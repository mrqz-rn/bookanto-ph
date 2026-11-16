-- Booking module: booking types, queue numbers, late cancellations, reschedules,
-- deposits, booking rules, payments, and change_booking_status().
CREATE TABLE "booking_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"cancel_window_hours" integer DEFAULT 2 NOT NULL,
	"max_reschedules" integer DEFAULT 2 NOT NULL,
	"quote_valid_hours" integer DEFAULT 24 NOT NULL,
	"payment_mode" text DEFAULT 'none' NOT NULL,
	"deposit_type" text DEFAULT 'percent' NOT NULL,
	"deposit_value" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_policies_payment_mode_check" CHECK ("booking_policies"."payment_mode" in ('none', 'deposit', 'full')),
	CONSTRAINT "booking_policies_deposit_type_check" CHECK ("booking_policies"."deposit_type" in ('fixed', 'percent')),
	CONSTRAINT "booking_policies_ranges_check" CHECK ("booking_policies"."cancel_window_hours" between 0 and 168 and "booking_policies"."max_reschedules" between 0 and 10 and "booking_policies"."quote_valid_hours" between 1 and 168 and "booking_policies"."deposit_value" >= 0)
);
--> statement-breakpoint
ALTER TABLE "booking_policies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"amount_centavos" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider" text DEFAULT 'paymongo' NOT NULL,
	"provider_session_id" text NOT NULL,
	"provider_payment_id" text,
	"checkout_url" text,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_status_check" CHECK ("payments"."status" in ('pending', 'paid', 'expired', 'failed', 'refunded')),
	CONSTRAINT "payments_amount_check" CHECK ("payments"."amount_centavos" > 0)
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "booking_type" text DEFAULT 'slot' NOT NULL;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "queue_number" integer;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "late_cancel" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "reschedule_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "deposit_centavos" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "paid_centavos" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "booking_policies" ADD CONSTRAINT "booking_policies_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "booking_policies_shop_id_key" ON "booking_policies" USING btree ("shop_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_session_id_key" ON "payments" USING btree ("provider_session_id");
--> statement-breakpoint
CREATE INDEX "payments_booking_id_idx" ON "payments" USING btree ("booking_id");
--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_booking_type_check" CHECK ("bookings"."booking_type" in ('slot', 'home', 'quote', 'queue'));
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_payment_check" CHECK ("bookings"."deposit_centavos" >= 0 and "bookings"."paid_centavos" >= 0 and "bookings"."reschedule_count" >= 0);
--> statement-breakpoint
-- Existing bookings take their service's booking type.
UPDATE "bookings" SET "booking_type" = "services"."booking_type"
  FROM "services" WHERE "services"."id" = "bookings"."service_id";
--> statement-breakpoint
-- One number per shop per Manila day in the queue.
CREATE UNIQUE INDEX "bookings_queue_number_key" ON "bookings" ("shop_id", (("start_at" AT TIME ZONE 'Asia/Manila')::date), "queue_number") WHERE "queue_number" IS NOT NULL;
--> statement-breakpoint
-- The only way to change a booking's status. Checks the booking is still in
-- the expected status (BK001) and that the lifecycle allows the move (BK002),
-- then records it in booking_events. Keep the list in step with TRANSITIONS
-- in features/bookings/rules.ts (tests/unit/bookings-lifecycle.test.ts checks).
CREATE OR REPLACE FUNCTION public.change_booking_status(
  p_booking_id uuid, p_from text, p_to text, p_actor_id uuid, p_reason text
) RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_current text;
BEGIN
  SELECT status INTO v_current FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND OR v_current IS DISTINCT FROM p_from THEN
    RAISE EXCEPTION 'booking % is %, not %', p_booking_id, coalesce(v_current, 'missing'), p_from
      USING ERRCODE = 'BK001';
  END IF;
  IF (p_from, p_to) NOT IN (
    ('requested', 'confirmed'), ('requested', 'quoted'), ('requested', 'declined'),
    ('requested', 'expired'), ('requested', 'cancelled'),
    ('quoted', 'confirmed'), ('quoted', 'expired'), ('quoted', 'cancelled'),
    ('confirmed', 'cancelled'), ('confirmed', 'completed'), ('confirmed', 'no_show')
  ) THEN
    RAISE EXCEPTION 'a booking cannot move from % to %', p_from, p_to USING ERRCODE = 'BK002';
  END IF;

  PERFORM set_config('bookanto.status_change', p_booking_id::text, true);
  UPDATE public.bookings SET status = p_to WHERE id = p_booking_id;
  PERFORM set_config('bookanto.status_change', '', true);

  INSERT INTO public.booking_events (booking_id, from_status, to_status, actor_id, reason)
  VALUES (p_booking_id, p_from, p_to, p_actor_id, p_reason);
END;
$$;
--> statement-breakpoint
-- Rejects status changes made any other way.
CREATE OR REPLACE FUNCTION public.guard_booking_status() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND coalesce(current_setting('bookanto.status_change', true), '') <> NEW.id::text THEN
    RAISE EXCEPTION 'change a booking''s status with change_booking_status()';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER guard_status BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_status();
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.booking_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
-- Server code only; not for the Data API.
REVOKE EXECUTE ON FUNCTION public.change_booking_status(uuid, text, text, uuid, text), public.guard_booking_status() FROM PUBLIC;
--> statement-breakpoint
-- Declared on messages in the schema but missing from earlier migrations.
CREATE INDEX IF NOT EXISTS "messages_sender_id_created_at_idx" ON "messages" USING btree ("sender_id","created_at");
