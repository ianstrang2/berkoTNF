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

// Get matches with player details - only show completed matches
export async function GET() {
  try {
    const matches = await prisma.matches.findMany({
      where: {
        OR: [
          // Legacy matches (no upcoming_match_id)
          { upcoming_match_id: null },
          // New match flow matches that are actually completed
          {
            upcoming_match_id: { not: null },
            upcoming_matches: {
              state: 'Completed'
            }
          }
        ]
      },
      orderBy: {
        match_date: 'desc',
      },
      include: {
        player_matches: {
          include: {
            players: true,  // Get player details
          },
        },
        upcoming_matches: {
          select: {
            state: true,
            upcoming_match_id: true
          }
        }
      },
    });

    // Format the matches data
    const formattedMatches = matches.map(match => ({
      match_id: match.match_id,
      upcoming_match_id: match.upcoming_match_id,  // Include for legacy detection
      match_date: match.match_date.toISOString(),  // Convert date to ISO format
      team_a_score: match.team_a_score,
      team_b_score: match.team_b_score,
      team_a_own_goals: (match as any).team_a_own_goals || 0,  // Include own goals for proper editing
      team_b_own_goals: (match as any).team_b_own_goals || 0,  // Include own goals for proper editing
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

    return NextResponse.json({ data: formattedMatches }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
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
      let teamScore, opposingScore;
      
      if (player.team === 'A') {
        teamScore = team_a_score;
        opposingScore = team_b_score;
      } else if (player.team === 'B') {
        teamScore = team_b_score;
        opposingScore = team_a_score;
      } else {
        // Ignore players who are not on team A or B
        return null;
      }

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
      let teamScore, opposingScore;
      
      if (player.team === 'A') {
        teamScore = team_a_score;
        opposingScore = team_b_score;
      } else if (player.team === 'B') {
        teamScore = team_b_score;
        opposingScore = team_a_score;
      } else {
        // Ignore players who are not on team A or B
        return null;
      }
      
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
    if (isNaN(parsedMatchId)) {
      return NextResponse.json(
        { error: 'Invalid Match ID' },
        { status: 400 }
      );
    }
    
    console.log(`Deleting match with ID: ${parsedMatchId}`);

    // Get the match to check if it's linked to upcoming system
    const match = await prisma.matches.findUnique({
      where: { match_id: parsedMatchId },
      include: {
        upcoming_matches: {
          select: {
            upcoming_match_id: true,
            state: true
          }
        }
      }
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Delete player_matches first to maintain referential integrity
      console.log('1. Deleting player_matches...');
      await tx.player_matches.deleteMany({
        where: { match_id: parsedMatchId }
      });
      console.log('2. Player_matches deleted');
      
      // Delete the historical match
      console.log('3. Deleting match...');
      await tx.matches.delete({
        where: { match_id: parsedMatchId }
      });
      console.log('4. Match deleted');

      // If this match is linked to the new system, also clean up upcoming data
      if (match.upcoming_matches && match.upcoming_matches.upcoming_match_id) {
        console.log('5. Cleaning up linked upcoming match data...');
        
        // Delete upcoming match players
        await tx.upcoming_match_players.deleteMany({
          where: { upcoming_match_id: match.upcoming_matches.upcoming_match_id }
        });

        // Delete player pool data
        await tx.match_player_pool.deleteMany({
          where: { upcoming_match_id: match.upcoming_matches.upcoming_match_id }
        });

        // Delete the upcoming match
        await tx.upcoming_matches.delete({
          where: { upcoming_match_id: match.upcoming_matches.upcoming_match_id }
        });
        
        console.log('6. Upcoming match data cleaned up');
      }
    });
    
    // Trigger stats recalculation since we deleted historical data (fire and forget)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    fetch(new URL('/api/admin/trigger-stats-update', baseUrl), {
      method: 'POST',
    }).catch(statsError => {
      console.warn('Could not trigger stats recalculation:', statsError);
      // Stats update failure doesn't affect deletion success
    });
    
    // Revalidate caches after successful deletion
    await revalidateMatchCaches();

    return NextResponse.json({ 
      success: true, 
      message: 'Match deleted successfully. Stats are being recalculated.'
    });
  } catch (error) {
    console.error('Error deleting match:', error);
    return NextResponse.json(
      { error: 'Failed to delete match', details: error },
      { status: 500 }
    );
  }
} 