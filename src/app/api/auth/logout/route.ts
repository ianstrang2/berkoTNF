/**
 * Logout API Route
 * 
 * POST /api/auth/logout
 * Handles server-side cleanup (cookies) before client-side Supabase logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    
    // Clear superadmin tenant selection cookie
    cookieStore.delete('superadmin_selected_tenant');
    
    console.log('🗑️ Logout: Cleared superadmin tenant cookie');
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      error: 'Logout failed'
    }, { status: 500 });
  }
}


