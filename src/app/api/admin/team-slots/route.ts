import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring team slots operations are tenant-scoped
import { createTenantPrisma } from '@/lib/tenantPrisma';
import { getCurrentTenantId } from '@/lib/tenantContext';

// Get all slots with their assigned players
export async function GET() {
  try {
    // Multi-tenant setup - ensure team slots operations are tenant-scoped
    const tenantId = getCurrentTenantId();
    const tenantPrisma = await createTenantPrisma(tenantId);
    
    const slots = await tenantPrisma.team_slots.findMany({
      orderBy: {
        slot_number: 'asc'
      },
      include: {
        players: true // Include player details
      }
    });

    return NextResponse.json({ 
      success: true,
      data: slots 
    });
  } catch (error) {
    console.error('Error fetching team slots:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team slots' },
      { status: 500 }
    );
  }
}

// Update a slot's player assignment
export async function PUT(request: Request) {
  try {
    // Multi-tenant setup - ensure team slots operations are tenant-scoped
    const tenantId = getCurrentTenantId();
    const tenantPrisma = await createTenantPrisma(tenantId);
    
    const { slot_number, player_id } = await request.json();

    // Validate input
    if (!slot_number || slot_number < 1 || slot_number > 18) {
      return NextResponse.json(
        { success: false, error: 'Invalid slot number' },
        { status: 400 }
      );
    }

    // If player_id is provided, check if player is already assigned to another slot
    if (player_id) {
      const existingSlot = await tenantPrisma.team_slots.findFirst({
        where: {
          player_id: player_id,
          NOT: {
            slot_number: slot_number
          }
        }
      });

      if (existingSlot) {
        // Clear the player from their existing slot
        await tenantPrisma.team_slots.update({
          where: { 
            tenant_id_slot_number: {
              tenant_id: tenantId,
              slot_number: existingSlot.slot_number
            }
          },
          data: { player_id: null }
        });
      }
    }

    // Update the slot
    const updatedSlot = await tenantPrisma.team_slots.update({
      where: { 
        tenant_id_slot_number: {
          tenant_id: tenantId,
          slot_number: slot_number
        }
      },
      data: { 
        player_id: player_id,
        updated_at: new Date()
      },
      include: {
        players: true // Include player details in response
      }
    });

    return NextResponse.json({ 
      success: true,
      data: updatedSlot 
    });
  } catch (error) {
    console.error('Error updating team slot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update team slot' },
      { status: 500 }
    );
  }
} 