ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_channel_check";
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_channel_check" CHECK ("notifications"."channel" in ('sms', 'push', 'email', 'whatsapp', 'viber'));
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"preferred_channel" text DEFAULT 'sms' NOT NULL,
	"sms_enabled" boolean DEFAULT true NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"whatsapp_enabled" boolean DEFAULT false NOT NULL,
	"viber_enabled" boolean DEFAULT false NOT NULL,
	"booking_confirmations" boolean DEFAULT true NOT NULL,
	"booking_reminders" boolean DEFAULT true NOT NULL,
	"booking_auto_expiry" boolean DEFAULT true NOT NULL,
	"marketing_promos" boolean DEFAULT false NOT NULL,
	"whatsapp_phone" text,
	"viber_phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_channel_check" CHECK ("notification_preferences"."preferred_channel" in ('sms', 'push', 'email', 'whatsapp', 'viber'))
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
