DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'plan_tier') THEN
    ALTER TABLE "users" ADD COLUMN "plan_tier" text DEFAULT 'free' NOT NULL;
  END IF;
END $$;