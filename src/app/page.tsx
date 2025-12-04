'use client';
import React, { useState } from 'react';
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

/**
 * Marketing Landing Page
 * 
 * This page is "dumb" - it doesn't check auth state.
 * Auth checks happen on app.caposport.com when user clicks "Login" or "Open App".
 * 
 * Domain Strategy:
 * - caposport.com → Marketing pages (this page, /privacy)
 * - app.caposport.com → App pages (/admin/*, /player/*, /auth/*)
 */
export default function MarketingPage() {
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
