# **Legacy Match Migration & Cleanup Plan**

_Last updated: December 2024_

---

## 0. Overview & Objectives

This document outlines the complete strategy to migrate all legacy matches (700+ completed games) to the new match flow system and remove all legacy functionality. The goal is to eliminate the dual-system complexity and ensure all matches work seamlessly with the unified Match Control Centre.

**Current State Analysis:**
- **Legacy Matches**: `matches` table records where `upcoming_match_id IS NULL`
- **New Matches**: `matches` table records linked via `upcoming_match_id` to `upcoming_matches` table
- **Legacy Detection**: Used throughout the UI and API to provide different functionality

**Target State:**
- All matches have corresponding `upcoming_matches` records
- All matches are linked via `upcoming_match_id`
- Complete removal of legacy detection logic
- Unified functionality across all historical data

---

## 1. Migration Strategy Analysis

### **1.1 Data Requirements for New System**

For each legacy match, we need to create:

#### **A. upcoming_matches Record**
```sql
-- Core match planning record
INSERT INTO upcoming_matches (
    match_date,         -- From matches.match_date
    team_size,          -- Calculated from player_matches count
    state,              -- Always 'Completed' for legacy
    is_completed,       -- Always true
    is_balanced,        -- Always true (they were played)
    team_a_name,        -- Default from config
    team_b_name,        -- Default from config
    state_version,      -- 0 (initial)
    created_at,         -- matches.created_at or match_date
    updated_at          -- matches.created_at or match_date
)
```

#### **B. upcoming_match_players Records**
```sql
-- Player team assignments based on actual gameplay
INSERT INTO upcoming_match_players (
    upcoming_match_id,  -- From step A
    player_id,          -- From player_matches.player_id
    team,               -- From player_matches.team
    slot_number,        -- Assigned sequentially within team
    created_at,         -- matches.created_at or match_date
    updated_at          -- matches.created_at or match_date
)
```

#### **C. match_player_pool Records**
```sql
-- All players marked as "IN" since they played
INSERT INTO match_player_pool (
    upcoming_match_id,  -- From step A
    player_id,          -- From player_matches.player_id
    response_status,    -- 'IN' (they played)
    response_timestamp, -- matches.created_at or match_date
    created_at,         -- matches.created_at or match_date
    updated_at          -- matches.created_at or match_date
)
```

#### **D. Update matches.upcoming_match_id**
```sql
-- Link legacy match to new planning record
UPDATE matches 
SET upcoming_match_id = [new_upcoming_match_id]
WHERE match_id = [legacy_match_id]
```

### **1.2 Team Size Calculation Logic**

Since legacy matches don't store `team_size`, we calculate it from player data:

```sql
-- Calculate team size from player distribution
WITH match_teams AS (
    SELECT 
        match_id,
        COUNT(*) FILTER (WHERE team = 'A') as team_a_count,
        COUNT(*) FILTER (WHERE team = 'B') as team_b_count
    FROM player_matches 
    WHERE match_id = [match_id]
    GROUP BY match_id
)
SELECT 
    match_id,
    GREATEST(team_a_count, team_b_count) as team_size
FROM match_teams;
```

**Fallback Strategy:**
- If teams are uneven, use the larger team size
- If no players found, default to 9 (system default)
- If team size < 5 or > 11, cap to valid range

---

## 2. SQL Migration Scripts

### **2.1 Pre-Migration Validation**

```sql
-- STEP 1: Analyze legacy matches
-- Run this first to understand the scope and any data issues

-- Count legacy matches
SELECT 
    'Total legacy matches' as metric,
    COUNT(*) as count
FROM matches 
WHERE upcoming_match_id IS NULL

UNION ALL

-- Count matches already migrated
SELECT 
    'Already migrated matches' as metric,
    COUNT(*) as count
FROM matches 
WHERE upcoming_match_id IS NOT NULL

UNION ALL

-- Count legacy matches with player data
SELECT 
    'Legacy matches with players' as metric,
    COUNT(DISTINCT m.match_id) as count
FROM matches m
JOIN player_matches pm ON m.match_id = pm.match_id
WHERE m.upcoming_match_id IS NULL

UNION ALL

-- Count legacy matches WITHOUT player data (data integrity issues)
SELECT 
    'Legacy matches WITHOUT players' as metric,
    COUNT(*) as count
FROM matches m
LEFT JOIN player_matches pm ON m.match_id = pm.match_id
WHERE m.upcoming_match_id IS NULL 
AND pm.match_id IS NULL;

-- Team size distribution analysis
WITH legacy_team_sizes AS (
    SELECT 
        m.match_id,
        m.match_date,
        COUNT(*) FILTER (WHERE pm.team = 'A') as team_a_count,
        COUNT(*) FILTER (WHERE pm.team = 'B') as team_b_count,
        GREATEST(
            COUNT(*) FILTER (WHERE pm.team = 'A'),
            COUNT(*) FILTER (WHERE pm.team = 'B')
        ) as calculated_team_size
    FROM matches m
    JOIN player_matches pm ON m.match_id = pm.match_id
    WHERE m.upcoming_match_id IS NULL
    GROUP BY m.match_id, m.match_date
)
SELECT 
    calculated_team_size,
    COUNT(*) as match_count,
    MIN(match_date) as earliest_match,
    MAX(match_date) as latest_match
FROM legacy_team_sizes
GROUP BY calculated_team_size
ORDER BY calculated_team_size;

-- Check for data anomalies
SELECT 
    'Matches with NULL team assignments' as issue,
    COUNT(*) as count
FROM matches m
JOIN player_matches pm ON m.match_id = pm.match_id
WHERE m.upcoming_match_id IS NULL 
AND (pm.team IS NULL OR pm.team NOT IN ('A', 'B'))

UNION ALL

SELECT 
    'Matches with missing player data' as issue,
    COUNT(*) as count
FROM matches m
JOIN player_matches pm ON m.match_id = pm.match_id
WHERE m.upcoming_match_id IS NULL 
AND pm.player_id IS NULL;
```

### **2.2 Core Migration Script**

```sql
-- STEP 2: Execute the main migration
-- This script migrates all legacy matches to the new system

DO $$
DECLARE
    legacy_match RECORD;
    new_upcoming_match_id INTEGER;
    team_size_calculated INTEGER;
    team_a_name_config TEXT;
    team_b_name_config TEXT;
    slot_counter_a INTEGER;
    slot_counter_b INTEGER;
    player_record RECORD;
    matches_processed INTEGER := 0;
    matches_skipped INTEGER := 0;
BEGIN
    -- Get default team names from config
    SELECT config_value INTO team_a_name_config 
    FROM app_config 
    WHERE config_key = 'team_a_name';
    
    SELECT config_value INTO team_b_name_config 
    FROM app_config 
    WHERE config_key = 'team_b_name';
    
    -- Fallback to defaults if config missing
    team_a_name_config := COALESCE(team_a_name_config, 'Orange');
    team_b_name_config := COALESCE(team_b_name_config, 'Green');
    
    RAISE NOTICE 'Starting migration with team names: % vs %', team_a_name_config, team_b_name_config;
    
    -- Process each legacy match
    FOR legacy_match IN 
        SELECT DISTINCT m.match_id, m.match_date, m.team_a_score, m.team_b_score, m.created_at
        FROM matches m
        WHERE m.upcoming_match_id IS NULL
        ORDER BY m.match_date, m.match_id
    LOOP
        -- Calculate team size from player data
        SELECT GREATEST(
            COUNT(*) FILTER (WHERE pm.team = 'A'),
            COUNT(*) FILTER (WHERE pm.team = 'B')
        ) INTO team_size_calculated
        FROM player_matches pm 
        WHERE pm.match_id = legacy_match.match_id;
        
        -- Validate and apply constraints to team size
        IF team_size_calculated IS NULL OR team_size_calculated = 0 THEN
            RAISE NOTICE 'Match % has no player data, skipping', legacy_match.match_id;
            matches_skipped := matches_skipped + 1;
            CONTINUE;
        END IF;
        
        -- Ensure team size is within valid range
        team_size_calculated := GREATEST(5, LEAST(11, team_size_calculated));
        
        RAISE NOTICE 'Processing match % (%) with team size %', 
            legacy_match.match_id, legacy_match.match_date, team_size_calculated;
        
        -- Create upcoming_matches record
        INSERT INTO upcoming_matches (
            match_date,
            team_size,
            state,
            is_completed,
            is_balanced,
            team_a_name,
            team_b_name,
            state_version,
            created_at,
            updated_at
        ) VALUES (
            legacy_match.match_date,
            team_size_calculated,
            'Completed',
            true,
            true,
            team_a_name_config,
            team_b_name_config,
            0,
            COALESCE(legacy_match.created_at, legacy_match.match_date),
            COALESCE(legacy_match.created_at, legacy_match.match_date)
        ) RETURNING upcoming_match_id INTO new_upcoming_match_id;
        
        -- Reset slot counters for this match
        slot_counter_a := 1;
        slot_counter_b := 1;
        
        -- Create upcoming_match_players records
        FOR player_record IN
            SELECT pm.player_id, pm.team
            FROM player_matches pm
            WHERE pm.match_id = legacy_match.match_id
            AND pm.team IN ('A', 'B')
            AND pm.player_id IS NOT NULL
            ORDER BY pm.team, pm.player_id
        LOOP
            INSERT INTO upcoming_match_players (
                upcoming_match_id,
                player_id,
                team,
                slot_number,
                created_at,
                updated_at
            ) VALUES (
                new_upcoming_match_id,
                player_record.player_id,
                player_record.team,
                CASE 
                    WHEN player_record.team = 'A' THEN slot_counter_a
                    ELSE team_size_calculated + slot_counter_b
                END,
                COALESCE(legacy_match.created_at, legacy_match.match_date),
                COALESCE(legacy_match.created_at, legacy_match.match_date)
            );
            
            -- Increment appropriate slot counter
            IF player_record.team = 'A' THEN
                slot_counter_a := slot_counter_a + 1;
            ELSE
                slot_counter_b := slot_counter_b + 1;
            END IF;
        END LOOP;
        
        -- Create match_player_pool records (all players marked as "IN")
        INSERT INTO match_player_pool (
            upcoming_match_id,
            player_id,
            response_status,
            response_timestamp,
            created_at,
            updated_at
        )
        SELECT 
            new_upcoming_match_id,
            pm.player_id,
            'IN',
            COALESCE(legacy_match.created_at, legacy_match.match_date),
            COALESCE(legacy_match.created_at, legacy_match.match_date),
            COALESCE(legacy_match.created_at, legacy_match.match_date)
        FROM player_matches pm
        WHERE pm.match_id = legacy_match.match_id
        AND pm.player_id IS NOT NULL
        AND pm.team IN ('A', 'B');
        
        -- Link the legacy match to the new upcoming_match
        UPDATE matches 
        SET upcoming_match_id = new_upcoming_match_id
        WHERE match_id = legacy_match.match_id;
        
        matches_processed := matches_processed + 1;
        
        -- Progress logging every 50 matches
        IF matches_processed % 50 = 0 THEN
            RAISE NOTICE 'Processed % matches...', matches_processed;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration completed: % matches processed, % skipped', matches_processed, matches_skipped;
END $$;
```

### **2.3 Post-Migration Validation**

```sql
-- STEP 3: Validate the migration results
-- Run this after the migration to ensure data integrity

-- Verify no legacy matches remain
SELECT 
    'Remaining legacy matches' as metric,
    COUNT(*) as count
FROM matches 
WHERE upcoming_match_id IS NULL;

-- Verify all matches now have planning records
SELECT 
    'Matches with planning records' as metric,
    COUNT(*) as count
FROM matches m
JOIN upcoming_matches um ON m.upcoming_match_id = um.upcoming_match_id;

-- Check for orphaned planning records
SELECT 
    'Orphaned upcoming_matches' as metric,
    COUNT(*) as count
FROM upcoming_matches um
LEFT JOIN matches m ON um.upcoming_match_id = m.upcoming_match_id
WHERE m.match_id IS NULL;

-- Validate player assignments match original data
WITH validation_check AS (
    SELECT 
        m.match_id,
        m.upcoming_match_id,
        -- Original player count
        (SELECT COUNT(*) FROM player_matches pm1 WHERE pm1.match_id = m.match_id) as original_players,
        -- New system player count  
        (SELECT COUNT(*) FROM upcoming_match_players ump WHERE ump.upcoming_match_id = m.upcoming_match_id) as migrated_players,
        -- Pool player count
        (SELECT COUNT(*) FROM match_player_pool mpp WHERE mpp.upcoming_match_id = m.upcoming_match_id) as pool_players
    FROM matches m
    WHERE m.upcoming_match_id IS NOT NULL
)
SELECT 
    'Matches with player count mismatches' as metric,
    COUNT(*) as count
FROM validation_check
WHERE original_players != migrated_players OR original_players != pool_players;

-- Check team balance in migrated data
WITH team_balance_check AS (
    SELECT 
        ump.upcoming_match_id,
        COUNT(*) FILTER (WHERE ump.team = 'A') as team_a_count,
        COUNT(*) FILTER (WHERE ump.team = 'B') as team_b_count,
        um.team_size
    FROM upcoming_match_players ump
    JOIN upcoming_matches um ON ump.upcoming_match_id = um.upcoming_match_id
    GROUP BY ump.upcoming_match_id, um.team_size
)
SELECT 
    'Matches with unbalanced teams' as metric,
    COUNT(*) as count
FROM team_balance_check
WHERE ABS(team_a_count - team_b_count) > 1 
OR team_a_count > team_size 
OR team_b_count > team_size;

-- Sample verification query - check a few matches manually
SELECT 
    m.match_id,
    m.match_date,
    um.team_size,
    um.state,
    COUNT(*) FILTER (WHERE ump.team = 'A') as team_a_players,
    COUNT(*) FILTER (WHERE ump.team = 'B') as team_b_players
FROM matches m
JOIN upcoming_matches um ON m.upcoming_match_id = um.upcoming_match_id
JOIN upcoming_match_players ump ON um.upcoming_match_id = ump.upcoming_match_id
GROUP BY m.match_id, m.match_date, um.team_size, um.state
ORDER BY m.match_date DESC
LIMIT 10;
```

### **2.4 Rollback Script (Emergency Use)**

```sql
-- EMERGENCY ROLLBACK: Only use if migration fails and needs to be undone
-- This script reverses the migration changes

DO $$
DECLARE
    rollback_count INTEGER := 0;
BEGIN
    -- Remove the links from matches table
    UPDATE matches 
    SET upcoming_match_id = NULL 
    WHERE upcoming_match_id IS NOT NULL;
    
    GET DIAGNOSTICS rollback_count = ROW_COUNT;
    RAISE NOTICE 'Unlinked % matches from upcoming_matches', rollback_count;
    
    -- Delete match_player_pool records for migrated matches
    DELETE FROM match_player_pool 
    WHERE upcoming_match_id IN (
        SELECT upcoming_match_id 
        FROM upcoming_matches 
        WHERE state = 'Completed'
    );
    
    -- Delete upcoming_match_players for migrated matches  
    DELETE FROM upcoming_match_players
    WHERE upcoming_match_id IN (
        SELECT upcoming_match_id 
        FROM upcoming_matches 
        WHERE state = 'Completed'
    );
    
    -- Delete upcoming_matches records created by migration
    DELETE FROM upcoming_matches 
    WHERE state = 'Completed' 
    AND created_at = updated_at; -- Migration sets these equal
    
    RAISE NOTICE 'Rollback completed - all migration changes reversed';
END $$;
```

---

## 3. Application Code Changes

### **3.1 Files to Modify - Remove Legacy Detection**

#### **A. Core API Routes**

**File: `src/app/api/matches/history/route.ts`**
```typescript
// BEFORE: Legacy filtering
where: {
  OR: [
    { upcoming_match_id: null }, // Legacy matches
    { 
      upcoming_match_id: { not: null },
      upcoming_matches: { state: 'Completed' }
    }
  ]
}

// AFTER: Simplified filtering
where: {
  upcoming_matches: { state: 'Completed' }
}
```

**File: `src/app/api/matches/route.ts`**
- **Action**: Delete entire file (legacy match creation)
- **Reason**: No longer needed - all matches created via new flow

#### **B. UI Components**

**File: `src/app/admin/matches/page.tsx`**
```typescript
// REMOVE: Legacy detection logic
const isLegacy = !match.upcoming_match_id;
const href = isLegacy ? '#' : `/admin/matches/${match.upcoming_match_id}`;

// REMOVE: Legacy styling and badges
{isLegacy && <span className="text-xs text-gray-500 font-semibold">Legacy</span>}
className={`${isLegacy ? 'opacity-70' : 'hover:shadow-lg'}`}

// REMOVE: Conditional navigation
{!isLegacy && <Link href={href} className="absolute inset-0 z-0" />}

// SIMPLIFY: All matches now clickable
<Link href={`/admin/matches/${match.upcoming_match_id}`} className="absolute inset-0 z-0" />
```

#### **C. Type Definitions**

**File: `src/app/admin/matches/page.tsx`**
```typescript
// BEFORE: Optional upcoming_match_id
interface HistoricalMatch {
  upcoming_match_id: number | null;
  // ...
}

// AFTER: Required upcoming_match_id
interface HistoricalMatch {
  upcoming_match_id: number;
  // ...
}
```

### **3.2 Files to Delete Completely**

**Remove Legacy Routes:**
- `src/app/api/matches/route.ts` - Legacy match creation endpoint
- Any deprecated admin match components in `deprecated/` folder

**Remove Legacy Documentation:**
- References to legacy system in `new-matchflow.md`
- Legacy migration sections no longer needed

### **3.3 Database Schema Updates**

**Option A: Make upcoming_match_id Required (Recommended)**
```sql
-- After successful migration, make the foreign key required
ALTER TABLE matches 
ALTER COLUMN upcoming_match_id SET NOT NULL;
```

**Option B: Keep Optional for Future Flexibility**
- Leave schema as-is but update application logic
- Useful if you might import historical data without planning records

### **3.4 Configuration Updates**

**Add Validation to Prevent Legacy Creation:**
```typescript
// In any match creation endpoints, add validation
if (!upcoming_match_id) {
  throw new Error('All matches must be created via the Match Control Centre');
}
```

---

## 4. Testing Strategy

### **4.1 Pre-Migration Testing**

**Test Current System:**
```bash
# 1. Export a sample of legacy matches for comparison
psql -c "COPY (
  SELECT m.match_id, m.match_date, m.team_a_score, m.team_b_score,
         COUNT(*) as player_count
  FROM matches m
  LEFT JOIN player_matches pm ON m.match_id = pm.match_id
  WHERE m.upcoming_match_id IS NULL
  GROUP BY m.match_id, m.match_date, m.team_a_score, m.team_b_score
  ORDER BY m.match_date DESC
  LIMIT 100
) TO '/tmp/legacy_matches_sample.csv' WITH CSV HEADER;"

# 2. Test current legacy functionality
# - Visit /admin/matches and verify legacy badge display
# - Confirm legacy matches show in history tab
# - Verify stats calculations include legacy data
```

### **4.2 Migration Testing**

**Step-by-Step Validation:**
```sql
-- 1. Test migration on a small subset first
-- Create a backup and test on 10 recent matches

-- 2. Run pre-migration validation queries

-- 3. Execute migration with limited scope for testing
DO $$ /* ... migration script with WHERE clause limiting to recent matches ... */ $$;

-- 4. Run post-migration validation

-- 5. Test application functionality:
--    - All matches now clickable in history
--    - Match Control Centre loads for migrated matches
--    - Stats calculations remain accurate
--    - No UI errors or legacy badges shown
```

### **4.3 Post-Migration Testing**

**Comprehensive Verification:**
```bash
# 1. UI Testing
# - All historical matches now clickable
# - No "Legacy" badges visible
# - Match Control Centre loads for all matches
# - Deletion works correctly for all matches

# 2. API Testing  
# - /api/matches/history returns all matches properly
# - No 500 errors on match-related endpoints
# - Stats APIs continue working correctly

# 3. Data Integrity Testing
# - Compare player statistics before/after migration
# - Verify match reports still generate correctly
# - Confirm all aggregated data remains consistent
```

### **4.4 Performance Testing**

**Database Performance:**
```sql
-- Check query performance after migration
EXPLAIN ANALYZE 
SELECT * FROM matches m
JOIN upcoming_matches um ON m.upcoming_match_id = um.upcoming_match_id
WHERE um.state = 'Completed'
ORDER BY m.match_date DESC;

-- Verify indexes are being used effectively
-- Add indexes if needed:
-- CREATE INDEX idx_upcoming_matches_state ON upcoming_matches(state);
```

---

## 5. Deployment Plan

### **5.1 Pre-Deployment Checklist**

- [ ] **Database Backup**: Full backup of production database
- [ ] **Staging Testing**: Complete migration tested on staging environment
- [ ] **Code Review**: All code changes reviewed and approved
- [ ] **Performance Check**: Migration script tested with production data volume
- [ ] **Rollback Plan**: Rollback script tested and ready

### **5.2 Deployment Steps**

**Phase 1: Database Migration (Low Traffic Window)**
```bash
# 1. Create backup
pg_dump [database] > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql

# 2. Run pre-migration validation
psql -f pre_migration_validation.sql

# 3. Execute migration
psql -f legacy_migration_script.sql

# 4. Run post-migration validation  
psql -f post_migration_validation.sql

# 5. Update database constraints (optional)
psql -c "ALTER TABLE matches ALTER COLUMN upcoming_match_id SET NOT NULL;"
```

**Phase 2: Application Update**
```bash
# 1. Deploy code changes
git push production

# 2. Test key functionality
curl -s https://[domain]/admin/matches | grep -i legacy
# Should return no results

# 3. Monitor error logs for issues
tail -f /var/log/application.log | grep -i error
```

### **5.3 Post-Deployment Monitoring**

**Monitor for 24-48 hours:**
- Application error rates
- Database query performance  
- User-reported issues with match functionality
- Stats calculation accuracy

**Success Criteria:**
- Zero legacy matches remain (`upcoming_match_id IS NULL`)
- All matches clickable in admin interface
- No legacy-related UI elements visible
- Stats calculations remain accurate
- No performance degradation

---

## 6. Risk Assessment & Mitigation

### **6.1 High-Risk Scenarios**

**Risk: Data Loss During Migration**
- **Mitigation**: Comprehensive backup strategy + rollback script
- **Detection**: Post-migration validation queries
- **Response**: Immediate rollback if any data inconsistencies found

**Risk: Performance Impact on Large Dataset**
- **Mitigation**: Test with production-sized data on staging
- **Detection**: Monitor query execution times
- **Response**: Add indexes or optimize migration script

**Risk: Application Errors After Code Changes**  
- **Mitigation**: Thorough testing on staging environment
- **Detection**: Error monitoring and user feedback
- **Response**: Quick rollback of application code (database remains migrated)

### **6.2 Medium-Risk Scenarios**

**Risk: Stats Calculation Inconsistencies**
- **Mitigation**: Compare stats before/after migration
- **Detection**: Automated stats validation queries
- **Response**: Re-run stats calculation functions

**Risk: UI/UX Issues**
- **Mitigation**: Comprehensive UI testing on staging
- **Detection**: User testing and feedback
- **Response**: Hotfix deployment for UI issues

### **6.3 Rollback Strategy**

**If Migration Must Be Reversed:**
1. **Stop Application Traffic** (maintenance mode)
2. **Run Rollback Script** (provided above)
3. **Restore Code** to previous version
4. **Validate Rollback** using pre-migration data exports
5. **Resume Traffic** once consistency verified

**Rollback Decision Criteria:**
- Data inconsistencies detected
- Application errors affecting > 10% of users
- Performance degradation > 50% 
- Critical functionality broken

---

## 7. Communication Plan

### **7.1 Stakeholder Communication**

**Pre-Migration (1 week before):**
- Notify admin users of upcoming improvements
- Schedule maintenance window if needed
- Communicate expected downtime (if any)

**During Migration:**
- Real-time status updates
- ETA communication if longer than expected

**Post-Migration:**
- Success confirmation
- Summary of improvements gained
- Documentation of any changes in workflow

### **7.2 User Training**

**Key Changes for Admin Users:**
- All historical matches now fully functional
- Consistent interface across all match data
- Enhanced deletion capabilities for all matches
- No more "Legacy" vs "New" distinction

**Updated Documentation:**
- Remove legacy system references
- Update admin guides with unified workflow
- Create troubleshooting guides for new system

---

## 8. Success Metrics

### **8.1 Technical Metrics**

- **Migration Completeness**: 100% of matches have `upcoming_match_id`
- **Data Integrity**: 0 mismatches between original and migrated data
- **Performance**: Query times remain within 110% of baseline
- **Error Rate**: < 0.1% increase in application errors

### **8.2 User Experience Metrics**

- **Functionality**: All historical matches fully clickable and functional
- **UI Consistency**: No legacy badges or conditional behavior visible
- **Admin Efficiency**: Unified workflow for all match management
- **Support Tickets**: No increase in user confusion or support requests

### **8.3 System Health Metrics**

- **Database Size**: Expected increase due to new planning records
- **Query Performance**: No significant degradation in match-related queries
- **Stats Accuracy**: All statistical calculations remain consistent
- **System Stability**: No unexpected downtime or service disruptions

---

## 9. Implementation Timeline

### **Week 1: Preparation**
- [ ] **Day 1-2**: Code changes and testing on development environment
- [ ] **Day 3-4**: Database migration script development and validation
- [ ] **Day 5-7**: Staging environment testing with production data copy

### **Week 2: Deployment**  
- [ ] **Day 1**: Final testing and stakeholder approval
- [ ] **Day 2**: Production database migration (maintenance window)
- [ ] **Day 3**: Application code deployment
- [ ] **Day 4-7**: Monitoring and issue resolution

### **Week 3: Validation**
- [ ] **Day 1-3**: Comprehensive testing and validation
- [ ] **Day 4-5**: User acceptance testing
- [ ] **Day 6-7**: Documentation updates and training

### **Week 4: Finalization**
- [ ] **Day 1-2**: Performance optimization if needed
- [ ] **Day 3-4**: Legacy code cleanup and removal
- [ ] **Day 5-7**: Final documentation and project closure

---

## 10. Conclusion

This migration plan provides a comprehensive approach to eliminating legacy match functionality while preserving all historical data and ensuring system reliability. The strategy balances thoroughness with practicality, providing multiple safety nets and validation steps.

**Key Benefits After Migration:**
- **Unified User Experience**: Consistent functionality across all historical data
- **Simplified Codebase**: Removal of complex legacy detection logic
- **Enhanced Functionality**: Full Match Control Centre features for all matches
- **Future-Proof Architecture**: Single system for all match-related operations
- **Improved Maintainability**: No dual-system complexity

The migration transforms 700+ legacy matches into full citizens of the new match flow system, eliminating the artificial distinction between "legacy" and "new" matches while maintaining complete data integrity and functionality. 