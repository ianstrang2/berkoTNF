import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const serializeData = (data) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

export async function GET() {
  try {
    console.log('Starting match report generation...');

    // Get latest match using Prisma's query builder
    console.log('Fetching latest match...');
    const latestMatch = await prisma.matches.findFirst({
      orderBy: {
        match_date: 'desc'
      },
      include: {
        player_matches: {
          include: {
            players: true
          }
        }
      }
    });
    console.log('Latest match:', latestMatch);

    if (!latestMatch) {
      console.log('No matches found');
      return NextResponse.json({
        success: false,
        error: 'No matches found'
      });
    }

    try {
      // Get active players from the latest match
      const activePlayerIds = await prisma.$queryRaw`
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
          array_agg(DISTINCT name) FILTER (WHERE team = 'A' AND is_ringer = false AND is_retired = false) as team_a_players,
          array_agg(DISTINCT name) FILTER (WHERE team = 'B' AND is_ringer = false AND is_retired = false) as team_b_players,
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

      // Fixed streaks query - only for active players
      console.log('Checking for streaks...');
      const streaks = await prisma.$queryRaw`
        WITH recent_matches AS (
          SELECT 
            p.player_id,
            p.name,
            m.match_date,
            pm.result,
            pm.goals,
            ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date DESC) as game_number
          FROM players p
          JOIN player_matches pm ON p.player_id = pm.player_id
          JOIN matches m ON pm.match_id = m.match_id
          WHERE m.match_date <= ${latestMatch.match_date}
          AND p.is_ringer = false
          AND p.is_retired = false
          AND p.player_id = ANY(${activePlayerIdList}::int[])
        )
        SELECT 
          name,
          streak_type,
          streak_count
        FROM (
          SELECT 
            name,
            CASE 
              WHEN COUNT(*) FILTER (WHERE result = 'win' AND game_number <= 4) = 4 THEN 'win'
              WHEN COUNT(*) FILTER (WHERE result = 'loss' AND game_number <= 4) = 4 THEN 'loss'
              WHEN COUNT(*) FILTER (WHERE result != 'loss' AND game_number <= 5) = 5 THEN 'unbeaten'
              WHEN COUNT(*) FILTER (WHERE result != 'win' AND game_number <= 5) = 5 THEN 'winless'
              WHEN COUNT(*) FILTER (WHERE goals > 0 AND game_number <= 3) = 3 THEN 'scoring'
            END as streak_type,
            CASE 
              WHEN COUNT(*) FILTER (WHERE goals > 0 AND game_number <= 3) = 3 
              THEN SUM(goals) FILTER (WHERE goals > 0 AND game_number <= 3)
              ELSE 
                CASE 
                  WHEN COUNT(*) FILTER (WHERE result = 'win' AND game_number <= 4) = 4 THEN 4
                  WHEN COUNT(*) FILTER (WHERE result = 'loss' AND game_number <= 4) = 4 THEN 4
                  WHEN COUNT(*) FILTER (WHERE result != 'loss' AND game_number <= 5) = 5 THEN 5
                  WHEN COUNT(*) FILTER (WHERE result != 'win' AND game_number <= 5) = 5 THEN 5
                  ELSE 0
                END
            END as streak_count
          FROM recent_matches
          GROUP BY name
        ) s
        WHERE streak_type IS NOT NULL
      `;
      console.log('Streaks:', streaks);

      // Simplified scoring leaders query - only for active players
      console.log('Checking for scoring leaders changes...');
      const scoringLeaders = await prisma.$queryRaw`
        WITH current_leaders AS (
          SELECT 
            p.name,
            SUM(pm.goals) as goals,
            ROW_NUMBER() OVER (ORDER BY SUM(pm.goals) DESC) as rank
          FROM players p
          JOIN player_matches pm ON p.player_id = pm.player_id
          JOIN matches m ON pm.match_id = m.match_id
          WHERE m.match_date <= ${latestMatch.match_date}
          AND p.is_ringer = false
          AND p.is_retired = false
          AND p.player_id = ANY(${activePlayerIdList}::int[])
          GROUP BY p.name
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
          AND p.is_ringer = false
          AND p.is_retired = false
          AND p.player_id = ANY(${activePlayerIdList}::int[])
          GROUP BY p.name
        )
        SELECT 
          cl.name as new_leader,
          cl.goals as new_leader_goals,
          pl.name as previous_leader,
          pl.goals as previous_leader_goals
        FROM current_leaders cl
        JOIN previous_leaders pl ON cl.rank = 1 AND pl.rank = 1
        WHERE cl.name != pl.name
        AND cl.goals > pl.goals
      `;
      console.log('Scoring leaders:', scoringLeaders);

      console.log('Preparing response...');
      return NextResponse.json({
        success: true,
        data: {
          matchInfo: serializeData(cleanedMatch),
          gamesMilestones: serializeData(gamesMilestones),
          goalsMilestones: serializeData(goalsMilestones),
          streaks: serializeData(streaks),
          scoringLeaders: serializeData(scoringLeaders)
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