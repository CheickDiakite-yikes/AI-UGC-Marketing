DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credit_transactions') THEN
    CREATE TABLE "credit_transactions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "user_id" uuid,
      "amount" integer NOT NULL,
      "reason" text NOT NULL,
      "stripe_session_id" text,
      "stripe_event_id" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stripe_customer_id') THEN ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stripe_subscription_id') THEN ALTER TABLE "users" ADD COLUMN "stripe_subscription_id" text; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stripe_subscription_status') THEN ALTER TABLE "users" ADD COLUMN "stripe_subscription_status" text; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'stripe_price_id') THEN ALTER TABLE "users" ADD COLUMN "stripe_price_id" text; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_current_period_end') THEN ALTER TABLE "users" ADD COLUMN "subscription_current_period_end" timestamp; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'trial_ends_at') THEN ALTER TABLE "users" ADD COLUMN "trial_ends_at" timestamp; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'credit_balance') THEN ALTER TABLE "users" ADD COLUMN "credit_balance" integer DEFAULT 0 NOT NULL; END IF; END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'credit_transactions_user_id_users_id_fk') THEN ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "credit_transactions_stripe_session_id_idx" ON "credit_transactions" USING btree ("stripe_session_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "credit_transactions_stripe_event_id_idx" ON "credit_transactions" USING btree ("stripe_event_id");