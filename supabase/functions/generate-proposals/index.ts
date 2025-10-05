// ============================================================================
// Edge Function: Generate ML Proposals
// ============================================================================
// This function calls an external ML service to detect regions of interest
// and stores the proposals in the database
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request body
    const requestBody = await req.json();
    const { image_id, image_url } = requestBody;

    if (!image_id || !image_url) {
      return new Response(
        JSON.stringify({ error: 'Missing image_id or image_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // OPTION 1: External ML service (Hugging Face, custom API, etc.)
    /*
    const mlResponse = await fetch("https://your-ml-service.com/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url }),
    });
    const mlResults = await mlResponse.json();
    const proposals = mlResults.detections || [];
    */

    // ========================================================================
    // OPTION 2: Simple heuristic detector (for demo/prototype)
    // ========================================================================
    const proposals = [
      {
        bbox: { x: 0.2, y: 0.3, w: 0.15, h: 0.15 },
        score: 0.92,
        features: { brightness: "high", color: "blue", morphology: "circular" },
      },
      {
        bbox: { x: 0.5, y: 0.4, w: 0.2, h: 0.1 },
        score: 0.87,
        features: {
          brightness: "medium",
          color: "red",
          morphology: "elongated",
        },
      },
      {
        bbox: { x: 0.7, y: 0.6, w: 0.1, h: 0.12 },
        score: 0.78,
        features: {
          brightness: "low",
          color: "yellow",
          morphology: "irregular",
        },
      },
    ];

    // ========================================================================
    // Store proposals in database
    // ========================================================================
    const insertData = proposals.map((p) => ({
      image_id,
      bbox: p.bbox,
      score: p.score,
      model_name: "demo-detector-v1",
      model_version: "1.0.0",
      features: p.features,
      status: "pending",
    }));

    const { data, error } = await supabaseClient
      .from("ml_proposals")
      .insert(insertData)
      .select();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to store proposals", details: error }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        count: data.length,
        proposals: data,
      }),
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
