'use client';
import React, { useState } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import MarketingNav from './marketing/components/MarketingNav.component';
import Hero from './marketing/components/Hero.component';
import ForPlayers from './marketing/components/ForPlayers.component';
import ForCaptains from './marketing/components/ForCaptains.component';
import FairTeams from './marketing/components/FairTeams.component';
import RealLife from './marketing/components/RealLife.component';
import HowItWorks from './marketing/components/HowItWorks.component';
import FinalCTA from './marketing/components/FinalCTA.component';
import ComingSoonModal from './marketing/components/ComingSoonModal.component';
import Footer from './marketing/components/Footer.component';
import PlausibleScript from '@/components/analytics/PlausibleScript.component';
import { useAttribution } from '@/hooks/useAttribution.hook';

export default function MarketingPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Check if user is already logged in - redirect to dashboard
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // User is logged in - redirect to dashboard
          console.log('[HOMEPAGE] User already logged in, redirecting to admin/matches');
          router.push('/admin/matches');
          return;
        }
      } catch (error) {
        console.error('[HOMEPAGE] Error checking session:', error);
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkSession();
  }, [router]);
  
  // Capture marketing attribution on first visit
  useAttribution();
  
  // Set page metadata dynamically for SEO
  useEffect(() => {
    document.title = 'Capo — The 5-a-side football app for organising casual football';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    const seoDescription = 'Capo is the 5-a-side football app that organises your casual football game. Track stats, balance teams, and collect match payments effortlessly.';
    if (metaDescription) {
      metaDescription.setAttribute('content', seoDescription);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = seoDescription;
      document.head.appendChild(meta);
    }

    // Add canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', 'https://caposport.com/');
      document.head.appendChild(canonical);
    }

    // Add Open Graph tags for social sharing
    const addOrUpdateMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (meta) {
        meta.setAttribute('content', content);
      } else {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
      }
    };

    addOrUpdateMeta('og:title', 'Capo — The 5-a-side football app your mates will obsess over');
    addOrUpdateMeta('og:description', 'The 5-a-side football app for casual football groups. Organise matches, track stats, balance teams and handle payments with zero admin.');
    addOrUpdateMeta('og:type', 'website');
    addOrUpdateMeta('og:url', 'https://caposport.com/');
    addOrUpdateMeta('og:image', 'https://caposport.com/og-image.jpg');
    
    // Twitter card
    addOrUpdateMeta('twitter:card', 'summary_large_image');
    addOrUpdateMeta('twitter:title', 'Capo — The 5-a-side football app your mates will obsess over');
    addOrUpdateMeta('twitter:description', 'The 5-a-side football app for casual football groups. Organise matches, track stats, balance teams and handle payments with zero admin.');
    addOrUpdateMeta('twitter:image', 'https://caposport.com/og-image.jpg');

    // Add JSON-LD structured data
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Capo",
        "url": "https://caposport.com",
        "description": "Capo is the 5-a-side football app that organises your casual football game. Track stats, balance teams, and collect match payments effortlessly.",
        "logo": "https://caposport.com/logo.png"
      });
      document.head.appendChild(script);
    }
  }, []);
  
  const [showModal, setShowModal] = useState(false);

  // Show loading state while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Privacy-friendly analytics for marketing page only */}
      <PlausibleScript />
      
      <MarketingNav onGetApp={() => setShowModal(true)} />
      
      <Hero onGetApp={() => setShowModal(true)} />
      <ForPlayers />
      <ForCaptains />
      <FairTeams />
      <RealLife />
      <HowItWorks />
      <FinalCTA onGetApp={() => setShowModal(true)} />
      <Footer />

      <ComingSoonModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </div>
  );
}
