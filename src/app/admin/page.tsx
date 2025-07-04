'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/admin/matches');
}