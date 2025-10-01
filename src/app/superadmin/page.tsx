/**
 * Superadmin Landing Page
 * 
 * /superadmin
 * Redirects to tenants page (sidebar navigation makes landing page unnecessary)
 */

'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function SuperadminPage() {
  redirect('/superadmin/tenants');
}

