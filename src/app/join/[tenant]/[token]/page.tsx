/**
 * Club Join Flow
 * 
 * /join/[tenant]/[token]
 * Players join via club invite link, auto-link based on phone number
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { QRCodeSVG } from 'qrcode.react';
import { apiFetch } from '@/lib/apiConfig';
import { formatPhoneNumber, isValidUKPhone, getPhoneErrorMessage } from '@/utils/phoneValidation.util';

function JoinForm() {
  const params = useParams();
  const router = useRouter();
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'landing' | 'phone' | 'otp' | 'name' | 'linking'>('landing');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clubName, setClubName] = useState('');
  const [validatingToken, setValidatingToken] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const tenant = params?.tenant as string;
  const token = params?.token as string;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const joinUrl = `${baseUrl}/join/${tenant}/${token}`;

  // Detect mobile device and if already in Capacitor app
  useEffect(() => {
    const checkMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(checkMobile);
    
    // Skip landing for web browsers (desktop + mobile web)
    // Show landing ONLY in Capacitor app (where app benefits are relevant)
    const isCapacitor = document.documentElement.classList.contains('capacitor');
    if (!isCapacitor && !validatingToken && clubName) {
      setStep('phone'); // Web: skip landing, go straight to phone entry
    }
  }, [validatingToken, clubName]);

  // Validate invite token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await apiFetch(`/join/validate-token?tenant=${tenant}&token=${token}`);
        const data = await response.json();
        
        if (!data.success) {
          setError(data.error || 'Invalid or expired invite link');
          setValidatingToken(false);
          return;
        }
        
        setClubName(data.clubName);
        setValidatingToken(false);
      } catch (err) {
        setError('Failed to validate invite link');
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [tenant, token]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // CLIENT-SIDE VALIDATION: Basic format check before API call
      if (!isValidUKPhone(phone)) {
        setLoading(false);
        setError('Please enter a valid UK mobile number (e.g., 07123 456789)');
        return;
      }
      
      const formattedPhone = formatPhoneNumber(phone);
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;

      setStep('otp');
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      setError(getPhoneErrorMessage(error));
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
      
      // Verify OTP with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;

      if (!data.session) {
        throw new Error('No session created');
      }

      // OTP verified! Now ask for name before linking
      setStep('name');
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setError(getPhoneErrorMessage(error));
      setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitName = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStep('linking');

    try {
      const formattedPhone = formatPhoneNumber(phone);

      // Now auto-link with name provided
      const linkResponse = await apiFetch('/join/link-player', {
        method: 'POST',
        body: JSON.stringify({
          tenant,
          token,
          phone: formattedPhone,
          displayName: displayName.trim() || null,
          email: email.trim() || null,
        }),
      });

      const linkData = await linkResponse.json();

      if (linkData.success) {
        if (linkData.autoLinked) {
          // Successfully auto-linked to existing player
          // Redirect based on role
          if (linkData.player?.is_admin) {
            router.push('/admin/matches');
          } else {
            router.push('/player/dashboard');
          }
        } else {
          // Created join request - pending admin approval
          router.push('/auth/pending-approval');
        }
      } else {
        throw new Error(linkData.error || 'Failed to link profile');
      }
    } catch (error: any) {
      console.error('Error linking:', error);
      setError(error.message || 'Failed to link profile');
      setStep('name');
    } finally {
      setLoading(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Validating invite link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !phone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Link</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <a
              href="/auth/login"
              className="inline-block py-3 px-6 bg-gradient-to-r from-purple-700 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90"
            >
              Try Regular Login
            </a>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Join {clubName}</h1>
          <p className="text-gray-600 mt-2">
            {step === 'landing'
              ? isMobile ? 'Get in the game!' : 'Scan to install the app'
              : step === 'phone' 
              ? 'Enter your mobile number to continue' 
              : step === 'otp'
              ? 'Enter the 6-digit code we sent you'
              : step === 'name'
              ? 'What\'s your name?'
              : 'Linking your profile...'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {step === 'landing' ? (
          // App-first landing screen
          isMobile ? (
            // Mobile: Show app download CTA
            <div className="space-y-6">
              <div className="border border-slate-200 rounded-xl p-6">
                <h3 className="font-semibold text-slate-700 mb-4 text-sm">Instant access to:</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-gradient-to-br from-purple-700 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                    <span>Priority match notifications</span>
                  </div>
                  <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-gradient-to-br from-purple-700 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                    <span>Easily RSVP to matches</span>
                  </div>
                  <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-gradient-to-br from-purple-700 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                    <span>Your profile and fantasy points</span>
                  </div>
                  <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-gradient-to-br from-purple-700 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                    <span>Leaderboards and match reports</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  // Try deep link first
                  window.location.href = `capo://join/${tenant}/${token}`;
                  // Fallback to Play Store after short delay
                  setTimeout(() => {
                    window.location.href = 'https://play.google.com/store/apps/details?id=com.caposport.capo';
                  }, 1500);
                }}
                className="w-full py-3 px-6 bg-gradient-to-tl from-purple-700 to-pink-500 text-white font-medium rounded-lg hover:scale-102 active:opacity-85 transition-all shadow-soft-md text-sm uppercase"
              >
                Download the Capo App
              </button>

              <button
                onClick={() => setStep('phone')}
                className="w-full text-center text-sm text-slate-600 hover:text-slate-900 transition-colors py-2"
              >
                Continue on web →
              </button>

              <div className="border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 text-center">
                  <strong>Web-only users:</strong> Players who do not install the app may not receive new match notifications.
                </p>
              </div>
            </div>
          ) : (
            // Desktop: Show QR code
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-700 mb-4">Scan with your phone to install the app:</p>
                
                {/* Real QR Code */}
                <div className="w-52 h-52 mx-auto bg-white border-2 border-slate-200 rounded-xl p-4 mb-4 shadow-soft-md">
                  <QRCodeSVG 
                    value={joinUrl}
                    size={192}
                    level="M"
                    includeMargin={false}
                    className="w-full h-full"
                  />
                </div>

                <div className="bg-slate-100 rounded-lg p-3 mb-4">
                  <p className="text-xs font-mono text-gray-700 break-all">{joinUrl}</p>
                </div>

                <p className="text-sm text-gray-600">
                  Or visit this page on your phone to download the app
                </p>
              </div>
            </div>
          )
        ) : step === 'phone' ? (
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
                autoFocus
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
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
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
              {loading ? 'Verifying...' : 'Verify & Join'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setOtp('');
                setError('');
              }}
              disabled={loading}
              className="w-full py-2 px-4 text-gray-600 font-medium text-sm hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              ← Change Phone Number
            </button>
          </form>
        ) : step === 'name' ? (
          <form onSubmit={handleSubmitName}>
            <div className="mb-6">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Smith"
                maxLength={14}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={loading}
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500 flex justify-between">
                <span>This helps the admin identify you when approving</span>
                <span>{displayName.length} / 14</span>
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
                disabled={loading}
              />
              <p className="mt-2 text-xs text-gray-500">
                For match notifications and updates
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-700 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Continuing...' : 'Continue'}
            </button>
          </form>
        ) : (
          <div className="text-center py-8">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent mb-4"></div>
            <p className="text-gray-600">Setting up your account...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-700 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <JoinForm />
    </Suspense>
  );
}

