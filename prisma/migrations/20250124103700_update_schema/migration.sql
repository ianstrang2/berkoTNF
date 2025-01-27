-- Alter players table: Remove the "active" column (we're using "is_retired" now)
ALTER TABLE "players" DROP COLUMN "active";

-- Alter players table: Add the "is_retired" column instead of "active"
ALTER TABLE "players" ADD COLUMN "is_retired" BOOLEAN DEFAULT false;

-- Remove retirement_date column from players table as per previous changes
ALTER TABLE "players" DROP COLUMN "retirement_date";