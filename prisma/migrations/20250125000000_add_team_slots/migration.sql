-- CreateTable
CREATE TABLE "team_slots" (
    "id" SERIAL NOT NULL,
    "slot_number" INTEGER NOT NULL,
    "player_id" INTEGER,
    "role" VARCHAR(20) NOT NULL,
    
    CONSTRAINT "team_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_slots_slot_number_key" ON "team_slots"("slot_number");

-- AddForeignKey
ALTER TABLE "team_slots" ADD CONSTRAINT "team_slots_player_id_fkey" 
    FOREIGN KEY ("player_id") REFERENCES "players"("player_id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert initial slots
INSERT INTO "team_slots" (slot_number, role)
SELECT 
    n,
    CASE 
        WHEN n <= 6 THEN 'defender'
        WHEN n <= 12 THEN 'midfielder'
        ELSE 'attacker'
    END
FROM generate_series(1, 16) n; 