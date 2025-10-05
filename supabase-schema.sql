-- ============================================================================
-- Starlight Voyager - Supabase-ready Schema (cleaned & fixed)
-- NASA Space Apps Challenge 2025
-- ============================================================================
-- Run this in your Supabase SQL Editor
-- This schema enables: PostGIS spatial queries, ML proposals, consensus voting,
-- missions, and full annotation workflow
-- ============================================================================

-- ---------------------------
-- Extensions
-- ---------------------------
-- pgcrypto provides gen_random_uuid(); postgis for spatial geometry
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
-- (uuid-ossp is optional; pgcrypto's gen_random_uuid() is used here)

-- ============================================================================
-- IMAGES TABLE
-- Stores NASA image metadata, tile manifests, and thumbnails
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nasa_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  manifest_url TEXT,
  thumbnail_url TEXT,
  high_res_url TEXT,
  source JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS images_nasa_id_idx ON public.images(nasa_id);
CREATE INDEX IF NOT EXISTS images_created_at_idx ON public.images(created_at);
CREATE INDEX IF NOT EXISTS images_metadata_idx ON public.images USING GIN(metadata);

-- ============================================================================
-- MISSIONS TABLE
-- Curated collections of images for specific exploration campaigns
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  featured_image_id UUID REFERENCES public.images(id) ON DELETE SET NULL,
  created_by UUID, -- store auth.uid() values; avoid cross-schema FK to auth.users
  is_public BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS missions_created_by_idx ON public.missions(created_by);
CREATE INDEX IF NOT EXISTS missions_is_public_idx ON public.missions(is_public);

-- ============================================================================
-- ANNOTATIONS TABLE (PostGIS-enabled)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES public.images(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  geom geometry(Geometry, 4326),
  bbox JSONB,
  label TEXT,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('text', 'rectangle', 'circle', 'polygon', 'freehand', 'point')),
  text TEXT,
  properties JSONB,
  color TEXT DEFAULT '#FFFFFF',
  font_size INTEGER,
  points JSONB,
  confidence NUMERIC,
  source TEXT DEFAULT 'user' CHECK (source IN ('user', 'ml', 'imported')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS annotations_image_id_idx ON public.annotations(image_id);
CREATE INDEX IF NOT EXISTS annotations_user_id_idx ON public.annotations(user_id);
CREATE INDEX IF NOT EXISTS annotations_created_at_idx ON public.annotations(created_at);
CREATE INDEX IF NOT EXISTS annotations_source_idx ON public.annotations(source);
CREATE INDEX IF NOT EXISTS annotations_geom_idx ON public.annotations USING GIST(geom);

-- ============================================================================
-- ANNOTATION VOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.annotation_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id UUID REFERENCES public.annotations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 0, 1)),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(annotation_id, user_id)
);

CREATE INDEX IF NOT EXISTS annotation_votes_annotation_id_idx ON public.annotation_votes(annotation_id);
CREATE INDEX IF NOT EXISTS annotation_votes_user_id_idx ON public.annotation_votes(user_id);

-- ============================================================================
-- ML PROPOSALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ml_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES public.images(id) ON DELETE CASCADE NOT NULL,
  geom geometry(Geometry, 4326),
  bbox JSONB NOT NULL,
  score NUMERIC NOT NULL,
  model_name TEXT NOT NULL,
  model_version TEXT,
  features JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'converted')),
  converted_to_annotation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for converted_to_annotation_id (set null if annotation removed)
ALTER TABLE public.ml_proposals
  ADD CONSTRAINT fk_ml_converted_annotation
  FOREIGN KEY (converted_to_annotation_id) REFERENCES public.annotations(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ml_proposals_image_id_idx ON public.ml_proposals(image_id);
CREATE INDEX IF NOT EXISTS ml_proposals_score_idx ON public.ml_proposals(score);
CREATE INDEX IF NOT EXISTS ml_proposals_status_idx ON public.ml_proposals(status);
CREATE INDEX IF NOT EXISTS ml_proposals_geom_idx ON public.ml_proposals USING GIST(geom);

-- ============================================================================
-- BOOKMARKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_id UUID REFERENCES public.images(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, image_id)
);

CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS bookmarks_image_id_idx ON public.bookmarks(image_id);

-- ============================================================================
-- EXPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('csv', 'png', 'json', 'geojson')),
  file_url TEXT NOT NULL,
  file_size INTEGER,
  metadata JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS exports_user_id_idx ON public.exports(user_id);
CREATE INDEX IF NOT EXISTS exports_expires_at_idx ON public.exports(expires_at);

-- ============================================================================
-- SYNC QUEUE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
  table_name TEXT NOT NULL,
  record_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sync_queue_user_id_idx ON public.sync_queue(user_id);
CREATE INDEX IF NOT EXISTS sync_queue_status_idx ON public.sync_queue(status);

-- ============================================================================
-- MATERIALIZED VIEW: ANNOTATION CONSENSUS
-- NOTE: drop before create to ensure compatibility across Postgres versions
-- ============================================================================
DROP MATERIALIZED VIEW IF EXISTS public.annotation_consensus;

CREATE MATERIALIZED VIEW public.annotation_consensus AS
SELECT 
  a.id AS annotation_id,
  a.image_id,
  a.user_id,
  a.label,
  COUNT(v.id) AS vote_count,
  COALESCE(SUM(v.vote), 0) AS vote_sum,
  CASE 
    WHEN COUNT(v.id) = 0 THEN 0
    ELSE COALESCE(SUM(v.vote)::FLOAT / COUNT(v.id), 0)
  END AS agreement_score,
  CASE
    WHEN COUNT(v.id) >= 3 AND (COALESCE(SUM(v.vote)::FLOAT / COUNT(v.id), 0)) >= 0.75 THEN 'confirmed'
    WHEN COUNT(v.id) >= 3 AND (COALESCE(SUM(v.vote)::FLOAT / COUNT(v.id), 0)) <= -0.5 THEN 'rejected'
    ELSE 'pending'
  END AS consensus_status
FROM public.annotations a
LEFT JOIN public.annotation_votes v ON v.annotation_id = a.id
GROUP BY a.id, a.image_id, a.user_id, a.label;

CREATE UNIQUE INDEX IF NOT EXISTS annotation_consensus_annotation_id_uidx ON public.annotation_consensus(annotation_id);
CREATE INDEX IF NOT EXISTS annotation_consensus_status_idx ON public.annotation_consensus(consensus_status);
CREATE INDEX IF NOT EXISTS annotation_consensus_score_idx ON public.annotation_consensus(agreement_score);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- IMPORTANT: add policies per-table and per-action
-- ============================================================================
-- IMAGES
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

CREATE POLICY images_select_public ON public.images
  FOR SELECT USING (true);

CREATE POLICY images_insert_authenticated ON public.images
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- MISSIONS
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY missions_select ON public.missions
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY missions_insert_authenticated ON public.missions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY missions_update_creator ON public.missions
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY missions_delete_creator ON public.missions
  FOR DELETE USING (auth.uid() = created_by);

-- ANNOTATIONS
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY annotations_select_all ON public.annotations
  FOR SELECT USING (true);

CREATE POLICY annotations_insert_own ON public.annotations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY annotations_update_own ON public.annotations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY annotations_delete_own ON public.annotations
  FOR DELETE USING (auth.uid() = user_id);

-- ANNOTATION VOTES
ALTER TABLE public.annotation_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY annotation_votes_select ON public.annotation_votes
  FOR SELECT USING (true);

CREATE POLICY annotation_votes_insert_authenticated ON public.annotation_votes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY annotation_votes_update_own ON public.annotation_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY annotation_votes_delete_own ON public.annotation_votes
  FOR DELETE USING (auth.uid() = user_id);

-- ML PROPOSALS
ALTER TABLE public.ml_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY ml_proposals_select ON public.ml_proposals
  FOR SELECT USING (true);

CREATE POLICY ml_proposals_insert_service ON public.ml_proposals
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY ml_proposals_update_service ON public.ml_proposals
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY ml_proposals_delete_service ON public.ml_proposals
  FOR DELETE USING (auth.role() = 'service_role');

-- BOOKMARKS
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY bookmarks_select_own ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY bookmarks_insert_own ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY bookmarks_delete_own ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- EXPORTS
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY exports_select_own ON public.exports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY exports_insert_service_or_owner ON public.exports
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

CREATE POLICY exports_delete_own ON public.exports
  FOR DELETE USING (auth.uid() = user_id);

-- SYNC QUEUE
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean deployment)
DROP POLICY IF EXISTS sync_queue_select_own ON public.sync_queue;
DROP POLICY IF EXISTS sync_queue_insert_own ON public.sync_queue;
DROP POLICY IF EXISTS sync_queue_update_own ON public.sync_queue;
DROP POLICY IF EXISTS sync_queue_delete_own ON public.sync_queue;

CREATE POLICY sync_queue_select_own ON public.sync_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY sync_queue_insert_own ON public.sync_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY sync_queue_update_own ON public.sync_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY sync_queue_delete_own ON public.sync_queue
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================
-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers (drop if exist then create)
DROP TRIGGER IF EXISTS set_images_updated_at ON public.images;
CREATE TRIGGER set_images_updated_at
  BEFORE UPDATE ON public.images
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_missions_updated_at ON public.missions;
CREATE TRIGGER set_missions_updated_at
  BEFORE UPDATE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_annotations_updated_at ON public.annotations;
CREATE TRIGGER set_annotations_updated_at
  BEFORE UPDATE ON public.annotations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Refresh consensus function
CREATE OR REPLACE FUNCTION public.refresh_consensus()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.annotation_consensus;
END;
$$ LANGUAGE plpgsql;

-- Convert ML proposal to annotation
CREATE OR REPLACE FUNCTION public.convert_proposal_to_annotation(
  proposal_id UUID,
  user_id_param UUID,
  label_param TEXT,
  properties_param JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  new_annotation_id UUID;
  proposal_record public.ml_proposals%ROWTYPE;
BEGIN
  SELECT * INTO proposal_record FROM public.ml_proposals WHERE id = proposal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  INSERT INTO public.annotations (
    image_id, user_id, geom, bbox, label, annotation_type, properties, confidence, source
  ) VALUES (
    proposal_record.image_id,
    user_id_param,
    proposal_record.geom,
    proposal_record.bbox,
    label_param,
    'rectangle',
    properties_param,
    proposal_record.score,
    'ml'
  ) RETURNING id INTO new_annotation_id;

  UPDATE public.ml_proposals
  SET status = 'converted', converted_to_annotation_id = new_annotation_id
  WHERE id = proposal_id;

  RETURN new_annotation_id;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired exports
CREATE OR REPLACE FUNCTION public.cleanup_expired_exports()
RETURNS void AS $$
BEGIN
  DELETE FROM public.exports WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER VIEWS (Created after all tables exist)
-- ============================================================================
-- NOTE: This view requires auth.users to be accessible
-- If you get errors, you can comment it out or modify as needed
-- CREATE OR REPLACE VIEW public.user_annotation_stats AS
-- SELECT 
--   u.id AS user_id,
--   u.email,
--   COUNT(DISTINCT a.id) AS total_annotations,
--   COUNT(DISTINCT a.image_id) AS unique_images,
--   COUNT(DISTINCT CASE WHEN a.created_at > NOW() - INTERVAL '7 days' THEN a.id END) AS annotations_this_week,
--   MAX(a.created_at) AS last_annotation_at
-- FROM auth.users u
-- LEFT JOIN public.annotations a ON a.user_id = u.id
-- GROUP BY u.id, u.email;

-- ============================================================================
-- STORAGE BUCKETS SETUP
-- Create these manually in Supabase Dashboard > Storage:
-- thumbnails (public), overlays (public), exports (private), raw_images (private)
-- ============================================================================
-- REALTIME / REPLICATION
-- Enable realtime for: public.annotations, public.annotation_votes, public.ml_proposals
-- Do this in the Supabase Dashboard -> Database -> Replication UI.

-- ============================================================================
-- SAMPLE DATA (Optional)
-- ============================================================================
INSERT INTO public.images (nasa_id, title, description, thumbnail_url, metadata)
VALUES (
  'PIA03632',
  'Mars Rover Curiosity',
  'Mars Rover Curiosity exploring the Martian surface',
  'https://images-assets.nasa.gov/image/PIA03632/PIA03632~thumb.jpg',
  '{"date": "2020-01-01", "center": "JPL", "keywords": ["Mars", "rover", "curiosity"]}'::jsonb
) ON CONFLICT (nasa_id) DO NOTHING;

-- ============================================================================
-- MAINTENANCE TASKS (schedule externally)
-- Use Supabase scheduled functions or external cron to call:
-- SELECT public.refresh_consensus();
-- SELECT public.cleanup_expired_exports();
-- ============================================================================
-- GRANTS
GRANT USAGE ON SCHEMA public TO authenticated;

-- ============================================================================
-- HELPER VIEWS (Created at the very end after everything else)
-- ============================================================================
-- Drop the view first to ensure a clean creation, avoiding stale cache issues.
DROP VIEW IF EXISTS public.image_annotation_summary;

-- Recreate the view using fully qualified names to avoid any ambiguity
CREATE VIEW public.image_annotation_summary AS
SELECT 
  i.id AS image_id,
  i.nasa_id,
  i.title,
  COALESCE(COUNT(DISTINCT public.annotations.id), 0) AS annotation_count,
  COALESCE(COUNT(DISTINCT public.annotations.user_id), 0) AS contributor_count,
  COALESCE(COUNT(DISTINCT CASE WHEN public.annotations.source = 'ml' THEN public.annotations.id END), 0) AS ml_annotation_count,
  COALESCE(COUNT(DISTINCT CASE WHEN public.annotations.source = 'user' THEN public.annotations.id END), 0) AS user_annotation_count
FROM public.images i
LEFT JOIN public.annotations ON public.annotations.image_id = i.id
GROUP BY i.id, i.nasa_id, i.title;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
