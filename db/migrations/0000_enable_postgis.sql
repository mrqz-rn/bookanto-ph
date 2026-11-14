-- PostGIS for shop locations and nearby search. Supabase keeps extensions in
-- their own schema, which is on the default search_path of its roles.
CREATE SCHEMA IF NOT EXISTS extensions;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
