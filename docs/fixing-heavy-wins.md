# Adding Configurable Heavy Win Threshold & Goals Scored Points

## Quick Start (TL;DR)

**What we're doing:** Making the "heavy win" goal difference threshold configurable (instead of hardcoded) and adding optional points per goal scored.

**Why:** Currently, heavy_win/heavy_loss are stored as booleans calculated at match creation with a hardcoded threshold. If you later change what "heavy" means, historical data stays wrong. This fixes that by calculating on-the-fly.

**Time needed:** ~2 hours including testing

**Risk level:** Medium (changes core fantasy points logic, but fully reversible)

---

## The Problem We're Fixing

### Current (Broken) Architecture
```
Match created with 3-goal difference
    ↓
Code checks: is 3 >= 4? No → Store heavy_win = false
    ↓
Later: You decide 3 goals should count as heavy win
    ↓
Change config to threshold = 3
    ↓
Problem: Old match still has heavy_win = false (wrong!)
         New matches have heavy_win = true (correct!)
         → Inconsistent data
```

### What We're Changing To
```
Match created with 3-goal difference
    ↓
Store: goal_difference = 3 (just the raw data)
    ↓
Fantasy points calculated
    ↓
Check: is 3 >= current_config_threshold?
    ↓
Result: Automatically correct for ALL matches when config changes
```

**Key insight:** Store the data, not the decision. Calculate the decision when needed.

---

## What's Being Added

1. **`fantasy_heavy_win_threshold`** (default: 4)
   - Configurable goal difference for heavy win/loss bonus
   - Currently hardcoded as 4 in some places, 3 in others (inconsistent!)
   
2. **`fantasy_goals_scored_points`** (default: 0)
   - Award X points per goal scored
   - Default 0 = no change from current behavior

---

## Before You Start

### ✅ Pre-Flight Checklist

- [ ] **Backup your database** (Settings → Database → Backup in Supabase)
- [ ] Pull latest code: `git pull origin main`
- [ ] Check current state works: Create a test match, verify stats calculate
- [ ] Note current heavy win threshold behavior for comparison

### 🔍 Step 0: Check if View Exists

**First, search your /sql folder for match_player_stats:**

```bash
# In your terminal
cd /sql
grep -r "match_player_stats" .
```

**If you find a view definition:**
- Check if it has a `goal_difference` field
- If yes, you're good to proceed
- If no, you need to add it (see Phase 1 below)

**If you don't find anything:**
- The view doesn't exist yet (this is what I suspect based on our earlier check)
- You'll need to create it as part of this implementation

---

## Implementation Steps

### Phase 1: Create the View (If Needed)

The trigger function references `match_player_stats` view, but it doesn't exist yet. Let's create it in your repo.

**Create file:** `/sql/views/match_player_stats.sql`

```sql
-- match_player_stats.sql
-- Provides a denormalized view of player match data with calculated fields
-- Used by trigger functions and stats calculations

CREATE OR REPLACE VIEW match_player_stats AS
SELECT 
    pm.player_match_id,
    pm.player_id,
    pm.match_id,
    pm.team,
    pm.goals,
    pm.clean_sheet,
    pm.result,
    pm.tenant_id,
    m.match_date,
    m.team_a_score,
    m.team_b_score,
    -- Calculate goal_difference from team perspective
    CASE 
        WHEN pm.team = 'A' THEN m.team_a_score - m.team_b_score
        WHEN pm.team = 'B' THEN m.team_b_score - m.team_a_score
        ELSE 0
    END AS goal_difference,
    -- Result code for compatibility with existing queries
    CASE 
        WHEN pm.result = 'win' THEN 'W'
        WHEN pm.result = 'loss' THEN 'L'
        WHEN pm.result = 'draw' THEN 'D'
        ELSE NULL
    END AS result_code
FROM player_matches pm
JOIN matches m ON pm.match_id = m.match_id;

-- Grant permissions
GRANT SELECT ON match_player_stats TO authenticated;
GRANT SELECT ON match_player_stats TO service_role;
```

**Why this view matters:**
- Calculates `goal_difference` from team perspective (positive = won, negative = lost)
- Used by trigger to aggregate stats efficiently
- Single place for this calculation logic

**Important: Update your deployment script**

After creating this file, make sure it gets deployed:

- **If your `deploy_all.ps1` script only deploys `/sql/*.sql`:** Update it to also deploy `/sql/views/*.sql`
- **OR manually run it once:** Copy/paste the SQL into Supabase SQL Editor (it's idempotent, safe to re-run)

Example script update:
```powershell
# Add to your deploy_all.ps1
Get-ChildItem -Path ".\views" -Filter "*.sql" | ForEach-Object {
    Write-Host "Deploying view: $($_.Name)"
    # Your deployment command here
}
```

---

### Phase 2: Add Config Entries

**Create file:** `/sql/migrations/add_fantasy_config.sql`

```sql
-- Add new fantasy points configuration options
-- Run this in Supabase SQL Editor or via your deployment script

-- Add to global defaults
INSERT INTO app_config_defaults (config_key, config_value, config_description, config_group) VALUES
('fantasy_goals_scored_points', '0', 'Points awarded per goal scored by a player', 'fantasy_points'),
('fantasy_heavy_win_threshold', '4', 'Goal difference threshold for heavy win/loss bonus (e.g., 4 means 4+ goal difference)', 'fantasy_points')
ON CONFLICT (config_key) DO NOTHING;

-- Add to your tenant config
-- Note: This will add for ALL tenants, but since you're solo, that's just you
INSERT INTO app_config (
  config_key, 
  config_value, 
  config_description, 
  config_group,
  display_name,
  display_group,
  sort_order,
  tenant_id
)
SELECT 
  'fantasy_goals_scored_points', 
  '0', 
  'Points awarded per goal scored by a player', 
  'fantasy_points',
  'Goals Scored Points',
  'Fantasy Points',
  90,
  tenant_id
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM app_config 
  WHERE config_key = 'fantasy_goals_scored_points' 
  AND app_config.tenant_id = tenants.tenant_id
);

INSERT INTO app_config (
  config_key, 
  config_value, 
  config_description, 
  config_group,
  display_name,
  display_group,
  sort_order,
  tenant_id
)
SELECT 
  'fantasy_heavy_win_threshold', 
  '4', 
  'Goal difference threshold for heavy win/loss bonus (e.g., 4 means 4+ goal difference)', 
  'fantasy_points',
  'Heavy Win Threshold',
  'Fantasy Points',
  91,
  tenant_id
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM app_config 
  WHERE config_key = 'fantasy_heavy_win_threshold' 
  AND app_config.tenant_id = tenants.tenant_id
);

-- Verify it worked
SELECT config_key, config_value, display_name 
FROM app_config 
WHERE config_key IN ('fantasy_goals_scored_points', 'fantasy_heavy_win_threshold');
```

---

### Phase 3: Update SQL Functions

#### 3.1 Update `sql/helpers.sql`

**FIND these lines (around line 6-43):**

```sql
CREATE OR REPLACE FUNCTION calculate_match_fantasy_points(
    result TEXT,
    heavy_win BOOLEAN,
    heavy_loss BOOLEAN,
    clean_sheet BOOLEAN,
    target_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID
)
```

**REPLACE with:**

```sql
CREATE OR REPLACE FUNCTION calculate_match_fantasy_points(
    result TEXT,
    goal_difference INT,           -- CHANGED: from heavy_win/heavy_loss booleans
    clean_sheet BOOLEAN,
    goals_scored INT DEFAULT 0,    -- NEW: goals scored by player
    target_tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID
)
RETURNS INT LANGUAGE plpgsql STABLE AS $$
DECLARE
    -- Existing config fetches
    v_win_points INT               := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_win_points' AND tenant_id = target_tenant_id LIMIT 1), 20);
    v_draw_points INT              := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_draw_points' AND tenant_id = target_tenant_id LIMIT 1), 10);
    v_loss_points INT              := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_loss_points' AND tenant_id = target_tenant_id LIMIT 1), -10);
    v_heavy_win_bonus INT          := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_heavy_win_points' AND tenant_id = target_tenant_id LIMIT 1), v_win_points + 10) - v_win_points;
    v_heavy_loss_penalty INT       := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_heavy_loss_points' AND tenant_id = target_tenant_id LIMIT 1), v_loss_points - 10) - v_loss_points;
    v_cs_win_bonus INT             := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_clean_sheet_win_points' AND tenant_id = target_tenant_id LIMIT 1), v_win_points + 10) - v_win_points;
    v_cs_draw_bonus INT            := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_clean_sheet_draw_points' AND tenant_id = target_tenant_id LIMIT 1), v_draw_points + 10) - v_draw_points;
    v_heavy_cs_win_bonus INT       := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_heavy_clean_sheet_win_points' AND tenant_id = target_tenant_id LIMIT 1), v_win_points + 20) - v_win_points - v_heavy_win_bonus - v_cs_win_bonus;
    
    -- NEW: Fetch new config values
    v_goals_scored_points INT      := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_goals_scored_points' AND tenant_id = target_tenant_id LIMIT 1), 0);
    v_heavy_win_threshold INT      := COALESCE((SELECT config_value::int FROM app_config WHERE config_key = 'fantasy_heavy_win_threshold' AND tenant_id = target_tenant_id LIMIT 1), 4);
    
    -- CHANGED: Calculate heavy_win/heavy_loss from goal_difference and threshold
    heavy_win BOOLEAN := (result = 'win' AND ABS(goal_difference) >= v_heavy_win_threshold);
    heavy_loss BOOLEAN := (result = 'loss' AND ABS(goal_difference) >= v_heavy_win_threshold);
    
    points INT := 0;
BEGIN
    -- Calculation logic (same as before)
    IF result = 'win' THEN
        points := v_win_points;
        IF heavy_win THEN points := points + v_heavy_win_bonus; END IF;
        IF clean_sheet THEN points := points + v_cs_win_bonus; END IF;
        IF heavy_win AND clean_sheet THEN points := points + v_heavy_cs_win_bonus; END IF;
    ELSIF result = 'draw' THEN
        points := v_draw_points;
        IF clean_sheet THEN points := points + v_cs_draw_bonus; END IF;
    ELSIF result = 'loss' THEN
        points := v_loss_points;
        IF heavy_loss THEN points := points + v_heavy_loss_penalty; END IF;
    END IF;

    -- NEW: Add points for goals scored
    points := points + (goals_scored * v_goals_scored_points);

    RETURN points;
END;
$$;
```

**Key changes:**
- Removed `heavy_win` and `heavy_loss` boolean parameters
- Added `goal_difference` and `goals_scored` parameters
- Fetch new config values
- Calculate heavy win/loss on-the-fly using threshold
- Add goals scored points to total

---

#### 3.2 Update `update_trigger.sql`

**FIND the function declaration (around lines 1-22):**

```sql
CREATE OR REPLACE FUNCTION handle_match_update()
RETURNS TRIGGER AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    half_season_start DATE;
    half_season_end DATE;
    -- Config values
    win_points INTEGER;
    draw_points INTEGER;
    loss_points INTEGER;
    -- ... other variables
BEGIN
    -- Get fantasy point values from app_config
```

**ADD the threshold variable to the DECLARE section (before BEGIN):**

```sql
CREATE OR REPLACE FUNCTION handle_match_update()
RETURNS TRIGGER AS $$
DECLARE
    current_year INTEGER;
    current_month INTEGER;
    half_season_start DATE;
    half_season_end DATE;
    -- Config values
    win_points INTEGER;
    draw_points INTEGER;
    loss_points INTEGER;
    heavy_win_points INTEGER;
    clean_sheet_win_points INTEGER;
    heavy_clean_sheet_win_points INTEGER;
    clean_sheet_draw_points INTEGER;
    heavy_loss_points INTEGER;
    v_heavy_win_threshold INTEGER;  -- ADD THIS LINE
    -- Season tracking
    start_year INTEGER;
    end_year INTEGER;
    season_start DATE;
    season_end DATE;
BEGIN
    -- Get fantasy point values from app_config
    SELECT CAST(config_value AS INTEGER) INTO win_points 
    FROM app_config WHERE config_key = 'fantasy_win_points';
    
    -- ... existing config fetches ...
    
    -- ADD: Fetch heavy win threshold
    SELECT CAST(config_value AS INTEGER) INTO v_heavy_win_threshold 
    FROM app_config WHERE config_key = 'fantasy_heavy_win_threshold' LIMIT 1;
    v_heavy_win_threshold := COALESCE(v_heavy_win_threshold, 4);
```

**Note:** In PostgreSQL functions, `DECLARE` comes before `BEGIN`, not after.

**FIND line 82 (first half-season aggregation):**

```sql
COUNT(*) FILTER (WHERE mps.goal_difference >= 3 AND mps.result = 'W') as heavy_wins,
COUNT(*) FILTER (WHERE mps.goal_difference <= -3 AND mps.result = 'L') as heavy_losses,
```

**REPLACE with:**

```sql
COUNT(*) FILTER (WHERE ABS(mps.goal_difference) >= v_heavy_win_threshold AND mps.result = 'W') as heavy_wins,
COUNT(*) FILTER (WHERE ABS(mps.goal_difference) >= v_heavy_win_threshold AND mps.result = 'L') as heavy_losses,
```

**FIND line 86:**

```sql
COUNT(*) FILTER (WHERE mps.clean_sheet = true AND mps.result = 'W' AND mps.goal_difference >= 3) as heavy_clean_sheet_wins,
```

**REPLACE with:**

```sql
COUNT(*) FILTER (WHERE mps.clean_sheet = true AND mps.result = 'W' AND ABS(mps.goal_difference) >= v_heavy_win_threshold) as heavy_clean_sheet_wins,
```

**REPEAT the same changes around line 177-181 (season aggregation section):**

Same pattern - replace hardcoded `>= 3` and `<= -3` with `ABS(mps.goal_difference) >= v_heavy_win_threshold`

---

#### 3.3 Update `sql/update_aggregated_all_time_stats.sql`

**FIND lines 38-44 (the function call in player_base_stats CTE):**

```sql
SUM(calculate_match_fantasy_points(
    pm.result, 
    COALESCE(pm.heavy_win, false), 
    COALESCE(pm.heavy_loss, false), 
    COALESCE(pm.clean_sheet, false)
)) as fantasy_points
```

**REPLACE with:**

```sql
SUM(calculate_match_fantasy_points(
    pm.result, 
    COALESCE((
        SELECT CASE 
            WHEN pm.team = 'A' THEN m.team_a_score - m.team_b_score
            WHEN pm.team = 'B' THEN m.team_b_score - m.team_a_score
            ELSE 0
        END
        FROM matches m WHERE m.match_id = pm.match_id
    ), 0),  -- goal_difference
    COALESCE(pm.clean_sheet, false),
    COALESCE(pm.goals, 0),  -- goals_scored
    target_tenant_id
)) as fantasy_points
```

**FIND line 49 (HAVING clause):**

```sql
HAVING SUM(calculate_match_fantasy_points(pm.result, COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false))) IS NOT NULL
```

**REPLACE with:**

```sql
HAVING SUM(calculate_match_fantasy_points(pm.result, COALESCE((SELECT CASE WHEN pm.team = 'A' THEN m.team_a_score - m.team_b_score WHEN pm.team = 'B' THEN m.team_b_score - m.team_a_score ELSE 0 END FROM matches m WHERE m.match_id = pm.match_id), 0), COALESCE(pm.clean_sheet, false), COALESCE(pm.goals, 0), target_tenant_id)) IS NOT NULL
```

---

#### 3.4 Update `sql/update_aggregated_season_honours_and_records.sql`

**FIND lines 78-79:**

```sql
SELECT p.name, s.id as season_id, get_season_display_name(s.start_date, s.end_date) as season_name,
       SUM(calculate_match_fantasy_points(COALESCE(pm.result, 'loss'), COALESCE(pm.heavy_win, false), COALESCE(pm.heavy_loss, false), COALESCE(pm.clean_sheet, false))) as points,
```

**REPLACE with:**

```sql
SELECT p.name, s.id as season_id, get_season_display_name(s.start_date, s.end_date) as season_name,
       SUM(calculate_match_fantasy_points(
           COALESCE(pm.result, 'loss'), 
           COALESCE((
               CASE 
                   WHEN pm.team = 'A' THEN m.team_a_score - m.team_b_score
                   WHEN pm.team = 'B' THEN m.team_b_score - m.team_a_score
                   ELSE 0
               END
           ), 0),  -- goal_difference
           COALESCE(pm.clean_sheet, false),
           COALESCE(pm.goals, 0),  -- goals_scored
           target_tenant_id
       )) as points,
```

---

### Phase 4: Update API Routes

#### 4.1 Update `src/app/api/matches/history/route.ts`

**FIND lines 105-139 (POST handler, processedPlayers mapping):**

Look for this block:
```typescript
const scoreDiff = Math.abs(team_a_score - team_b_score);

// Skip retired players
if (player.is_retired) {
  return null;
}

// Calculate result-related data
const result = teamScore > opposingScore ? 'win' : (teamScore < opposingScore ? 'loss' : 'draw');

return {
  player_id: parseInt(player.player_id),
  team: player.team,
  goals: player.goals,
  clean_sheet: opposingScore === 0,
  heavy_win: teamScore > opposingScore && scoreDiff >= 4,
  heavy_loss: teamScore < opposingScore && scoreDiff >= 4,
  result,
};
```

**REPLACE with:**

```typescript
// Skip retired players
if (player.is_retired) {
  return null;
}

// Calculate result-related data
// Note: heavy_win/heavy_loss NO LONGER stored - calculated from goal_difference in SQL
const result = teamScore > opposingScore ? 'win' : (teamScore < opposingScore ? 'loss' : 'draw');

return {
  player_id: parseInt(player.player_id),
  team: player.team,
  goals: player.goals,
  clean_sheet: opposingScore === 0,
  // REMOVED: heavy_win and heavy_loss - calculated on-the-fly in SQL
  result,
};
```

**Do the same for the PUT handler (around lines 220-254)** - remove `scoreDiff`, `heavy_win`, and `heavy_loss` calculations.

---

#### 4.2 Update `src/app/api/admin/upcoming-matches/[id]/complete/route.ts`

**FIND lines 114-154:**

Look for:
```typescript
const scoreDiff = Math.abs(score.team_a - score.team_b);
const isHeavyWin = scoreDiff >= 4;

console.log(`MATCH COMPLETION DEBUG: Match ${matchId}, Score: ${score.team_a}-${score.team_b}, Own Goals: ${own_goals.team_a}-${own_goals.team_b}, ScoreDiff: ${scoreDiff}, IsHeavyWin: ${isHeavyWin}`);
```

**REPLACE with:**

```typescript
// Note: heavy_win/heavy_loss NO LONGER stored - calculated from goal_difference in SQL
console.log(`MATCH COMPLETION DEBUG: Match ${matchId}, Score: ${score.team_a}-${score.team_b}, Own Goals: ${own_goals.team_a}-${own_goals.team_b}`);
```

**Then find in the playerMatchesData mapping:**

```typescript
const heavy_win = result === 'win' && isHeavyWin;
const heavy_loss = result === 'loss' && isHeavyWin;
const clean_sheet = opposingScore === 0;

const playerData = {
  match_id: newMatch.match_id,
  player_id: p.player_id,
  team: p.team,
  goals: goalsMap.get(p.player_id) || 0,
  result,
  heavy_win,
  heavy_loss,
  clean_sheet,
  tenant_id: tenantId
};

console.log(`PLAYER ${p.player_id} (Team ${p.team}): result=${result}, heavy_win=${heavy_win}, heavy_loss=${heavy_loss}, clean_sheet=${clean_sheet}`);
```

**REPLACE with:**

```typescript
const clean_sheet = opposingScore === 0;

const playerData = {
  match_id: newMatch.match_id,
  player_id: p.player_id,
  team: p.team,
  goals: goalsMap.get(p.player_id) || 0,
  result,
  // REMOVED: heavy_win and heavy_loss
  clean_sheet,
  tenant_id: tenantId
};

console.log(`PLAYER ${p.player_id} (Team ${p.team}): result=${result}, clean_sheet=${clean_sheet}`);
```

**And update the validation:**

```typescript
const invalidRecords = playerMatchesData.filter(p => 
  !p.result || typeof p.heavy_win !== 'boolean' || typeof p.heavy_loss !== 'boolean' || typeof p.clean_sheet !== 'boolean'
);
```

**REPLACE with:**

```typescript
const invalidRecords = playerMatchesData.filter(p => 
  !p.result || typeof p.clean_sheet !== 'boolean'
);
```

---

### Phase 5: Update Frontend Config

**File:** `src/lib/config.ts`

**FIND the defaultConfig object (around line 9):**

```typescript
const defaultConfig: AppConfig = {
  fantasy_win_points: 20,
  fantasy_draw_points: 10,
  fantasy_loss_points: -10,
  fantasy_heavy_win_points: 30,
  fantasy_clean_sheet_win_points: 30,
  fantasy_heavy_clean_sheet_win_points: 40,
  fantasy_clean_sheet_draw_points: 20,
  fantasy_heavy_loss_points: -20,
  win_streak_threshold: 4,
  // ... rest
};
```

**ADD these two lines after `fantasy_heavy_loss_points`:**

```typescript
fantasy_goals_scored_points: 0,        // NEW: Points per goal scored
fantasy_heavy_win_threshold: 4,        // NEW: Goal difference threshold
```

---

### Phase 6: Update Prisma Schema (Documentation Only)

**File:** `prisma/schema.prisma`

**FIND the player_matches model (around line 451):**

```prisma
model player_matches {
  player_match_id Int       @id @default(autoincrement())
  player_id       Int?
  match_id        Int?
  team            String?   @db.VarChar(20)
  goals           Int?      @default(0)
  clean_sheet     Boolean?  @default(false)
  heavy_win       Boolean?  @default(false)
  heavy_loss      Boolean?  @default(false)
  result          String?   @db.VarChar
  fantasy_points  Int?
  updated_at      DateTime? @default(now()) @db.Timestamptz(6)
  tenant_id       String    @db.Uuid
  // ... relations
}
```

**ADD comments to document deprecation:**

```prisma
heavy_win       Boolean?  @default(false)  // DEPRECATED: Calculated on-the-fly from goal_difference
heavy_loss      Boolean?  @default(false)  // DEPRECATED: Calculated on-the-fly from goal_difference
```

**Then run:**

```bash
npx prisma generate
```

**Note:** We're NOT dropping these columns yet. They'll just stop being populated. You can drop them later once you're confident everything works.

---

## Deployment

### Step-by-Step Deployment Order

**1. Create the view (if it doesn't exist)**

Run this in Supabase SQL Editor:

```sql
-- From /sql/views/match_player_stats.sql
CREATE OR REPLACE VIEW match_player_stats AS
SELECT 
    pm.player_match_id, pm.player_id, pm.match_id, pm.team, pm.goals,
    pm.clean_sheet, pm.result, pm.tenant_id, m.match_date,
    m.team_a_score, m.team_b_score,
    CASE 
        WHEN pm.team = 'A' THEN m.team_a_score - m.team_b_score
        WHEN pm.team = 'B' THEN m.team_b_score - m.team_a_score
        ELSE 0
    END AS goal_difference,
    CASE 
        WHEN pm.result = 'win' THEN 'W'
        WHEN pm.result = 'loss' THEN 'L'
        WHEN pm.result = 'draw' THEN 'D'
        ELSE NULL
    END AS result_code
FROM player_matches pm
JOIN matches m ON pm.match_id = m.match_id;

GRANT SELECT ON match_player_stats TO authenticated;
GRANT SELECT ON match_player_stats TO service_role;
```

**2. Add config entries**

Run the migration script from Phase 2 in Supabase SQL Editor.

**3. Deploy SQL functions**

```bash
cd sql/
./deploy_all.ps1  # Or however you deploy SQL functions
```

**4. Deploy Next.js app**

```bash
git add .
git commit -m "Add configurable heavy win threshold and goals scored points"
git push origin main
```

**5. Regenerate Prisma client**

```bash
npx prisma generate
```

---

## Testing

### Basic Verification Tests

**1. Config UI appears**
- Go to `/admin/setup?section=stats`
- Verify you see "Goals Scored Points" and "Heavy Win Threshold" fields
- Both should show default values (0 and 4)

**2. Can edit and save config**
- Change "Heavy Win Threshold" from 4 to 3
- Click Save
- Refresh page - should still show 3
- Change back to 4

**3. Create test match**
- Create a match with 3-goal difference (e.g., 5-2)
- With threshold=4: Should NOT count as heavy win
- Change threshold to 3
- Check stats page - same match should NOW count as heavy win
- Change threshold back to 4 - should revert

**4. Goals scored points**
- Set "Goals Scored Points" to 1
- Create match where player scores 2 goals
- Verify they get +2 fantasy points beyond normal win/draw/loss points
- Set back to 0 - points should update

**5. Historical data**
- All existing matches should calculate correctly with new threshold
- Stats pages should load without errors
- Match reports should show correct fantasy points

**What "working" looks like:**
- Config changes → Stats automatically update
- No errors in browser console
- No errors in Supabase logs
- Fantasy points make sense

---

## If Something Breaks (Rollback)

### Quick Rollback Steps

**1. Revert application code**

```bash
git log  # Find commit hash before your changes
git revert HEAD  # Or git revert <commit-hash>
git push origin main
```

**2. Remove config entries (optional)**

```sql
-- Only if you want to completely remove the feature
DELETE FROM app_config 
WHERE config_key IN ('fantasy_goals_scored_points', 'fantasy_heavy_win_threshold');

DELETE FROM app_config_defaults 
WHERE config_key IN ('fantasy_goals_scored_points', 'fantasy_heavy_win_threshold');
```

**3. Verify rollback worked**

- Can still create matches
- Stats still calculate
- No errors in logs
- Config UI doesn't show new fields

**Note:** Because we calculate on-the-fly, you don't need to recalculate any historical data. Just reverting the code is enough.

---

## What Could Break

### Likely Issues and Fixes

**Issue: "View match_player_stats does not exist"**
- **Cause:** View wasn't created before deploying functions
- **Fix:** Create the view (see Phase 1), then redeploy functions

**Issue: "Function calculate_match_fantasy_points wrong signature"**
- **Cause:** Old code calling function with old parameters
- **Fix:** Make sure ALL files are updated (check Phase 3 carefully)

**Issue: "Column heavy_win does not exist" in API routes**
- **Cause:** API route still trying to store heavy_win/heavy_loss
- **Fix:** Check Phase 4 changes are applied correctly

**Issue: Stats showing wrong fantasy points**
- **Cause:** Config might not be fetching correctly
- **Fix:** Check config table has entries (run SELECT query from Phase 2)

**Issue: Can't see new config fields in admin UI**
- **Cause:** Config entries missing `display_name` or `display_group`
- **Fix:** Check Phase 2 INSERT statements ran correctly

---

## After It Works

### Optional Cleanup (Wait a Few Days)

Once you're confident everything works:

**1. Drop deprecated columns**

```sql
-- Remove heavy_win and heavy_loss columns
ALTER TABLE player_matches DROP COLUMN IF EXISTS heavy_win;
ALTER TABLE player_matches DROP COLUMN IF EXISTS heavy_loss;
```

**2. Update Prisma schema**

```bash
npx prisma db pull  # Sync schema from database
npx prisma generate # Regenerate client
```

**But honestly?** You can just leave them. They're not hurting anything, and having them makes rollback easier.

---

## Files You're Changing

### SQL Files (in /sql/):
1. `views/match_player_stats.sql` - NEW (create this)
2. `migrations/add_fantasy_config.sql` - NEW (create this)
3. `helpers.sql` - MODIFIED (change function signature)
4. `update_aggregated_all_time_stats.sql` - MODIFIED (update function call)
5. `update_aggregated_season_honours_and_records.sql` - MODIFIED (update function call)
6. `../update_trigger.sql` - MODIFIED (use configurable threshold)

### TypeScript Files:
1. `src/lib/config.ts` - MODIFIED (add defaults)
2. `src/app/api/matches/history/route.ts` - MODIFIED (remove heavy_win/loss)
3. `src/app/api/admin/upcoming-matches/[id]/complete/route.ts` - MODIFIED (remove heavy_win/loss)
4. `prisma/schema.prisma` - MODIFIED (add comments)

### No Changes Needed:
- Admin UI (`src/components/admin/config/AppConfig.component.tsx`) - Already dynamic!

---

## Quick Reference

**New config keys:**
- `fantasy_goals_scored_points` (default: 0)
- `fantasy_heavy_win_threshold` (default: 4)

**What changed:**
- Heavy win/loss calculated on-the-fly (not stored)
- Uses current config threshold (not hardcoded)
- Optional points per goal scored

**How to test:**
- Change threshold in admin UI
- Historical matches automatically recalculate
- No manual stats refresh needed

**How to undo:**
- `git revert HEAD && git push`
- Delete config entries (optional)
- Done

---

That's it! The plan looks long but it's mostly just showing you the exact code changes. The actual work is:
1. Create view (2 min)
2. Add config (2 min)
3. Update 4 SQL functions (15 min)
4. Update 2 API routes (10 min)
5. Update 1 config file (2 min)
6. Test (30 min)

You got this! 🚀