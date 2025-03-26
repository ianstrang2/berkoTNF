import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import AppSetup from '@/components/admin/AppSetup';
import { useAuth } from '@/hooks/useAuth';

const AppSetupPage = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();

  // Add telemetry to track page usage
  useEffect(() => {
    console.log('Direct app-setup page was accessed - tracking for potential cleanup');
    // In a production app, you might want to log this to your analytics system
  }, []);

  // Redirect if user is not an admin
  React.useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/login');
    }
  }, [user, isAdmin, isLoading, router]);

  if (isLoading || !user || !isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Application Setup - PlayerPath Admin</title>
        <meta name="description" content="Configure all application settings including app configuration, team templates, and balance algorithm" />
      </Head>
      
      <AdminLayout>
        <AppSetup />
      </AdminLayout>
    </>
  );
};

export default AppSetupPage; 