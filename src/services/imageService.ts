// ============================================================================
// Image Service - Manages NASA images in Supabase
// ============================================================================
import { supabase } from '../../supabasecliente';

export interface ImageRecord {
  id: string;
  nasa_id: string;
  title: string;
  description?: string;
  manifest_url?: string;
  thumbnail_url?: string;
  high_res_url?: string;
  source?: any;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export class ImageService {
  /**
   * Get or create image record from NASA data
   */
  static async getOrCreateImage(nasaItem: any): Promise<ImageRecord> {
    const nasaId = nasaItem.data[0].nasa_id;
    
    // Check if image already exists
    const { data: existing, error: fetchError } = await supabase
      .from('images')
      .select('*')
      .eq('nasa_id', nasaId)
      .single();

    if (existing) {
      return existing;
    }

    // Create new image record
    const imageData = {
      nasa_id: nasaId,
      title: nasaItem.data[0].title,
      description: nasaItem.data[0].description,
      thumbnail_url: nasaItem.links?.[0]?.href,
      high_res_url: nasaItem.links?.[0]?.href,
      source: nasaItem,
      metadata: {
        date: nasaItem.data[0].date_created,
        center: nasaItem.data[0].center,
        keywords: nasaItem.data[0].keywords || [],
      },
    };

    const { data, error } = await supabase
      .from('images')
      .insert(imageData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get image by ID
   */
  static async getImageById(imageId: string): Promise<ImageRecord | null> {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .eq('id', imageId)
      .single();

    if (error) {
      console.error('Error fetching image:', error);
      return null;
    }

    return data;
  }

  /**
   * Get image by NASA ID
   */
  static async getImageByNasaId(nasaId: string): Promise<ImageRecord | null> {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .eq('nasa_id', nasaId)
      .single();

    if (error) {
      console.error('Error fetching image:', error);
      return null;
    }

    return data;
  }

  /**
   * Search images with metadata
   */
  static async searchImages(query: string, limit = 20): Promise<ImageRecord[]> {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get recent images
   */
  static async getRecentImages(limit = 20): Promise<ImageRecord[]> {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get images with annotation summary
   */
  static async getImagesWithAnnotations(limit = 20): Promise<any[]> {
    const { data, error } = await supabase
      .from('image_annotation_summary')
      .select('*')
      .order('annotation_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
}
