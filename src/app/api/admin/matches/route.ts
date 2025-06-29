import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';
import { ALL_MATCH_RELATED_TAGS } from '@/lib/cache/constants';

async function revalidateMatchCaches() {
  console.log('Revalidating all match-related cache tags...');
  for (const tag of ALL_MATCH_RELATED_TAGS) {
    revalidateTag(tag);
  }
  console.log('Finished revalidating match-related tags.');
}

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
      created_at: match.created_at!.toISOString(),  // Convert timestamp to ISO format
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
          name: pm.players.name,
          join_date: pm.players.join_date!.toISOString()
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

    console.log(`Creating match with ${processedPlayers.length} players`);
    
    // Split the transaction into smaller operations to avoid timeouts
    let newMatch;
    try {
      // Step 1: Create the match
      console.log('1. Creating match record...');
      newMatch = await prisma.matches.create({
        data: {
          match_date: new Date(match_date),
          team_a_score,
          team_b_score,
        },
      });
      console.log(`2. Match created with ID: ${newMatch.match_id}`);
      
      // Step 2: Create player_matches entries
      console.log('3. Creating player matches...');
      await prisma.player_matches.createMany({
        data: processedPlayers.map(player => ({
          match_id: newMatch.match_id,
          ...player
        })),
      });
      console.log(`4. Created ${processedPlayers.length} player matches`);
    } catch (transactionError) {
      console.error('Transaction error:', transactionError);
      
      // If match was created but player_matches failed, clean up the match
      if (newMatch) {
        try {
          console.log(`Cleanup: Deleting match ${newMatch.match_id} due to error`);
          await prisma.matches.delete({
            where: { match_id: newMatch.match_id }
          });
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      }
      
      throw transactionError;
    }

    // Revalidate caches after successful creation
    await revalidateMatchCaches();

    return NextResponse.json({ data: newMatch });
  } catch (error: any) {
    console.error('Error creating match:', error);
    
    // Better error details for debugging
    const errorDetails = {
      message: error.message || 'Unknown error',
      name: error.name,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    return NextResponse.json(
      { error: 'Failed to create match', details: errorDetails },
      { status: 500 }
    );
  }
}

// Update a match
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { match_id, match_date, team_a_score, team_b_score, players } = body;

    console.log(`Updating match with ID: ${match_id}`);

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

    console.log(`Update will include ${processedPlayers.length} players`);

    // Split the operations to avoid transaction timeouts
    let updatedMatch;
    try {
      // Step 1: Update match details
      console.log('1. Updating match record...');
      updatedMatch = await prisma.matches.update({
        where: { match_id },
        data: {
          match_date: new Date(match_date),
          team_a_score,
          team_b_score,
        },
      });
      console.log(`2. Match updated: ${updatedMatch.match_id}`);
      
      // Step 2: Delete existing player_matches
      console.log('3. Deleting existing player matches...');
      const deleteResult = await prisma.player_matches.deleteMany({
        where: { match_id },
      });
      console.log(`4. Deleted ${deleteResult.count} player matches`);
      
      // Step 3: Create new player_matches entries
      console.log('5. Creating new player matches...');
      await prisma.player_matches.createMany({
        data: processedPlayers.map(player => ({
          match_id,
          ...player
        })),
      });
      console.log(`6. Created ${processedPlayers.length} player matches`);
    } catch (error) {
      console.error('Error during match update operations:', error);
      throw error;
    }

    // Revalidate caches after successful update
    await revalidateMatchCaches();

    return NextResponse.json({ data: updatedMatch });
  } catch (error: any) {
    console.error('Error updating match:', error);
    
    // Better error details for debugging
    const errorDetails = {
      message: error.message || 'Unknown error',
      name: error.name,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    
    return NextResponse.json(
      { error: 'Failed to update match', details: errorDetails },
      { status: 500 }
    );
  }
}

// Delete a match
export async function DELETE(request: Request) {
  try {
    // Get match ID from URL params
    const url = new URL(request.url);
    const matchId = url.searchParams.get('matchId');
    
    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }
    
    const parsedMatchId = parseInt(matchId);
    console.log(`Deleting match with ID: ${parsedMatchId}`);
    
    // Delete player_matches first to maintain referential integrity
    console.log('1. Deleting player_matches...');
    await prisma.$executeRaw`DELETE FROM player_matches WHERE match_id = ${parsedMatchId}`;
    console.log('2. Player_matches deleted');
    
    // Delete the match
    console.log('3. Deleting match...');
    await prisma.$executeRaw`DELETE FROM matches WHERE match_id = ${parsedMatchId}`;
    console.log('4. Match deleted');
    
    // Revalidate caches after successful deletion
    await revalidateMatchCaches();

    return NextResponse.json({ 
      success: true, 
      message: 'Match successfully deleted'
    });
  } catch (error) {
    console.error('Error deleting match:', error);
    return NextResponse.json(
      { error: 'Failed to delete match', details: error },
      { status: 500 }
    );
  }
}
