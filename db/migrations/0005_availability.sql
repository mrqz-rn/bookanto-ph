-- Per-staff schedules, staff time off and holiday rules.
-- Indexes come before foreign keys: staff_hours references
-- staff_schedules(shop_id, user_id), which needs its unique index first.
CREATE TABLE "shop_holiday_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"holiday_key" text NOT NULL,
	"opens" time,
	"closes" time,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shop_holiday_rules_holiday_key_check" CHECK ("shop_holiday_rules"."holiday_key" ~ '^[a-z0-9_]{1,50}$'),
	CONSTRAINT "shop_holiday_rules_hours_check" CHECK (("shop_holiday_rules"."opens" is null and "shop_holiday_rules"."closes" is null) or ("shop_holiday_rules"."opens" is not null and "shop_holiday_rules"."closes" is not null and "shop_holiday_rules"."closes" > "shop_holiday_rules"."opens"))
);
--> statement-breakpoint
ALTER TABLE "shop_holiday_rules" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "staff_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"opens" time NOT NULL,
	"closes" time NOT NULL,
	"break_start" time,
	"break_end" time,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_hours_weekday_check" CHECK ("staff_hours"."weekday" between 0 and 6),
	CONSTRAINT "staff_hours_range_check" CHECK ("staff_hours"."closes" > "staff_hours"."opens"),
	CONSTRAINT "staff_hours_break_check" CHECK (("staff_hours"."break_start" is null and "staff_hours"."break_end" is null) or ("staff_hours"."break_start" is not null and "staff_hours"."break_end" is not null and "staff_hours"."break_start" > "staff_hours"."opens" and "staff_hours"."break_end" > "staff_hours"."break_start" and "staff_hours"."break_end" < "staff_hours"."closes"))
);
--> statement-breakpoint
ALTER TABLE "staff_hours" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "staff_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"uses_shop_hours" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_schedules" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE TABLE "staff_time_off" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_time_off_range_check" CHECK ("staff_time_off"."ends_at" > "staff_time_off"."starts_at"),
	CONSTRAINT "staff_time_off_reason_length_check" CHECK (char_length("staff_time_off"."reason") <= 200)
);
--> statement-breakpoint
ALTER TABLE "staff_time_off" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "shop_holiday_rules_shop_id_holiday_key_key" ON "shop_holiday_rules" USING btree ("shop_id","holiday_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "staff_hours_shop_id_user_id_weekday_key" ON "staff_hours" USING btree ("shop_id","user_id","weekday");
--> statement-breakpoint
CREATE UNIQUE INDEX "staff_schedules_shop_id_user_id_key" ON "staff_schedules" USING btree ("shop_id","user_id");
--> statement-breakpoint
CREATE INDEX "staff_time_off_shop_id_starts_at_idx" ON "staff_time_off" USING btree ("shop_id","starts_at");
--> statement-breakpoint
ALTER TABLE "shop_holiday_rules" ADD CONSTRAINT "shop_holiday_rules_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_hours" ADD CONSTRAINT "staff_hours_schedule_fk" FOREIGN KEY ("shop_id","user_id") REFERENCES "public"."staff_schedules"("shop_id","user_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_member_fk" FOREIGN KEY ("shop_id","user_id") REFERENCES "public"."shop_members"("shop_id","user_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_time_off" ADD CONSTRAINT "staff_time_off_member_fk" FOREIGN KEY ("shop_id","user_id") REFERENCES "public"."shop_members"("shop_id","user_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.staff_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.staff_hours
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.staff_time_off
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.shop_holiday_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
