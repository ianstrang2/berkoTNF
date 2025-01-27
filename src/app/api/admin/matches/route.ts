import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Get matches with player details
export async function GET() {
  try {
    const matches = await prisma.matches.findMany({
      orderBy: {
        match_date: 'desc',
      },
      include: {
        player_matches: {
          include: {
            players: true,  // Get player details
          },
        },
      },
    });

    // Format the matches data
    const formattedMatches = matches.map(match => ({
      match_id: match.match_id,
      match_date: match.match_date.toISOString(),  // Convert date to ISO format
      team_a_score: match.team_a_score,
      team_b_score: match.team_b_score,
      created_at: match.created_at.toISOString(),  // Convert timestamp to ISO format
      player_matches: match.player_matches.map(pm => ({
        player_match_id: pm.player_match_id,
        player_id: pm.player_id,
        match_id: pm.match_id,
        team: pm.team,
        goals: pm.goals,
        clean_sheet: pm.clean_sheet,
        heavy_win: pm.heavy_win,
        heavy_loss: pm.heavy_loss,
        result: pm.result,
        fantasy_points: pm.fantasy_points,
        players: pm.players ? {
          player_id: pm.players.player_id,
          name: pm.players.name,
          join_date: pm.players.join_date.toISOString(),  // Convert date to ISO format
          is_ringer: pm.players.is_ringer,
          is_retired: pm.players.is_retired,
        } : null,  // Handle missing players
      })),
    }));

    return NextResponse.json({ data: formattedMatches });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch matches', details: error },
      { status: 500 }
    );
  }
}

// Add a new match
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received request body:', body);  // Log the request body

    const { match_date, team_a_score, team_b_score, players } = body;

    // Calculate win/loss/clean sheet for each player
    const processedPlayers = players.map(player => {
      const isTeamA = player.team === 'A';
      const teamScore = isTeamA ? team_a_score : team_b_score;
      const opposingScore = isTeamA ? team_b_score : team_a_score;
      const scoreDiff = Math.abs(team_a_score - team_b_score);

      // Skip retired players
      if (player.is_retired) {
        return null;
      }

      // Calculate result-related data
      const result = teamScore > opposingScore ? 'win' : (teamScore < opposingScore ? 'loss' : 'draw');

      return {
        player_id: parseInt(player.player_id),  // Ensure player_id is a number
        team: player.team,
        goals: player.goals,
        clean_sheet: opposingScore === 0,
        heavy_win: teamScore > opposingScore && scoreDiff >= 4,
        heavy_loss: teamScore < opposingScore && scoreDiff >= 4,
        result,  // Add result to be stored in the database
      };
    }).filter(Boolean); // Remove any null players (retired ones)

    // Create match and player_matches in a transaction
    const match = await prisma.$transaction(async (prisma) => {
      const newMatch = await prisma.matches.create({
        data: {
          match_date: new Date(match_date),
          team_a_score,
          team_b_score,
        },
      });

      // Create player_matches entries with result data
      await prisma.player_matches.createMany({
        data: processedPlayers.map(player => ({
          match_id: newMatch.match_id,
          ...player
        })),
      });

      return newMatch;
    });

    return NextResponse.json({ data: match });
  } catch (error) {
    console.error('Error creating match:', error);  // Log the error
    return NextResponse.json(
      { error: 'Failed to create match', details: error.message },
      { status: 500 }
    );
  }
}

// Update a match
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { match_id, match_date, team_a_score, team_b_score, players } = body;

    // Calculate win/loss/clean sheet for each player
    const processedPlayers = players.map(player => {
      const isTeamA = player.team === 'A';
      const teamScore = isTeamA ? team_a_score : team_b_score;
      const opposingScore = isTeamA ? team_b_score : team_a_score;
      const scoreDiff = Math.abs(team_a_score - team_b_score);

      // Skip retired players
      if (player.is_retired) {
        return null;
      }

      // Calculate result-related data
      const result = teamScore > opposingScore ? 'win' : (teamScore < opposingScore ? 'loss' : 'draw');

      return {
        player_id: player.player_id,
        team: player.team,
        goals: player.goals,
        clean_sheet: opposingScore === 0,
        heavy_win: teamScore > opposingScore && scoreDiff >= 4,
        heavy_loss: teamScore < opposingScore && scoreDiff >= 4,
        result,  // Add result to be stored in the database
      };
    }).filter(Boolean); // Remove any null players (retired ones)

    // Update match and player_matches in a transaction
    const updatedMatch = await prisma.$transaction(async (prisma) => {
      // Update match
      const match = await prisma.matches.update({
        where: { match_id },
        data: {
          match_date: new Date(match_date),
          team_a_score,
          team_b_score,
        },
      });

      // Delete existing player_matches
      await prisma.player_matches.deleteMany({
        where: { match_id },
      });

      // Create new player_matches entries
      await prisma.player_matches.createMany({
        data: processedPlayers.map(player => ({
          match_id,
          ...player
        })),
      });

      return match;
    });

    return NextResponse.json({ data: updatedMatch });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update match', details: error },
      { status: 500 }
    );
  }
}
