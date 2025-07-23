'use client';

import React from 'react';
import { RatingDataView } from '@/components/admin/RatingDataView.component';
import AdminLayout from '@/components/layout/AdminLayout.layout';

export default function DataPage() {
  return (
    <AdminLayout>
      <div className="px-6 py-4">
        <h2 className="text-2xl font-bold mb-4">Rating Data Analysis</h2>
        <RatingDataView />
      </div>
    </AdminLayout>
  );
} 