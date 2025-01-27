import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Get all players
export async function GET() {
  try {
    const players = await prisma.players.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json({ data: players });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch players', details: error },
      { status: 500 }
    );
  }
}

// Add a new player
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, is_ringer, is_retired } = body; // Using is_retired instead of active

    const player = await prisma.players.create({
      data: {
        name,
        is_ringer,
        is_retired, // Store is_retired field
        join_date: new Date(),
      },
    });
    return NextResponse.json({ data: player });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create player', details: error },
      { status: 500 }
    );
  }
}

// Update a player
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { player_id, name, is_ringer, is_retired } = body; // Using is_retired instead of active

    const player = await prisma.players.update({
      where: {
        player_id: player_id,
      },
      data: {
        name,
        is_ringer,
        is_retired, // Updating the is_retired field
      },
    });
    return NextResponse.json({ data: player });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update player', details: error },
      { status: 500 }
    );
  }
}
