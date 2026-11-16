-- Search and discovery.
--
-- pg_trgm gives typo-tolerant matching (word_similarity) for /search. Supabase
-- keeps extensions in their own schema, on its roles' search_path.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
--> statement-breakpoint
-- Fixed-window counters behind lib/rate-limit.ts (searches per minute per
-- visitor, and any other limit keyed by a string). Not a Drizzle table: only
-- hit_rate_limit() touches it.
CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);
--> statement-breakpoint
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Counts one hit for p_key in the current window and returns whether it is
-- still within p_limit. Old windows are cleared now and then, so the table
-- stays small without a cron job.
CREATE OR REPLACE FUNCTION public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_window timestamptz := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
BEGIN
  INSERT INTO public.rate_limit_hits AS r (key, window_start)
  VALUES (p_key, v_window)
  ON CONFLICT (key, window_start) DO UPDATE SET hits = r.hits + 1
  RETURNING r.hits INTO v_hits;

  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit_hits WHERE window_start < now() - interval '1 hour';
  END IF;

  RETURN v_hits <= p_limit;
END;
$$;
--> statement-breakpoint
-- Server code only: never callable through the Supabase Data API.
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.hit_rate_limit(text, integer, integer) FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.hit_rate_limit(text, integer, integer) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.hit_rate_limit(text, integer, integer) FROM authenticated;
  END IF;
END;
$$;
