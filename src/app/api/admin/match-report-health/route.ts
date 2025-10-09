import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Multi-tenant imports - ensuring match report health is tenant-scoped
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  // Simple auth check for admin access
  const referer = request.headers.get('referer');
  const isAdminRequest = referer?.includes('/admin') || referer?.includes('localhost');
  
  if (!isAdminRequest) {
    return NextResponse.json({ error: 'Admin access only' }, { status: 401 });
  }

  return withTenantContext(request, async (tenantId) => {
    const healthData: any = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      issues: [],
      data_sources: {}
    };

    // Check aggregated_match_report table
    try {
      const latestReport = await prisma.aggregated_match_report.findFirst({
        where: { tenant_id: tenantId },
        orderBy: { match_date: 'desc' },
        select: {
          match_id: true,
          match_date: true,
          last_updated: true,
          feat_breaking_data: true
        }
      });

      if (latestReport) {
        healthData.data_sources.aggregated_match_report = {
          status: 'available',
          latest_match_id: latestReport.match_id,
          latest_match_date: latestReport.match_date,
          last_updated: latestReport.last_updated,
          has_feat_data: !!latestReport.feat_breaking_data,
          feat_count: Array.isArray(latestReport.feat_breaking_data) 
            ? latestReport.feat_breaking_data.length 
            : 0
        };
      } else {
        healthData.data_sources.aggregated_match_report = {
          status: 'empty',
          issue: 'No match report data found'
        };
        healthData.issues.push('aggregated_match_report table is empty');
        healthData.status = 'degraded';
      }
    } catch (error) {
      healthData.data_sources.aggregated_match_report = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      healthData.issues.push('Cannot access aggregated_match_report table');
      healthData.status = 'degraded';
    }

    // Check fallback data source (matches table)
    try {
      const latestMatch = await prisma.matches.findFirst({
        where: { tenant_id: tenantId },
        orderBy: { match_date: 'desc' },
        select: {
          match_id: true,
          match_date: true,
          team_a_score: true,
          team_b_score: true
        }
      });

      if (latestMatch) {
        healthData.data_sources.matches_fallback = {
          status: 'available',
          latest_match_id: latestMatch.match_id,
          latest_match_date: latestMatch.match_date,
          score: `${latestMatch.team_a_score} - ${latestMatch.team_b_score}`
        };
      } else {
        healthData.data_sources.matches_fallback = {
          status: 'empty',
          issue: 'No match data found in matches table'
        };
        healthData.issues.push('matches table is empty - no fallback available');
        healthData.status = 'critical';
      }
    } catch (error) {
      healthData.data_sources.matches_fallback = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      healthData.issues.push('Cannot access matches table for fallback');
      healthData.status = 'critical';
    }

    // Check cache metadata
    try {
      const cacheMetadata = await prisma.cache_metadata.findUnique({
        where: { 
          cache_key_tenant_id: {
            cache_key: 'match_report',
            tenant_id: tenantId
          }
        }
      });

      if (cacheMetadata) {
        const lastInvalidated = new Date(cacheMetadata.last_invalidated);
        const hoursSinceInvalidation = (Date.now() - lastInvalidated.getTime()) / (1000 * 60 * 60);
        
        healthData.cache_info = {
          last_invalidated: cacheMetadata.last_invalidated,
          hours_since_invalidation: Math.round(hoursSinceInvalidation * 10) / 10,
          dependency_type: cacheMetadata.dependency_type,
          is_stale: hoursSinceInvalidation > 1, // Stale if > 1 hour (TTL)
        };

        if (hoursSinceInvalidation > 2) {
          healthData.issues.push(`Cache appears stale (${Math.round(hoursSinceInvalidation)} hours since invalidation)`);
          if (healthData.status === 'healthy') healthData.status = 'degraded';
        }
      } else {
        healthData.cache_info = {
          status: 'no_metadata',
          issue: 'No cache metadata found for match_report'
        };
        healthData.issues.push('Cache metadata missing');
        if (healthData.status === 'healthy') healthData.status = 'degraded';
      }
    } catch (error) {
      healthData.cache_info = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      healthData.issues.push('Cannot check cache metadata');
    }

    // Overall assessment
    healthData.recommendations = [];
    
    if (healthData.status === 'critical') {
      healthData.recommendations.push('Immediate action required: No match data available');
    } else if (healthData.status === 'degraded') {
      healthData.recommendations.push('Check stats update system and cache revalidation');
      if (healthData.cache_info?.is_stale) {
        healthData.recommendations.push('Trigger manual stats update to refresh cache');
      }
    } else {
      healthData.recommendations.push('System operating normally');
    }

    return NextResponse.json({
      success: true,
      health: healthData
    });
  }).catch(handleTenantError);
} 