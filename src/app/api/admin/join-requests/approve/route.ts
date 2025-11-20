/**
 * Approve Join Request API
 * 
 * POST /api/admin/join-requests/approve
 * Creates new player and links to authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/auth/apiAuth';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantContext } from '@/lib/tenantContext';
import { sendPlayerApprovedEmail } from '@/lib/notifications/email.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const { user } = await requireAdminRole(request);
      
      const { requestId, playerName, existingPlayerId } = await request.json();

    if (!requestId || (!playerName && !existingPlayerId)) {
      return NextResponse.json(
        { success: false, error: 'Missing requestId or playerName/existingPlayerId' },
        { status: 400 }
      );
    }

    // Get the join request (requestId is UUID string)
    const joinRequest = await prisma.player_join_requests.findUnique({
      where: { id: requestId }, // UUID string, not number
      select: {
        id: true,
        tenant_id: true,
        phone_number: true,
        display_name: true,
        email: true, // Needed for email notification
        auth_user_id: true,
        status: true,
      },
    });

    if (!joinRequest || joinRequest.tenant_id !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Join request not found' },
        { status: 404 }
      );
    }

    if (joinRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Request already processed' },
        { status: 409 }
      );
    }

    let linkedPlayer;

    if (existingPlayerId) {
      // Link to existing player
      const existingPlayer = await prisma.players.findUnique({
        where: { player_id: parseInt(existingPlayerId) },
        select: { player_id: true, name: true, tenant_id: true, auth_user_id: true },
      });

      if (!existingPlayer || existingPlayer.tenant_id !== tenantId) {
        return NextResponse.json(
          { success: false, error: 'Player not found or belongs to different tenant' },
          { status: 404 }
        );
      }

      if (existingPlayer.auth_user_id) {
        return NextResponse.json(
          { success: false, error: 'This player is already claimed' },
          { status: 409 }
        );
      }

      // Link auth_user_id and update phone
      linkedPlayer = await prisma.players.update({
        where: { player_id: parseInt(existingPlayerId) },
        data: {
          auth_user_id: joinRequest.auth_user_id || undefined,
          phone: joinRequest.phone_number,
        },
      });
    } else {
      // Create new player
      linkedPlayer = await prisma.players.create({
        data: {
          tenant_id: tenantId,
          name: playerName,
          phone: joinRequest.phone_number,
          auth_user_id: joinRequest.auth_user_id || undefined,
          is_ringer: false,
          is_retired: false,
        },
      });
    }

    // Mark request as approved
    await prisma.player_join_requests.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        approved_by: user.id,
        linked_player_id: linkedPlayer.player_id,
        processed_at: new Date(),
      },
    });

      // Send approval notification to player
      try {
        // Email can come from join request or player record
        const playerEmail = joinRequest.email || linkedPlayer.email;
        const tenant = await prisma.tenants.findUnique({
          where: { tenant_id: tenantId },
          select: { name: true, slug: true },
        });

        if (playerEmail && tenant) {
          // Use universal entry point - routes based on auth state
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.caposport.com';
          const openUrl = `${baseUrl}/open?club=${tenant.slug}`;
          
          const emailResult = await sendPlayerApprovedEmail({
            toEmail: playerEmail,
            playerName: linkedPlayer.name,
            clubName: tenant.name,
            loginUrl: openUrl,
          });

          if (emailResult.success) {
            console.log('[APPROVAL] Email notification sent to:', playerEmail);
          } else {
            console.warn('[APPROVAL] Email notification failed:', emailResult.error);
            // Graceful degradation: Approval succeeded even if email fails
          }
        } else {
          console.log('[APPROVAL] No email available for notification (phone:', joinRequest.phone_number, ')');
          console.log('[APPROVAL] Player approved successfully, will be notified on next login');
        }
      } catch (notificationError) {
        // Log error but don't fail approval
        console.error('[APPROVAL] Notification error (approval still succeeded):', notificationError);
      }

      return NextResponse.json({
        success: true,
        message: existingPlayerId ? 'Player linked successfully' : 'Player approved and created',
        player: {
          id: linkedPlayer.player_id.toString(),
          name: linkedPlayer.name,
        },
      });
    } catch (error) {
      return handleTenantError(error);
    }
  });
}

