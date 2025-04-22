import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const serializeData = (data) => {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value
  ));
};

export async function GET() {
  try {
    console.log('Starting honour roll data fetch...');

    // Fetch from pre-aggregated tables
    const seasonHonours: { year: number; season_winners: any; top_scorers: any; }[] = await prisma.$queryRaw`
      SELECT year, season_winners, top_scorers 
      FROM aggregated_season_honours
      ORDER BY year DESC`;

    const records: { records: any; }[] = await prisma.$queryRaw`
      SELECT records FROM aggregated_records
      LIMIT 1`;

    // Transform the data to match the expected format
    const seasonWinners = seasonHonours.map(row => {
      const winners = row.season_winners.winners || [];
      const runnersUp = row.season_winners.runners_up || [];
      const thirdPlace = row.season_winners.third_place || [];
      
      // Combine runners_up and third_place into a single array
      const allRunnersUp = [...runnersUp, ...thirdPlace];
      
      return {
        year: row.year,
        winners: {
          winner: winners.length > 0 ? winners[0].name : "",
          winner_points: winners.length > 0 ? winners[0].points : 0,
          runners_up: allRunnersUp.map(runner => ({
            name: runner.name,
            points: runner.points
          }))
        }
      };
    });

    const topScorers = seasonHonours.map(row => {
      const winners = row.top_scorers.winners || [];
      const runnersUp = row.top_scorers.runners_up || [];
      const thirdPlace = row.top_scorers.third_place || [];
      
      // Combine runners_up and third_place into a single array
      const allRunnersUp = [...runnersUp, ...thirdPlace];
      
      return {
        year: row.year,
        scorers: {
          winner: winners.length > 0 ? winners[0].name : "",
          winner_goals: winners.length > 0 ? winners[0].goals : 0,
          runners_up: allRunnersUp.map(runner => ({
            name: runner.name,
            goals: runner.goals
          }))
        }
      };
    });

    const response = { 
      data: {
        seasonWinners: serializeData(seasonWinners),
        topScorers: serializeData(topScorers),
        records: serializeData(records)
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch honour roll data', details: error },
      { status: 500 }
    );
  }
}