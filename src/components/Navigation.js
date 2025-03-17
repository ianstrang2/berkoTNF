'use client';

import { useState } from 'react';

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="flex items-center sm:hidden">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-500"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-controls="mobile-menu"
          aria-expanded={isMobileMenuOpen}
        >
          <span className="sr-only">Open main menu</span>
          {isMobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      <div className={`${isMobileMenuOpen ? '' : 'hidden'} sm:hidden`} id="mobile-menu">
        <div className="space-y-1 pb-3 pt-2">
          <a
            href="/"
            className="block px-3 py-2 text-base font-medium text-neutral-600 hover:bg-neutral-100 hover:text-primary-600"
          >
            HOME
          </a>
          <a
            href="/admin"
            className="block px-3 py-2 text-base font-medium text-neutral-600 hover:bg-neutral-100 hover:text-primary-600"
          >
            ADMIN
          </a>
        </div>
      </div>
    </>
  );
} 