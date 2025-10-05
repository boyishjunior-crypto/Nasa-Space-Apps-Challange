// ============================================================================
// Sync Service - Manages offline queue and synchronization
// ============================================================================
import { supabase, processSyncQueue } from '../../supabasecliente';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncQueueItem {
  id: string;
  user_id: string;
  operation: 'insert' | 'update' | 'delete';
  table_name: string;
  record_data: any;
  status: 'pending' | 'synced' | 'failed';
  error_message?: string;
  attempts: number;
  created_at: string;
  synced_at?: string;
}

export class SyncService {
  private static syncInterval: NodeJS.Timeout | null = null;
  private static isOnline: boolean = true;

  /**
   * Initialize sync service with network monitoring
   */
  static async initialize(): Promise<void> {
    // Monitor network state
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // If we just came online, trigger sync
      if (wasOffline && this.isOnline) {
        console.log('Network restored, syncing...');
        this.syncNow();
      }
    });

    // Start periodic sync (every 30 seconds when online)
    this.startPeriodicSync();

    // Initial sync
    await this.syncNow();
  }

  /**
   * Start periodic sync
   */
  static startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (this.isOnline) {
        await this.syncNow();
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop periodic sync
   */
  static stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Sync now
   */
  static async syncNow(): Promise<{ processed: number; failed: number }> {
    if (!this.isOnline) {
      return { processed: 0, failed: 0 };
    }

    try {
      const result = await processSyncQueue();
      
      // Update last sync time
      await AsyncStorage.setItem('last_sync_time', new Date().toISOString());
      
      return result;
    } catch (error) {
      console.error('Sync error:', error);
      return { processed: 0, failed: 0 };
    }
  }

  /**
   * Get pending sync count
   */
  static async getPendingSyncCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('sync_queue')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (error) return 0;
    return count || 0;
  }

  /**
   * Get failed sync items
   */
  static async getFailedSyncItems(): Promise<SyncQueueItem[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'failed')
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  }

  /**
   * Retry failed sync item
   */
  static async retryFailedItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('sync_queue')
      .update({ status: 'pending', attempts: 0, error_message: null })
      .eq('id', itemId);

    if (error) throw error;

    // Trigger immediate sync
    await this.syncNow();
  }

  /**
   * Clear synced items
   */
  static async clearSyncedItems(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('sync_queue')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'synced');

    if (error) throw error;
  }

  /**
   * Get sync status
   */
  static async getSyncStatus(): Promise<{
    isOnline: boolean;
    pendingCount: number;
    lastSyncTime?: string;
  }> {
    const netInfo = await NetInfo.fetch();
    const pendingCount = await this.getPendingSyncCount();
    const lastSyncTime = await AsyncStorage.getItem('last_sync_time');

    return {
      isOnline: netInfo.isConnected ?? false,
      pendingCount,
      lastSyncTime: lastSyncTime || undefined,
    };
  }
}
