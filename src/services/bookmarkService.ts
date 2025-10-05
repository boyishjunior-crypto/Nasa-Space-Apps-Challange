// ============================================================================
// Bookmark Service - Manages user bookmarks/favorites
// ============================================================================
import { supabase } from '../../supabasecliente';

export interface Bookmark {
  id: string;
  user_id: string;
  image_id: string;
  notes?: string;
  created_at: string;
}

export class BookmarkService {
  /**
   * Add bookmark
   */
  static async addBookmark(imageId: string, notes?: string): Promise<Bookmark> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          image_id: imageId,
          notes,
        })
        .select()
        .single();

      if (error) {
        console.error('BookmarkService addBookmark error:', error);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Network error in addBookmark:', error);
      throw error;
    }
  }

  /**
   * Remove bookmark
   */
  static async removeBookmark(imageId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('image_id', imageId);

    if (error) throw error;
  }

  /**
   * Check if image is bookmarked
   */
  static async isBookmarked(imageId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('image_id', imageId)
      .maybeSingle();

    if (error) {
      return false;
    }
    return !!data;
  }

  /**
   * Get all user bookmarks
   */
  static async getUserBookmarks(): Promise<Bookmark[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('bookmarks')
      .select('*, images(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update bookmark notes
   */
  static async updateBookmarkNotes(imageId: string, notes: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('bookmarks')
      .update({ notes })
      .eq('user_id', user.id)
      .eq('image_id', imageId);

    if (error) throw error;
  }
}
