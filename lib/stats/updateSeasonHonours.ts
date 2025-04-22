import { prisma } from '../db';
import { calculateFantasyPointsForMatch, fetchStructuredConfig } from './helpers';
import type { player_matches, matches } from '@prisma/client';

// Define the structure expected for player stats within this function
interface PlayerYearStats {
  name: string;
  player_id: number;
  games: number;
  points: number;
  goals: number;
}

/**
 * Updates season honours (winners and top scorers) for all completed seasons.
 * Fetches configuration for fantasy points calculation.
 * Removes minimum games threshold.
 */
export const updateSeasonHonours = async () => {
  try {
    console.time('updateSeasonHonours');

    // Fetch structured configuration for points calculation
    const config = await fetchStructuredConfig();
    if (!config) {
      console.error("Failed to fetch app config, cannot calculate season honours accurately.");
      // Decide if we should stop or continue with fallback points in the helper
      // For now, the helper has fallbacks, but logging an error is important.
      // return false; // Uncomment this to stop execution if config is essential
    }

    // ------------ SEASON HONOURS SECTION ------------

    // Delete existing season honours 
    await prisma.aggregated_season_honours.deleteMany({});

    // Calculate yearly stats (excluding current year)
    const currentYear = new Date().getFullYear();

    // Get all years with matches
    const yearsWithMatches = await prisma.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM match_date)::integer AS year
      FROM matches
      WHERE EXTRACT(YEAR FROM match_date) < ${currentYear}
      ORDER BY year DESC
    `;

    // Process each year
    for (const { year } of yearsWithMatches) {
      // Get all non-ringer players with their matches for this year
      const players = await prisma.players.findMany({
        where: {
          is_ringer: false,
          player_matches: {
            some: {
              matches: {
                match_date: {
                  gte: new Date(`${year}-01-01`),
                  lt: new Date(`${year + 1}-01-01`)
                }
              }
            }
          }
        },
        include: {
          player_matches: {
            where: {
              matches: {
                match_date: {
                  gte: new Date(`${year}-01-01`),
                  lt: new Date(`${year + 1}-01-01`)
                }
              }
            },
            include: {
              matches: true // Include match details needed for points calc
            }
          }
        }
      });

      // Calculate stats for each player using the helper function
      const playerStats: PlayerYearStats[] = players
        .map(player => {
          const matchesPlayed = player.player_matches;
          
          // Removed minimum games threshold
          // if (matchesPlayed.length < 10) return null;

          let totalPoints = 0;
          let totalGoals = 0;

          for (const pm of matchesPlayed) {
            // Ensure matches data is present for point calculation
            if (!pm.matches || !pm.result) continue; 

            totalGoals += pm.goals || 0;
            // Use helper for fantasy points
            totalPoints += calculateFantasyPointsForMatch(pm as player_matches & { matches: matches }, config);
          }

          return {
            name: player.name,
            player_id: player.player_id,
            games: matchesPlayed.length,
            points: totalPoints,
            goals: totalGoals
          };
        })
        // Filter out any potential nulls if map logic were to change (good practice)
        // .filter((item): item is PlayerYearStats => item !== null)
        .sort((a, b) => b.points - a.points); // Sort by points descending

      // Skip year if no player stats were generated (e.g., no matches in that year)
      if (playerStats.length === 0) continue;

      // Calculate season winners
      const seasonWinner = playerStats[0];
      const runnersUp = playerStats.slice(1, 3).map(p => ({
        name: p.name,
        points: p.points
      }));

      // Calculate top scorers
      // Create a mutable copy before sorting by goals
      const goalStats = [...playerStats].sort((a, b) => b.goals - a.goals);
      const topScorer = goalStats[0];
      const topScorerRunnersUp = goalStats.slice(1, 3).map(p => ({
        name: p.name,
        goals: p.goals
      }));

      // Save season honours
      await prisma.aggregated_season_honours.create({
        data: {
          year,
          season_winners: {
            winner: seasonWinner.name,
            winner_points: seasonWinner.points,
            runners_up: runnersUp
          },
          top_scorers: {
            winner: topScorer.name,
            winner_goals: topScorer.goals,
            runners_up: topScorerRunnersUp
          },
          last_updated: new Date()
        }
      });
    } // End loop through years

    // ------------ RECORDS SECTION (Removed) ------------
    // All logic previously here (most goals, biggest win, streaks) is moved to updateFeats.ts

    // Update cache metadata for season honours ONLY
    await prisma.cache_metadata.upsert({
      where: { cache_key: 'season_honours' },
      update: { last_invalidated: new Date() },
      create: {
        cache_key: 'season_honours',
        last_invalidated: new Date(),
        dependency_type: 'season_honours' // Adjust if enum/type is different
      }
    });

    // Cache metadata update for 'records' removed, handled by updateFeats.ts

    console.timeEnd('updateSeasonHonours');
    return true;
  } catch (error) {
    console.error('Error updating season honours:', error);
    return false;
  }
};

export default updateSeasonHonours; 