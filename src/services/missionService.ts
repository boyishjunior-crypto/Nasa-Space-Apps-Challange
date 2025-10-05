// ============================================================================
// Mission Service - Manages curated exploration campaigns
// ============================================================================
import { supabase } from '../../supabasecliente';

export interface Mission {
  id: string;
  title: string;
  description?: string;
  featured_image_id?: string;
  created_by?: string;
  is_public: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export class MissionService {
  /**
   * Create a new mission
   */
  static async createMission(missionData: {
    title: string;
    description?: string;
    featured_image_id?: string;
    is_public?: boolean;
    metadata?: any;
  }): Promise<Mission> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('missions')
      .insert({
        ...missionData,
        created_by: user.id,
        is_public: missionData.is_public ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get public missions
   */
  static async getPublicMissions(): Promise<Mission[]> {
    const { data, error } = await supabase
      .from('missions')
      .select('*, images(nasa_id, title, thumbnail_url)')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get user's missions
   */
  static async getUserMissions(): Promise<Mission[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('missions')
      .select('*, images(nasa_id, title, thumbnail_url)')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get mission by ID
   */
  static async getMissionById(missionId: string): Promise<Mission | null> {
    const { data, error } = await supabase
      .from('missions')
      .select('*, images(nasa_id, title, thumbnail_url, description)')
      .eq('id', missionId)
      .single();

    if (error) {
      console.error('Error fetching mission:', error);
      return null;
    }

    return data;
  }

  /**
   * Update mission
   */
  static async updateMission(
    missionId: string,
    updates: Partial<Mission>
  ): Promise<Mission> {
    const { data, error } = await supabase
      .from('missions')
      .update(updates)
      .eq('id', missionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete mission
   */
  static async deleteMission(missionId: string): Promise<void> {
    const { error } = await supabase
      .from('missions')
      .delete()
      .eq('id', missionId);

    if (error) throw error;
  }

  /**
   * Get featured mission
   */
  static async getFeaturedMission(): Promise<Mission | null> {
    const { data, error } = await supabase
      .from('missions')
      .select('*, images(nasa_id, title, thumbnail_url, description)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data;
  }
}
