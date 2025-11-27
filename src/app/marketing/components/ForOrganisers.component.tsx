'use client';
import React from 'react';

const ForOrganisers: React.FC = () => {
  return (
    <section className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-4">For Organisers</p>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Your game, sorted — without losing the vibe.
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Capo takes the admin you've quietly carried for years — chasing replies, juggling dropouts, collecting money — and wraps it into one clean flow. You still run the group. Capo just takes the stress away.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Feature Bullets */}
          <div className="space-y-8 order-2 lg:order-1">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">One-tap RSVPs</h3>
              <p className="text-gray-700 leading-relaxed">
                Players tap IN or OUT. You see your numbers instantly — no scrolling, no guessing, no "who's actually coming tonight?".
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Automatic waitlist</h3>
              <p className="text-gray-700 leading-relaxed">
                If someone drops out, Capo fills the spot from your waiting list. You don't even open the chat.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Tiered invites for your A/B/C list</h3>
              <p className="text-gray-700 leading-relaxed">
                Your core players get the first invite. If spaces remain, it opens to the wider group. Regulars feel valued. Games fill faster.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Payments handled upfront</h3>
              <p className="text-gray-700 leading-relaxed">
                Players pay when they RSVP. You receive automatic payouts every match. No awkward chasing, no IOUs, no fronting pitch money.
              </p>
            </div>

            {/* Free Badge */}
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full font-semibold">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Free forever for organisers
            </div>
          </div>

          {/* Right: Phone Screenshot */}
          <div className="relative order-1 lg:order-2">
            <div className="relative w-72 aspect-[9/19] mx-auto lg:mx-0 lg:ml-auto">
              <img 
                src="/img/marketing/organiser-dashboard.png"
                alt="football organiser app with RSVPs, dropouts and waiting list – Capo organiser dashboard"
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForOrganisers;

