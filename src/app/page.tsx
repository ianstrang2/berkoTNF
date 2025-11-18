'use client';
import React, { useState } from 'react';
import MarketingNav from './marketing/components/MarketingNav.component';
import Hero from './marketing/components/Hero.component';
import ForPlayers from './marketing/components/ForPlayers.component';
import ForCaptains from './marketing/components/ForCaptains.component';
import FairTeams from './marketing/components/FairTeams.component';
import RealLife from './marketing/components/RealLife.component';
import HowItWorks from './marketing/components/HowItWorks.component';
import FinalCTA from './marketing/components/FinalCTA.component';
import ComingSoonModal from './marketing/components/ComingSoonModal.component';

export default function MarketingPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <MarketingNav onGetApp={() => setShowModal(true)} />
      
      <Hero onGetApp={() => setShowModal(true)} />
      <ForPlayers />
      <ForCaptains />
      <FairTeams />
      <RealLife />
      <HowItWorks />
      <FinalCTA onGetApp={() => setShowModal(true)} />

      <ComingSoonModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </div>
  );
}
