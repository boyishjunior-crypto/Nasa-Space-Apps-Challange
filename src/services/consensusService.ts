// ============================================================================
// Consensus Service - Manages voting and consensus on annotations
// ============================================================================
import { supabase } from '../../supabasecliente';

export interface AnnotationVote {
  id: string;
  annotation_id: string;
  user_id: string;
  vote: -1 | 0 | 1;
  comment?: string;
  created_at: string;
}

export interface ConsensusData {
  annotation_id: string;
  image_id: string;
  user_id: string;
  label?: string;
  vote_count: number;
  vote_sum: number;
  agreement_score: number;
  consensus_status: 'pending' | 'confirmed' | 'rejected';
}

export class ConsensusService {
  /**
   * Vote on an annotation
   */
  static async voteOnAnnotation(
    annotationId: string,
    vote: -1 | 0 | 1,
    comment?: string
  ): Promise<AnnotationVote> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Upsert vote (update if exists, insert if not)
    const { data, error } = await supabase
      .from('annotation_votes')
      .upsert({
        annotation_id: annotationId,
        user_id: user.id,
        vote,
        comment,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get votes for an annotation
   */
  static async getVotesForAnnotation(annotationId: string): Promise<AnnotationVote[]> {
    const { data, error } = await supabase
      .from('annotation_votes')
      .select('*')
      .eq('annotation_id', annotationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get consensus data for an annotation
   */
  static async getConsensusForAnnotation(annotationId: string): Promise<ConsensusData | null> {
    const { data, error } = await supabase
      .from('annotation_consensus')
      .select('*')
      .eq('annotation_id', annotationId)
      .single();

    if (error) {
      console.error('Error fetching consensus:', error);
      return null;
    }

    return data;
  }

  /**
   * Get all confirmed annotations for an image
   */
  static async getConfirmedAnnotations(imageId: string): Promise<ConsensusData[]> {
    const { data, error } = await supabase
      .from('annotation_consensus')
      .select('*')
      .eq('image_id', imageId)
      .eq('consensus_status', 'confirmed')
      .order('agreement_score', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get pending annotations needing votes
   */
  static async getPendingAnnotations(imageId: string): Promise<ConsensusData[]> {
    const { data, error } = await supabase
      .from('annotation_consensus')
      .select('*')
      .eq('image_id', imageId)
      .eq('consensus_status', 'pending')
      .order('vote_count', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Refresh consensus materialized view
   */
  static async refreshConsensus(): Promise<void> {
    const { error } = await supabase.rpc('refresh_consensus');
    if (error) throw error;
  }

  /**
   * Get user's voting statistics
   */
  static async getUserVoteStats(): Promise<{
    total_votes: number;
    confirms: number;
    rejects: number;
    neutrals: number;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('annotation_votes')
      .select('vote')
      .eq('user_id', user.id);

    if (error) throw error;

    const votes = data || [];
    return {
      total_votes: votes.length,
      confirms: votes.filter(v => v.vote === 1).length,
      rejects: votes.filter(v => v.vote === -1).length,
      neutrals: votes.filter(v => v.vote === 0).length,
    };
  }

  /**
   * Check if user has voted on an annotation
   */
  static async hasUserVoted(annotationId: string): Promise<AnnotationVote | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('annotation_votes')
      .select('*')
      .eq('annotation_id', annotationId)
      .eq('user_id', user.id)
      .single();

    if (error) return null;
    return data;
  }
}
