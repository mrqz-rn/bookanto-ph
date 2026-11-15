CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"kind" text DEFAULT 'info' NOT NULL,
	"target_audience" text DEFAULT 'all' NOT NULL,
	"action_url" text,
	"action_label" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcements_kind_check" CHECK ("announcements"."kind" in ('info', 'warning', 'critical', 'maintenance')),
	CONSTRAINT "announcements_audience_check" CHECK ("announcements"."target_audience" in ('all', 'customers', 'shops'))
);
--> statement-breakpoint
ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcements_active_dates_idx" ON "announcements" USING btree ("is_active","starts_at","ends_at");--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();--> statement-breakpoint
CREATE TABLE "fraud_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"signal_type" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"score" integer DEFAULT 50 NOT NULL,
	"details" jsonb,
	"resolved_at" timestamp with time zone,
	"resolved_by_id" uuid,
	"resolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fraud_signals_target_type_check" CHECK ("fraud_signals"."target_type" in ('user', 'shop', 'booking')),
	CONSTRAINT "fraud_signals_signal_type_check" CHECK ("fraud_signals"."signal_type" in ('excessive_cancellations', 'excessive_no_shows', 'burst_bookings', 'dispute_rate_high', 'review_abuse', 'suspicious_velocity', 'custom')),
	CONSTRAINT "fraud_signals_severity_check" CHECK ("fraud_signals"."severity" in ('low', 'medium', 'high', 'critical')),
	CONSTRAINT "fraud_signals_status_check" CHECK ("fraud_signals"."status" in ('active', 'investigating', 'resolved', 'dismissed')),
	CONSTRAINT "fraud_signals_score_check" CHECK ("fraud_signals"."score" >= 0 and "fraud_signals"."score" <= 100)
);
--> statement-breakpoint
ALTER TABLE "fraud_signals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fraud_signals_target_idx" ON "fraud_signals" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "fraud_signals_status_severity_idx" ON "fraud_signals" USING btree ("status","severity");--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.fraud_signals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
