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
    const response = { 
      data: {
        seasonWinners: serializeData(seasonHonours.map(row => ({
          year: row.year,
          winners: row.season_winners
        }))),
        topScorers: serializeData(seasonHonours.map(row => ({
          year: row.year,
          scorers: row.top_scorers
        }))),
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