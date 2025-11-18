'use client';
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-neutral-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Logo & Tagline */}
          <div>
            <h3 className="text-3xl font-bold mb-3 text-white">CAPO</h3>
            <p className="text-white/60 text-base leading-relaxed">
              The 5-a-side football app your mates will obsess over
            </p>
          </div>

          {/* Social Media */}
          <div className="text-center">
            <p className="text-white/80 text-sm font-semibold mb-4 uppercase tracking-wide">Follow us</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {/* Twitter */}
              <a
                href="https://twitter.com/CapoSportApp"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-5 py-3 bg-white/5 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20 rounded-xl transition-all duration-300 hover:shadow-lg border border-white/10 hover:border-purple-500/50 min-w-[180px]"
                aria-label="Follow Capo on Twitter"
              >
                <svg className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">@CapoSportApp</span>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com/capo.app"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-5 py-3 bg-white/5 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-pink-500/20 rounded-xl transition-all duration-300 hover:shadow-lg border border-white/10 hover:border-pink-500/50 min-w-[180px]"
                aria-label="Follow Capo on Instagram"
              >
                <svg className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">@capo.app</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="text-center md:text-right">
            <p className="text-white/80 text-sm font-semibold mb-4 uppercase tracking-wide">Quick Links</p>
            <div className="flex flex-col gap-3">
              <a 
                href="/auth/login" 
                className="text-base text-white/70 hover:text-white transition-colors hover:translate-x-1 inline-block"
              >
                Login
              </a>
              <a 
                href="mailto:hello@caposport.com" 
                className="text-base text-white/70 hover:text-white transition-colors hover:translate-x-1 inline-block"
              >
                Contact
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-16 pt-8 border-t border-white/10 text-center">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} Capo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


