import { prisma } from '../db';
import { formatPlayerName } from './helpers';
import type { player_matches, matches, players } from '@prisma/client';

// Define a type for the raw query result for biggest victory
// Adjust based on actual columns selected
interface BiggestVictoryRawResult extends matches {
  player_id: number | null;
  team: string | null;
  goals: number | null;
  name: string | null;
}

// Helper function to format date to YYYY-MM-DD
const formatDate = (date: Date | string | undefined | null): string => {
  if (!date) return '0000-00-00';
  try {
    // Ensure it's a Date object before calling toISOString
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString().split('T')[0];
  } catch (e) {
    console.error("Error formatting date:", date, e);
    return '0000-00-00';
  }
};

/**
 * Updates aggregated records like most goals, biggest victory, and streaks.
 */
export const updateFeats = async () => {
  try {
    console.time('updateFeats');

    // Clear existing records
    await prisma.aggregated_records.deleteMany({});

    // ------------ 1. Most Goals in a Game ------------
    let mostGoalsRecords: { name: string | undefined | null; goals: number | null; date: string | undefined; score: string; }[] = [];
    const maxGoalsResult = await prisma.player_matches.aggregate({
      _max: { goals: true },
      where: { 
        players: { is_ringer: false },
        goals: { gt: 0 } // Ensure we only consider games where goals were scored
      }
    });
    const maxGoals = maxGoalsResult._max.goals;

    if (maxGoals !== null && maxGoals > 0) {
      const topGoalScorers = await prisma.player_matches.findMany({
        where: {
          goals: maxGoals,
          players: { is_ringer: false }
        },
        include: {
          players: { select: { name: true } },
          matches: true
        },
        orderBy: {
          matches: { match_date: 'asc' } // Earliest date first for consistency
        }
      });

      mostGoalsRecords = topGoalScorers.map(pm => ({
        name: pm.players?.name,
        goals: pm.goals,
        date: pm.matches?.match_date ? formatDate(pm.matches.match_date) : '0000-00-00',
        score: pm.matches 
          ? (pm.team === 'A'
            ? `${pm.matches.team_a_score}-${pm.matches.team_b_score}`
            : `${pm.matches.team_b_score}-${pm.matches.team_a_score}`)
          : 'N/A'
      }));
    }

    // ------------ 2. Biggest Victory ------------
    let biggestVictoryRecords: any[] = [];
    const maxDiffResult = await prisma.$queryRaw<[{ max_diff: number | null }]>`
      SELECT MAX(ABS(team_a_score - team_b_score)) as max_diff
      FROM matches
      WHERE team_a_score IS NOT NULL AND team_b_score IS NOT NULL
    `;
    const maxScoreDiff = maxDiffResult?.[0]?.max_diff;

    if (maxScoreDiff !== null && maxScoreDiff > 0) {
      // Fetch matches AND related player data matching the max difference
      const biggestVictoryMatchesRaw = await prisma.$queryRaw<BiggestVictoryRawResult[]>`
        SELECT m.*, pm.player_id, pm.team, pm.goals, p.name 
        FROM matches m
        LEFT JOIN player_matches pm ON m.match_id = pm.match_id
        LEFT JOIN players p ON pm.player_id = p.player_id
        WHERE ABS(m.team_a_score - m.team_b_score) = ${maxScoreDiff}
        ORDER BY m.match_date ASC, m.match_id ASC, pm.team ASC, p.name ASC
      `;

      // Group raw results by match_id
      const groupedMatches = biggestVictoryMatchesRaw.reduce((acc: { [key: number]: any }, row) => {
        const matchId = row.match_id;
        if (!acc[matchId]) {
          acc[matchId] = {
            match_id: row.match_id,
            team_a_score: row.team_a_score,
            team_b_score: row.team_b_score,
            match_date: row.match_date,
            player_matches: []
          };
        }
        // Add player info if it exists for this row
        if (row.player_id && row.name) { // Ensure player info exists
          acc[matchId].player_matches.push({
            team: row.team,
            goals: row.goals,
            players: { name: row.name, player_id: row.player_id } // Structure like Prisma include
          });
        }
        return acc;
      }, {});

      // Format each tied match
      biggestVictoryRecords = Object.values(groupedMatches).map((match: any) => {
        const winningTeam = match.team_a_score > match.team_b_score ? 'A' : 'B';
        
        // Helper to format player list for a team
        const formatPlayers = (team: 'A' | 'B') => match.player_matches
          .filter((pm: any) => pm.team === team)
          // Sort players within a team alphabetically for consistent display
          .sort((a: any, b: any) => (a.players?.name || '').localeCompare(b.players?.name || ''))
          .map((pm: any) => {
            const formattedName = formatPlayerName(pm.players?.name); // Use helper
            return pm.goals && pm.goals > 0
              ? `${formattedName} (${pm.goals})`
              : formattedName;
          })
          .join(', ');

        return {
          team_a_score: match.team_a_score,
          team_b_score: match.team_b_score,
          team_a_players: formatPlayers('A'),
          team_b_players: formatPlayers('B'),
          date: formatDate(match.match_date), // Use helper
          winning_team: winningTeam
        };
      });
    }
    
    // ------------ 3. Streaks ------------
    console.log("Starting streak calculation...");

    // Fetch all relevant player matches, ordered chronologically per player
    const allPlayerMatches = await prisma.player_matches.findMany({
      where: {
        players: { is_ringer: false },
        result: { not: null } // Exclude matches without a result for streak calculation
      },
      include: {
        players: { select: { player_id: true, name: true } },
        matches: { select: { match_id: true, match_date: true } }
      },
      orderBy: [
        { player_id: 'asc' },
        { matches: { match_date: 'asc' } }
      ]
    });
    console.log(`Fetched ${allPlayerMatches.length} player matches for streak calculation.`);

    // Group matches by player
    const matchesByPlayer = allPlayerMatches.reduce((acc, pm) => {
      // Skip if essential data is missing
      if (!pm.players || !pm.matches || pm.match_id === null || pm.matches.match_date === null || pm.result === null) {
         console.warn("Skipping player_match due to missing essential data:", { pm_id: pm.player_match_id, match_id: pm.match_id, player_id: pm.player_id });
         return acc; 
      }
      
      const playerId = pm.players.player_id;
      if (!acc[playerId]) {
        acc[playerId] = {
          name: pm.players.name ?? 'Unknown Player', // Provide default name
          matches: []
        };
      }
      
      acc[playerId].matches.push({
        match_id: pm.match_id, // Now guaranteed non-null by the filter above
        match_date: pm.matches.match_date, // Guaranteed non-null
        goals: pm.goals ?? 0, 
        result: pm.result // Guaranteed non-null
      });
      return acc;
    // Explicitly type the accumulator and the matches array within it
    }, {} as Record<number, { name: string, matches: Array<{ match_id: number, match_date: Date, goals: number, result: string }> }>);

    // Store the longest streak found for each player, for each type
    const playerMaxStreaks: Record<number, {
      consecutive_goals: { value: number, startDate?: Date, endDate?: Date },
      win_streak: { value: number, startDate?: Date, endDate?: Date },
      loss_streak: { value: number, startDate?: Date, endDate?: Date },
      no_win_streak: { value: number, startDate?: Date, endDate?: Date },
      undefeated_streak: { value: number, startDate?: Date, endDate?: Date }
    }> = {};

    // Process streaks for each player
    for (const playerIdStr in matchesByPlayer) {
      const playerId = parseInt(playerIdStr, 10);
      const player = matchesByPlayer[playerId];
      const matches = player.matches; // Already sorted by date

      playerMaxStreaks[playerId] = {
        consecutive_goals: { value: 0 },
        win_streak: { value: 0 },
        loss_streak: { value: 0 },
        no_win_streak: { value: 0 },
        undefeated_streak: { value: 0 }
      };

      // Initialize current streak trackers for this player
      let currentStreaks = {
        consecutive_goals: { value: 0, startDate: undefined as Date | undefined },
        win_streak: { value: 0, startDate: undefined as Date | undefined },
        loss_streak: { value: 0, startDate: undefined as Date | undefined },
        no_win_streak: { value: 0, startDate: undefined as Date | undefined },
        undefeated_streak: { value: 0, startDate: undefined as Date | undefined }
      };

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const matchDate = match.match_date;

        // --- Consecutive Goals ---
        if (match.goals > 0) {
          if (currentStreaks.consecutive_goals.value === 0) currentStreaks.consecutive_goals.startDate = matchDate;
          currentStreaks.consecutive_goals.value++;
        } else {
          if (currentStreaks.consecutive_goals.value > playerMaxStreaks[playerId].consecutive_goals.value) {
            playerMaxStreaks[playerId].consecutive_goals = {
              value: currentStreaks.consecutive_goals.value,
              startDate: currentStreaks.consecutive_goals.startDate,
              endDate: matches[i - 1]?.match_date // End date is the last match OF the streak
            };
          }
          currentStreaks.consecutive_goals = { value: 0, startDate: undefined };
        }

        // --- Win Streak ---
        if (match.result === 'win') {
          if (currentStreaks.win_streak.value === 0) currentStreaks.win_streak.startDate = matchDate;
          currentStreaks.win_streak.value++;
        } else {
          if (currentStreaks.win_streak.value >= 3 && currentStreaks.win_streak.value > playerMaxStreaks[playerId].win_streak.value) {
            playerMaxStreaks[playerId].win_streak = { value: currentStreaks.win_streak.value, startDate: currentStreaks.win_streak.startDate, endDate: matches[i - 1]?.match_date };
          }
          currentStreaks.win_streak = { value: 0, startDate: undefined };
        }

        // --- Loss Streak ---
        if (match.result === 'loss') {
          if (currentStreaks.loss_streak.value === 0) currentStreaks.loss_streak.startDate = matchDate;
          currentStreaks.loss_streak.value++;
        } else {
          if (currentStreaks.loss_streak.value >= 3 && currentStreaks.loss_streak.value > playerMaxStreaks[playerId].loss_streak.value) {
            playerMaxStreaks[playerId].loss_streak = { value: currentStreaks.loss_streak.value, startDate: currentStreaks.loss_streak.startDate, endDate: matches[i - 1]?.match_date };
          }
          currentStreaks.loss_streak = { value: 0, startDate: undefined };
        }

        // --- No Win Streak (Loss or Draw) ---
        if (match.result !== 'win') {
          if (currentStreaks.no_win_streak.value === 0) currentStreaks.no_win_streak.startDate = matchDate;
          currentStreaks.no_win_streak.value++;
        } else {
          if (currentStreaks.no_win_streak.value >= 3 && currentStreaks.no_win_streak.value > playerMaxStreaks[playerId].no_win_streak.value) {
            playerMaxStreaks[playerId].no_win_streak = { value: currentStreaks.no_win_streak.value, startDate: currentStreaks.no_win_streak.startDate, endDate: matches[i - 1]?.match_date };
          }
          currentStreaks.no_win_streak = { value: 0, startDate: undefined };
        }

        // --- Undefeated Streak (Win or Draw) ---
        if (match.result !== 'loss') {
          if (currentStreaks.undefeated_streak.value === 0) currentStreaks.undefeated_streak.startDate = matchDate;
          currentStreaks.undefeated_streak.value++;
        } else {
          if (currentStreaks.undefeated_streak.value >= 3 && currentStreaks.undefeated_streak.value > playerMaxStreaks[playerId].undefeated_streak.value) {
            playerMaxStreaks[playerId].undefeated_streak = { value: currentStreaks.undefeated_streak.value, startDate: currentStreaks.undefeated_streak.startDate, endDate: matches[i - 1]?.match_date };
          }
          currentStreaks.undefeated_streak = { value: 0, startDate: undefined };
        }

        // --- End of loop checks: Handle streaks that run up to the last match ---
        if (i === matches.length - 1) {
          // Consecutive Goals
          if (currentStreaks.consecutive_goals.value > playerMaxStreaks[playerId].consecutive_goals.value) {
            playerMaxStreaks[playerId].consecutive_goals = { value: currentStreaks.consecutive_goals.value, startDate: currentStreaks.consecutive_goals.startDate, endDate: matchDate };
          }
          // Win Streak
          if (currentStreaks.win_streak.value >= 3 && currentStreaks.win_streak.value > playerMaxStreaks[playerId].win_streak.value) {
            playerMaxStreaks[playerId].win_streak = { value: currentStreaks.win_streak.value, startDate: currentStreaks.win_streak.startDate, endDate: matchDate };
          }
          // Loss Streak
          if (currentStreaks.loss_streak.value >= 3 && currentStreaks.loss_streak.value > playerMaxStreaks[playerId].loss_streak.value) {
            playerMaxStreaks[playerId].loss_streak = { value: currentStreaks.loss_streak.value, startDate: currentStreaks.loss_streak.startDate, endDate: matchDate };
          }
          // No Win Streak
          if (currentStreaks.no_win_streak.value >= 3 && currentStreaks.no_win_streak.value > playerMaxStreaks[playerId].no_win_streak.value) {
            playerMaxStreaks[playerId].no_win_streak = { value: currentStreaks.no_win_streak.value, startDate: currentStreaks.no_win_streak.startDate, endDate: matchDate };
          }
          // Undefeated Streak
          if (currentStreaks.undefeated_streak.value >= 3 && currentStreaks.undefeated_streak.value > playerMaxStreaks[playerId].undefeated_streak.value) {
            playerMaxStreaks[playerId].undefeated_streak = { value: currentStreaks.undefeated_streak.value, startDate: currentStreaks.undefeated_streak.startDate, endDate: matchDate };
          }
        }
      } // End loop through player's matches
    } // End loop through players
    console.log("Finished processing streaks for all players.");

    // Find the overall maximum streak value for each type
    let overallMaxStreaks = {
      consecutive_goals: 0,
      win_streak: 0,
      loss_streak: 0,
      no_win_streak: 0,
      undefeated_streak: 0
    };

    for (const playerId in playerMaxStreaks) {
      const streaks = playerMaxStreaks[playerId];
      if (streaks.consecutive_goals.value > overallMaxStreaks.consecutive_goals) overallMaxStreaks.consecutive_goals = streaks.consecutive_goals.value;
      if (streaks.win_streak.value > overallMaxStreaks.win_streak) overallMaxStreaks.win_streak = streaks.win_streak.value;
      if (streaks.loss_streak.value > overallMaxStreaks.loss_streak) overallMaxStreaks.loss_streak = streaks.loss_streak.value;
      if (streaks.no_win_streak.value > overallMaxStreaks.no_win_streak) overallMaxStreaks.no_win_streak = streaks.no_win_streak.value;
      if (streaks.undefeated_streak.value > overallMaxStreaks.undefeated_streak) overallMaxStreaks.undefeated_streak = streaks.undefeated_streak.value;
    }
    console.log("Overall max streaks identified:", overallMaxStreaks);

    // Build the final streaks array, including all tied players for each max streak
    const finalStreaks: { type: string; player: string; value: number; dates: [string, string]; }[] = [];

    const addRecordHolders = (streakType: keyof typeof overallMaxStreaks, typeLabel: string) => {
      const maxValue = overallMaxStreaks[streakType];
      // Don't add records for streaks of 0, or streaks < 3 for types other than consecutive goals
      if (maxValue === 0 || (streakType !== 'consecutive_goals' && maxValue < 3)) return;

      let holdersFound = 0;
      for (const playerIdStr in playerMaxStreaks) {
        const playerId = parseInt(playerIdStr, 10);
        const playerStreak = playerMaxStreaks[playerId][streakType];
        if (playerStreak.value === maxValue) {
          // Defensive check for player name
          const playerName = matchesByPlayer[playerId]?.name;
          if (!playerName) {
              console.warn(`Player name not found for ID ${playerId} while adding streak holder.`);
              continue;
          }
          finalStreaks.push({
            type: typeLabel,
            player: playerName,
            value: playerStreak.value,
            dates: [formatDate(playerStreak.startDate), formatDate(playerStreak.endDate)]
          });
          holdersFound++;
        }
      }
      console.log(`Added ${holdersFound} holder(s) for record streak type: ${typeLabel} (value: ${maxValue})`);
    };

    // Add holders for each streak type - Use specific labels as needed by frontend/DB
    addRecordHolders('consecutive_goals', 'consecutive_goals');
    addRecordHolders('win_streak', 'win_streak');
    addRecordHolders('loss_streak', 'loss_streak');
    addRecordHolders('no_win_streak', 'no_win_streak'); 
    addRecordHolders('undefeated_streak', 'undefeated_streak');

    console.log(`Total streak records generated: ${finalStreaks.length}`);

    // Combine all records
    const records = {
      most_goals_in_game: mostGoalsRecords,   // Array of tied records
      biggest_victory: biggestVictoryRecords, // Array of tied records
      streaks: finalStreaks                   // Populated array of streak objects
    };

    // Save records
    await prisma.aggregated_records.create({
      data: {
        records, // Prisma will serialize this JSON
        last_updated: new Date()
      }
    });
    console.log("Aggregated records saved successfully.");

    // Update cache metadata for records
    await prisma.cache_metadata.upsert({
      where: { cache_key: 'records' },
      update: { last_invalidated: new Date() },
      create: {
        cache_key: 'records',
        last_invalidated: new Date(),
        dependency_type: 'records' // Ensure this matches your enum/type if applicable
      }
    });

    console.timeEnd('updateFeats');
    return true;
  } catch (error) {
    console.error('Error updating feats:', error);
    return false;
  }
};

export default updateFeats; 