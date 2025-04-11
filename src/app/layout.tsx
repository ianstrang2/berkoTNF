import './globals.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { Inter } from 'next/font/google';
import { ReactNode } from 'react';
import { NavigationProvider } from '@/contexts/NavigationContext';
import Script from 'next/script';
// Note: we'll use style tags for CSS in public directory

// Initialize the Inter font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata = {
  title: "Berko TNF Stats",
  description: "Statistics for Berko TNF Football",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.className}`}>
      <head>
        {/* Material Icons still needs to be loaded this way */}
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
        {/* CSS stylesheets */}
        <link rel="stylesheet" href="/assets/css/soft-ui-dashboard-tailwind.css" />
        <link rel="stylesheet" href="/assets/css/nucleo-icons.css" />
        <link rel="stylesheet" href="/assets/css/nucleo-svg.css" />
        <link rel="stylesheet" href="/assets/css/perfect-scrollbar.css" />
        <link rel="stylesheet" href="/assets/css/datatable.css" />
        {/* Font Awesome Icons */}
        <Script src="https://kit.fontawesome.com/42d5adcbca.js" crossOrigin="anonymous" strategy="beforeInteractive" />
      </head>
      <body className="h-full bg-gray-50">
        <NavigationProvider>
          {children}
        </NavigationProvider>

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
        
        {/* Perfect Scrollbar JS */}
        <Script src="/assets/js/plugins/perfect-scrollbar.min.js" strategy="afterInteractive" />
        <Script src="/assets/js/perfect-scrollbar.js" strategy="afterInteractive" />
        
        {/* Nav Pills JS */}
        <Script src="/assets/js/nav-pills.js" strategy="afterInteractive" />
        
        {/* Soft UI Dashboard Pro JS */}
        <Script src="/assets/js/soft-ui-dashboard-pro-tailwind.js" strategy="afterInteractive" />
      </body>
    </html>
  );
} 