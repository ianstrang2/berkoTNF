import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL is not set.');
}
if (!supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.');
}

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export async function GET(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client is not initialized. Check server configuration.' }, { status: 500 });
  }

  const { playerId } = params;

  if (!playerId) {
    return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
  }

  const numericPlayerId = parseInt(playerId, 10);

  if (isNaN(numericPlayerId)) {
    return NextResponse.json({ error: 'Invalid Player ID' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('player_matches')
      .select(`
        goals,
        result,
        matches!inner (
          match_date
        )
      `)
      .eq('player_id', numericPlayerId)
      .order('match_date', { foreignTable: 'matches', ascending: true });

    if (error) {
      console.error('Supabase error fetching all matches:', error);
      return NextResponse.json({ error: 'Error fetching data from database.' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ matches: [] }, { status: 200 });
    }

    let formattedMatches = data.map((pm: any) => ({
      date: pm.matches.match_date,
      goals: pm.goals,
      result: pm.result.toLowerCase(),
    }));

    formattedMatches.sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return 0;
    });

    return NextResponse.json({ matches: formattedMatches }, { status: 200 });
  } catch (err: any) {
    console.error('Error fetching all player matches:', err);
    return NextResponse.json({ error: 'Failed to fetch all player matches', details: err.message }, { status: 500 });
  }
} 