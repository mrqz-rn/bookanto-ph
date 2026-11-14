CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"data" jsonb,
	"ip" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"actor_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_events_from_status_check" CHECK ("booking_events"."from_status" is null or "booking_events"."from_status" in ('requested', 'quoted', 'confirmed', 'declined', 'expired', 'cancelled', 'completed', 'no_show')),
	CONSTRAINT "booking_events_to_status_check" CHECK ("booking_events"."to_status" in ('requested', 'quoted', 'confirmed', 'declined', 'expired', 'cancelled', 'completed', 'no_show'))
);
--> statement-breakpoint
ALTER TABLE "booking_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref_code" text NOT NULL,
	"customer_id" uuid,
	"shop_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"staff_id" uuid,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"status" text DEFAULT 'requested' NOT NULL,
	"address" text,
	"location" geography(Point,4326),
	"notes" text,
	"quoted_price_centavos" integer,
	"total_centavos" integer,
	"expires_at" timestamp with time zone,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_status_check" CHECK ("bookings"."status" in ('requested', 'quoted', 'confirmed', 'declined', 'expired', 'cancelled', 'completed', 'no_show')),
	CONSTRAINT "bookings_range_check" CHECK ("bookings"."end_at" is null or "bookings"."end_at" > "bookings"."start_at"),
	CONSTRAINT "bookings_money_check" CHECK (coalesce("bookings"."quoted_price_centavos", 0) >= 0 and coalesce("bookings"."total_centavos", 0) >= 0)
);
--> statement-breakpoint
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"body" text,
	"image_path" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_content_check" CHECK ("messages"."body" is not null or "messages"."image_path" is not null),
	CONSTRAINT "messages_body_length_check" CHECK (char_length("messages"."body") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"review_id" uuid,
	"reporter_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_target_check" CHECK ("reports"."booking_id" is not null or "reports"."review_id" is not null),
	CONSTRAINT "reports_status_check" CHECK ("reports"."status" in ('open', 'resolved', 'dismissed'))
);
--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"shop_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text,
	"reply" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_check" CHECK ("reviews"."rating" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"template" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_channel_check" CHECK ("notifications"."channel" in ('sms', 'push', 'email')),
	CONSTRAINT "notifications_status_check" CHECK ("notifications"."status" in ('queued', 'sent', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "barangays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"center" geography(Point,4326),
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "barangays_slug_check" CHECK ("barangays"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "barangays" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"province" text NOT NULL,
	"center" geography(Point,4326),
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cities_slug_check" CHECK ("cities"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "cities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "business_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"opens" time NOT NULL,
	"closes" time NOT NULL,
	"break_start" time,
	"break_end" time,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_hours_weekday_check" CHECK ("business_hours"."weekday" between 0 and 6),
	CONSTRAINT "business_hours_break_check" CHECK (("business_hours"."break_start" is null) = ("business_hours"."break_end" is null))
);
--> statement-breakpoint
ALTER TABLE "business_hours" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"default_booking_type" text DEFAULT 'slot' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_check" CHECK ("categories"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "categories_default_booking_type_check" CHECK ("categories"."default_booking_type" in ('slot', 'home', 'quote', 'queue'))
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "closures_range_check" CHECK ("closures"."ends_at" > "closures"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "closures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"path" text NOT NULL,
	"kind" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_owner_type_check" CHECK ("media"."owner_type" in ('shop', 'service', 'review')),
	CONSTRAINT "media_kind_check" CHECK ("media"."kind" in ('photo', 'document'))
);
--> statement-breakpoint
ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"price_type" text DEFAULT 'fixed' NOT NULL,
	"price_centavos" integer,
	"duration_min" integer NOT NULL,
	"booking_type" text DEFAULT 'slot' NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"buffer_min" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_price_type_check" CHECK ("services"."price_type" in ('fixed', 'starts_at', 'quote')),
	CONSTRAINT "services_booking_type_check" CHECK ("services"."booking_type" in ('slot', 'home', 'quote', 'queue')),
	CONSTRAINT "services_price_check" CHECK (("services"."price_type" = 'quote' or "services"."price_centavos" is not null) and ("services"."price_centavos" is null or "services"."price_centavos" >= 0)),
	CONSTRAINT "services_duration_min_check" CHECK ("services"."duration_min" > 0),
	CONSTRAINT "services_capacity_check" CHECK ("services"."capacity" >= 1),
	CONSTRAINT "services_buffer_min_check" CHECK ("services"."buffer_min" >= 0)
);
--> statement-breakpoint
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "shop_categories" (
	"shop_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_categories_shop_id_category_id_pk" PRIMARY KEY("shop_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "shop_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "shop_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_members_role_check" CHECK ("shop_members"."role" in ('owner', 'manager', 'staff'))
);
--> statement-breakpoint
ALTER TABLE "shop_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "shops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"address" text,
	"barangay_id" uuid,
	"city_id" uuid,
	"location" geography(Point,4326),
	"phone" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"verified_at" timestamp with time zone,
	"rating_avg" numeric(3, 2) DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shops_slug_check" CHECK ("shops"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "shops_status_check" CHECK ("shops"."status" in ('draft', 'pending', 'active', 'suspended'))
);
--> statement-breakpoint
ALTER TABLE "shops" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "slug_redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_slug" text NOT NULL,
	"shop_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "slug_redirects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_id" text NOT NULL,
	"phone" text,
	"name" text,
	"email" text,
	"platform_role" text DEFAULT 'customer' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_platform_role_check" CHECK ("users"."platform_role" in ('customer', 'admin', 'super_admin')),
	CONSTRAINT "users_status_check" CHECK ("users"."status" in ('active', 'suspended')),
	CONSTRAINT "users_phone_e164_check" CHECK ("users"."phone" ~ '^\+[1-9][0-9]{7,14}$')
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barangays" ADD CONSTRAINT "barangays_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closures" ADD CONSTRAINT "closures_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_categories" ADD CONSTRAINT "shop_categories_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_categories" ADD CONSTRAINT "shop_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_members" ADD CONSTRAINT "shop_members_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_members" ADD CONSTRAINT "shop_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_barangay_id_barangays_id_fk" FOREIGN KEY ("barangay_id") REFERENCES "public"."barangays"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slug_redirects" ADD CONSTRAINT "slug_redirects_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_target_type_target_id_idx" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "booking_events_booking_id_created_at_idx" ON "booking_events" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_ref_code_key" ON "bookings" USING btree ("ref_code");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_customer_id_idempotency_key_key" ON "bookings" USING btree ("customer_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "bookings_shop_id_start_at_idx" ON "bookings" USING btree ("shop_id","start_at");--> statement-breakpoint
CREATE INDEX "bookings_customer_id_start_at_idx" ON "bookings" USING btree ("customer_id","start_at");--> statement-breakpoint
CREATE INDEX "bookings_status_expires_at_idx" ON "bookings" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "messages_booking_id_created_at_idx" ON "messages" USING btree ("booking_id","created_at");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "reviews_shop_id_created_at_idx" ON "reviews" USING btree ("shop_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE UNIQUE INDEX "barangays_city_id_slug_key" ON "barangays" USING btree ("city_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "cities_slug_key" ON "cities" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "business_hours_shop_id_weekday_key" ON "business_hours" USING btree ("shop_id","weekday");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_key" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "closures_shop_id_starts_at_idx" ON "closures" USING btree ("shop_id","starts_at");--> statement-breakpoint
CREATE INDEX "media_owner_type_owner_id_idx" ON "media" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "services_shop_id_active_idx" ON "services" USING btree ("shop_id","active");--> statement-breakpoint
CREATE INDEX "shop_categories_category_id_idx" ON "shop_categories" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shop_members_shop_id_user_id_key" ON "shop_members" USING btree ("shop_id","user_id");--> statement-breakpoint
CREATE INDEX "shop_members_user_id_idx" ON "shop_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "shops_slug_key" ON "shops" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "shops_city_id_status_idx" ON "shops" USING btree ("city_id","status");--> statement-breakpoint
CREATE INDEX "shops_location_idx" ON "shops" USING gist ("location");--> statement-breakpoint
CREATE UNIQUE INDEX "slug_redirects_from_slug_key" ON "slug_redirects" USING btree ("from_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "users_auth_id_key" ON "users" USING btree ("auth_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_key" ON "users" USING btree ("phone");