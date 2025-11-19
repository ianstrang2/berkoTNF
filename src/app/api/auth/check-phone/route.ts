/**
 * Check Phone Existence API
 * 
 * POST /api/auth/check-phone
 * Pre-check if phone exists in ANY tenant before sending SMS
 * 
 * Purpose: Prevent SMS waste, bot attacks, and improve UX
 * Security: Reveals if phone is registered (acceptable trade-off for sports app)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// In-memory rate limiting (simple, no Redis needed for MVP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = 10; // requests per window
  const window = 60 * 1000; // 1 minute
  
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + window });
    return true;
  }
  
  if (record.count >= limit) {
    return false; // Rate limited
  }
  
  record.count++;
  return true;
}

// Cleanup expired rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000); // Every minute

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many requests. Please try again in 1 minute.' 
        },
        { status: 429 }
      );
    }

    const { phone } = await request.json();
    
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number required' },
        { status: 400 }
      );
    }

    // Normalize phone number for matching
    const normalizePhone = (phoneNum: string): string => {
      let cleaned = phoneNum.replace(/[\s\-\(\)]/g, '');
      if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
      if (cleaned.startsWith('0')) cleaned = '44' + cleaned.substring(1);
      if (!cleaned.startsWith('44')) cleaned = '44' + cleaned;
      return '+' + cleaned;
    };

    const normalizedPhone = normalizePhone(phone);

    // Use Supabase admin client to bypass RLS for cross-tenant phone lookup
    // This is a legitimate use case: we need to find which tenant a phone belongs to
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Query using Supabase admin client (bypasses RLS)
    const { data: allPlayers, error: queryError } = await supabaseAdmin
      .from('players')
      .select('player_id, name, phone, tenant_id, tenants!inner(name)')
      .eq('is_ringer', false)
      .eq('is_retired', false)
      .not('phone', 'is', null);

    if (queryError) {
      console.error('[CHECK-PHONE] Query error:', queryError);
      throw new Error('Failed to check phone');
    }

    // Find matching player (first match if multiple clubs)
    const matchingPlayer = allPlayers?.find((p: any) => {
      if (!p.phone) return false;
      return normalizePhone(p.phone) === normalizedPhone;
    });

    if (!matchingPlayer) {
      console.log('[CHECK-PHONE] No match found for phone:', normalizedPhone);
      return NextResponse.json({
        exists: false,
        clubName: null,
      });
    }

    console.log('[CHECK-PHONE] Found player:', matchingPlayer.name, 'in tenant:', matchingPlayer.tenant_id);

    // Note: If player exists in multiple clubs, returns first match only
    // Multi-club switcher is future enhancement (see docs/FUTURE_PROBLEMS.md)
    return NextResponse.json({
      exists: true,
      clubName: (matchingPlayer as any).tenants?.name || null, // Don't show in UI (enumeration prevention)
    });

  } catch (error: any) {
    console.error('[CHECK-PHONE] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to check phone' 
      },
      { status: 500 }
    );
  }
}

