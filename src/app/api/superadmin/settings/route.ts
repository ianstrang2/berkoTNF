import { NextRequest, NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/apiAuth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Types
interface SuperadminConfigRow {
  config_id: number;
  config_key: string;
  config_value: string;
  config_description: string | null;
  display_name: string;
  display_group: string;
  sort_order: number;
}

interface UpdateConfigItem {
  config_key: string;
  config_value: string;
}

// Create Supabase client for server
function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for superadmin operations
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );
}

/**
 * GET /api/superadmin/settings
 * Fetch all superadmin configs, optionally filtered by group
 */
export async function GET(request: NextRequest) {
  try {
    // 🔒 MANDATORY: Check superadmin authorization
    await requireSuperadmin(request);

    const searchParams = request.nextUrl.searchParams;
    const group = searchParams.get('group');

    const supabase = createSupabaseServer();

    let query = supabase
      .from('superadmin_config')
      .select('*')
      .order('display_group')
      .order('sort_order');

    if (group) {
      query = query.eq('display_group', group);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching superadmin config:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data as SuperadminConfigRow[],
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
      }
    });
  } catch (error: any) {
    console.error('Superadmin settings GET error:', error);
    
    if (error.message?.includes('Unauthorized') || error.message?.includes('Superadmin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Superadmin access required' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/settings
 * Update multiple config values
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 MANDATORY: Check superadmin authorization
    await requireSuperadmin(request);

    const body = await request.json();
    const updates: UpdateConfigItem[] = body.updates;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServer();

    // Update each config value
    const results = await Promise.all(
      updates.map(async ({ config_key, config_value }) => {
        const { error } = await supabase
          .from('superadmin_config')
          .update({ 
            config_value,
            updated_at: new Date().toISOString()
          })
          .eq('config_key', config_key);

        if (error) {
          console.error(`Error updating ${config_key}:`, error);
          return { config_key, success: false, error: error.message };
        }
        return { config_key, success: true };
      })
    );

    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Failed to update: ${failures.map(f => f.config_key).join(', ')}`,
        details: failures,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} config(s)`,
    });
  } catch (error: any) {
    console.error('Superadmin settings POST error:', error);
    
    if (error.message?.includes('Unauthorized') || error.message?.includes('Superadmin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Superadmin access required' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}




