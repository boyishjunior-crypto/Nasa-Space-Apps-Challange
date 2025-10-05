// ============================================================================
// ML Service - Manages ML proposals and inference
// ============================================================================
import { supabase, callEdgeFunction } from '../../supabasecliente';

export interface MLProposal {
  id: string;
  image_id: string;
  bbox: { x: number; y: number; w: number; h: number };
  score: number;
  model_name: string;
  model_version?: string;
  features?: any;
  status: 'pending' | 'confirmed' | 'rejected' | 'converted';
  converted_to_annotation_id?: string;
  created_at: string;
}

export class MLService {
  /**
   * Generate ML proposals for an image
   */
  static async generateProposals(imageId: string, imageUrl: string): Promise<MLProposal[]> {
    try {
      // Call Edge Function to run ML inference
      const result = await callEdgeFunction('generate-proposals', {
        image_id: imageId,
        image_url: imageUrl,
      });

      return result.proposals || [];
    } catch (error) {
      console.error('Error generating proposals:', error);
      throw error;
    }
  }

  /**
   * Get ML proposals for an image
   */
  static async getProposalsByImageId(imageId: string): Promise<MLProposal[]> {
    const { data, error } = await supabase
      .from('ml_proposals')
      .select('*')
      .eq('image_id', imageId)
      .order('score', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get pending proposals (not yet converted)
   */
  static async getPendingProposals(imageId: string): Promise<MLProposal[]> {
    const { data, error } = await supabase
      .from('ml_proposals')
      .select('*')
      .eq('image_id', imageId)
      .eq('status', 'pending')
      .order('score', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Convert ML proposal to user annotation
   */
  static async convertProposalToAnnotation(
    proposalId: string,
    label: string,
    properties: any = {}
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('convert_proposal_to_annotation', {
      proposal_id: proposalId,
      user_id_param: user.id,
      label_param: label,
      properties_param: properties,
    });

    if (error) throw error;
    return data; // Returns new annotation ID
  }

  /**
   * Update proposal status
   */
  static async updateProposalStatus(
    proposalId: string,
    status: 'confirmed' | 'rejected'
  ): Promise<void> {
    const { error } = await supabase
      .from('ml_proposals')
      .update({ status })
      .eq('id', proposalId);

    if (error) throw error;
  }

  /**
   * Batch generate proposals for multiple images
   */
  static async batchGenerateProposals(imageIds: string[]): Promise<void> {
    try {
      await callEdgeFunction('batch-generate-proposals', {
        image_ids: imageIds,
      });
    } catch (error) {
      console.error('Error in batch generation:', error);
      throw error;
    }
  }
}
