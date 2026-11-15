CREATE TABLE "quick_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quick_replies_title_check" CHECK (char_length("quick_replies"."title") <= 100),
	CONSTRAINT "quick_replies_body_check" CHECK (char_length("quick_replies"."body") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "quick_replies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quick_replies_shop_id_idx" ON "quick_replies" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_sender_id_created_at_idx" ON "messages" USING btree ("sender_id", "created_at");--> statement-breakpoint
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.quick_replies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
