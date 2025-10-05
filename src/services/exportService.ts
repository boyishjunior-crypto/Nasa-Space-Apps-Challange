// ============================================================================
// Export Service - Manages data exports (CSV, PNG, JSON)
// ============================================================================
import { supabase, callEdgeFunction } from '../../supabasecliente';

export interface ExportRecord {
  id: string;
  user_id: string;
  type: 'csv' | 'png' | 'json' | 'geojson';
  file_url: string;
  file_size?: number;
  metadata?: any;
  expires_at?: string;
  created_at: string;
}

export class ExportService {
  /**
   * Export annotations as CSV
   */
  static async exportAnnotationsCSV(imageId?: string): Promise<ExportRecord> {
    try {
      const result = await callEdgeFunction('export-annotations', {
        format: 'csv',
        image_id: imageId,
      });

      return result.export;
    } catch (error) {
      console.error('Error exporting CSV:', error);
      throw error;
    }
  }

  /**
   * Export annotations as GeoJSON
   */
  static async exportAnnotationsGeoJSON(imageId?: string): Promise<ExportRecord> {
    try {
      const result = await callEdgeFunction('export-annotations', {
        format: 'geojson',
        image_id: imageId,
      });

      return result.export;
    } catch (error) {
      console.error('Error exporting GeoJSON:', error);
      throw error;
    }
  }

  /**
   * Generate annotated overlay PNG
   */
  static async generateAnnotatedOverlay(imageId: string): Promise<ExportRecord> {
    try {
      const result = await callEdgeFunction('generate-overlay', {
        image_id: imageId,
      });

      return result.export;
    } catch (error) {
      console.error('Error generating overlay:', error);
      throw error;
    }
  }

  /**
   * Get user's export history
   */
  static async getUserExports(): Promise<ExportRecord[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('exports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Delete export
   */
  static async deleteExport(exportId: string): Promise<void> {
    const { error } = await supabase
      .from('exports')
      .delete()
      .eq('id', exportId);

    if (error) throw error;
  }

  /**
   * Cleanup expired exports
   */
  static async cleanupExpiredExports(): Promise<void> {
    const { error } = await supabase.rpc('cleanup_expired_exports');
    if (error) throw error;
  }
}
