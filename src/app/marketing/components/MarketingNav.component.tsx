'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/ui-kit/Button.component';

interface MarketingNavProps {
  onGetApp: () => void;
}

const MarketingNav: React.FC<MarketingNavProps> = ({ onGetApp }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-md'
          : 'bg-transparent'
      }`}
      style={{ 
        paddingTop: 'env(safe-area-inset-top, 0px)',
        WebkitPaddingTop: 'env(safe-area-inset-top, 0px)'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src={isScrolled ? '/img/logo-with-text-purple.png' : '/img/logo-with-text-white.png'}
              alt="Capo - 5-a-side football app"
              width={580}
              height={160}
              className="h-10 w-auto md:h-12"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="outline"
              size="md"
              onClick={onGetApp}
              className={`${
                isScrolled
                  ? 'border-purple-500 text-purple-600 hover:bg-purple-50'
                  : 'border-white text-white hover:bg-white/10'
              }`}
            >
              Get the App
            </Button>
            <Link href="/auth/login">
              <Button variant="primary" size="md">
                Login
              </Button>
            </Link>
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-3">
            <Link href="/auth/login">
              <Button variant="primary" size="sm">
                Login
              </Button>
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`p-2 rounded-lg transition-colors ${
                isScrolled
                  ? 'text-neutral-800 hover:bg-neutral-100'
                  : 'text-white hover:bg-white/10'
              }`}
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 bg-white border-t border-neutral-200">
            <button
              onClick={() => {
                onGetApp();
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-3 text-base font-medium text-neutral-900 hover:bg-neutral-50 transition-colors"
            >
              Get the App
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default MarketingNav;

