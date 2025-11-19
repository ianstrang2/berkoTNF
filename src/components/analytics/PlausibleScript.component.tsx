/**
 * Plausible Analytics Script Component
 * 
 * Privacy-friendly analytics for marketing pages only.
 * Does NOT track authenticated app pages.
 * 
 * Usage:
 * - Add to marketing pages only (e.g., homepage at `/`)
 * - Do NOT add to authenticated routes (/admin, /player, /superadmin)
 */

'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Plausible Analytics component
 * 
 * Only loads on marketing pages (currently just `/`)
 * Automatically tracks pageviews
 */
export default function PlausibleScript() {
  const pathname = usePathname();
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Only load Plausible on marketing pages
    // Currently: only the homepage (`/`)
    const isMarketingPage = pathname === '/';
    
    setShouldLoad(isMarketingPage);
    
    if (isMarketingPage) {
      console.log('[Plausible] Loading analytics for marketing page');
    }
  }, [pathname]);

  // Don't render script if not on marketing page
  if (!shouldLoad) {
    return null;
  }

  return (
    <>
      {/* Plausible Analytics Script */}
      <Script
        id="plausible-analytics"
        strategy="afterInteractive"
        src="https://plausible.io/js/pa-9n7aEGKWpPiFeHabLIwWC.js"
      />
      
      {/* Plausible Initialization Script */}
      <Script
        id="plausible-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
            plausible.init();
          `,
        }}
      />
    </>
  );
}

