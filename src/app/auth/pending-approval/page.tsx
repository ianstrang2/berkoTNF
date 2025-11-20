/**
 * Pending Approval Page
 * 
 * /auth/pending-approval
 * Shown to players whose phone number wasn't found - awaiting admin approval
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { apiFetch } from '@/lib/apiConfig';

export default function PendingApprovalPage() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Check every 5 seconds if profile has been approved
    const checkApproval = async () => {
      try {
        const response = await apiFetch('/auth/profile');
        const data = await response.json();
        
        if (data.linkedPlayerId) {
          // Approved! Redirect to dashboard
          router.push('/');
        }
      } catch (err) {
        console.error('Error checking approval:', err);
      } finally {
        setChecking(false);
      }
    };

    checkApproval();
    const interval = setInterval(checkApproval, 5000);

    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-soft-xl p-8 w-full max-w-md">
        <div className="text-center">
          <div className="w-20 h-20 bg-white rounded-xl shadow-soft-md flex items-center justify-center mx-auto mb-6 p-3">
            <img 
              src="/img/logo.png" 
              alt="Capo Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-700 mb-2">
            Almost There!
          </h1>
          
          <p className="text-sm text-slate-500 mb-6">
            Pending Admin Approval
          </p>

          {checking && (
            <div className="mb-6">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-purple-600 border-r-transparent"></div>
              <p className="mt-2 text-sm text-slate-500">Checking for approval...</p>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-soft-sm">
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Your request has been sent to your club admin for approval.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              You'll receive a notification when approved. 
              Feel free to close this page - we'll let you know!
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Email notification enabled</span>
          </div>
        </div>

          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 text-slate-600 font-medium text-sm hover:text-slate-900 transition-colors"
          >
            Try Different Number
          </button>
        </div>
      </div>
    </div>
  );
}

