import { NextRequest, NextResponse } from 'next/server';
import { CACHE_TAGS } from '@/lib/cache/constants';
import { prisma } from '@/lib/prisma';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAdminRole } from '@/lib/auth/apiAuth';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify admin access (replacing insecure referer check)
    await requireAdminRole(request);
    // Environment debugging
    const environmentInfo = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasInternalApiKey: !!process.env.INTERNAL_API_KEY,
      timestamp: new Date().toISOString(),
      isVercelEnvironment: !!process.env.VERCEL,
      relevantEnvKeys: Object.keys(process.env)
        .filter(k => k.includes('VERCEL') || k.includes('URL') || k.includes('SUPABASE'))
        .sort()
    };

    // URL construction test
    let urlConstructionTest: any = {};
    try {
      let baseUrl: string;
      let urlSource: string;
      
      if (process.env.NEXT_PUBLIC_SITE_URL) {
        baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
        urlSource = 'NEXT_PUBLIC_SITE_URL';
      } else if (process.env.VERCEL_URL) {
        baseUrl = process.env.VERCEL_URL;
        urlSource = 'VERCEL_URL';
      } else {
        baseUrl = 'http://localhost:3000';
        urlSource = 'localhost_fallback';
      }
      
      if (baseUrl && !baseUrl.startsWith('http')) {
        if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
          baseUrl = `https://${baseUrl}`;
        } else {
          baseUrl = `http://${baseUrl}`;
        }
      }
      
      const testUrl = new URL('/api/internal/cache/invalidate', baseUrl);
      
      urlConstructionTest = {
        success: true,
        baseUrl,
        urlSource,
        finalUrl: testUrl.toString(),
        protocol: testUrl.protocol,
        host: testUrl.host
      };
    } catch (error) {
      urlConstructionTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Cache tags info
    const cacheTagsInfo = {
      totalTags: Object.keys(CACHE_TAGS).length,
      tags: Object.entries(CACHE_TAGS).map(([key, value]) => ({
        name: key,
        tag: value
      })),
      matchRelatedTagsCount: 10 // from ALL_MATCH_RELATED_TAGS
    };

    // Test revalidation endpoint accessibility
    let revalidationEndpointTest: any = {};
    try {
      if (urlConstructionTest.success) {
        const testResponse = await fetch(urlConstructionTest.finalUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-worker-key'}`,
          },
          body: JSON.stringify({ 
            tags: [CACHE_TAGS.MATCH_REPORT], 
            source: 'admin-debug-test',
            requestId: 'debug-' + Date.now()
          }),
          signal: AbortSignal.timeout(5000)
        });

        revalidationEndpointTest = {
          success: testResponse.ok,
          status: testResponse.status,
          statusText: testResponse.statusText,
          url: urlConstructionTest.finalUrl
        };

        if (!testResponse.ok) {
          const errorBody = await testResponse.text();
          revalidationEndpointTest.errorBody = errorBody.substring(0, 200);
        }
      } else {
        revalidationEndpointTest = {
          success: false,
          error: 'URL construction failed'
        };
      }
    } catch (error) {
      revalidationEndpointTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'UnknownError'
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        environment: environmentInfo,
        urlConstruction: urlConstructionTest,
        cacheInfo: cacheTagsInfo,
        revalidationEndpointTest,
        diagnosis: {
          canBuildUrl: urlConstructionTest.success,
          hasAuthToken: environmentInfo.hasInternalApiKey,
          canReachEndpoint: revalidationEndpointTest.success,
          overallHealth: urlConstructionTest.success && environmentInfo.hasInternalApiKey && revalidationEndpointTest.success
        }
      }
    });

  } catch (error) {
    return handleTenantError(error);
  }
} 