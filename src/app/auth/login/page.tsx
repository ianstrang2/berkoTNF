/**
 * Phone Authentication Page
 * 
 * /auth/login
 * All users (players and admins) sign up/login using phone number and SMS OTP
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { apiFetch } from '@/lib/apiConfig';

function PlayerLoginForm() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showClubCodeEntry, setShowClubCodeEntry] = useState(false);
  const [clubCode, setClubCode] = useState('');
  const [checkingPhone, setCheckingPhone] = useState(false);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // If starts with 0, replace with 44
    if (numbers.startsWith('0')) {
      return '+44' + numbers.slice(1);
    }
    
    // If starts with 44, add +
    if (numbers.startsWith('44')) {
      return '+' + numbers;
    }
    
    // If just numbers, assume UK
    if (numbers.length === 10) {
      return '+44' + numbers;
    }
    
    return value;
  };

  const isValidUKPhone = (phone: string): boolean => {
    const formatted = formatPhoneNumber(phone);
    // Basic validation: must start with +44 and be at least 12 chars
    return formatted.startsWith('+44') && formatted.length >= 12;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCheckingPhone(true);
    setError('');

    try {
      const formattedPhone = formatPhoneNumber(phone);
      
      // CLIENT-SIDE VALIDATION: Basic format check before pre-check
      if (!isValidUKPhone(phone)) {
        setLoading(false);
        setCheckingPhone(false);
        setError('Please enter a valid UK mobile number (07XXX XXXXXX)');
        return; // Don't proceed with pre-check
      }
      
      // PRE-CHECK: Does phone exist in any club?
      let shouldSendOTP = true; // Default: allow SMS (lenient fallback policy)
      
      try {
        const checkResponse = await apiFetch('/auth/check-phone', {
          method: 'POST',
          body: JSON.stringify({ phone: formattedPhone }),
        });
        
        if (checkResponse.ok) {
          const { exists } = await checkResponse.json();
          
          if (!exists) {
            // Phone not found - show club code entry immediately
            setError(
              `Phone not found in any club. Enter your club code below to continue.`
            );
            setShowClubCodeEntry(true);
            setLoading(false);
            shouldSendOTP = false; // Don't send SMS
          }
        } else {
          // Pre-check API failed - log warning but continue with SMS (fallback)
          console.warn('Pre-check failed, falling back to SMS:', checkResponse.status);
        }
      } catch (checkErr) {
        // Pre-check error (network issue, timeout, etc.) - log but continue (fallback)
        console.error('Pre-check error, falling back to SMS:', checkErr);
        // shouldSendOTP remains true (lenient policy: prefer false negatives over blocking users)
      }
      
      setCheckingPhone(false);
      
      if (!shouldSendOTP) return; // Exit if pre-check succeeded and phone not found
      
      // Phone exists OR pre-check failed - proceed with SMS
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;

      setStep('otp');
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      setError(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formattedPhone = formatPhoneNumber(phone);
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;

      if (data.session) {
        // Try to auto-link by phone number
        const formattedPhone = formatPhoneNumber(phone);
        
        try {
          const linkResponse = await apiFetch('/auth/link-by-phone', {
            method: 'POST',
            body: JSON.stringify({ phone: formattedPhone }),
          });
          
          const linkData = await linkResponse.json();
          
          if (linkData.success && linkData.player) {
            // Linked! Clear cache and reload to refresh profile
            localStorage.removeItem('userProfile');
            
            // Redirect based on role
            if (linkData.player.is_admin) {
              window.location.href = '/admin/matches'; // Full reload to refresh auth context
            } else {
              window.location.href = '/';
            }
          } else {
            // No player found - redirect to no-club page
            router.push('/auth/no-club');
          }
        } catch (linkError) {
          console.error('Link error:', linkError);
          setError('Failed to link profile. Please use your club invite link.');
          setStep('phone');
        }
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setError(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 p-3">
            <img 
              src="/img/logo.png" 
              alt="Capo Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Login</h1>
          <p className="text-gray-600 mt-2">
            {step === 'phone' 
              ? 'Enter your mobile number to continue' 
              : 'Enter the 6-digit code we sent you'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <>
            <form onSubmit={handleSendOTP}>
              <div className="mb-6">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    // Reset club code state when phone changes (prevents stale UI)
                    if (showClubCodeEntry) {
                      setShowClubCodeEntry(false);
                      setClubCode('');
                      setError('');
                    }
                  }}
                  placeholder="07XXX XXXXXX"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
                <p className="mt-2 text-xs text-gray-500">
                  We'll send you a verification code via SMS
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !phone}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-700 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingPhone ? 'Checking phone...' : loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
            
            {/* Club Code Entry - shown when phone not found in pre-check */}
            {showClubCodeEntry && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Enter Club Code
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your admin can find this on their Players page
                </p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="clubCode" className="block text-sm font-medium text-gray-700 mb-2">
                  5-Character Code
                </label>
                <input
                  id="clubCode"
                  type="text"
                  value={clubCode}
                  onChange={(e) => setClubCode(e.target.value.toUpperCase())}
                  placeholder="FC247"
                  maxLength={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl tracking-widest font-mono uppercase"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <button
                onClick={async () => {
                  setLoading(true);
                  setError('');
                  try {
                    const response = await apiFetch('/join/by-code', {
                      method: 'POST',
                      body: JSON.stringify({ club_code: clubCode }),
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                      router.push(data.join_url);
                    } else {
                      throw new Error(data.error || 'Club not found');
                    }
                  } catch (err: any) {
                    setError(err.message || 'Failed to find club');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || clubCode.length !== 5}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-700 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Looking up club...' : 'Continue with Code'}
              </button>

              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 text-center">
                  💡 <strong>Don't have a code?</strong><br />
                  Ask your admin or use the invite link they shared
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  Want to start your own club?
                </p>
                <button
                  onClick={() => router.push('/signup/admin')}
                  className="w-full mt-3 py-2 px-4 text-purple-700 font-medium text-sm hover:text-purple-900 transition-colors"
                >
                  Create a New Club →
                </button>
              </div>
            </div>
          )}
          </>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div className="mb-6">
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                required
                disabled={loading}
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                Sent to {phone}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-700 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mb-3"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setOtp('');
                setError('');
              }}
              className="w-full py-2 px-4 text-gray-600 font-medium text-sm hover:text-gray-900 transition-colors"
            >
              ← Change Phone Number
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

export default function PlayerLoginPage() {
  // Removed Suspense - not needed for client component, was causing hydration errors
  return <PlayerLoginForm />;
}

