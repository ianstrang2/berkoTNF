'use client';
import React from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const RealLife: React.FC = () => {
  const sectionRef = useScrollReveal();

  return (
    <section ref={sectionRef} className="py-20 md:py-32 bg-neutral-50 scroll-reveal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-4">
            BUILT FOR REAL 5-A-SIDE LIFE
          </h2>
          <h3 className="text-2xl md:text-3xl font-semibold text-neutral-700">
            Built for the chaos around the game — the app to organise casual football without the WhatsApp headache.
          </h3>
        </div>

        {/* Match Control Centre Image */}
        <div className="max-w-4xl mx-auto mb-16">
          <img
            src="/img/marketing/match-control-centre.png"
            alt="Match Control Centre in the Capo casual football app"
            className="w-full rounded-2xl shadow-2xl"
          />
        </div>

        {/* Features */}
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="bg-white p-8 md:p-12 rounded-2xl shadow-soft-md">
            <h4 className="text-2xl font-bold text-neutral-900 mb-4">
              Match Control Centre
            </h4>
            <p className="text-lg text-neutral-700 leading-relaxed mb-6">
              Your pitch-side command centre. One screen showing your player pool, the teams, the score entry, the finish button. When you mark the match done, Capo updates everything instantly:
            </p>
          <ul className="grid md:grid-cols-2 gap-3 text-neutral-700">
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Tables
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Streaks
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Points
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Records
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Chemistry
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Performance graphs
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Every player's AI profile
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              The AI match report
            </li>
          </ul>
            <p className="text-lg text-neutral-700 leading-relaxed mt-6">
              Your post-game admin fits inside a single tap.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-soft-md">
              <h4 className="text-xl font-bold text-neutral-900 mb-3">
                Season setup & templates
              </h4>
              <p className="text-neutral-700 leading-relaxed">
                Set your dates. Pick your stat formats. Tune your balancing weights if you want to. Most captains set it once and never think about it again.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-soft-md">
              <h4 className="text-xl font-bold text-neutral-900 mb-3">
                Guests welcome
              </h4>
              <p className="text-neutral-700 leading-relaxed">
                A mate of a mate turns up? Add them as a guest in seconds. They're tracked separately until they become regulars.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-soft-md">
              <h4 className="text-xl font-bold text-neutral-900 mb-3">
                Smooth, fast, effortless
              </h4>
              <p className="text-neutral-700 leading-relaxed">
                Runs smooth on your phone. Feels premium without throwing settings at you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RealLife;

