import { NextRequest, NextResponse } from 'next/server';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAdminRole } from '@/lib/auth/apiAuth';

// GET: Fetch admin settings
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify admin access
    await requireAdminRole(request);
    // Return hardcoded settings
    return NextResponse.json({ 
      success: true, 
      data: {
        days_between_matches: 7  // Default value
      }
    });
  } catch (error) {
    return handleTenantError(error);
  }
}

// PUT: Update admin settings (this is a stub - no actual update happens)
export async function PUT(request: NextRequest) {
  try {
    // SECURITY: Verify admin access
    await requireAdminRole(request);
    const body = await request.json();
    const { days_between_matches } = body;
    
    if (days_between_matches === undefined) {
      return NextResponse.json({ 
        success: false, 
        error: 'No settings provided to update' 
      }, { status: 400 });
    }
    
    // Just return the value that was sent, without actually saving it
    return NextResponse.json({ 
      success: true, 
      data: {
        days_between_matches
      }
    });
  } catch (error) {
    return handleTenantError(error);
  }
} 