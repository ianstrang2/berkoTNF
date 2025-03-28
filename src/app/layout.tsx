import "./globals.css";
import { Inter } from 'next/font/google';
import { ReactNode } from 'react';

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
      </head>
      <body className="h-full">
        {children}
      </body>
    </html>
  );
} 