import './globals.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { Inter } from 'next/font/google';
import { ReactNode } from 'react';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';
import { StatusBarConfig } from '@/components/native/StatusBarConfig.component';
import { DeepLinkHandler } from '@/components/native/DeepLinkHandler.component';
import Script from 'next/script';
// Note: we'll use style tags for CSS in public directory

// Initialize the Inter font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata = {
  metadataBase: new URL('https://caposport.com'),
  title: "Capo – Football Organiser App for 5-a-side & 7-a-side | Stats, AI Team Balancing, RSVPs & Match Payments",
  description: "Capo is the football organiser app built for small-sided games: 5-a-side, 6-a-side and 7-a-side. Run your weekly kickabout without chaos – manage RSVPs, balance teams with AI, track stats and streaks, and collect football match payments automatically.",
  keywords: "5-a-side app, 7-a-side app, football team organiser app, five a side organiser, five a side team organiser, football match organiser app, football RSVPs app, football team management app, team balancing app football, fair team picker app, football stats app, football stat tracking app UK, football performance tracker, football streak tracker, fantasy football style stats app, 5-a-side booking app, football match payments app, best app for 5-a-side, how to organise 5-a-side, football league tracking app, app for managing casual football matches, Capo football app, Capo 5-a-side, Capo team balancer, Capo football stats, Capo app UK",
  authors: [{ name: "Capo" }],
  openGraph: {
    title: "Capo – The Football App Your Mates Will Obsess Over",
    description: "Capo turns your weekly kickabout into something everyone talks about – AI-balanced teams, football stats and streaks, RSVPs, match payments and reports, built for 5-a-side and small-sided football.",
    type: "website",
    locale: "en_GB",
    siteName: "Capo",
    url: "https://caposport.com/",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Capo – Football organiser app for 5-a-side with stats, AI team balancing and match payments",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@CapoSportApp",
    creator: "@CapoSportApp",
    title: "Capo – The Football App Your Mates Will Obsess Over",
    description: "Small-sided football, sorted. Run your 5-a-side or 7-a-side with AI team balancing, match RSVPs, football stats and automatic payments – without losing the vibe.",
    images: ["https://caposport.com/images/og-image.jpg"],
  },
  alternates: {
    canonical: "https://caposport.com/",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`h-full ${inter.className}`}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>Capo</title>
        {/* Material Icons still needs to be loaded this way */}
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
        {/* FAQ Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Do all my players have to download the Capo football app?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "No. You can start as the only person using Capo to organise your 5-a-side or 7-a-side games, logging scores and tracking attendance while sharing screenshots in WhatsApp. Players usually join once they see their football stats, streaks and AI profiles."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Is Capo free to use?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Capo is free for organisers. If you use in-app payments, players pay a small fee per match, turning Capo into a football match payments app that handles payouts automatically. If you collect money yourself, Capo stays 100% free."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Is Capo only for 5-a-side football?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Capo is built for small-sided football, including 5-a-side, 6-a-side and 7-a-side games. It works as a football team organiser app with RSVPs, AI team balancing, stats and match payments for any casual group."
                  }
                },
                {
                  "@type": "Question",
                  "name": "How is Capo better than using WhatsApp to organise 5-a-side?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "WhatsApp is great for chat, but it is not a football organiser app. Capo adds proper RSVPs, waitlists, AI team balancing, match payments and football stat tracking so you can organise 5-a-side games without scrolling through chaotic message threads."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Does Capo balance 5-a-side and 7-a-side teams fairly?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes. Capo has an AI team balancer designed for small-sided football. It uses recent performances and form to create fair teams for 5-a-side, 6-a-side and 7-a-side games, with the option to tweak line-ups manually."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Can I track goals, assists and streaks with Capo?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Capo works as a football stats app and performance tracker for casual players. It tracks goals, assists, appearances, wins, losses, streaks and long-term history, giving your five-a-side games fantasy-football-style stats."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Can Capo handle football match payments automatically?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes. Capo can be used as a football match payments app. Players pay when they RSVP and the app handles payouts, so you do not need to chase people for money or front the pitch booking fees."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Can I use Capo to track a casual football league?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Capo can act as a light football league tracking app. It keeps tables, results, streaks and stats across your season for your casual 5-a-side or 7-a-side group."
                  }
                }
              ]
            })
          }}
        />
        {/* CSS stylesheets */}
        <link rel="stylesheet" href="/assets/css/soft-ui-dashboard-tailwind.css" />
        <link rel="stylesheet" href="/assets/css/nucleo-icons.css" />
        <link rel="stylesheet" href="/assets/css/nucleo-svg.css" />
        {/* perfect-scrollbar.css disabled - using native scrollbars */}
        <link rel="stylesheet" href="/assets/css/datatable.css" />
        {/* Font Awesome is already imported at the top of the file */}
      </head>
      <body className="h-full bg-gray-50">
        <StatusBarConfig />
        <DeepLinkHandler />
        <ReactQueryProvider>
          <AuthProvider>
            <NavigationProvider>
              {children}
            </NavigationProvider>
          </AuthProvider>
        </ReactQueryProvider>

        {/* This script helps avoid hydration errors by making client rendering match server exactly */}
        <Script
          id="hydration-fix"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // When Next.js hydrates the page, the browser might show different
                // date formats than what was rendered on the server
                // This script removes any mismatch warnings from the console
                const originalConsoleError = console.error;
                console.error = function() {
                  if (arguments[0] && 
                      typeof arguments[0] === 'string' && 
                      arguments[0].includes('Warning: Text content did not match') &&
                      arguments[0].includes('did not match server-rendered HTML')) {
                    // Ignore the specific hydration error
                    return;
                  }
                  originalConsoleError.apply(console, arguments);
                };
              })();
            `,
          }}
        />
        
        {/* Soft UI Dashboard Pro JS - handles conditional loading of nav-pills and other features */}
        <Script src="/assets/js/soft-ui-dashboard-pro-tailwind.js" strategy="afterInteractive" />
      </body>
    </html>
  );
} 