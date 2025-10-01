/**
 * Superadmin Tenants Management Page
 * 
 * /superadmin/tenants
 * Manage all tenants in the platform
 */

'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Tenant {
  tenant_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  playerCount: number;
  adminCount: number;
  created_at: string;
  updated_at: string;
}

const TenantsManagementContent = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Tenant Management</h1>
        <p className="text-slate-600 mt-1">
          Manage all tenants across the platform
        </p>
      </div>

      {/* Tenants List */}
      <div className="space-y-4">
        {tenants.map((tenant) => (
          <div
            key={tenant.tenant_id}
            className="bg-white p-6 rounded-xl shadow-soft-xl border"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-slate-800">{tenant.name}</h3>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
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
                    <p className="text-xs text-slate-500 uppercase font-medium">Created</p>
                    <p className="text-sm text-slate-700 mt-1">
                      {format(new Date(tenant.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <div className="text-xs text-slate-500">
                    ID: <span className="font-mono text-xs">{tenant.tenant_id}</span>
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
        ))}
      </div>

      {/* Add Tenant Button */}
      <div
        onClick={() => {
          // TODO: Implement add tenant functionality
          alert('Add tenant functionality coming soon');
        }}
        className="mt-4 bg-white hover:shadow-lg transition-shadow duration-300 p-6 rounded-xl shadow-soft-xl border cursor-pointer hover:bg-gray-50"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-md flex items-center justify-center">
            <span className="text-xl font-bold">+</span>
          </div>
          <span className="font-semibold text-slate-700">Add New Tenant</span>
        </div>
      </div>
    </div>
  );
};

const TenantsManagementPage = () => (
  <TenantsManagementContent />
);

export default TenantsManagementPage;

