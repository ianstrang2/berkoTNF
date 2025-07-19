# Season Race Graph Implementation Plan

## Overview

Add a "Graph" tab to the Table navigation (alongside "Half Season" and "Whole Season") that displays a race-for-the-title line chart showing the cumulative points progression of the current top 5 season leaders with a vertical line marking the half-season date (June 30th).

## Architecture Overview

This implementation follows the established patterns:
1. **Edge Function** (`call-update-season-race-data`) → calls SQL function  
2. **SQL Function** (`update_aggregated_season_race_data.sql`) → populates aggregated table
3. **API Endpoint** (`/api/season-race-data`) → serves pre-aggregated data
4. **Navigation** → Add "Graph" as third table option
5. **Component** → Use existing Chart component with multiple lines

## 1. Database Changes

### Create Aggregated Table

```sql
-- In your database migration or via Supabase SQL editor
CREATE TABLE IF NOT EXISTS public.aggregated_season_race_data (
    race_data_id SERIAL PRIMARY KEY,
    season_year INTEGER NOT NULL,
    player_data JSONB NOT NULL, -- Array of player race data
    last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_season_race_data_year ON public.aggregated_season_race_data(season_year);
```

**Data Structure**: `player_data` will contain:
```json
[
  {
    "player_id": 123,
    "name": "Steve McGrail", 
    "cumulative_data": [
      {"date": "2025-01-15", "points": 20, "match_number": 1},
      {"date": "2025-01-22", "points": 40, "match_number": 2},
      ...
    ]
  },
  ...
]
```

## 2. SQL Function Implementation

### File: `sql/update_aggregated_season_race_data.sql`

```sql
-- sql/update_aggregated_season_race_data.sql
CREATE OR REPLACE FUNCTION update_aggregated_season_race_data()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    current_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
    inserted_count INT := 0;
BEGIN
    RAISE NOTICE 'Starting update_aggregated_season_race_data for year %...', current_year;

    -- Delete existing data for current year
    DELETE FROM aggregated_season_race_data WHERE season_year = current_year;

    -- Calculate race data
    WITH current_season_matches AS (
        SELECT m.match_id, m.match_date, pm.player_id, p.name,
               calculate_match_fantasy_points(
                   COALESCE(pm.result, 'loss'), 
                   COALESCE(pm.heavy_win, false), 
                   COALESCE(pm.heavy_loss, false), 
                   COALESCE(pm.clean_sheet, false)
               ) as fantasy_points
        FROM matches m
        JOIN player_matches pm ON m.match_id = pm.match_id  
        JOIN players p ON pm.player_id = p.player_id
        WHERE EXTRACT(YEAR FROM m.match_date) = current_year
          AND p.is_ringer = false
        ORDER BY m.match_date, m.match_id
    ),
    total_season_points AS (
        SELECT player_id, name, SUM(fantasy_points) as total_points
        FROM current_season_matches
        GROUP BY player_id, name
    ),
    top_5_players AS (
        SELECT player_id, name, total_points,
               ROW_NUMBER() OVER (ORDER BY total_points DESC, name ASC) as rank
        FROM total_season_points
        WHERE total_points > 0
        ORDER BY total_points DESC, name ASC
        LIMIT 5
    ),
    cumulative_race_data AS (
        SELECT tp.player_id, tp.name,
               jsonb_agg(
                   jsonb_build_object(
                       'date', csm.match_date::date,
                       'points', SUM(csm.fantasy_points) OVER (
                           PARTITION BY tp.player_id 
                           ORDER BY csm.match_date, csm.match_id 
                           ROWS UNBOUNDED PRECEDING
                       ),
                       'match_number', ROW_NUMBER() OVER (
                           PARTITION BY tp.player_id 
                           ORDER BY csm.match_date, csm.match_id
                       )
                   ) ORDER BY csm.match_date, csm.match_id
               ) as cumulative_data
        FROM top_5_players tp
        JOIN (
            SELECT DISTINCT player_id, match_id, match_date, fantasy_points
            FROM current_season_matches
        ) csm ON tp.player_id = csm.player_id
        GROUP BY tp.player_id, tp.name
    ),
    final_player_data AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'player_id', player_id,
                'name', name,
                'cumulative_data', cumulative_data
            ) ORDER BY player_id
        ) as player_data_json
        FROM cumulative_race_data
    )
    INSERT INTO aggregated_season_race_data (season_year, player_data)
    SELECT current_year, COALESCE(player_data_json, '[]'::jsonb)
    FROM final_player_data;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % race data records for year %', inserted_count, current_year;

    -- Update cache metadata
    INSERT INTO cache_metadata (cache_key, last_invalidated, dependency_type)
    VALUES ('season_race_data', NOW(), 'season_race_data')
    ON CONFLICT (cache_key) DO UPDATE SET last_invalidated = NOW();

    RAISE NOTICE 'update_aggregated_season_race_data completed successfully.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_aggregated_season_race_data: %', SQLERRM;
END;
$$;
```

## 3. Edge Function Implementation

### File: `supabase/functions/call-update-season-race-data/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FUNCTION_NAME = 'call-update-season-race-data';
const TARGET_RPC = 'update_aggregated_season_race_data';

console.log(`Initializing Supabase Edge Function: ${FUNCTION_NAME}`);

async function callDatabaseFunction(supabase: SupabaseClient): Promise<{ success: boolean; message: string; error?: string }> {
  console.log(`[${FUNCTION_NAME}] Calling RPC: ${TARGET_RPC}...`);
  const startTime = Date.now();
  try {
    const { error } = await supabase.rpc(TARGET_RPC);

    if (error) {
      console.error(`[${FUNCTION_NAME}] Error calling RPC ${TARGET_RPC}:`, error);
      throw new Error(`Database function error: ${error.message}`);
    }
    const endTime = Date.now();
    const message = `${TARGET_RPC} executed successfully in ${endTime - startTime}ms.`;
    console.log(`[${FUNCTION_NAME}] ${message}`);
    return { success: true, message };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${FUNCTION_NAME}] CRITICAL ERROR calling ${TARGET_RPC}:`, error);
    return { success: false, message: `Failed to execute ${TARGET_RPC}: ${errorMessage}`, error: errorMessage };
  }
}

// Standard Handler Boilerplate
serve(async (req: Request) => {
  console.log(`[${FUNCTION_NAME}] Request received: ${req.method} ${req.url}`);
  if (req.method === 'OPTIONS') { 
    return new Response('ok', { 
      headers: {
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      } 
    }); 
  }

  let supabase: SupabaseClient | null = null;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase env vars.');
    supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  } catch (initError) {
    console.error(`[${FUNCTION_NAME}] Client init error:`, initError);
    return new Response(JSON.stringify({ success: false, error: `Client init error: ${initError.message}` }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
    });
  }

  let result: { success: boolean; message: string; error?: string };
  try {
    result = await callDatabaseFunction(supabase);
  } catch (handlerError) {
    console.error(`[${FUNCTION_NAME}] Unhandled execution error:`, handlerError);
    result = { success: false, message: `Unexpected handler error: ${handlerError.message}`, error: handlerError.message };
  }

  return new Response(JSON.stringify(result), { 
    status: result.success ? 200 : 500, 
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
  });
});

console.log(`Edge Function ${FUNCTION_NAME} listener started.`);
```

## 4. Cache Configuration Updates

### File: `src/lib/cache/constants.ts`

```typescript
export const CACHE_TAGS = {
  // ... existing tags ...
  SEASON_RACE_DATA: 'season_race_data', // ADD THIS LINE
};

// Update ALL_MATCH_RELATED_TAGS to include the new tag
export const ALL_MATCH_RELATED_TAGS = [
  // ... existing tags ...
  CACHE_TAGS.SEASON_RACE_DATA, // ADD THIS LINE
];
```

### File: `src/app/api/admin/trigger-stats-update/route.ts`

```typescript
// Add to FUNCTIONS_TO_CALL array:
const FUNCTIONS_TO_CALL: Array<{ name: string; tag?: string; tags?: string[] }> = [
  // ... existing functions ...
  { name: 'call-update-season-race-data', tag: CACHE_TAGS.SEASON_RACE_DATA }, // ADD THIS LINE
];
```

## 5. API Endpoint Implementation

### File: `src/app/api/season-race-data/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const currentYear = new Date().getFullYear();
    
    const raceData = await prisma.aggregated_season_race_data.findFirst({
      where: { season_year: currentYear },
      select: { player_data: true, last_updated: true }
    });

    if (!raceData) {
      console.warn(`No season race data found for year ${currentYear}`);
      return NextResponse.json({
        success: true,
        data: { players: [], lastUpdated: null }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        players: raceData.player_data,
        lastUpdated: raceData.last_updated
      }
    });

  } catch (error) {
    // Enhanced error logging for production debugging
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'UnknownError',
      timestamp: new Date().toISOString(),
      endpoint: '/api/season-race-data',
      method: 'GET',
      currentYear: new Date().getFullYear()
    };
    
    console.error('Season race data API error:', errorDetails);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch season race data',
        // Only include detailed error info in development
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}
```

## 6. Navigation Updates

### File: `src/components/navigation/NavigationTabs.component.tsx`

```typescript
// In getSecondaryOptions() function, update the 'table' case:
case 'table':
  return [
    {
      key: 'half',
      label: 'Half Season',
      href: '/table/half',
      active: secondarySection === 'half'
    },
    {
      key: 'whole', 
      label: 'Whole Season',
      href: '/table/whole',
      active: secondarySection === 'whole'
    },
    {
      key: 'graph', // ADD THIS OPTION
      label: 'Graph',
      href: '/table/graph',
      active: secondarySection === 'graph'
    }
  ];
```

## 7. Page Implementation

### File: `src/app/table/graph/page.tsx`

```typescript
'use client';
import React, { Suspense } from 'react';
import SeasonRaceGraph from '@/components/tables/SeasonRaceGraph.component';
import MainLayout from '@/components/layout/MainLayout.layout';
import { ErrorBoundary } from '@/components/ui-kit/ErrorBoundary.component';

// Loading component
const LoadingIndicator = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
        <span className="sr-only">Loading...</span>
      </div>
      <p className="mt-2 text-slate-600">Loading...</p>
    </div>
  </div>
);

function TableGraphContent() {
  return (
    <ErrorBoundary>
      <SeasonRaceGraph />
    </ErrorBoundary>
  );
}

export default function TableGraphPage() {
  return (
    <MainLayout>
      <Suspense fallback={<LoadingIndicator />}>
        <TableGraphContent />
      </Suspense>
    </MainLayout>
  );
}
```

## 8. Component Implementation

### File: `src/components/tables/SeasonRaceGraph.component.tsx`

```typescript
'use client';
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';

interface PlayerRaceData {
  player_id: number;
  name: string;
  cumulative_data: Array<{
    date: string;
    points: number;
    match_number: number;
  }>;
}

interface SeasonRaceData {
  players: PlayerRaceData[];
  lastUpdated: string | null;
}

const PLAYER_COLORS = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink  
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
];

const SeasonRaceGraph: React.FC = () => {
  const [data, setData] = useState<SeasonRaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/season-race-data');
        if (!response.ok) {
          throw new Error('Failed to fetch season race data');
        }
        
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }
        
        setData(result.data);
      } catch (err) {
        console.error('Error fetching season race data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Transform data for Recharts
  const chartData = React.useMemo(() => {
    if (!data || !data.players || data.players.length === 0) return [];

    // Get all unique dates from all players
    const allDates = new Set<string>();
    data.players.forEach(player => {
      player.cumulative_data.forEach(point => {
        allDates.add(point.date);
      });
    });

    const sortedDates = Array.from(allDates).sort();

    // Track last known values for each player (carry-forward logic)
    const lastKnownValues: Record<string, number> = {};
    
    // Initialize all players to 0
    data.players.forEach(player => {
      lastKnownValues[player.name] = 0;
    });

    // Create chart data points
    return sortedDates.map(date => {
      const dataPoint: any = { date };
      
      data.players.forEach(player => {
        // Find points for this player on this exact date
        const playerPointsForDate = player.cumulative_data
          .filter(point => point.date === date);
        
        if (playerPointsForDate.length > 0) {
          // Update last known value with the latest point for this date
          const latestPoint = playerPointsForDate[playerPointsForDate.length - 1];
          lastKnownValues[player.name] = latestPoint.points;
        }
        
        // Use last known value (carry forward) - never drops to 0 unless player never played
        dataPoint[player.name] = lastKnownValues[player.name];
      });

      return dataPoint;
    });
  }, [data]);

  // Calculate half-season date (June 30th of current year)
  const halfSeasonDate = `${new Date().getFullYear()}-06-30`;

  if (loading) {
    return (
      <div className="w-full px-3">
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
          <div className="text-center">
            <h6 className="mb-2 text-lg">Loading season race graph...</h6>
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-3">
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
          <div className="text-center py-4">
            <h5 className="mb-2 text-red-600">Error Loading Graph</h5>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.players || data.players.length === 0) {
    return (
      <div className="w-full px-3">
        <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border p-4">
          <div className="text-center py-4">
            <h5 className="mb-2">No Data Available</h5>
            <p className="text-sm text-gray-600">Season race data is not yet available.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-3">
      <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border mb-6">
        <div className="border-black/12.5 rounded-t-2xl border-b-0 border-solid p-4">
          <h5 className="mb-0">Race for the Season Title</h5>
          <p className="text-sm text-gray-600 mt-1">Cumulative points progression of current top 5 season leaders</p>
        </div>
        <div className="p-4">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-current text-gray-200" />
                <XAxis 
                  dataKey="date" 
                  className="text-sm fill-current text-gray-600"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: '2-digit' 
                  })}
                />
                <YAxis 
                  className="text-sm fill-current text-gray-600"
                  label={{ value: 'Points', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E0E0E0',
                    borderRadius: '0.375rem',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric'
                  })}
                />
                <Legend />
                
                {/* Half-season reference line */}
                <ReferenceLine 
                  x={halfSeasonDate} 
                  stroke="#6B7280" 
                  strokeDasharray="5 5"
                  label={{ value: "Half Season", position: "top" }}
                />
                
                {/* Player lines */}
                {data.players.map((player, index) => (
                  <Line
                    key={player.player_id}
                    type="monotone"
                    dataKey={player.name}
                    stroke={PLAYER_COLORS[index % PLAYER_COLORS.length]}
                    strokeWidth={3}
                    dot={{ fill: 'white', stroke: PLAYER_COLORS[index % PLAYER_COLORS.length], strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonRaceGraph;
```

### File: `src/components/tables/index.ts`

```typescript
export { default as CurrentHalfSeason } from './CurrentHalfSeason.component';
export { default as OverallSeasonPerformance } from './OverallSeasonPerformance.component';
export { default as SeasonRaceGraph } from './SeasonRaceGraph.component'; // ADD THIS LINE
```

## 9. Important Implementation Notes

### 9.1 SQL Data Integrity
The SQL function includes `DISTINCT` in the join to prevent potential duplicate records from affecting cumulative calculations. This ensures accurate point totals even if there are data inconsistencies.

### 9.2 Frontend Carry-Forward Logic
The chart data transformation uses **carry-forward logic** - when a player doesn't play on a given date, their points remain at their last known value rather than dropping to 0. This is crucial for accurate race visualization.

**Example**: If Steve McGrail has 40 points on Jan 15th but doesn't play until Feb 1st, he shows 40 points throughout that entire period. Without this logic, his line would incorrectly drop to 0 and spike back up.

### 9.3 Enhanced Error Logging  
The API includes comprehensive error logging with stack traces and context for production debugging, while only exposing minimal error details to clients in production.

## 10. Deployment Script Updates

### File: `deploy_all.ps1`

You need to update two arrays in your deployment script:

**1. Add the new edge function to `$edgeFunctionNames`:**
```powershell
$edgeFunctionNames = @(
    "call-update-all-time-stats",
    "call-update-half-and-full-season-stats", 
    "call-update-hall-of-fame",
    "call-update-match-report-cache",
    "call-update-recent-performance",
    "call-update-season-honours-and-records",
    "call-update-personal-bests",
    // "call-update-player-power-rating", // Removed - replaced by update_half_and_full_season_stats
    "call-update-player-profile-stats",
    "call-update-season-race-data"  # ADD THIS LINE
)
```

**2. Add the new SQL file to `$sqlDeploymentOrder`:**
```powershell
$sqlDeploymentOrder = @(
    "helpers.sql", # Always first if it exists
    "update_aggregated_all_time_stats.sql", # Must run before hall_of_fame
    "update_aggregated_hall_of_fame.sql", # Depends on all_time_stats
    # The rest can run in any order relative to each other but after dependencies
    "update_aggregated_match_report_cache.sql",
    "update_aggregated_recent_performance.sql", 
    "update_aggregated_season_honours_and_records.sql",
    "update_half_and_full_season_stats.sql",
    "update_aggregated_personal_bests.sql",
    // "update_aggregated_player_power_rating.sql", // REMOVED - replaced by update_half_and_full_season_stats
    "update_aggregated_player_profile_stats.sql",
    "update_aggregated_season_race_data.sql"  # ADD THIS LINE
)
```

The new SQL function has no dependencies so it can go at the end of the deployment order.

## 11. Deployment Steps

### 11.1 Database Setup
1. Run the SQL to create `aggregated_season_race_data` table
2. Deploy the SQL function `update_aggregated_season_race_data.sql` to your `/sql` folder
3. Test the function manually: `SELECT update_aggregated_season_race_data();`

### 11.2 Edge Function Deployment  
1. Create the edge function directory and file
2. Deploy using your existing Supabase deployment script
3. Test edge function in Supabase dashboard

### 11.3 Frontend Changes
1. Update cache constants and trigger-stats-update
2. Create API endpoint
3. Update navigation 
4. Create page and component
5. Test the full flow

### 11.4 Testing
1. **Manual Admin Trigger**: Use admin/info page "Update Stats" button
2. **Post-Match Trigger**: Complete/edit a match and verify stats update
3. **Graph Display**: Navigate to `/table/graph` and verify data loads
4. **Cache Invalidation**: Verify graph updates after stats refresh

## 12. Verification Checklist

- [ ] Database table created
- [ ] SQL function deployed and tested
- [ ] Edge function deployed and callable  
- [ ] Cache constants updated
- [ ] trigger-stats-update includes new function
- [ ] API endpoint returns data
- [ ] Navigation shows Graph tab
- [ ] Page loads without errors
- [ ] Component displays chart correctly
- [ ] Half-season line appears at June 30th
- [ ] Admin info page triggers update correctly
- [ ] Match completion triggers update correctly
- [ ] Cache invalidation works properly

## 13. Notes

- **Tie-breaking**: Uses total points DESC, then name ASC for consistent top 5 selection
- **Data Structure**: Pre-aggregated for performance, updated via edge functions  
- **Styling**: Matches existing soft-UI patterns (rounded corners, shadows, purple/pink theme)
- **Error Handling**: Graceful fallbacks for no data, loading states, and errors
- **Responsive**: Chart adapts to container size
- **Performance**: Minimal client-side processing, data pre-calculated server-side

This implementation integrates seamlessly with your existing architecture and maintains consistency with all established patterns. 