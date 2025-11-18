'use client';
import React from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const ForCaptains: React.FC = () => {
  const sectionRef = useScrollReveal();

  return (
    <section ref={sectionRef} className="py-20 md:py-32 bg-neutral-50 scroll-reveal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-4">
            FOR CAPTAINS
          </h2>
          <h3 className="text-2xl md:text-3xl font-semibold text-neutral-700">
            Your game, sorted. Completely.
          </h3>
        </div>

        <div className="max-w-4xl mx-auto mb-16">
          <p className="text-lg md:text-xl text-neutral-700 leading-relaxed text-center">
            Capo removes the admin you've been quietly carrying for years.
            No more begging for replies, chasing money, or mediating team moans. It's the football team organiser app that actually fits how small-sided football works.
          </p>
        </div>

        {/* RSVP & Captain Features Image */}
        <div className="max-w-4xl mx-auto mb-16">
          <img
            src="/img/marketing/for-captains.png"
            alt="Capo football organiser app screen with RSVPs, waitlist and match payments"
            className="w-full rounded-2xl shadow-2xl"
          />
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-soft-md">
            <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-neutral-900 mb-3">
              One-tap RSVPs
            </h4>
            <p className="text-neutral-700 leading-relaxed">
              Players tap IN or OUT. You instantly see your numbers — no scrolling, no guessing.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-soft-md">
            <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-neutral-900 mb-3">
              Automatic waitlist
            </h4>
            <p className="text-neutral-700 leading-relaxed">
              If someone drops out, Capo fills the spot. You don't lift a finger.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-soft-md">
            <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-neutral-900 mb-3">
              Tiered invites (A/B/C groups)
            </h4>
            <p className="text-neutral-700 leading-relaxed">
              Your core players get invites first. Then it opens up if spaces remain. Your regulars feel valued. Your games fill faster.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-soft-md">
            <div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-neutral-900 mb-3">
              Payments handled upfront
            </h4>
            <p className="text-neutral-700 leading-relaxed">
              Players pay when they RSVP. You receive automatic payouts every match. No awkward chats. No IOUs. No fronting pitch money. Capo makes it effortless to collect football match payments every week.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForCaptains;

