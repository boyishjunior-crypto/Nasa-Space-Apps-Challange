import { supabase } from '../../supabasecliente';
import { Annotation } from '../types/nasa';

export interface AnnotationDB {
  id: string;
  user_id: string;
  nasa_id: string;
  image_url: string | null;
  type: 'text' | 'rectangle' | 'circle' | 'freehand';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  font_size?: number;
  points?: Array<{ x: number; y: number }>;
  created_at: string;
  updated_at: string;
}

export class AnnotationService {
  /**
   * Create a new annotation
   */
  static async createAnnotation(
    annotation: Omit<Annotation, 'id'>,
    nasaId: string,
    imageUrl?: string
  ): Promise<{ data: AnnotationDB | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('annotations')
        .insert({
          user_id: user.id,
          nasa_id: nasaId,
          image_url: imageUrl,
          type: annotation.type,
          x: annotation.x,
          y: annotation.y,
          width: annotation.width,
          height: annotation.height,
          text: annotation.text,
          color: annotation.color,
          font_size: annotation.fontSize,
          points: annotation.points,
        })
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get all annotations for a specific NASA image
   */
  static async getAnnotationsByNasaId(
    nasaId: string
  ): Promise<{ data: AnnotationDB[] | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('nasa_id', nasaId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get all annotations for the current user
   */
  static async getAllUserAnnotations(): Promise<{ data: AnnotationDB[] | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Update an existing annotation
   */
  static async updateAnnotation(
    annotationId: string,
    updates: Partial<Omit<Annotation, 'id'>>
  ): Promise<{ data: AnnotationDB | null; error: any }> {
    try {
      const updateData: any = {};
      
      if (updates.type) updateData.type = updates.type;
      if (updates.x !== undefined) updateData.x = updates.x;
      if (updates.y !== undefined) updateData.y = updates.y;
      if (updates.width !== undefined) updateData.width = updates.width;
      if (updates.height !== undefined) updateData.height = updates.height;
      if (updates.text !== undefined) updateData.text = updates.text;
      if (updates.color) updateData.color = updates.color;
      if (updates.fontSize !== undefined) updateData.font_size = updates.fontSize;
      if (updates.points) updateData.points = updates.points;

      const { data, error } = await supabase
        .from('annotations')
        .update(updateData)
        .eq('id', annotationId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Delete an annotation
   */
  static async deleteAnnotation(annotationId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('annotations')
        .delete()
        .eq('id', annotationId);

      return { error };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Delete all annotations for a specific NASA image
   */
  static async deleteAnnotationsByNasaId(nasaId: string): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: new Error('User not authenticated') };
      }

      const { error } = await supabase
        .from('annotations')
        .delete()
        .eq('nasa_id', nasaId)
        .eq('user_id', user.id);

      return { error };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Convert database annotation to app annotation format
   */
  static dbToAnnotation(dbAnnotation: AnnotationDB): Annotation {
    return {
      id: dbAnnotation.id,
      type: dbAnnotation.type,
      x: dbAnnotation.x,
      y: dbAnnotation.y,
      width: dbAnnotation.width,
      height: dbAnnotation.height,
      text: dbAnnotation.text,
      color: dbAnnotation.color,
      fontSize: dbAnnotation.font_size,
      points: dbAnnotation.points,
    };
  }

  /**
   * Convert multiple database annotations to app format
   */
  static dbToAnnotations(dbAnnotations: AnnotationDB[]): Annotation[] {
    return dbAnnotations.map(this.dbToAnnotation);
  }
}
