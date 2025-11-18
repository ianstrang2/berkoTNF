'use client';
import React, { useState } from 'react';
import { useEffect } from 'react';
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
  // Set page metadata dynamically for SEO
  useEffect(() => {
    document.title = 'Capo – 5-a-side football app for organising casual football';
    
    // Update meta description with SEO keywords
    const metaDescription = document.querySelector('meta[name="description"]');
    const seoDescription = '5-a-side organiser app with football stats tracker. Collect match payments, balance teams, and track player stats. Free for organisers.';
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

    addOrUpdateMeta('og:title', 'Capo – 5-a-side football app for organising casual football');
    addOrUpdateMeta('og:description', '5-a-side organiser app with football stats tracker. Collect match payments, balance teams, and track player stats.');
    addOrUpdateMeta('og:type', 'website');
    addOrUpdateMeta('og:url', 'https://caposport.com/');
    addOrUpdateMeta('og:image', 'https://caposport.com/img/marketing/hero-pitch-night.jpg');
    
    // Twitter card
    addOrUpdateMeta('twitter:card', 'summary_large_image');
    addOrUpdateMeta('twitter:title', 'Capo – 5-a-side football app for organising casual football');
    addOrUpdateMeta('twitter:description', '5-a-side organiser app with football stats tracker. Collect match payments, balance teams, and track player stats.');
    addOrUpdateMeta('twitter:image', 'https://caposport.com/img/marketing/hero-pitch-night.jpg');

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
        "description": "5-a-side football app for organising casual football with stats tracking, team management, and payment collection",
        "logo": "https://caposport.com/img/logo.png"
      });
      document.head.appendChild(script);
    }
  }, []);
  
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
