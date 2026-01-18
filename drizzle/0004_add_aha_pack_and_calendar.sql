ALTER TABLE "users" ADD COLUMN "aha_pack_used" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN "aha_pack_used_at" timestamp;

CREATE TABLE "calendar_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"board_id" uuid NOT NULL REFERENCES "boards"("id") ON DELETE CASCADE,
	"item_id" uuid NOT NULL REFERENCES "generated_items"("id") ON DELETE CASCADE,
	"scheduled_for" timestamp NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
