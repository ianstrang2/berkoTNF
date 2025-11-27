'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAttribution } from '@/hooks/useAttribution.hook';
import PlausibleScript from '@/components/analytics/PlausibleScript.component';

// Marketing Components
import MarketingNav from './marketing/components/MarketingNav.component';
import Hero from './marketing/components/Hero.component';
import ForPlayers from './marketing/components/ForPlayers.component';
import ForOrganisers from './marketing/components/ForOrganisers.component';
import FairTeams from './marketing/components/FairTeams.component';
import MatchControl from './marketing/components/MatchControl.component';
import Comparison from './marketing/components/Comparison.component';
import OriginStory from './marketing/components/OriginStory.component';
import SocialProof from './marketing/components/SocialProof.component';
import FAQ from './marketing/components/FAQ.component';
import FinalCTA from './marketing/components/FinalCTA.component';
import Footer from './marketing/components/Footer.component';
import ComingSoonModal from './marketing/components/ComingSoonModal.component';

export default function MarketingPage() {
  const router = useRouter();
  const { profile, loading } = useAuthContext();
  
  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (!loading && profile.isAuthenticated) {
      console.log('[HOMEPAGE] Authenticated user detected, redirecting to dashboard');
      if (profile.isAdmin) {
        router.push('/admin/matches');
      } else {
        router.push('/player/dashboard');
      }
    }
  }, [loading, profile, router]);
  
  // Capture marketing attribution on first visit
  useAttribution();
  
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Privacy-friendly analytics for marketing page only */}
      <PlausibleScript />
      
      {/* Navigation */}
      <MarketingNav onGetApp={() => setShowModal(true)} />
      
      {/* Hero Section */}
      <Hero onGetApp={() => setShowModal(true)} />
      
      {/* For Players Section */}
      <ForPlayers />
      
      {/* For Organisers Section */}
      <ForOrganisers />
      
      {/* Fair Teams Section */}
      <FairTeams />
      
      {/* Match Control + Week Timeline Section */}
      <MatchControl />
      
      {/* Comparison Table Section */}
      <Comparison />
      
      {/* Origin Story Section */}
      <OriginStory />
      
      {/* Social Proof / Testimonials Section */}
      <SocialProof />
      
      {/* FAQ Section */}
      <FAQ />
      
      {/* Final CTA Section */}
      <FinalCTA onGetApp={() => setShowModal(true)} />
      
      {/* Footer */}
      <Footer />

      {/* Coming Soon Modal */}
      <ComingSoonModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </div>
  );
}
