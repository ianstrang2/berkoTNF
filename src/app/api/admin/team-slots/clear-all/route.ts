import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';

export async function POST() {
  try {
    // Update all slots to have null player_id
    await prisma.team_slots.updateMany({
      data: {
        player_id: null,
        updated_at: new Date()
      }
    });

    // Fetch the cleared slots to return
    const clearedSlots = await prisma.team_slots.findMany({
      orderBy: {
        slot_number: 'asc'
      }
    });

    return NextResponse.json({ 
      success: true,
      data: clearedSlots
    });
  } catch (error) {
    return handleTenantError(error);
  }
} 