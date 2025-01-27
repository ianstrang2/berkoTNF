import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-static';  // Ensures the route is statically exported
export const revalidate = 30;           // Revalidate every 30 seconds (adjust as needed)

export async function GET() {
  try {
    console.log('Attempting to fetch matches...')
    const matches = await prisma.matches.findMany({
      take: 5,
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
    })
    console.log('Matches fetched:', matches)
    return NextResponse.json({ data: matches })
  } catch (error) {
    console.error('Database Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch matches', details: error },
      { status: 500 }
    )
  }
}

// Add a new match
export async function POST(request: Request) {
  try {
    console.log('Attempting to create match...')
    const body = await request.json()
    const { match_date, team_a_score, team_b_score, player_matches } = body

    const match = await prisma.matches.create({
      data: {
        match_date: new Date(match_date),
        team_a_score,
        team_b_score,
        player_matches: {
          create: player_matches
        }
      },
      include: {
        player_matches: {
          include: {
            players: true
          }
        }
      }
    })
    console.log('Match created:', match)
    return NextResponse.json({ data: match })
  } catch (error) {
    console.error('Database Error:', error)
    return NextResponse.json(
      { error: 'Failed to create match', details: error },
      { status: 500 }
    )
  }
}