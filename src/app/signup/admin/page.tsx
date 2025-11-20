/**
 * Admin Club Creation Page
 * 
 * /signup/admin
 * New admins create their club and become first player with admin privileges
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { isMobileUserAgent } from '@/utils/platform-detection';
import { apiFetch } from '@/lib/apiConfig';
import { getStoredAttribution, clearAttribution } from '@/lib/attribution';

function AdminSignupForm() {
  // Multi-step form state
  const [step, setStep] = useState<'phone' | 'otp' | 'details'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initializing, setInitializing] = useState(true);
  
  // Form fields
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [clubName, setClubName] = useState('');
  
  // Platform detection
  const [showAppPrompt, setShowAppPrompt] = useState(false);
  
  const router = useRouter();

  // Force logout any existing session on mount (clean slate for signup)
  useEffect(() => {
    const initializePage = async () => {
      try {
        // Check if there's an existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('[ADMIN_SIGNUP] Found existing session, checking if user already has a player...');
          
          // Check if this user already has a player in any club
          const response = await apiFetch('/auth/profile');
          if (response.ok) {
            const profileData = await response.json();
            
            if (profileData.profile?.player_id) {
              // User is already linked to a player - redirect them
              console.log('[ADMIN_SIGNUP] User already has player_id:', profileData.profile.player_id);
              setError(`You are already a member of a club. Cannot create a new club. Please log out first.`);
              
              // Force sign out and redirect after 3 seconds
              setTimeout(async () => {
                await supabase.auth.signOut();
                // Clear only non-auth storage items (preserve other app state)
                localStorage.removeItem('adminAuth');
                localStorage.removeItem('userProfile');
                localStorage.removeItem('capo_attribution');
                sessionStorage.clear();
                // Force reload to clear all state
                window.location.href = '/auth/login';
              }, 3000);
              
              setInitializing(false);
              return; // Stop initialization
            }
          }
          
          // No player linked - safe to proceed, but sign out first for clean slate
          console.log('[ADMIN_SIGNUP] Signing out existing session (no player linked)');
          await supabase.auth.signOut();
          
          // Clear only non-auth storage items (Supabase signOut already cleared auth tokens)
          localStorage.removeItem('adminAuth');
          localStorage.removeItem('userProfile');
          localStorage.removeItem('capo_attribution');
          sessionStorage.clear();
          
          // Wait a moment for signout to propagate
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Check platform
        if (typeof window !== 'undefined') {
          const userAgent = navigator.userAgent;
          const isMobile = isMobileUserAgent(userAgent);
          const isCapacitor = document.documentElement.classList.contains('capacitor');
          
          // Show app prompt for mobile web users (not Capacitor app)
          setShowAppPrompt(isMobile && !isCapacitor);
        }
      } catch (error) {
        console.error('Error initializing signup page:', error);
        // Don't block signup if checks fail
      } finally {
        setInitializing(false);
      }
    };

    initializePage();
  }, [supabase]);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.startsWith('0')) {
      return '+44' + numbers.slice(1);
    }
    if (numbers.startsWith('44')) {
      return '+' + numbers;
    }
    if (numbers.length === 10) {
      return '+44' + numbers;
    }
    
    return value;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formattedPhone = formatPhoneNumber(phone);
      
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

      if (!data.session) {
        throw new Error('No session created');
      }

      // OTP verified! Now collect club details
      setStep('details');
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setError(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate inputs
      if (!email || !name || !clubName) {
        throw new Error('All fields are required');
      }

      if (name.length > 14) {
        throw new Error('Name must be 14 characters or less');
      }

      if (clubName.length > 50) {
        throw new Error('Club name must be 50 characters or less');
      }

      // Read attribution data from localStorage (if exists)
      const attribution = getStoredAttribution();
      if (attribution) {
        console.log('📊 Attribution data found:', attribution);
      }

      // Phone comes from authenticated session, not from frontend
      const response = await apiFetch('/admin/create-club', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          club_name: clubName.trim(),
          attribution: attribution, // Include attribution data
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create club');
      }

      console.log('✅ Club created successfully:', data);

      // Clear attribution after successful signup (prevents stale data)
      clearAttribution();

      // Success! Redirect to admin dashboard
      window.location.href = '/admin/matches';
    } catch (error: any) {
      console.error('❌ Error creating club:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      });
      setError(error.message || 'Failed to create club');
      setStep('details'); // Stay on details page to see error
    } finally {
      setLoading(false);
    }
  };

  // Show loading while initializing (signing out any existing sessions)
  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Initializing...</p>
          </div>
        </div>
      </div>
    );
  }

  // App download interstitial for mobile users
  if (showAppPrompt && step === 'phone') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 p-3 shadow-lg">
              <img 
                src="/img/logo.png" 
                alt="Capo Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Start Your Club</h1>
            <p className="text-gray-600">
              For the best experience, download our app first
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Instant match notifications</p>
                <p className="text-sm text-gray-600">Get RSVPs and updates in real-time</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-10 h-10 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Track player stats</p>
                <p className="text-sm text-gray-600">Fantasy points, leaderboards, records</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="w-10 h-10 bg-gradient-to-tl from-purple-700 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Balance teams automatically</p>
                <p className="text-sm text-gray-600">AI-powered fair team generation</p>
              </div>
            </div>
          </div>

          <a
            href="https://play.google.com/store/apps/details?id=com.capo.app"
            className="block w-full py-3 px-4 bg-gradient-to-r from-purple-700 to-pink-500 text-white font-semibold rounded-lg text-center hover:opacity-90 transition-opacity mb-3"
          >
            Download App
          </a>

          <button
            onClick={() => setShowAppPrompt(false)}
            className="w-full py-2 px-4 text-gray-600 font-medium text-sm hover:text-gray-900 transition-colors"
          >
            Continue on Web →
          </button>
        
        <p className="text-xs text-gray-500 text-center mt-4 flex items-center justify-center gap-1">
          <svg className="w-3 h-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Web version has limited notifications
        </p>
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
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 'phone' && 'Start Your Club'}
            {step === 'otp' && 'Verify Your Phone'}
            {step === 'details' && 'Club Details'}
          </h1>
          <p className="text-gray-600 mt-2">
            {step === 'phone' && 'Enter your mobile number to begin'}
            {step === 'otp' && 'Enter the 6-digit code we sent you'}
            {step === 'details' && 'Tell us about your club'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Phone Number */}
        {step === 'phone' && (
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
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
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

        {/* Step 3: Club Details */}
        {step === 'details' && (
          <form onSubmit={handleCreateClub}>
            <div className="space-y-4 mb-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
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
                <p className="mt-1 text-xs text-gray-500">
                  For admin notifications and account recovery
                </p>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  maxLength={14}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {name.length}/14 characters
                </p>
              </div>

              <div>
                <label htmlFor="clubName" className="block text-sm font-medium text-gray-700 mb-2">
                  Club Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="clubName"
                  type="text"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="FC United"
                  maxLength={50}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {clubName.length}/50 characters
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !name || !clubName}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-700 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Club...' : 'Create Club'}
            </button>

            <p className="mt-4 text-xs text-gray-500 text-center">
              By creating a club, you become the first admin and player
            </p>
          </form>
        )}

      </div>
    </div>
  );
}

export default function AdminSignupPage() {
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
      <AdminSignupForm />
    </Suspense>
  );
}
