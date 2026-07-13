-- Adds the SUPER_ADMIN value to the UserRole enum.
DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
