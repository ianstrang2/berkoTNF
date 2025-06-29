-- /sql/2024-07-01-add-match-lifecycle.sql

BEGIN;

-- Create the ENUM type for match lifecycle states
CREATE TYPE "public"."match_state" AS ENUM ('Draft', 'PoolLocked', 'TeamsBalanced', 'Completed', 'Cancelled');

-- Add state management columns to the upcoming_matches table
ALTER TABLE "public"."upcoming_matches"
  ADD COLUMN "state" "public"."match_state" NOT NULL DEFAULT 'Draft',
  ADD COLUMN "state_version" INTEGER NOT NULL DEFAULT 0;

-- Add a column to link the historical matches table back to the planning table
ALTER TABLE "public"."matches"
  ADD COLUMN "upcoming_match_id" INTEGER;

-- Add a foreign key constraint to ensure data integrity
ALTER TABLE "public"."matches"
  ADD CONSTRAINT "fk_matches_upcoming_match_id"
  FOREIGN KEY ("upcoming_match_id")
  REFERENCES "public"."upcoming_matches"("upcoming_match_id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Add an index to the new foreign key column for faster lookups
CREATE INDEX "idx_matches_upcoming_match_id"
  ON "public"."matches"("upcoming_match_id");

-- Create a unique index on the foreign key to ensure a one-to-one relationship
-- An upcoming match can only be linked to one historical match
CREATE UNIQUE INDEX "idx_matches_unique_upcoming_match_id"
  ON "public"."matches"("upcoming_match_id")
  WHERE "upcoming_match_id" IS NOT NULL;

COMMIT; 