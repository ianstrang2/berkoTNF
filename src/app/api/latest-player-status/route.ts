import { NextRequest, NextResponse } from 'next/server';
import { handleTenantError } from '@/lib/api-helpers';
import { withTenantContext } from '@/lib/tenantContext';
import { prisma } from '@/lib/prisma';
import { withTenantFilter } from '@/lib/tenantFilter';

// Ensure this route is revalidated on every request
export const dynamic = 'force-dynamic';

// Response shape for current voting award holders
interface VotingAwardHolder {
  player_id: string;
  is_co_winner: boolean;
}

interface VotingAwards {
  mom: VotingAwardHolder[];
  dod: VotingAwardHolder[];
  mia: VotingAwardHolder[];
}

// Helper to get config value with default
function getConfigValue(configs: { config_key: string; config_value: string }[], key: string, defaultValue: string): string {
  return configs.find(c => c.config_key === key)?.config_value ?? defaultValue;
}

export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    // Run all queries in parallel for performance
    const [latestStatus, latestClosedSurvey, votingConfigs] = await Promise.all([
      // Query 1: On Fire and Grim Reaper from aggregated_match_report
      prisma.aggregated_match_report.findFirst({
        where: withTenantFilter(tenantId),
        orderBy: { match_date: 'desc' },
        select: {
          on_fire_player_id: true,
          grim_reaper_player_id: true,
        },
      }),
      
      // Query 2: Find the most recent CLOSED survey to get current voting award holders
      // Per spec: "Show awards from the latest match that has a completed survey"
      // PERF: Order by closed_at instead of match.match_date to avoid JOIN
      // Surveys are closed in chronological order, so closed_at DESC gives us the latest
      prisma.match_surveys.findFirst({
        where: {
          tenant_id: tenantId,
          is_open: false, // Must be closed
        },
        orderBy: { closed_at: 'desc' },
        select: {
          id: true,
        },
      }),
      
      // Query 3: Get voting config settings to check if awards should be shown
      prisma.app_config.findMany({
        where: {
          tenant_id: tenantId,
          config_key: {
            in: ['voting_enabled', 'voting_mom_enabled', 'voting_dod_enabled', 'voting_mia_enabled'],
          },
        },
        select: {
          config_key: true,
          config_value: true,
        },
      }),
    ]);

    // Parse voting config settings (default to true for enabled states, except mia which defaults false)
    const votingEnabled = getConfigValue(votingConfigs, 'voting_enabled', 'true') !== 'false';
    const momEnabled = getConfigValue(votingConfigs, 'voting_mom_enabled', 'true') !== 'false';
    const dodEnabled = getConfigValue(votingConfigs, 'voting_dod_enabled', 'true') !== 'false';
    const miaEnabled = getConfigValue(votingConfigs, 'voting_mia_enabled', 'false') === 'true'; // Default false

    // Build voting awards object - only include enabled categories
    const votingAwards: VotingAwards = {
      mom: [],
      dod: [],
      mia: [],
    };

    // Only fetch and populate awards if voting is enabled AND we have a closed survey
    if (votingEnabled && latestClosedSurvey) {
      const awards = await prisma.player_awards.findMany({
        where: {
          tenant_id: tenantId,
          survey_id: latestClosedSurvey.id,
        },
        select: {
          player_id: true,
          award_type: true,
          is_co_winner: true,
        },
      });

      // Group awards by type, respecting individual category configs
      for (const award of awards) {
        const awardType = award.award_type as 'mom' | 'dod' | 'mia';
        
        // Check if this specific category is enabled
        const categoryEnabled = 
          (awardType === 'mom' && momEnabled) ||
          (awardType === 'dod' && dodEnabled) ||
          (awardType === 'mia' && miaEnabled);
        
        if (categoryEnabled && votingAwards[awardType]) {
          votingAwards[awardType].push({
            player_id: String(award.player_id),
            is_co_winner: award.is_co_winner,
          });
        }
      }
    }

    return NextResponse.json({
      on_fire_player_id: latestStatus?.on_fire_player_id ? String(latestStatus.on_fire_player_id) : null,
      grim_reaper_player_id: latestStatus?.grim_reaper_player_id ? String(latestStatus.grim_reaper_player_id) : null,
      voting_awards: votingAwards,
      // Include config flags so clients know if voting is enabled at all
      voting_enabled: votingEnabled,
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Vary': 'Cookie'
      }
    });
  }).catch(handleTenantError);
} 