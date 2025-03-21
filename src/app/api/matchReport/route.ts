import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Add dynamic configuration to prevent static generation
export const dynamic = 'force-dynamic';

const serializeData = (data) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

export async function GET() {
  try {
    console.log('Starting match report generation...');

    // Get latest match using raw SQL
    console.log('Fetching latest match...');
    const latestMatches = await prisma.$queryRaw`
      SELECT 
        m.*,
        json_agg(json_build_object(
          'player_id', pm.player_id,
          'team', pm.team,
          'goals', pm.goals,
          'result', pm.result,
          'player', json_build_object(
            'player_id', p.player_id,
            'name', p.name,
            'is_ringer', p.is_ringer,
            'is_retired', p.is_retired
          )
        )) as player_matches
      FROM matches m
      LEFT JOIN player_matches pm ON m.match_id = pm.match_id
      LEFT JOIN players p ON pm.player_id = p.player_id
      WHERE m.match_date IS NOT NULL
      GROUP BY m.match_id
      ORDER BY m.match_date DESC
      LIMIT 1
    `;
    
    const latestMatch = latestMatches[0];
    console.log('Latest match:', latestMatch);
    console.log('Latest match date:', latestMatch?.match_date);

    if (!latestMatch) {
      console.log('No matches found');
      return NextResponse.json({
        success: false,
        error: 'No matches found'
      });
    }

    try {
      // Get active players from the latest match
      const activePlayerIds = await prisma.$queryRaw<Array<{ player_id: number }>>`
        SELECT DISTINCT p.player_id
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        WHERE pm.match_id = ${latestMatch.match_id}
        AND p.is_retired = false
        AND p.is_ringer = false
      `;
      
      const activePlayerIdList = activePlayerIds.map(p => p.player_id);

      // Format match data
      console.log('Formatting match data for match_id:', latestMatch.match_id);
      const formattedMatch = await prisma.$queryRaw`
        WITH match_players AS (
          SELECT 
            m.match_id,
            m.match_date,
            m.team_a_score,
            m.team_b_score,
            p.name,
            p.is_ringer,
            p.is_retired,
            pm.team,
            pm.goals
          FROM matches m
          LEFT JOIN player_matches pm ON m.match_id = pm.match_id
          LEFT JOIN players p ON pm.player_id = p.player_id
          WHERE m.match_id = ${latestMatch.match_id}
        )
        SELECT 
          match_id,
          match_date,
          team_a_score,
          team_b_score,
          array_agg(DISTINCT name) FILTER (WHERE team = 'A' AND is_retired = false) as team_a_players,
          array_agg(DISTINCT name) FILTER (WHERE team = 'B' AND is_retired = false) as team_b_players,
          array_agg(json_build_object('name', name, 'goals', goals)) FILTER (WHERE team = 'A' AND is_retired = false AND goals > 0) as team_a_scorers,
          array_agg(json_build_object('name', name, 'goals', goals)) FILTER (WHERE team = 'B' AND is_retired = false AND goals > 0) as team_b_scorers
        FROM match_players
        GROUP BY match_id, match_date, team_a_score, team_b_score
      `;
      console.log('Formatted match data:', formattedMatch);

      // Format scorers into strings
      const formatScorers = (scorers, teamScore) => {
        if (!scorers || !Array.isArray(scorers)) return '';
        
        // Calculate total goals from scorers
        const totalScorerGoals = scorers.reduce((sum, s) => sum + (s?.goals || 0), 0);
        
        // Create array of scorer strings
        const scorerStrings = scorers
          .filter(s => s && s.name && s.goals)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(s => `${s.name} (${s.goals})`);

        // Add OG if there's a difference
        const ownGoals = teamScore - totalScorerGoals;
        if (ownGoals > 0) {
          scorerStrings.push(`OG (${ownGoals})`);
        }

        return scorerStrings.join(', ');
      };

      // Remove any null values from arrays and format scorers
      const cleanedMatch = {
        ...formattedMatch[0],
        team_a_players: formattedMatch[0].team_a_players.filter(Boolean),
        team_b_players: formattedMatch[0].team_b_players.filter(Boolean),
        team_a_scorers: formatScorers(formattedMatch[0].team_a_scorers, formattedMatch[0].team_a_score),
        team_b_scorers: formatScorers(formattedMatch[0].team_b_scorers, formattedMatch[0].team_b_score)
      };

      // Check for milestones (games played) - only for active players
      console.log('Checking for game milestones...');
      const gamesMilestones = await prisma.$queryRaw`
        SELECT p.name, COUNT(*) as total_games
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE m.match_date <= ${latestMatch.match_date}
        AND p.is_ringer = false
        AND p.is_retired = false
        AND p.player_id = ANY(${activePlayerIdList}::int[])
        GROUP BY p.player_id, p.name
        HAVING COUNT(*) >= 50 AND COUNT(*) % 50 = 0
      `;
      console.log('Games milestones:', gamesMilestones);

      // Check for goals milestones - only for active players
      console.log('Checking for goals milestones...');
      const goalsMilestones = await prisma.$queryRaw`
        SELECT p.name, SUM(pm.goals) as total_goals
        FROM players p
        JOIN player_matches pm ON p.player_id = pm.player_id
        JOIN matches m ON pm.match_id = m.match_id
        WHERE m.match_date <= ${latestMatch.match_date}
        AND p.is_ringer = false
        AND p.is_retired = false
        AND p.player_id = ANY(${activePlayerIdList}::int[])
        GROUP BY p.player_id, p.name
        HAVING SUM(pm.goals) >= 50 AND SUM(pm.goals) % 50 = 0
      `;
      console.log('Goals milestones:', goalsMilestones);

      // Checking for streaks
      console.log('Checking for streaks...');
      try {
        const streaks = await prisma.$queryRaw`
          WITH player_recent_matches AS (
            -- Get up to 15 most recent matches for each player
            SELECT 
              p.player_id,
              p.name,
              pm.result,
              m.match_date,
              ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as match_num
            FROM players p
            JOIN player_matches pm ON p.player_id = pm.player_id
            JOIN matches m ON pm.match_id = m.match_id
            WHERE p.is_ringer = false 
            AND p.is_retired = false
            AND m.match_date <= ${latestMatch.match_date}
            AND p.player_id = ANY(${activePlayerIdList}::int[])
            ORDER BY p.player_id, m.match_date DESC
          ),
          streak_segments AS (
            -- Find where streaks break
            SELECT
              player_id,
              name,
              match_num,
              result,
              -- 1 when result changes from previous match, 0 when same
              CASE 
                WHEN result <> LAG(result, 1, result) OVER (PARTITION BY player_id ORDER BY match_num) THEN 1
                ELSE 0
              END as break_point
            FROM player_recent_matches
            WHERE match_num <= 15
          ),
          streak_groups AS (
            -- Group consecutive same results
            SELECT
              player_id,
              name,
              match_num,
              result,
              SUM(break_point) OVER (PARTITION BY player_id ORDER BY match_num) as group_id
            FROM streak_segments
          ),
          streak_counts AS (
            -- Count length of each streak group
            SELECT
              name,
              result,
              MIN(match_num) as first_match,
              COUNT(*) as streak_length
            FROM streak_groups
            GROUP BY name, result, group_id
          ),
          qualified_streaks AS (
            -- Only include streaks that meet criteria
            SELECT
              name,
              CASE 
                WHEN result = 'win' THEN 'win'
                WHEN result = 'loss' THEN 'loss'
                WHEN result = 'draw' THEN 'draw'
              END as streak_type,
              streak_length as streak_count
            FROM streak_counts
            WHERE first_match = 1 -- Must include most recent match
            AND (
              (result = 'win' AND streak_length >= 4) OR
              (result = 'loss' AND streak_length >= 4)
            )
          ),
          -- Special handling for unbeaten/winless streaks that can include multiple result types
          unbeaten_streaks AS (
            -- Count consecutive games (win,draw) without a loss
            SELECT
              name,
              'unbeaten' as streak_type,
              COUNT(*) as streak_count
            FROM player_recent_matches
            WHERE result IN ('win', 'draw')
            AND match_num <= 15
            GROUP BY name
            HAVING MIN(match_num) = 1 -- Must include most recent match
            AND MAX(match_num) = COUNT(*) -- Must be consecutive
            AND COUNT(*) >= 6
          ),
          winless_streaks AS (
            -- Count consecutive games (loss,draw) without a win
            SELECT
              name,
              'winless' as streak_type,
              COUNT(*) as streak_count
            FROM player_recent_matches
            WHERE result IN ('loss', 'draw')
            AND match_num <= 15
            GROUP BY name
            HAVING MIN(match_num) = 1 -- Must include most recent match
            AND MAX(match_num) = COUNT(*) -- Must be consecutive
            AND COUNT(*) >= 6
          ),
          all_streaks AS (
            SELECT * FROM qualified_streaks
            UNION ALL
            SELECT * FROM unbeaten_streaks
            UNION ALL
            SELECT * FROM winless_streaks
          )
          SELECT DISTINCT ON (name)
            name,
            streak_type,
            streak_count
          FROM all_streaks
          ORDER BY name, streak_count DESC
        `;
        console.log('Streaks:', streaks);
        
        // Get current half-season dates
        const now = new Date();
        const currentYear = now.getFullYear();
        const isFirstHalf = now.getMonth() < 6;  // 0-5 is first half (Jan-June)
        const halfSeasonStartDate = isFirstHalf ? `${currentYear}-01-01` : `${currentYear}-07-01`;
        const halfSeasonEndDate = isFirstHalf ? `${currentYear}-06-30` : `${currentYear}-12-31`;
        
        // Current Half-Season Goal Leaders - only show changes where new_leader != previous_leader
        const halfSeasonGoalLeaders = await prisma.$queryRaw`
          WITH current_leaders AS (
            SELECT 
              p.name,
              SUM(pm.goals) as goals,
              ROW_NUMBER() OVER (ORDER BY SUM(pm.goals) DESC) as rank
            FROM players p
            JOIN player_matches pm ON p.player_id = pm.player_id
            JOIN matches m ON pm.match_id = m.match_id
            WHERE m.match_date <= ${latestMatch.match_date}
            AND m.match_date >= ${halfSeasonStartDate}::date
            AND m.match_date <= ${halfSeasonEndDate}::date
            AND p.is_ringer = false
            AND p.is_retired = false
            AND p.player_id = ANY(${activePlayerIdList}::int[])
            GROUP BY p.name
            HAVING SUM(pm.goals) > 0
          ),
          previous_leaders AS (
            SELECT 
              p.name,
              SUM(pm.goals) as goals,
              ROW_NUMBER() OVER (ORDER BY SUM(pm.goals) DESC) as rank
            FROM players p
            JOIN player_matches pm ON p.player_id = pm.player_id
            JOIN matches m ON pm.match_id = m.match_id
            WHERE m.match_date < ${latestMatch.match_date}
            AND m.match_date >= ${halfSeasonStartDate}::date
            AND m.match_date <= ${halfSeasonEndDate}::date
            AND p.is_ringer = false
            AND p.is_retired = false
            AND p.player_id = ANY(${activePlayerIdList}::int[])
            GROUP BY p.name
            HAVING SUM(pm.goals) > 0
          )
          SELECT 
            cl.name as new_leader,
            cl.goals as new_leader_goals,
            pl.name as previous_leader,
            pl.goals as previous_leader_goals,
            CASE 
              WHEN pl.goals IS NULL THEN 'new_leader'
              WHEN cl.goals = pl.goals AND cl.name != pl.name THEN 'tied'
              WHEN cl.name != pl.name THEN 'overtake'
              WHEN cl.name = pl.name THEN 'remains'
              ELSE NULL
            END as change_type
          FROM current_leaders cl
          LEFT JOIN previous_leaders pl ON pl.rank = 1
          WHERE cl.rank = 1
          AND (
            pl.name IS NULL  -- New leader (no previous leader)
            OR (cl.name != pl.name)  -- Different player
            OR (cl.name = pl.name)  -- Same player (remains at top)
          )`;

        // Current Half-Season Fantasy Leaders - only show changes where new_leader != previous_leader
        const halfSeasonFantasyLeaders = await prisma.$queryRaw`
          WITH current_leaders AS (
            SELECT 
              p.name,
              SUM(
                CASE 
                  WHEN pm.result = 'win' AND pm.heavy_win = true AND 
                       ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                  THEN 40
                  WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
                  WHEN pm.result = 'win' AND 
                       ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                  THEN 30
                  WHEN pm.result = 'win' THEN 20
                  WHEN pm.result = 'draw' THEN 10
                  WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
                  WHEN pm.result = 'loss' THEN -10
                  ELSE 0
                END
              ) as fantasy_points,
              ROW_NUMBER() OVER (ORDER BY SUM(
                CASE 
                  WHEN pm.result = 'win' AND pm.heavy_win = true AND 
                       ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                  THEN 40
                  WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
                  WHEN pm.result = 'win' AND 
                       ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                  THEN 30
                  WHEN pm.result = 'win' THEN 20
                  WHEN pm.result = 'draw' THEN 10
                  WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
                  WHEN pm.result = 'loss' THEN -10
                  ELSE 0
                END
              ) DESC) as rank
            FROM players p
            JOIN player_matches pm ON p.player_id = pm.player_id
            JOIN matches m ON pm.match_id = m.match_id
            WHERE m.match_date <= ${latestMatch.match_date}
            AND m.match_date >= ${halfSeasonStartDate}::date
            AND m.match_date <= ${halfSeasonEndDate}::date
            AND p.is_ringer = false
            AND p.is_retired = false
            AND p.player_id = ANY(${activePlayerIdList}::int[])
            GROUP BY p.name
          ),
          previous_leaders AS (
            SELECT 
              p.name,
              SUM(
                CASE 
                  WHEN pm.result = 'win' AND pm.heavy_win = true AND 
                       ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                  THEN 40
                  WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
                  WHEN pm.result = 'win' AND 
                       ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                  THEN 30
                  WHEN pm.result = 'win' THEN 20
                  WHEN pm.result = 'draw' THEN 10
                  WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
                  WHEN pm.result = 'loss' THEN -10
                  ELSE 0
                END
              ) as fantasy_points,
              ROW_NUMBER() OVER (ORDER BY SUM(
                CASE 
                  WHEN pm.result = 'win' AND pm.heavy_win = true AND 
                       ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                  THEN 40
                  WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
                  WHEN pm.result = 'win' AND 
                       ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                  THEN 30
                  WHEN pm.result = 'win' THEN 20
                  WHEN pm.result = 'draw' THEN 10
                  WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
                  WHEN pm.result = 'loss' THEN -10
                  ELSE 0
                END
              ) DESC) as rank
            FROM players p
            JOIN player_matches pm ON p.player_id = pm.player_id
            JOIN matches m ON pm.match_id = m.match_id
            WHERE m.match_date < ${latestMatch.match_date}
            AND m.match_date >= ${halfSeasonStartDate}::date
            AND m.match_date <= ${halfSeasonEndDate}::date
            AND p.is_ringer = false
            AND p.is_retired = false
            AND p.player_id = ANY(${activePlayerIdList}::int[])
            GROUP BY p.name
          )
          SELECT 
            cl.name as new_leader,
            cl.fantasy_points as new_leader_points,
            pl.name as previous_leader,
            pl.fantasy_points as previous_leader_points,
            CASE 
              WHEN pl.fantasy_points IS NULL THEN 'new_leader'
              WHEN cl.fantasy_points = pl.fantasy_points AND cl.name != pl.name THEN 'tied'
              WHEN cl.name != pl.name THEN 'overtake'
              WHEN cl.name = pl.name THEN 'remains'
              ELSE NULL
            END as change_type
          FROM current_leaders cl
          LEFT JOIN previous_leaders pl ON pl.rank = 1
          WHERE cl.rank = 1
          AND (
            pl.name IS NULL  -- New leader (no previous leader)
            OR (cl.name != pl.name)  -- Different player
            OR (cl.name = pl.name)  -- Same player (remains at top)
          )`;

        // Only run season queries if we're in the second half of the year
        let seasonGoalLeaders = [];
        let seasonFantasyLeaders = [];

        if (!isFirstHalf) {
          // Overall Season Goal Leaders - only show changes where new_leader != previous_leader
          seasonGoalLeaders = await prisma.$queryRaw`
            WITH current_leaders AS (
              SELECT 
                p.name,
                SUM(pm.goals) as goals,
                ROW_NUMBER() OVER (ORDER BY SUM(pm.goals) DESC) as rank
              FROM players p
              JOIN player_matches pm ON p.player_id = pm.player_id
              JOIN matches m ON pm.match_id = m.match_id
              WHERE m.match_date <= ${latestMatch.match_date}
              AND EXTRACT(YEAR FROM m.match_date) = ${currentYear}
              AND p.is_ringer = false
              AND p.is_retired = false
              AND p.player_id = ANY(${activePlayerIdList}::int[])
              GROUP BY p.name
              HAVING SUM(pm.goals) > 0
            ),
            previous_leaders AS (
              SELECT 
                p.name,
                SUM(pm.goals) as goals,
                ROW_NUMBER() OVER (ORDER BY SUM(pm.goals) DESC) as rank
              FROM players p
              JOIN player_matches pm ON p.player_id = pm.player_id
              JOIN matches m ON pm.match_id = m.match_id
              WHERE m.match_date < ${latestMatch.match_date}
              AND EXTRACT(YEAR FROM m.match_date) = ${currentYear}
              AND p.is_ringer = false
              AND p.is_retired = false
              AND p.player_id = ANY(${activePlayerIdList}::int[])
              GROUP BY p.name
              HAVING SUM(pm.goals) > 0
            )
            SELECT 
              cl.name as new_leader,
              cl.goals as new_leader_goals,
              pl.name as previous_leader,
              pl.goals as previous_leader_goals,
              CASE 
                WHEN pl.goals IS NULL THEN 'new_leader'
                WHEN cl.goals = pl.goals AND cl.name != pl.name THEN 'tied'
                WHEN cl.name != pl.name THEN 'overtake'
                WHEN cl.name = pl.name THEN 'remains'
                ELSE NULL
              END as change_type
            FROM current_leaders cl
            LEFT JOIN previous_leaders pl ON pl.rank = 1
            WHERE cl.rank = 1
            AND (
              pl.name IS NULL  -- New leader (no previous leader)
              OR (cl.name != pl.name)  -- Different player
              OR (cl.name = pl.name)  -- Same player (remains at top)
            )`;

          // Overall Season Fantasy Leaders - only show changes where new_leader != previous_leader
          seasonFantasyLeaders = await prisma.$queryRaw`
            WITH current_leaders AS (
              SELECT 
                p.name,
                SUM(
                  CASE 
                    WHEN pm.result = 'win' AND pm.heavy_win = true AND 
                         ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                    THEN 40
                    WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
                    WHEN pm.result = 'win' AND 
                         ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                    THEN 30
                    WHEN pm.result = 'win' THEN 20
                    WHEN pm.result = 'draw' THEN 10
                    WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
                    WHEN pm.result = 'loss' THEN -10
                    ELSE 0
                  END
                ) as fantasy_points,
                ROW_NUMBER() OVER (ORDER BY SUM(
                  CASE 
                    WHEN pm.result = 'win' AND pm.heavy_win = true AND 
                         ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                    THEN 40
                    WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
                    WHEN pm.result = 'win' AND 
                         ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                    THEN 30
                    WHEN pm.result = 'win' THEN 20
                    WHEN pm.result = 'draw' THEN 10
                    WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
                    WHEN pm.result = 'loss' THEN -10
                    ELSE 0
                  END
                ) DESC) as rank
              FROM players p
              JOIN player_matches pm ON p.player_id = pm.player_id
              JOIN matches m ON pm.match_id = m.match_id
              WHERE m.match_date <= ${latestMatch.match_date}
              AND EXTRACT(YEAR FROM m.match_date) = ${currentYear}
              AND p.is_ringer = false
              AND p.is_retired = false
              AND p.player_id = ANY(${activePlayerIdList}::int[])
              GROUP BY p.name
            ),
            previous_leaders AS (
              SELECT 
                p.name,
                SUM(
                  CASE 
                    WHEN pm.result = 'win' AND pm.heavy_win = true AND 
                         ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                    THEN 40
                    WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
                    WHEN pm.result = 'win' AND 
                         ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                    THEN 30
                    WHEN pm.result = 'win' THEN 20
                    WHEN pm.result = 'draw' THEN 10
                    WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
                    WHEN pm.result = 'loss' THEN -10
                    ELSE 0
                  END
                ) as fantasy_points,
                ROW_NUMBER() OVER (ORDER BY SUM(
                  CASE 
                    WHEN pm.result = 'win' AND pm.heavy_win = true AND 
                         ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                    THEN 40
                    WHEN pm.result = 'win' AND pm.heavy_win = true THEN 30
                    WHEN pm.result = 'win' AND 
                         ((pm.team = 'A' AND m.team_b_score = 0) OR (pm.team = 'B' AND m.team_a_score = 0))
                    THEN 30
                    WHEN pm.result = 'win' THEN 20
                    WHEN pm.result = 'draw' THEN 10
                    WHEN pm.result = 'loss' AND pm.heavy_loss = true THEN -20
                    WHEN pm.result = 'loss' THEN -10
                    ELSE 0
                  END
                ) DESC) as rank
              FROM players p
              JOIN player_matches pm ON p.player_id = pm.player_id
              JOIN matches m ON pm.match_id = m.match_id
              WHERE m.match_date < ${latestMatch.match_date}
              AND EXTRACT(YEAR FROM m.match_date) = ${currentYear}
              AND p.is_ringer = false
              AND p.is_retired = false
              AND p.player_id = ANY(${activePlayerIdList}::int[])
              GROUP BY p.name
            )
            SELECT 
              cl.name as new_leader,
              cl.fantasy_points as new_leader_points,
              pl.name as previous_leader,
              pl.fantasy_points as previous_leader_points,
              CASE 
                WHEN pl.fantasy_points IS NULL THEN 'new_leader'
                WHEN cl.fantasy_points = pl.fantasy_points AND cl.name != pl.name THEN 'tied'
                WHEN cl.name != pl.name THEN 'overtake'
                WHEN cl.name = pl.name THEN 'remains'
                ELSE NULL
              END as change_type
            FROM current_leaders cl
            LEFT JOIN previous_leaders pl ON pl.rank = 1
            WHERE cl.rank = 1
            AND (
              pl.name IS NULL  -- New leader (no previous leader)
              OR (cl.name != pl.name)  -- Different player
              OR (cl.name = pl.name)  -- Same player (remains at top)
            )`;
        }

        console.log('Checking for goal-scoring streaks...');
        try {
          const goalStreaks = await prisma.$queryRaw`
            WITH player_recent_matches AS (
              -- Get recent matches with goal info for each player
              SELECT 
                p.player_id,
                p.name,
                pm.match_id,
                m.match_date,
                COALESCE(pm.goals, 0) as goals,
                ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as match_num
              FROM players p
              JOIN player_matches pm ON p.player_id = pm.player_id
              JOIN matches m ON pm.match_id = m.match_id
              WHERE p.is_ringer = false 
              AND p.is_retired = false
              AND m.match_date <= ${latestMatch.match_date}
              AND p.player_id = ANY(${activePlayerIdList}::int[])
              ORDER BY p.player_id, m.match_date DESC
            ),
            scored_matches AS (
              -- Flag matches where player scored
              SELECT
                player_id,
                name,
                match_id,
                match_num,
                goals,
                CASE WHEN goals > 0 THEN 1 ELSE 0 END as scored_in_match
              FROM player_recent_matches
              WHERE match_num <= 15
            ),
            streak_segments AS (
              -- Identify where goal streaks break
              SELECT
                player_id,
                name,
                match_num,
                goals,
                scored_in_match,
                -- 1 when scoring status changes (scored -> didn't score or vice versa), 0 when same
                CASE 
                  WHEN scored_in_match <> LAG(scored_in_match, 1, scored_in_match) 
                       OVER (PARTITION BY player_id ORDER BY match_num) THEN 1
                  ELSE 0
                END as break_point
              FROM scored_matches
            ),
            streak_groups AS (
              -- Group consecutive matches with goals
              SELECT
                player_id,
                name,
                match_num,
                goals,
                scored_in_match,
                SUM(break_point) OVER (PARTITION BY player_id ORDER BY match_num) as group_id
              FROM streak_segments
            ),
            goal_streak_counts AS (
              -- Count length and total goals of each streak
              SELECT
                name,
                MIN(match_num) as first_match,
                COUNT(*) as streak_length,
                SUM(goals) as total_goals
              FROM streak_groups
              WHERE scored_in_match = 1 -- Only count streaks where player scored
              GROUP BY name, group_id
            )
            -- Only include qualifying goal streaks (3+ consecutive matches with goals)
            SELECT
              name,
              streak_length as matches_with_goals,
              total_goals as goals_in_streak
            FROM goal_streak_counts
            WHERE first_match = 1 -- Must include most recent match
            AND streak_length >= 3 -- At least 3 consecutive matches with goals
            ORDER BY streak_length DESC, total_goals DESC
          `;
          console.log('Goal-scoring streaks:', goalStreaks);

          // Build response DTO with all the data
          const response = {
            match: latestMatch,
            scorers: cleanedMatch,
            top6: [],
            bottom6: [],
            milestones: serializeData([...(gamesMilestones || []), ...(goalsMilestones || [])]),
            streaks: serializeData(streaks),
            goalStreaks: serializeData(goalStreaks), // Add the goal streaks to the response
            halfSeasonGoalLeaders: halfSeasonGoalLeaders?.length ? serializeData(halfSeasonGoalLeaders) : null,
            halfSeasonFantasyLeaders: halfSeasonFantasyLeaders?.length ? serializeData(halfSeasonFantasyLeaders) : null,
            seasonGoalLeaders: seasonGoalLeaders?.length ? serializeData(seasonGoalLeaders) : null,
            seasonFantasyLeaders: seasonFantasyLeaders?.length ? serializeData(seasonFantasyLeaders) : null,
          };

          // Prepare response
          console.log('Preparing response...');
          return NextResponse.json({
            success: true,
            data: {
              matchInfo: serializeData(cleanedMatch),
              gamesMilestones: serializeData(gamesMilestones),
              goalsMilestones: serializeData(goalsMilestones),
              streaks: serializeData(streaks),
              goalStreaks: serializeData(goalStreaks),
              halfSeasonGoalLeaders: serializeData(halfSeasonGoalLeaders),
              halfSeasonFantasyLeaders: serializeData(halfSeasonFantasyLeaders),
              seasonGoalLeaders: serializeData(seasonGoalLeaders),
              seasonFantasyLeaders: serializeData(seasonFantasyLeaders)
            }
          });
        } catch (queryError) {
          console.error('Error generating match report:', queryError);
          throw new Error('Failed to generate match report');
        }

      } catch (queryError) {
        console.error('SQL Query Error:', queryError);
        throw queryError; // Re-throw to be caught by outer catch
      }

    } catch (queryError) {
      console.error('SQL Query Error:', queryError);
      throw queryError; // Re-throw to be caught by outer catch
    }

  } catch (error) {
    console.error('Error generating match report:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate match report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 