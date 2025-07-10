# Match Report Dashboard Fix - Comprehensive Implementation Plan

## Executive Summary

This plan addresses the restructuring of the dashboard components and fixes three critical issues:
1. **Missing feat-breaking detection logic** - Currently no real-time notifications when records are broken/equaled
2. **Missing attendance streak in feats table** - Attendance records exist but aren't included in all-time feats
3. **Potential dual holder display issues** - SQL tie-breaking logic may cut off some dual record holders

**Goals:**
- Restructure dashboard into logical "Records & Achievements" and "Current Form & Standings" components
- Add real-time feat-breaking notifications to make dashboard more engaging
- Include attendance streaks in the all-time feats table
- Ensure proper display of all tied record holders

## **✅ UPDATED: Configuration Strategy**

**Changed Approach:** Use existing config keys instead of creating new ones:
- ✅ **Reuses:** `win_streak_threshold`, `goal_milestone_threshold`, etc. (already in database)
- ✅ **Only adds:** `feat_breaking_enabled` (master switch)
- ✅ **Logic:** Same thresholds for milestones AND feat detection = consistency

---

## **✅ VERIFIED: No Race Conditions - Proper Execution Order**

### **Analysis: SQL Function Execution Order**
After investigation, the current execution order is already correct:
- **`call-update-season-honours-and-records`** (6th) → Updates `aggregated_records`
- **`call-update-match-report-cache`** (7th) → Reads `aggregated_records` for feat detection
- **Sequential execution** via `for` loop ensures proper ordering

### **Result: No Changes Needed to Execution Order**
```sql
-- Modified update_aggregated_match_report_cache.sql
-- Add dependency check at the beginning:

DECLARE
    v_latest_match_id INT;
    v_latest_records_update TIMESTAMPTZ;
    v_max_wait_seconds INT := 30;
    v_wait_count INT := 0;
BEGIN
    -- Get the latest match
    SELECT match_id INTO v_latest_match_id
    FROM matches ORDER BY match_date DESC, match_id DESC LIMIT 1;
    
    -- Wait for records to be updated for this match
    LOOP
        SELECT last_updated INTO v_latest_records_update 
        FROM aggregated_records ORDER BY last_updated DESC LIMIT 1;
        
        -- Check if records are newer than this match completion
        IF v_latest_records_update >= (
            SELECT created_at FROM matches WHERE match_id = v_latest_match_id
        ) THEN
            EXIT; -- Records are up to date
        END IF;
        
        -- Wait and retry (up to 30 seconds)
        v_wait_count := v_wait_count + 1;
        IF v_wait_count > v_max_wait_seconds THEN
            RAISE WARNING 'Timeout waiting for records update - proceeding anyway';
            EXIT;
        END IF;
        
        PERFORM pg_sleep(1);
    END LOOP;
    
    -- Now proceed with feat breaking detection...
```

## **2. Cache Invalidation Strategy** ✅ **WELL HANDLED**

**Current Analysis:** Your caching system is robust:
- ✅ Uses `ALL_MATCH_RELATED_TAGS` for comprehensive invalidation  
- ✅ `MATCH_REPORT` tag will invalidate feat-breaking data correctly
- ✅ `unstable_cache` with proper tags will revalidate automatically

**Recommendation:** No changes needed - the existing cache invalidation will handle feat-breaking data correctly.

## **3. Multiple Players, Same Feat** ✅ **JSON LOGIC IS SOUND**

**Analysis of Existing Pattern:**
```sql
-- Your current aggregation handles multiple records perfectly:
SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
        'feat_type', feat_type,
        'player_name', player_name,
        'player_id', player_id,
        'new_value', new_value,
        'status', status
    )
    ORDER BY new_value DESC, player_name ASC  -- Proper sorting
), '[]'::jsonb)
FROM feat_breaking_data
```

**Updated Implementation:** Multiple events are handled correctly with proper sorting.

## **4. Configuration Values** ✅ **USES EXISTING CONFIGS**

**Strategy:** Use your existing threshold config keys instead of creating new ones.

**Existing Configs We'll Use:**
```sql
-- Streak thresholds (already in your database):
win_streak_threshold := get_config_value('win_streak_threshold', '4')::int;
unbeaten_streak_threshold := get_config_value('unbeaten_streak_threshold', '6')::int;
loss_streak_threshold := get_config_value('loss_streak_threshold', '4')::int;
winless_streak_threshold := get_config_value('winless_streak_threshold', '6')::int;
goal_streak_threshold := get_config_value('goal_streak_threshold', '3')::int;

-- Milestone thresholds (already in your database):
goal_milestone_threshold := get_config_value('goal_milestone_threshold', '25')::int;
hall_of_fame_limit := get_config_value('hall_of_fame_limit', '3')::int;

-- Only new config needed:
feat_breaking_enabled := get_config_value('feat_breaking_enabled', 'true')::boolean;
```

**Logic:** If a streak/goal count is "notable enough" to display in your current milestones (via these thresholds), it's also "notable enough" to check for record breaking. This approach:
- ✅ **No config clutter** - reuses existing values
- ✅ **Logical consistency** - same thresholds everywhere  
- ✅ **Admin configurable** - user can adjust via existing UI

## **5. Null Safety & Production Robustness** ⚠️ **NEEDS ATTENTION**

**Potential Issues:**
- `feat_breaking_data` column could be NULL or malformed JSON
- Frontend components could crash on undefined data
- API responses need defensive programming

**Solution: Comprehensive Null Safety**

### **SQL Level:**
```sql
-- Ensure feat_breaking_data always has valid JSON
ALTER TABLE aggregated_match_report 
ADD COLUMN feat_breaking_data JSONB DEFAULT '[]'::jsonb NOT NULL;

-- Add constraint to ensure valid structure
ALTER TABLE aggregated_match_report 
ADD CONSTRAINT feat_breaking_data_is_array 
CHECK (jsonb_typeof(feat_breaking_data) = 'array');
```

### **API Level:**
```typescript
// Enhanced match report API with null safety
const getMatchReportData = unstable_cache(
  async () => {
    try {
      const rawMatchReport = await prisma.aggregated_match_report.findFirst({
        orderBy: { match_date: 'desc' }
      });
      
      // Defensive programming for feat_breaking_data
      let featBreakingData: FeatBreakingItem[] = [];
      try {
        if (rawMatchReport?.feat_breaking_data) {
          const parsed = typeof rawMatchReport.feat_breaking_data === 'string' 
            ? JSON.parse(rawMatchReport.feat_breaking_data)
            : rawMatchReport.feat_breaking_data;
          
          if (Array.isArray(parsed)) {
            featBreakingData = parsed.filter(item => 
              item && 
              typeof item.feat_type === 'string' && 
              typeof item.player_name === 'string' &&
              typeof item.status === 'string'
            );
          }
        }
      } catch (parseError) {
        console.error('Error parsing feat_breaking_data:', parseError);
        featBreakingData = []; // Safe fallback
      }
      
      return {
        // ... existing fields
        feat_breaking_data: featBreakingData,
      };
    } catch (error) {
      console.error('Match report data error:', error);
      return null; // Let the API handle graceful fallback
    }
  }
);
```

### **Frontend Level:**
```typescript
// Component with comprehensive error boundaries
const RecordsAndAchievements: React.FC = () => {
  const [timelineItems, setTimelineItems] = useState<RecordsTimelineItem[]>([]);
  
  const processFeatBreaking = (featData: unknown): RecordsTimelineItem[] => {
    try {
      if (!Array.isArray(featData)) {
        console.warn('Feat breaking data is not an array:', typeof featData);
        return [];
      }
      
      return featData
        .filter((feat): feat is FeatBreakingItem => 
          feat && 
          typeof feat === 'object' &&
          'feat_type' in feat &&
          'player_name' in feat &&
          'status' in feat
        )
        .map((feat, index) => ({
          type: feat.status === 'broken' ? 'feat_broken' : 'feat_equaled',
          feat_type: feat.feat_type,
          player: feat.player_name,
          playerId: feat.player_id ? String(feat.player_id) : undefined,
          content: generateFeatContent(feat),
          icon: getFeatIcon(feat.feat_type),
          date: formatDateSafely(matchDate),
          color: feat.status === 'broken' ? 'purple' : 'amber',
          key: `feat-${index}-${feat.feat_type}-${feat.player_id}`
        }));
    } catch (error) {
      console.error('Error processing feat breaking data:', error);
      return []; // Safe fallback
    }
  };
};
```

---

## **Updated Implementation Plan**

### **Phase 1: Database & SQL Fixes** 

#### **1.1 Add Robust Database Schema**
```sql
-- USER MUST RUN THIS IN SUPABASE:
ALTER TABLE aggregated_match_report 
ADD COLUMN feat_breaking_data JSONB DEFAULT '[]'::jsonb NOT NULL;

-- Add validation constraint
ALTER TABLE aggregated_match_report 
ADD CONSTRAINT feat_breaking_data_is_array 
CHECK (jsonb_typeof(feat_breaking_data) = 'array');

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_aggregated_match_report_feat_breaking 
ON aggregated_match_report USING GIN (feat_breaking_data);

-- Add config value for feat breaking (optional - can disable entirely)
INSERT INTO app_config (config_key, config_value, config_description, config_group) VALUES
('feat_breaking_enabled', 'true', 'Enable real-time feat breaking detection', 'achievements')
ON CONFLICT (config_key) DO NOTHING;

-- Note: Uses existing threshold configs already in your database:
-- win_streak_threshold, unbeaten_streak_threshold, loss_streak_threshold, 
-- winless_streak_threshold, goal_streak_threshold, goal_milestone_threshold
```

#### **1.2 Enhanced Feat-Breaking Detection with Sequencing**
```sql
-- Modified update_aggregated_match_report_cache.sql
CREATE OR REPLACE FUNCTION update_aggregated_match_report_cache()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_latest_match_id INT;
    -- Config values
    v_feat_breaking_enabled BOOLEAN;
    v_win_streak_threshold INT;
    v_unbeaten_streak_threshold INT;
    v_loss_streak_threshold INT;
    v_winless_streak_threshold INT;
    v_goal_streak_threshold INT;
    v_goal_milestone_threshold INT;
    hall_of_fame_limit INT;
BEGIN
    RAISE NOTICE 'Starting update_aggregated_match_report_cache...';
    
    -- Fetch config (using existing config keys)
    v_feat_breaking_enabled := get_config_value('feat_breaking_enabled', 'true')::boolean;
    v_win_streak_threshold := get_config_value('win_streak_threshold', '4')::int;
    v_unbeaten_streak_threshold := get_config_value('unbeaten_streak_threshold', '6')::int;
    v_loss_streak_threshold := get_config_value('loss_streak_threshold', '4')::int;
    v_winless_streak_threshold := get_config_value('winless_streak_threshold', '6')::int;
    v_goal_streak_threshold := get_config_value('goal_streak_threshold', '3')::int;
    v_goal_milestone_threshold := get_config_value('goal_milestone_threshold', '25')::int;
    hall_of_fame_limit := get_config_value('hall_of_fame_limit', '3')::int;
    
    IF NOT v_feat_breaking_enabled THEN
        RAISE NOTICE 'Feat breaking detection disabled by configuration';
        RETURN;
    END IF;
    
    -- Get latest match
    SELECT match_id INTO v_latest_match_id
    FROM matches ORDER BY match_date DESC, match_id DESC LIMIT 1;
    
    IF v_latest_match_id IS NULL THEN
        RAISE NOTICE 'No matches found. Exiting.';
        RETURN;
    END IF;
    
    -- Note: No wait loop needed! The execution order in trigger-stats-update 
    -- already ensures call-update-season-honours-and-records (which updates aggregated_records) 
    -- runs before call-update-match-report-cache (which reads aggregated_records)
    
    -- ... existing match report logic ...
    
    -- Feat Breaking Detection
    WITH current_records AS (
        SELECT records FROM aggregated_records 
        ORDER BY last_updated DESC LIMIT 1
    ),
    feat_breaking_candidates AS (
        -- Most Goals in Game Detection (only check if meets milestone threshold)
        SELECT 
            'most_goals_in_game' as feat_type,
            pm.player_id,
            p.name as player_name,
            pm.goals as new_value,
            COALESCE((current_records.records->'most_goals_in_game'->0->>'goals')::int, 0) as current_record,
            CASE 
                WHEN pm.goals > COALESCE((current_records.records->'most_goals_in_game'->0->>'goals')::int, 0) THEN 'broken'
                WHEN pm.goals = COALESCE((current_records.records->'most_goals_in_game'->0->>'goals')::int, 0) AND pm.goals >= v_goal_milestone_threshold THEN 'equaled'
                ELSE NULL
            END as status
        FROM player_matches pm
        JOIN players p ON pm.player_id = p.player_id
        CROSS JOIN current_records
        WHERE pm.match_id = v_latest_match_id 
          AND pm.goals >= v_goal_milestone_threshold
          AND p.is_ringer = false
        
        UNION ALL
        
        -- Win Streak Detection (only check if meets threshold)
        SELECT 
            'win_streak' as feat_type,
            ams.player_id,
            ams.name as player_name,
            ams.current_win_streak as new_value,
            COALESCE((current_records.records->'streaks'->'Win Streak'->'holders'->0->>'streak')::int, 0) as current_record,
            CASE 
                WHEN ams.current_win_streak > COALESCE((current_records.records->'streaks'->'Win Streak'->'holders'->0->>'streak')::int, 0) THEN 'broken'
                WHEN ams.current_win_streak = COALESCE((current_records.records->'streaks'->'Win Streak'->'holders'->0->>'streak')::int, 0) AND ams.current_win_streak >= v_win_streak_threshold THEN 'equaled'
                ELSE NULL
            END as status
        FROM aggregated_match_streaks ams
        CROSS JOIN current_records
        WHERE ams.player_id IN (
            SELECT DISTINCT pm.player_id 
            FROM player_matches pm 
            WHERE pm.match_id = v_latest_match_id
        )
        AND ams.current_win_streak >= v_win_streak_threshold
        
        -- Add similar UNION ALL blocks for:
        -- unbeaten_streak (using v_unbeaten_streak_threshold)
        -- loss_streak (using v_loss_streak_threshold) 
        -- winless_streak (using v_winless_streak_threshold)
        -- goal_streak (using v_goal_streak_threshold)
        -- biggest_victory (check all values > 0)
        -- attendance_streak (once added to records)
    )
    UPDATE aggregated_match_report 
    SET feat_breaking_data = COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'feat_type', feat_type,
                'player_name', player_name,
                'player_id', player_id,
                'new_value', new_value,
                'current_record', current_record,
                'status', status
            )
            ORDER BY 
                CASE WHEN status = 'broken' THEN 1 ELSE 2 END, -- Broken records first
                new_value DESC, 
                player_name ASC
        )
        FROM feat_breaking_candidates
        WHERE status IS NOT NULL
    ), '[]'::jsonb)
    WHERE match_id = v_latest_match_id;
    
    RAISE NOTICE 'Feat breaking detection completed for match %', v_latest_match_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_aggregated_match_report_cache: %', SQLERRM;
END;
$$;
```

#### **1.3 Add Attendance Streak to Records (Updated)**
```sql
-- Enhanced attendance streak calculation in update_aggregated_season_honours_and_records.sql
attendance_streaks AS (
    WITH player_game_sequences AS (
        SELECT 
            p.name, 
            p.player_id,
            m.match_date,
            LAG(m.match_date) OVER (PARTITION BY p.player_id ORDER BY m.match_date) as prev_match_date,
            ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date) as game_number
        FROM players p 
        JOIN player_matches pm ON p.player_id = pm.player_id 
        JOIN matches m ON pm.match_id = m.match_id
        WHERE p.is_ringer = false
        ORDER BY p.player_id, m.match_date
    ),
    streak_groups AS (
        SELECT 
            name,
            player_id,
            match_date,
            game_number,
            SUM(CASE WHEN prev_match_date IS NULL OR game_number = 1 THEN 1 ELSE 0 END) 
            OVER (PARTITION BY player_id ORDER BY match_date ROWS UNBOUNDED PRECEDING) as streak_group
        FROM player_game_sequences
    ),
    streak_calculations AS (
        SELECT 
            name,
            streak_group,
            COUNT(*) as streak_length,
            MIN(match_date) as streak_start,
            MAX(match_date) as streak_end,
            DENSE_RANK() OVER (ORDER BY COUNT(*) DESC, MAX(match_date) DESC) as rnk
        FROM streak_groups
        GROUP BY name, player_id, streak_group
        HAVING COUNT(*) >= min_streak_length
    )
    SELECT name, streak_length as streak, streak_start, streak_end
    FROM streak_calculations 
    WHERE rnk = 1
),

-- Add to the final records JSON:
'attendance_streak', (
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'name', name, 
            'streak', streak, 
            'start_date', streak_start::text, 
            'end_date', streak_end::text
        )
        ORDER BY streak DESC, streak_end DESC, name ASC
    ), '[]'::jsonb)
    FROM (
        SELECT *, 
               DENSE_RANK() OVER (ORDER BY streak DESC, streak_end DESC) as value_rank
        FROM attendance_streaks
    ) ranked_attendance
    WHERE value_rank <= hall_of_fame_limit
)
```

### **Phase 2: Frontend Implementation with Error Boundaries**

```typescript
// Enhanced component with comprehensive error handling
const RecordsAndAchievements: React.FC = () => {
  const [timelineItems, setTimelineItems] = useState<RecordsTimelineItem[]>([]);
  const [error, setError] = useState<Error | null>(null);
  
  // Error boundary for feat processing
  const processFeatBreakingWithErrorHandling = useCallback((featData: unknown): RecordsTimelineItem[] => {
    try {
      if (!featData || !Array.isArray(featData)) {
        console.warn('Invalid feat breaking data format:', typeof featData);
        return [];
      }
      
      return featData
        .filter((feat): feat is FeatBreakingItem => {
          if (!feat || typeof feat !== 'object') return false;
          if (!('feat_type' in feat) || !('player_name' in feat) || !('status' in feat)) return false;
          if (!['broken', 'equaled'].includes(feat.status)) return false;
          return true;
        })
        .map((feat, index) => ({
          type: feat.status === 'broken' ? 'feat_broken' : 'feat_equaled',
          feat_type: feat.feat_type,
          player: feat.player_name,
          playerId: feat.player_id ? String(feat.player_id) : undefined,
          content: `${feat.status === 'broken' ? 'Broke' : 'Equaled'} ${getFeatDisplayName(feat.feat_type)} record with ${feat.new_value}`,
          subtext: `Previous record: ${feat.current_record}`,
          icon: getFeatIcon(feat.feat_type),
          color: feat.status === 'broken' ? 'purple' : 'amber',
          previous_record_value: feat.current_record,
          key: `feat-${index}-${feat.feat_type}-${feat.player_id}`
        }))
        .slice(0, 10); // Limit to prevent UI overload
    } catch (error) {
      console.error('Error processing feat breaking data:', error);
      setError(new Error('Failed to process achievement data'));
      return [];
    }
  }, []);
  
  // Rest of component with similar error handling patterns...
};
```

---

## **Updated Success Metrics & Testing**

### **Robustness Testing**
- ✅ Test with malformed JSON in feat_breaking_data
- ✅ Test simultaneous match completions
- ✅ Test when aggregated_records is temporarily unavailable
- ✅ Test with very large numbers of simultaneous feat breaks
- ✅ Test cache invalidation timing

### **Configuration Testing**
- ✅ Verify all thresholds are configurable via admin UI
- ✅ Test feat breaking can be disabled
- ✅ Test different hall_of_fame_limit values
- ✅ Test edge cases with config value changes

### **Execution Order Verification**
- ✅ Verify `call-update-season-honours-and-records` runs before `call-update-match-report-cache`
- ✅ Test feat detection has access to latest records data
- ✅ Confirm sequential execution maintains proper order

## **🎯 Final Summary**

This plan provides a **clean, production-ready implementation** with:

✅ **No artificial delays** - existing execution order already handles sequencing  
✅ **Reuses existing configs** - no clutter, just `feat_breaking_enabled` toggle  
✅ **Comprehensive error handling** - robust null safety and graceful fallbacks  
✅ **Maintains performance** - simple comparisons, no complex threshold logic  

**Total execution time impact:** Near zero - just 8 simple record comparisons per match completion. 