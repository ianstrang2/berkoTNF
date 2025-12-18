/**
 * Regional Settings API
 * 
 * GET /api/admin/regional-settings
 * Returns tenant's globalisation settings (timezone, currency, locale, country)
 * 
 * PUT /api/admin/regional-settings
 * Updates tenant's globalisation settings
 * 
 * @see docs/SPEC_Globalisation.md - Phase 0
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withTenantContext } from '@/lib/tenantContext';
import { handleTenantError } from '@/lib/api-helpers';
import { requireAdminRole } from '@/lib/auth/apiAuth';

export const dynamic = 'force-dynamic';

/**
 * GET: Fetch current regional settings
 */
export async function GET(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      // Require admin access
      await requireAdminRole(request);

      const tenant = await prisma.tenants.findUnique({
        where: { tenant_id: tenantId },
        select: {
          timezone: true,
          currency: true,
          locale: true,
          country: true,
        },
      });

      if (!tenant) {
        return NextResponse.json(
          { success: false, error: 'Tenant not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          timezone: tenant.timezone,
          currency: tenant.currency,
          locale: tenant.locale,
          country: tenant.country,
        },
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie',
        },
      });
    } catch (error) {
      console.error('[REGIONAL-SETTINGS] Error fetching:', error);
      return handleTenantError(error);
    }
  });
}

/**
 * PUT: Update regional settings
 */
export async function PUT(request: NextRequest) {
  return withTenantContext(request, async (tenantId) => {
    try {
      // Require admin access
      await requireAdminRole(request);
      const body = await request.json();
      const { timezone, currency, locale, country } = body;

      // Validate required fields
      if (!timezone && !currency && !locale && !country) {
        return NextResponse.json(
          { success: false, error: 'At least one field is required' },
          { status: 400 }
        );
      }

      // Build update object with only provided fields
      const updateData: Record<string, string> = {};
      
      if (timezone) {
        // Basic IANA timezone validation
        try {
          Intl.DateTimeFormat('en', { timeZone: timezone });
          updateData.timezone = timezone;
        } catch {
          return NextResponse.json(
            { success: false, error: `Invalid timezone: ${timezone}` },
            { status: 400 }
          );
        }
      }

      if (currency) {
        // Basic ISO 4217 currency validation (3 uppercase letters)
        if (!/^[A-Z]{3}$/.test(currency)) {
          return NextResponse.json(
            { success: false, error: `Invalid currency code: ${currency}. Must be 3 uppercase letters (e.g., GBP, USD, EUR)` },
            { status: 400 }
          );
        }
        updateData.currency = currency;
      }

      if (locale) {
        // Basic BCP 47 locale validation
        try {
          new Intl.DateTimeFormat(locale);
          updateData.locale = locale;
        } catch {
          return NextResponse.json(
            { success: false, error: `Invalid locale: ${locale}` },
            { status: 400 }
          );
        }
      }

      if (country) {
        // Basic ISO 3166-1 alpha-2 validation (2 uppercase letters)
        if (!/^[A-Z]{2}$/.test(country)) {
          return NextResponse.json(
            { success: false, error: `Invalid country code: ${country}. Must be 2 uppercase letters (e.g., GB, US, DE)` },
            { status: 400 }
          );
        }
        updateData.country = country;
      }

      // Update tenant
      const updatedTenant = await prisma.tenants.update({
        where: { tenant_id: tenantId },
        data: {
          ...updateData,
          updated_at: new Date(),
        },
        select: {
          timezone: true,
          currency: true,
          locale: true,
          country: true,
        },
      });

      console.log('[REGIONAL-SETTINGS] Updated for tenant:', tenantId, updateData);

      return NextResponse.json({
        success: true,
        data: updatedTenant,
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Vary': 'Cookie',
        },
      });
    } catch (error) {
      console.error('[REGIONAL-SETTINGS] Error updating:', error);
      return handleTenantError(error);
    }
  });
}

