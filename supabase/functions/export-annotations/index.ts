// ============================================================================
// Edge Function: Export Annotations
// ============================================================================
// Exports annotations as CSV, JSON, or GeoJSON
// Stores result in Supabase Storage and returns signed URL
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    const { format, image_id } = requestBody;

    // Validate required parameters
    if (!format) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['csv', 'json', 'geojson'].includes(format)) {
      return new Response(
        JSON.stringify({ error: 'Invalid format. Must be csv, json, or geojson' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // ========================================================================
    // Fetch annotations
    // ========================================================================
    let query = supabaseClient
      .from('annotations')
      .select('*, images(nasa_id, title)')
      .eq('user_id', user.id);

    if (image_id) {
      query = query.eq('image_id', image_id);
    }

    const { data: annotations, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    // ========================================================================
    // Generate export based on format
    // ========================================================================
    let fileContent: string;
    let fileName: string;
    let contentType: string;

    if (format === 'csv') {
      // Generate CSV
      const headers = ['NASA ID', 'Image Title', 'Label', 'Text', 'Type', 'Confidence', 'Created At'];
      const rows = annotations.map(a => [
        a.images?.nasa_id || '',
        a.images?.title || '',
        a.label || '',
        a.text || '',
        a.type,
        a.confidence || '',
        a.created_at,
      ]);

      fileContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      fileName = `annotations-${Date.now()}.csv`;
      contentType = 'text/csv';

    } else if (format === 'geojson') {
      // Generate GeoJSON
      const features = annotations
        .filter(a => a.geom)
        .map(a => ({
          type: 'Feature',
          geometry: a.geom,
          properties: {
            id: a.id,
            nasa_id: a.images?.nasa_id,
            label: a.label,
            text: a.text,
            type: a.type,
            confidence: a.confidence,
            created_at: a.created_at,
          },
        }));

      fileContent = JSON.stringify({
        type: 'FeatureCollection',
        features,
      }, null, 2);

      fileName = `annotations-${Date.now()}.geojson`;
      contentType = 'application/geo+json';

    } else {
      // Generate JSON
      fileContent = JSON.stringify(annotations, null, 2);
      fileName = `annotations-${Date.now()}.json`;
      contentType = 'application/json';
    }

    // ========================================================================
    // Upload to Supabase Storage
    // ========================================================================
    const filePath = `${user.id}/${fileName}`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('exports')
      .upload(filePath, new Blob([fileContent], { type: contentType }), {
        contentType,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Generate signed URL (expires in 7 days)
    const { data: urlData, error: urlError } = await supabaseClient.storage
      .from('exports')
      .createSignedUrl(filePath, 604800);

    if (urlError) throw urlError;

    // ========================================================================
    // Store export record
    // ========================================================================
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: exportRecord, error: recordError } = await supabaseClient
      .from('exports')
      .insert({
        user_id: user.id,
        type: format,
        file_url: urlData.signedUrl,
        file_size: fileContent.length,
        metadata: {
          annotation_count: annotations.length,
          image_id,
        },
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (recordError) throw recordError;

    // Return export record
    return new Response(
      JSON.stringify({
        success: true,
        export: exportRecord,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
