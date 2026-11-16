CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" text NOT NULL,
	"session_id" text NOT NULL,
	"user_id" uuid,
	"shop_id" uuid,
	"service_id" uuid,
	"booking_id" uuid,
	"step" text,
	"metadata" jsonb,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_events_name_check" CHECK ("analytics_events"."event_name" in ('shop_view', 'service_view', 'funnel_start', 'funnel_step', 'slot_selected', 'details_entered', 'booking_submitted', 'booking_confirmed', 'booking_completed', 'booking_cancelled', 'booking_no_show'))
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_event_name_created_at_idx" ON "analytics_events" USING btree ("event_name","created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_shop_id_created_at_idx" ON "analytics_events" USING btree ("shop_id","created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_session_id_idx" ON "analytics_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "analytics_events_user_id_created_at_idx" ON "analytics_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_booking_id_idx" ON "analytics_events" USING btree ("booking_id");--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.analytics_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
