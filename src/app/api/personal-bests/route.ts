import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'; // Opt out of caching

// Define the type for the data returned by this API route - UPDATED STRUCTURE
export interface PlayerPersonalBests {
  name: string;
  pbs: {
    metric_type: string;
    value: number;
    previous_best_value: number;
  }[];
}

export interface PersonalBestsAPIResponseData {
  match_id: number;
  match_date: string;
  broken_pbs_data: {
    [playerId: string]: PlayerPersonalBests;
  };
}

export async function GET() {
  console.log('[API /personal-bests] GET request received.');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('[API /personal-bests] Missing Supabase environment variables.');
    return NextResponse.json(
      { success: false, error: 'Server configuration error: Supabase credentials missing.' }, 
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    console.log('[API /personal-bests] Fetching latest personal bests (v2 structure)...');
    const { data, error } = await supabase
      .from('aggregated_personal_bests')
      .select(`
        match_id,
        broken_pbs_data,
        matches ( match_date )
      `)
      .order('match_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[API /personal-bests] Supabase error:', error);
      throw error;
    }

    if (!data) {
      console.log('[API /personal-bests] No personal bests found for the latest match.');
      return NextResponse.json({ success: true, data: null });
    }

    // Ensure the data matches the new expected structure for the client.
    // The actual structure of `data.broken_pbs_data` from the DB now contains the name and pbs array.
    const responseData: PersonalBestsAPIResponseData = {
      match_id: data.match_id,
      // @ts-ignore data.matches will exist if match_id is valid and RLS allows
      match_date: data.matches.match_date, 
      broken_pbs_data: data.broken_pbs_data, // This should now conform to { [playerId: string]: PlayerPersonalBests }
    };

    console.log('[API /personal-bests] Successfully fetched data (v2 structure).');
    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    console.error('[API /personal-bests] Error fetching personal bests:', errorMessage);
    return NextResponse.json(
      { success: false, error: `Failed to fetch personal bests: ${errorMessage}` },
      { status: 500 }
    );
  }
} 