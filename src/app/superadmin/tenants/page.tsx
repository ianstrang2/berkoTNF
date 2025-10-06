/**
 * Superadmin Tenants Management Page
 * 
 * /superadmin/tenants
 * Manage all tenants in the platform
 */

'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout.layout';
import { format } from 'date-fns';

interface Tenant {
  tenant_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  playerCount: number;
  adminCount: number;
  activeMatchesCount: number;
  totalMatchesCount: number;
  created_at: string;
  updated_at: string;
  lastActivityAt: string;
  activityStatus: 'active' | 'recent' | 'inactive';
  daysSinceActivity: number;
}

const TenantsManagementContent = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/superadmin/tenants');
      const data = await response.json();

      if (data.success) {
        setTenants(data.data);
      } else {
        setError(data.error || 'Failed to load tenants');
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIndicator = (status: 'active' | 'recent' | 'inactive') => {
    switch (status) {
      case 'active':
        return { emoji: '🟢', label: 'Active (7d)', color: 'text-green-600 bg-green-100' };
      case 'recent':
        return { emoji: '🟡', label: 'Recent (30d)', color: 'text-yellow-600 bg-yellow-100' };
      case 'inactive':
        return { emoji: '🔴', label: 'Inactive (>30d)', color: 'text-red-600 bg-red-100' };
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    if (filter === 'all') return true;
    if (filter === 'active') return tenant.activityStatus === 'active' || tenant.activityStatus === 'recent';
    if (filter === 'inactive') return tenant.activityStatus === 'inactive';
    return true;
  });

  const activityCounts = {
    all: tenants.length,
    active: tenants.filter(t => t.activityStatus === 'active' || t.activityStatus === 'recent').length,
    inactive: tenants.filter(t => t.activityStatus === 'inactive').length
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
              <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="w-full px-4">
        <div className="max-w-7xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Tenant Management</h1>
            <p className="text-slate-600 mt-1">
              Manage all tenants across the platform
            </p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-soft-sm border">
            <div className="text-2xl font-bold text-slate-700">{tenants.length}</div>
            <div className="text-sm text-slate-500">Total Tenants</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg shadow-soft-sm">
            <div className="text-2xl font-bold text-green-700">{activityCounts.active}</div>
            <div className="text-sm text-green-600">Active Tenants</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg shadow-soft-sm">
            <div className="text-2xl font-bold text-red-700">{activityCounts.inactive}</div>
            <div className="text-sm text-red-600">Inactive Tenants</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg shadow-soft-sm">
            <div className="text-2xl font-bold text-purple-700">
              {tenants.reduce((sum, t) => sum + t.totalMatchesCount, 0)}
            </div>
            <div className="text-sm text-purple-600">Total Matches</div>
          </div>
          </div>

          {/* Filter Dropdown */}
          <div className="mb-4 flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">All Tenants ({activityCounts.all})</option>
            <option value="active">Active ({activityCounts.active})</option>
            <option value="inactive">Inactive ({activityCounts.inactive})</option>
          </select>
          </div>

          {/* Tenants List */}
          <div className="space-y-4">
          {filteredTenants.map((tenant) => {
            const indicator = getActivityIndicator(tenant.activityStatus);
            
            return (
              <div
                key={tenant.tenant_id}
                className="bg-white p-6 rounded-xl shadow-soft-xl border hover:shadow-soft-2xl transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{indicator.emoji}</span>
                      <h3 className="text-lg font-semibold text-slate-800">{tenant.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${indicator.color}`}>
                        {indicator.label}
                      </span>
                      {tenant.is_active ? (
                        <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-medium">Slug</p>
                        <p className="text-sm text-slate-700 font-mono mt-1">{tenant.slug}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-medium">Players</p>
                        <p className="text-sm text-slate-700 mt-1">{tenant.playerCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-medium">Admins</p>
                        <p className="text-sm text-slate-700 mt-1">{tenant.adminCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-medium">Active Matches</p>
                        <p className="text-sm text-slate-700 mt-1">{tenant.activeMatchesCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-medium">Total Matches</p>
                        <p className="text-sm text-slate-700 mt-1">{tenant.totalMatchesCount}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <div>
                        Last Activity: {format(new Date(tenant.lastActivityAt), 'MMM d, yyyy')}
                        <span className="ml-1 text-slate-400">({tenant.daysSinceActivity}d ago)</span>
                      </div>
                      <div className="h-4 w-px bg-slate-300"></div>
                      <div>
                        Created: {format(new Date(tenant.created_at), 'MMM d, yyyy')}
                      </div>
                      <div className="h-4 w-px bg-slate-300"></div>
                      <div>
                        ID: <span className="font-mono text-xs">{tenant.tenant_id.substring(0, 8)}...</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        // TODO: Implement edit functionality
                        alert('Edit tenant functionality coming soon');
                      }}
                      className="px-3 py-2 text-sm bg-gradient-to-tl from-purple-700 to-pink-500 text-white rounded-lg shadow-soft-md hover:scale-105 transition-transform"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredTenants.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <div className="text-4xl mb-2">🔍</div>
              <p>No tenants found matching the selected filter</p>
            </div>
          )}
          </div>

          {/* Add Tenant Button */}
          <div
          onClick={() => {
            // TODO: Implement add tenant functionality
            alert('Add tenant functionality coming soon');
          }}
          className="mt-6 bg-white hover:shadow-lg transition-shadow duration-300 p-6 rounded-xl shadow-soft-xl border cursor-pointer hover:bg-gray-50"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md flex items-center justify-center">
              <span className="text-xl font-bold">+</span>
            </div>
            <span className="font-semibold text-slate-700">Add New Tenant</span>
          </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

const TenantsManagementPage = () => (
  <TenantsManagementContent />
);

export default TenantsManagementPage;