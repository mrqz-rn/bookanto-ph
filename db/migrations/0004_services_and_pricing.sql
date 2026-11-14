CREATE TABLE "service_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_centavos" integer DEFAULT 0 NOT NULL,
	"duration_min" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_addons_price_check" CHECK ("service_addons"."price_centavos" >= 0),
	CONSTRAINT "service_addons_duration_check" CHECK ("service_addons"."duration_min" >= 0),
	CONSTRAINT "service_addons_name_len_check" CHECK (char_length("service_addons"."name") between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "service_addons" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "service_addons" ADD CONSTRAINT "service_addons_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "service_addons_service_id_active_idx" ON "service_addons" USING btree ("service_id", "active");
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.service_addons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_centavos" integer NOT NULL,
	"original_price_centavos" integer,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packages_price_check" CHECK ("packages"."price_centavos" >= 0),
	CONSTRAINT "packages_name_len_check" CHECK (char_length("packages"."name") between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "packages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "packages_shop_id_active_idx" ON "packages" USING btree ("shop_id", "active");
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TABLE "package_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "package_items_quantity_check" CHECK ("package_items"."quantity" >= 1)
);
--> statement-breakpoint
ALTER TABLE "package_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "package_items_package_id_idx" ON "package_items" USING btree ("package_id");
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.package_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_centavos" integer NOT NULL,
	"cadence" text DEFAULT 'monthly' NOT NULL,
	"session_credits" integer,
	"validity_days" integer,
	"perks" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_price_check" CHECK ("memberships"."price_centavos" >= 0),
	CONSTRAINT "memberships_cadence_check" CHECK ("memberships"."cadence" in ('weekly', 'monthly', 'quarterly', 'yearly', 'sessions_pack')),
	CONSTRAINT "memberships_name_len_check" CHECK (char_length("memberships"."name") between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "memberships_shop_id_active_idx" ON "memberships" USING btree ("shop_id", "active");
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
