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
  const [step, setStep] = useState<'phone' | 'otp' | 'joinForm'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false); // Track if phone was found in pre-check
  
  // Join form fields (shown after OTP for new phones)
  const [clubCode, setClubCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  
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
        return;
      }
      
      // PRE-CHECK: Does phone exist in any club? (for bot protection only)
      let phoneFoundInDB = false;
      
      try {
        const checkResponse = await apiFetch('/auth/check-phone', {
          method: 'POST',
          body: JSON.stringify({ phone: formattedPhone }),
        });
        
        if (checkResponse.ok) {
          const { exists } = await checkResponse.json();
          phoneFoundInDB = exists;
          setPhoneExists(exists); // Store for use after OTP verification
        } else {
          console.warn('Pre-check failed, assuming phone not found:', checkResponse.status);
        }
      } catch (checkErr) {
        console.error('Pre-check error, assuming phone not found:', checkErr);
      }
      
      setCheckingPhone(false);
      
      // ALWAYS send OTP (even for new phones - ~£0.01 per genuine attempt)
      // Pre-check is for bot protection/rate limiting only
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
        // Check if phone was found in pre-check
        if (phoneExists) {
          // EXISTING PLAYER: Auto-link and redirect
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
                window.location.href = '/admin/matches';
              } else {
                window.location.href = '/';
              }
            } else {
              // Shouldn't happen (pre-check said exists), but handle gracefully
              console.error('Pre-check said phone exists but link-by-phone failed');
              setError('Failed to link profile. Please contact admin.');
              setStep('phone');
            }
          } catch (linkError) {
            console.error('Link error:', linkError);
            setError('Failed to link profile. Please try again.');
            setStep('phone');
          }
        } else {
          // NEW PHONE: Show join form (club code + name + email)
          setStep('joinForm');
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
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 'phone' && 'Login'}
            {step === 'otp' && 'Verify Your Phone'}
            {step === 'joinForm' && 'Request to Join Club'}
          </h1>
          <p className="text-gray-600 mt-2">
            {step === 'phone' && 'Enter your mobile number to continue'}
            {step === 'otp' && 'Enter the 6-digit code we sent you'}
            {step === 'joinForm' && 'Tell us which club you want to join'}
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
                  onChange={(e) => setPhone(e.target.value)}
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
          </>
        ) : step === 'otp' ? (
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
        ) : step === 'joinForm' ? (
          <form onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setError('');
            
            try {
              const formattedPhone = formatPhoneNumber(phone);
              
              // Validate club code first
              const codeResponse = await apiFetch('/join/by-code', {
                method: 'POST',
                body: JSON.stringify({ club_code: clubCode }),
              });
              
              const codeData = await codeResponse.json();
              
              if (!codeData.success) {
                throw new Error(codeData.error || 'Club code not found');
              }
              
              // Get tenant info from code lookup
              const tenant = codeData.club_name;
              
              // Create join request (with authenticated user)
              const requestResponse = await apiFetch('/join/request-access', {
                method: 'POST',
                body: JSON.stringify({
                  phone: formattedPhone,
                  clubCode: clubCode,
                  name: playerName.trim(),
                  email: playerEmail.trim() || null,
                }),
              });
              
              const requestData = await requestResponse.json();
              
              if (!requestData.success) {
                throw new Error(requestData.error || 'Failed to create join request');
              }
              
              // Success! Redirect to pending approval
              router.push('/auth/pending-approval');
              
            } catch (error: any) {
              console.error('Error submitting join request:', error);
              setError(error.message || 'Failed to submit request');
            } finally {
              setLoading(false);
            }
          }}>
            {/* Phone (display only - already verified) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (Verified)
              </label>
              <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                {phone}
            </div>
            <p className="mt-2 text-xs text-gray-500 flex items-center justify-center gap-1">
              <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Verified via SMS
            </p>
          </div>

            {/* Club Code */}
            <div className="mb-6">
              <label htmlFor="clubCode" className="block text-sm font-medium text-gray-700 mb-2">
                Club Code
              </label>
              <input
                id="clubCode"
                type="text"
                value={clubCode}
                onChange={(e) => setClubCode(e.target.value.toUpperCase())}
                placeholder="FC247"
                maxLength={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl tracking-widest font-mono uppercase"
                required
                disabled={loading}
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                Ask your admin for your club's 5-character code
              </p>
            </div>

            {/* Name */}
            <div className="mb-6">
              <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="John Smith"
                maxLength={14}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
                disabled={loading}
              />
              <p className="mt-2 text-xs text-gray-500 flex justify-between">
                <span>This helps the admin identify you</span>
                <span>{playerName.length} / 14</span>
              </p>
            </div>

            {/* Email (optional) */}
            <div className="mb-6">
              <label htmlFor="playerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address (optional)
              </label>
              <input
                id="playerEmail"
                type="email"
                value={playerEmail}
                onChange={(e) => setPlayerEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={loading}
              />
              <p className="mt-2 text-xs text-gray-500">
                For match notifications and updates
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || clubCode.length !== 5 || !playerName.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-700 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting Request...' : 'Request to Join Club'}
            </button>
          </form>
        ) : null}

      </div>
    </div>
  );
}

export default function PlayerLoginPage() {
  // Removed Suspense - not needed for client component, was causing hydration errors
  return <PlayerLoginForm />;
}

