import "./globals.css";

export const metadata = {
  title: "Berko TNF Stats",
  description: "Statistics for Berko TNF Football",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      </head>
      <body className="h-full">
        <div className="min-h-full flex flex-col">
          <nav className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <div className="flex-shrink-0 flex items-center">
                    <a href="/" className="flex items-center">
                      <img 
                        src="/logo.png" 
                        alt="Berko TNF" 
                        className="h-10 w-auto my-1"
                      />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </nav>
          <main className="flex-grow bg-neutral-50 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
          <footer className="bg-white">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
              <p className="text-center text-sm text-neutral-500">
                © {new Date().getFullYear()} Berko TNF. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
