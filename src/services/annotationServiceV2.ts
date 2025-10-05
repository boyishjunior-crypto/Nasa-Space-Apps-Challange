// ============================================================================
// Annotation Service V2 - Works with new Supabase schema
// ============================================================================
import { supabase } from '../../supabasecliente';
import { ImageService } from './imageService';
import NetInfo from '@react-native-community/netinfo';
import { queueOfflineOperation } from '../../supabasecliente';

export interface AnnotationV2 {
  id: string;
  image_id: string;
  user_id: string;
  geom?: any;  // PostGIS geometry
  bbox?: { x: number; y: number; w: number; h: number };
  label?: string;
  annotation_type: 'text' | 'rectangle' | 'circle' | 'polygon' | 'freehand' | 'point';
  text?: string;
  properties?: any;
  color: string;
  font_size?: number;
  points?: any;
  confidence?: number;
  source: 'user' | 'ml' | 'imported';
  created_at: string;
  updated_at: string;
}

export class AnnotationServiceV2 {
  /**
   * Create annotation with offline support
   */
  static async createAnnotation(
    nasaItem: any,
    annotationData: {
      bbox?: { x: number; y: number; w: number; h: number };
      label?: string;
      annotation_type: 'text' | 'rectangle' | 'circle' | 'polygon' | 'freehand' | 'point';
      text?: string;
      properties?: any;
      color?: string;
    }
  ): Promise<AnnotationV2> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check network connectivity
    const netInfo = await NetInfo.fetch();

    // Get or create image record
    const image = await ImageService.getOrCreateImage(nasaItem);

    const insertData = {
      image_id: image.id,
      user_id: user.id,
      bbox: annotationData.bbox,
      label: annotationData.label,
      annotation_type: annotationData.annotation_type,
      text: annotationData.text,
      properties: annotationData.properties || {},
      color: annotationData.color || '#FFFFFF',
      source: 'user' as const,
    };

    // If offline, queue for later sync
    if (!netInfo.isConnected) {
      await queueOfflineOperation('insert', 'annotations', insertData);
      // Return optimistic response
      return {
        id: `temp-${Date.now()}`,
        ...insertData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as AnnotationV2;
    }

    // Online: insert directly
    const { data, error } = await supabase
      .from('annotations')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get annotations for an image
   */
  static async getAnnotationsByImageId(imageId: string): Promise<AnnotationV2[]> {
    const { data, error } = await supabase
      .from('annotations')
      .select('*')
      .eq('image_id', imageId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all user annotations with image data
   */
  static async getAllUserAnnotations(): Promise<any[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('annotations')
      .select('*, images(id, nasa_id, title, thumbnail_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update annotation
   */
  static async updateAnnotation(
    annotationId: string,
    updates: Partial<AnnotationV2>
  ): Promise<AnnotationV2> {
    const { data, error } = await supabase
      .from('annotations')
      .update(updates)
      .eq('id', annotationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete annotation
   */
  static async deleteAnnotation(annotationId: string): Promise<void> {
    const { error } = await supabase
      .from('annotations')
      .delete()
      .eq('id', annotationId);

    if (error) throw error;
  }

  /**
   * Get annotations by NASA ID (legacy compatibility)
   */
  static async getAnnotationsByNasaId(nasaId: string): Promise<AnnotationV2[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First get image by NASA ID
    const image = await ImageService.getImageByNasaId(nasaId);
    if (!image) return [];

    return this.getAnnotationsByImageId(image.id);
  }

  /**
   * Search annotations by text
   */
  static async searchAnnotations(query: string): Promise<AnnotationV2[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('annotations')
      .select('*, images(nasa_id, title)')
      .eq('user_id', user.id)
      .or(`label.ilike.%${query}%,text.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get annotation statistics
   */
  static async getAnnotationStats(): Promise<{
    total: number;
    by_type: Record<string, number>;
    by_source: Record<string, number>;
    this_week: number;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('annotations')
      .select('annotation_type, source, created_at')
      .eq('user_id', user.id);

    if (error) throw error;

    const annotations = data || [];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return {
      total: annotations.length,
      by_type: annotations.reduce((acc, a) => {
        acc[a.annotation_type] = (acc[a.annotation_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      by_source: annotations.reduce((acc, a) => {
        acc[a.source] = (acc[a.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      this_week: annotations.filter(a => new Date(a.created_at) > weekAgo).length,
    };
  }
}
