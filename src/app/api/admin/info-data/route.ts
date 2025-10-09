import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { differenceInDays, startOfYear, endOfYear } from 'date-fns';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantContext } from '@/lib/tenantContext';

// Helper to serialize data (especially for BigInt and Date types if needed)
const serializeData = (data: any) => {
  return JSON.parse(JSON.stringify(data, (_, value) => {
    if (typeof value === 'bigint') {
      return Number(value);
    }
    return value;
  }));
};

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      const allPlayers = await prisma.players.findMany({
        where: { tenant_id: tenantId },
      include: {
        player_matches: {
          include: {
            matches: {
              select: {
                match_date: true,
              },
            },
          },
        },
      },
    });

    const today = new Date();
    const currentYearStart = startOfYear(today);
    const currentYearEnd = endOfYear(today);

    const processedPlayers = allPlayers.map(player => {
      const totalGamesPlayed = player.player_matches.length;
      
      let lastGamePlayedDate: Date | null = null;
      if (player.player_matches.length > 0) {
        const matchDates = player.player_matches
          .map(pm => pm.matches?.match_date)
          .filter(date => date != null) as Date[];
        if (matchDates.length > 0) {
          lastGamePlayedDate = new Date(Math.max(...matchDates.map(date => new Date(date).getTime())));
        }
      }
      
      const daysAbsent = lastGamePlayedDate ? differenceInDays(today, lastGamePlayedDate) : Infinity;

      const gamesPlayedThisYear = player.player_matches.filter(pm => {
        if (!pm.matches?.match_date) return false;
        const matchDate = new Date(pm.matches.match_date);
        return matchDate >= currentYearStart && matchDate <= currentYearEnd;
      }).length;

      return {
        player_id: player.player_id,
        name: player.name,
        is_ringer: player.is_ringer,
        is_retired: player.is_retired,
        totalGamesPlayed,
        lastGamePlayedDate,
        daysAbsent,
        gamesPlayedThisYear,
      };
    });

    // Absentee Table Data
    const absentees = processedPlayers
      .filter(p => !p.is_retired && !p.is_ringer && p.daysAbsent > 50)
      .sort((a, b) => b.daysAbsent - a.daysAbsent); 
      // No explicit limit here, will be handled by frontend table display (max 5 records with scroll)

    // "Guests To Add To Stats?" Table Data
    // Filters for players marked as guests who have played >= 10 games this year and are not retired.
    const ringersToAdd = processedPlayers
      .filter(p => p.is_ringer === true && p.gamesPlayedThisYear >= 10 && !p.is_retired)
      .sort((a, b) => b.gamesPlayedThisYear - a.gamesPlayedThisYear); // Sort by games played this year

      return NextResponse.json(serializeData({
        success: true,
        data: {
          absentees,
          showOnStatsPlayers: ringersToAdd, // Still using this key for response
        },
      }));

    } catch (error) {
      return handleTenantError(error);
    }
  });
} 