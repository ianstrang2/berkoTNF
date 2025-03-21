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

      // Simplified streaks query
      console.log('Checking for streaks...');
      const streaks = await prisma.$queryRaw`
        WITH recent_matches AS (
          SELECT 
            p.player_id,
            p.name,
            m.match_date,
            pm.result,
            ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as game_number,
            LAG(pm.result) OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as prev_result
          FROM players p
          JOIN player_matches pm ON p.player_id = pm.player_id
          JOIN matches m ON pm.match_id = m.match_id
          WHERE m.match_date <= ${latestMatch.match_date}
          AND p.is_ringer = false
          AND p.is_retired = false
          AND p.player_id = ANY(${activePlayerIdList}::int[])
        ),
        streak_groups AS (
          SELECT 
            *,
            CASE
              WHEN result != prev_result OR prev_result IS NULL THEN 1
              ELSE 0
            END as is_new_streak,
            SUM(CASE WHEN result != prev_result OR prev_result IS NULL THEN 1 ELSE 0 END) 
              OVER (PARTITION BY player_id ORDER BY game_number) as streak_group
          FROM recent_matches
          WHERE game_number <= 15  -- Look at last 15 games max
        ),
        streak_lengths AS (
          SELECT 
            name,
            result,
            streak_group,
            COUNT(*) as streak_length,
            MIN(game_number) as first_game_in_streak,
            MAX(game_number) as last_game_in_streak
          FROM streak_groups
          GROUP BY name, result, streak_group
        )
        SELECT DISTINCT ON (name)
          name,
          result as streak_type,
          streak_length as streak_count
        FROM streak_lengths
        WHERE 
          last_game_in_streak = 1  -- Must be current streak
          AND (
            (result = 'win' AND streak_length >= 4)  -- Win streak of 4 or more
            OR (result = 'loss' AND streak_length >= 4)  -- Loss streak of 4 or more
            OR (result IN ('win', 'draw') AND streak_length >= 6)  -- Unbeaten streak of 6 or more
            OR (result IN ('loss', 'draw') AND streak_length >= 6)  -- Winless streak of 6 or more
          )
        ORDER BY 
          name,
          streak_length DESC
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

      console.log('Preparing response...');
      return NextResponse.json({
        success: true,
        data: {
          matchInfo: serializeData(cleanedMatch),
          gamesMilestones: serializeData(gamesMilestones),
          goalsMilestones: serializeData(goalsMilestones),
          streaks: serializeData(streaks),
          halfSeasonGoalLeaders: serializeData(halfSeasonGoalLeaders),
          halfSeasonFantasyLeaders: serializeData(halfSeasonFantasyLeaders),
          seasonGoalLeaders: serializeData(seasonGoalLeaders),
          seasonFantasyLeaders: serializeData(seasonFantasyLeaders)
        }
      });

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