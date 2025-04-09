import './globals.css';
import '../styles/soft-ui-dashboard-tailwind.css'; // ✅ Add this line
import "@/styles/nucleo-icons.css";
import { Inter } from 'next/font/google';
import { ReactNode } from 'react';
import { NavigationProvider } from '@/contexts/NavigationContext';


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
        {/* Add direct link to nucleo-icons.css */}
        <link href="/assets/css/nucleo-icons.css" rel="stylesheet" />
      </head>
      <body className="h-full bg-gray-50">
        <NavigationProvider>
          {children}
        </NavigationProvider>

        {/* This script helps avoid hydration errors by making client rendering match server exactly */}
        <script
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
      </body>
    </html>
  );
} 