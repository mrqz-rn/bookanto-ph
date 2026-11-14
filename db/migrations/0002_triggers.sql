-- Keep updated_at current on every UPDATE, including updates made inside
-- database functions such as change_booking_status().
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
-- booking_events and audit_log are append-only.
CREATE OR REPLACE FUNCTION public.prevent_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
END;
$$;
--> statement-breakpoint
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users', 'cities', 'barangays', 'shops', 'shop_members', 'categories',
    'shop_categories', 'services', 'business_hours', 'closures', 'media',
    'slug_redirects', 'bookings', 'messages', 'reviews', 'reports',
    'notifications', 'push_subscriptions'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      table_name
    );
  END LOOP;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON public.booking_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_change();
--> statement-breakpoint
CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_change();
--> statement-breakpoint
-- Trigger functions must not be callable through the Supabase Data API.
REVOKE EXECUTE ON FUNCTION public.set_updated_at(), public.prevent_change() FROM PUBLIC;
