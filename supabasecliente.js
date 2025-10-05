// ============================================================================
// Starlight Voyager - Supabase Client Configuration
// ============================================================================
// IMPORTANT: Import polyfill FIRST before any other imports
import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// CONFIGURATION
// ============================================================================
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 
                    process.env.EXPO_PUBLIC_SUPABASE_URL || 
                    'https://nnxdpafuzbretrmlbxrh.supabase.co';

const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 
                        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
                        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ueGRwYWZ1emJyZXRybWxieHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDg2OTksImV4cCI6MjA3NTE4NDY5OX0.pg2h378f-M_UXCRqsiWxqb5D_nLNw42dOfSSsvathI0';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // Use AsyncStorage for session persistence
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,  // Rate limit for realtime events
    },
  },
  global: {
    headers: {
      'x-client-info': 'starlight-voyager-mobile',
    },
  },
  // Add timeout and retry configuration
  db: {
    schema: 'public',
  },
  functions: {
    timeout: 30000, // 30 second timeout
  },
});

// ============================================================================
// STORAGE HELPERS
// ============================================================================

/**
 * Get signed URL for private storage objects
 */
export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Upload file to storage
 */
export async function uploadFile(bucket, path, file, options = {}) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      ...options,
    });
  
  if (error) throw error;
  return data;
}

/**
 * Get public URL for storage object
 */
export function getPublicUrl(bucket, path) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

// ============================================================================
// REALTIME HELPERS
// ============================================================================

/**
 * Subscribe to annotation changes for an image
 */
export function subscribeToImageAnnotations(imageId, callbacks) {
  const channel = supabase
    .channel(`image-annotations:${imageId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'annotations',
        filter: `image_id=eq.${imageId}`,
      },
      (payload) => callbacks.onInsert?.(payload.new)
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'annotations',
        filter: `image_id=eq.${imageId}`,
      },
      (payload) => callbacks.onUpdate?.(payload.new)
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'annotations',
        filter: `image_id=eq.${imageId}`,
      },
      (payload) => callbacks.onDelete?.(payload.old)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to votes on an annotation
 */
export function subscribeToAnnotationVotes(annotationId, onVote) {
  const channel = supabase
    .channel(`annotation-votes:${annotationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'annotation_votes',
        filter: `annotation_id=eq.${annotationId}`,
      },
      (payload) => onVote(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to ML proposals for an image
 */
export function subscribeToMLProposals(imageId, onProposal) {
  const channel = supabase
    .channel(`ml-proposals:${imageId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ml_proposals',
        filter: `image_id=eq.${imageId}`,
      },
      (payload) => onProposal(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ============================================================================
// EDGE FUNCTION HELPERS
// ============================================================================

// ============================================================================
// CONNECTION TEST
// ============================================================================

/**
 * Test Supabase connection
 */
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Supabase connection test failed:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Network error during connection test:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// OFFLINE SYNC HELPERS
// ============================================================================

/**
 * Queue operation for offline sync
 */
export async function queueOfflineOperation(operation, tableName, recordData) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('sync_queue')
    .insert({
      user_id: user.id,
      operation,
      table_name: tableName,
      record_data: recordData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Process pending sync queue
 */
export async function processSyncQueue() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { processed: 0, failed: 0 };

  const { data: pending, error } = await supabase
    .from('sync_queue')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;

  let processed = 0;
  let failed = 0;

  for (const item of pending || []) {
    try {
      // Execute the queued operation
      if (item.operation === 'insert') {
        await supabase.from(item.table_name).insert(item.record_data);
      } else if (item.operation === 'update') {
        await supabase.from(item.table_name).update(item.record_data).eq('id', item.record_data.id);
      } else if (item.operation === 'delete') {
        await supabase.from(item.table_name).delete().eq('id', item.record_data.id);
      }

      // Mark as synced
      await supabase
        .from('sync_queue')
        .update({ status: 'synced', synced_at: new Date().toISOString() })
        .eq('id', item.id);

      processed++;
    } catch (error) {
      // Mark as failed
      await supabase
        .from('sync_queue')
        .update({ 
          status: 'failed', 
          error_message: error.message,
          attempts: item.attempts + 1,
        })
        .eq('id', item.id);

      failed++;
    }
  }

  return { processed, failed };
}

// ============================================================================
// EXPORTS
// ============================================================================
export default supabase;