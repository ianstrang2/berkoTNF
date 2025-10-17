/**
 * Superadmin Header Component
 * 
 * Shows tenant selector dropdown (platform context) or "Back to Platform" button (tenant context)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { apiFetch } from '@/lib/apiConfig';

interface Tenant {
  tenant_id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface SuperadminHeaderProps {
  isInTenantContext: boolean; // True when viewing tenant-specific pages
  currentTenantId?: string | null;
}

export const SuperadminHeader: React.FC<SuperadminHeaderProps> = ({
  isInTenantContext,
  currentTenantId,
}) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await apiFetch('/superadmin/tenants');
      const data = await response.json();

      if (data.success) {
        setTenants(data.data);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchToTenant = async (tenantId: string) => {
    setSwitching(true);

    try {
      const response = await apiFetch('/auth/superadmin/switch-tenant', {
        method: 'POST',
        body: JSON.stringify({ tenantId }),
      });

      const result = await response.json();

      if (result.success) {
        // Just navigate - session will update on page load
        window.location.href = '/admin/matches';
      } else {
        alert(result.error || 'Failed to switch tenant');
        setSwitching(false);
      }
    } catch (error) {
      console.error('Error switching tenant:', error);
      alert('Failed to switch tenant');
      setSwitching(false);
    }
  };

  const returnToPlatform = async () => {
    setSwitching(true);

    try {
      // Clear tenant context from app_metadata
      const response = await apiFetch('/auth/superadmin/switch-tenant', {
        method: 'POST',
        body: JSON.stringify({ tenantId: null }),
      });

      const result = await response.json();

      if (result.success) {
        // Just navigate - session will update on page load
        window.location.href = '/superadmin/tenants';
      } else {
        alert(result.error || 'Failed to return to platform');
        setSwitching(false);
      }
    } catch (error) {
      console.error('Error returning to platform:', error);
      alert('Failed to return to platform');
      setSwitching(false);
    }
  };

  // If in tenant context, show "Back to Platform" button
  if (isInTenantContext) {
    return (
      <button
        onClick={returnToPlatform}
        disabled={switching}
        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="text-sm font-medium">
          {switching ? 'Switching...' : 'Back to Platform'}
        </span>
      </button>
    );
  }

  // If in platform context, show view mode selector
  const currentTenant = tenants.find(t => t.tenant_id === currentTenantId);
  
  const switchView = async (mode: 'platform' | 'admin' | 'player', tenantId?: string) => {
    setSwitching(true);

    try {
      if (mode === 'platform') {
        // Return to platform view
        window.location.href = '/superadmin/tenants';
      } else if (mode === 'admin') {
        // Switch to admin view for tenant
        const response = await apiFetch('/auth/superadmin/switch-tenant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId }),
        });
        if ((await response.json()).success) {
          window.location.href = '/admin/matches';
        }
      } else if (mode === 'player') {
        // Switch to player view for tenant
        const response = await apiFetch('/auth/superadmin/switch-tenant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId }),
        });
        if ((await response.json()).success) {
          window.location.href = '/';
        }
      }
    } catch (error) {
      console.error('Error switching view:', error);
      setSwitching(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-white text-sm font-medium">View:</span>
      <select
        value={currentTenantId || ''}
        onChange={(e) => {
          const value = e.target.value;
          if (!value) {
            switchView('platform');
          } else if (value.endsWith('-player')) {
            const tenantId = value.replace('-player', '');
            switchView('player', tenantId);
          } else {
            switchView('admin', value);
          }
        }}
        disabled={loading || switching}
        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
      >
        <option value="" className="text-gray-900">🏢 Platform View</option>
        {tenants.map((tenant) => (
          <optgroup key={tenant.tenant_id} label={tenant.name} className="text-gray-900">
            <option value={tenant.tenant_id} className="text-gray-900">
              ⚙️ Admin View
            </option>
            <option value={`${tenant.tenant_id}-player`} className="text-gray-900">
              👤 Player View
            </option>
          </optgroup>
        ))}
      </select>
    </div>
  );
};

