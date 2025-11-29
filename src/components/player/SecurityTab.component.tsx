'use client';
import React from 'react';
import { useAuth } from '@/hooks/useAuth.hook';

const SecurityTab: React.FC = () => {
  const { profile } = useAuth();

  // Mask phone number generically for any country
  const maskPhone = (phone: string | null) => {
    if (!phone) return 'Not set';
    // Show first 3 digits, mask middle, show last 3
    // Examples: +447123456789 → +44 *** *** 789
    //           +15551234567  → +15 *** *** 567
    if (phone.length > 6) {
      return `${phone.slice(0, 3)} *** *** ${phone.slice(-3)}`;
    }
    return phone;
  };

  return (
    <div className="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-soft-xl rounded-2xl bg-clip-border max-w-lg">
      <div className="p-6">
        {/* Phone Number Section */}
        <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Phone Number</h3>
        
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700 mb-1">Current Phone Number</p>
              <p className="text-lg font-mono text-slate-900">{maskPhone(profile.phone)}</p>
              <p className="text-xs text-slate-500 mt-2">
                Your phone number is used for authentication via SMS
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800 mb-1">Need to update your phone number?</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              📱 To update your phone number, please contact an admin. This requires verification to maintain account security.
              Phone numbers cannot be changed directly because they are your primary authentication method.
            </p>
          </div>
        </div>
      </div>

        {/* Future: Password/2FA section will go here when implemented */}
      </div>
    </div>
  );
};

export default SecurityTab;

