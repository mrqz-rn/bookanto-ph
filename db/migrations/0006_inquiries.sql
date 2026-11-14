CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"business_name" text,
	"city" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"ip" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inquiries_kind_check" CHECK ("inquiries"."kind" in ('shop', 'business', 'investor', 'other')),
	CONSTRAINT "inquiries_status_check" CHECK ("inquiries"."status" in ('new', 'contacted', 'closed')),
	CONSTRAINT "inquiries_contact_check" CHECK ("inquiries"."email" is not null or "inquiries"."phone" is not null),
	CONSTRAINT "inquiries_length_check" CHECK (char_length("inquiries"."name") <= 100 and char_length("inquiries"."message") <= 2000
        and coalesce(char_length("inquiries"."email"), 0) <= 200
        and coalesce(char_length("inquiries"."business_name"), 0) <= 150
        and coalesce(char_length("inquiries"."city"), 0) <= 100)
);
--> statement-breakpoint
ALTER TABLE "inquiries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "inquiries_status_created_at_idx" ON "inquiries" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "inquiries_ip_created_at_idx" ON "inquiries" USING btree ("ip","created_at");--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
