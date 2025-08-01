import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cache/constants';

const serializeData = (data: any) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

const getHonourRollData = unstable_cache(
  async () => {
    console.log('Fetching fresh honour roll data from DB.');
    
    const seasonHonours: { year: number; season_winners: any; top_scorers: any; }[] = await prisma.$queryRaw`
      SELECT year, season_winners, top_scorers 
      FROM aggregated_season_honours
      ORDER BY year DESC`;

    const records: { records: any; }[] = await prisma.$queryRaw`
      SELECT records FROM aggregated_records
      LIMIT 1`;

    let playerNames = new Set<string>();
    seasonHonours.forEach(row => {
      (row.season_winners.winners || []).forEach(p => playerNames.add(p.name));
      (row.season_winners.runners_up || []).forEach(p => playerNames.add(p.name));
      (row.season_winners.third_place || []).forEach(p => playerNames.add(p.name));
      (row.top_scorers.winners || []).forEach(p => playerNames.add(p.name));
      (row.top_scorers.runners_up || []).forEach(p => playerNames.add(p.name));
      (row.top_scorers.third_place || []).forEach(p => playerNames.add(p.name));
    });

    if (records.length > 0 && records[0].records) {
      const rec = records[0].records;
      (rec.most_goals_in_game || []).forEach(p => playerNames.add(p.name));
      (rec.consecutive_goals_streak || []).forEach(p => playerNames.add(p.name));
      // Add attendance_streak players to the set
      (rec.attendance_streak || []).forEach(p => playerNames.add(p.name));
      if (rec.streaks) {
        Object.values(rec.streaks).forEach((streakData: any) => {
          (streakData.holders || []).forEach(h => playerNames.add(h.name));
        });
      }
    }

    const uniquePlayerNames = Array.from(playerNames);
    let playerClubMap = new Map<string, any>();

    if (uniquePlayerNames.length > 0) {
      const playersData = await prisma.players.findMany({
        where: { name: { in: uniquePlayerNames } },
        select: { name: true, selected_club: true }
      });
      playersData.forEach(p => playerClubMap.set(p.name, p.selected_club));
    }

    const seasonWinners = seasonHonours.map(row => {
      const winners = row.season_winners.winners || [];
      const runnersUp = row.season_winners.runners_up || [];
      const thirdPlace = row.season_winners.third_place || [];
      const allRunnersUp = [...runnersUp, ...thirdPlace];
      
      return {
        year: row.year,
        winners: {
          winner: winners.length > 0 ? winners[0].name : "",
          winner_points: winners.length > 0 ? winners[0].points : 0,
          selected_club: winners.length > 0 ? playerClubMap.get(winners[0].name) : null,
          runners_up: allRunnersUp.map(runner => ({
            name: runner.name,
            points: runner.points,
            selected_club: playerClubMap.get(runner.name)
          }))
        }
      };
    });

    const topScorers = seasonHonours.map(row => {
      const winners = row.top_scorers.winners || [];
      const runnersUp = row.top_scorers.runners_up || [];
      const thirdPlace = row.top_scorers.third_place || [];
      const allRunnersUp = [...runnersUp, ...thirdPlace];

      return {
        year: row.year,
        scorers: {
          winner: winners.length > 0 ? winners[0].name : "",
          winner_goals: winners.length > 0 ? winners[0].goals : 0,
          selected_club: winners.length > 0 ? playerClubMap.get(winners[0].name) : null,
          runners_up: allRunnersUp.map(runner => ({
            name: runner.name,
            goals: runner.goals,
            selected_club: playerClubMap.get(runner.name)
          }))
        }
      };
    });

    let finalRecords = records;
    if (records.length > 0 && records[0].records) {
      const originalRecordObject = records[0].records;
      const processedRecordObject = JSON.parse(JSON.stringify(originalRecordObject));

      if (processedRecordObject.most_goals_in_game) {
        processedRecordObject.most_goals_in_game = processedRecordObject.most_goals_in_game.map(p => ({ ...p, selected_club: playerClubMap.get(p.name) || null }));
      }
      if (processedRecordObject.consecutive_goals_streak) {
        processedRecordObject.consecutive_goals_streak = processedRecordObject.consecutive_goals_streak.map(p => ({ ...p, selected_club: playerClubMap.get(p.name) || null }));
      }
      // Add attendance_streak processing
      if (processedRecordObject.attendance_streak) {
        processedRecordObject.attendance_streak = processedRecordObject.attendance_streak.map(p => ({ ...p, selected_club: playerClubMap.get(p.name) || null }));
      }
      if (processedRecordObject.streaks) {
        Object.keys(processedRecordObject.streaks).forEach(streakType => {
          if (processedRecordObject.streaks[streakType] && processedRecordObject.streaks[streakType].holders) {
            processedRecordObject.streaks[streakType].holders = processedRecordObject.streaks[streakType].holders.map(h => ({ ...h, selected_club: playerClubMap.get(h.name) || null }));
          }
        });
      }
      finalRecords = [{ records: processedRecordObject }];
    }

    return {
      seasonWinners: serializeData(seasonWinners),
      topScorers: serializeData(topScorers),
      records: serializeData(finalRecords)
    };
  },
  [CACHE_TAGS.HONOUR_ROLL],
  {
    tags: [CACHE_TAGS.HONOUR_ROLL],
    revalidate: 3600,
  }
);

export async function GET() {
  try {
    const data = await getHonourRollData();
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch honour roll data', details: error },
      { status: 500 }
    );
  }
}