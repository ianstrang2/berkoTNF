'use client';
import React from 'react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const FairTeams: React.FC = () => {
  const sectionRef = useScrollReveal();

  return (
    <section ref={sectionRef} className="py-20 md:py-32 bg-white scroll-reveal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-4">
            FAIR TEAMS
          </h2>
          <h3 className="text-2xl md:text-3xl font-semibold text-neutral-700">
            Balanced matches. Less moaning. More football.
          </h3>
        </div>

        <div className="max-w-4xl mx-auto mb-16">
          <p className="text-lg md:text-xl text-neutral-700 leading-relaxed text-center">
            Stacked teams ruin a good night. Capo builds fair sides using ratings and real performance — and shows you exactly why the teams are balanced.
          </p>
        </div>

        {/* Team Balancing Image */}
        <div className="max-w-4xl mx-auto mb-16">
          <img
            src="/img/marketing/fair-teams.png"
            alt="Football team picker app interface showing balance score, attribute sliders, and side-by-side team comparison - Capo 5-a-side football app"
            className="w-full rounded-2xl shadow-2xl"
          />
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="bg-neutral-50 p-8 md:p-12 rounded-2xl">
            <h4 className="text-2xl font-bold text-neutral-900 mb-4">
              AI team balancing with sliders
            </h4>
            <p className="text-lg text-neutral-700 leading-relaxed">
              Adjust the importance of things like pace, technique, goalscoring, teamwork and resilience. Use fixed ratings or let Capo lean on live form. The teams feel right before you even kick off.
            </p>
          </div>

          <div className="bg-neutral-50 p-8 md:p-12 rounded-2xl">
            <h4 className="text-2xl font-bold text-neutral-900 mb-4">
              Balance Score with full breakdown
            </h4>
            <p className="text-lg text-neutral-700 leading-relaxed">
              When you generate teams, Capo shows a clear Balance Score and a breakdown across defence, midfield, attack, teamwork and resilience. If someone complains, you've got the evidence.
            </p>
          </div>

          <div className="bg-neutral-50 p-8 md:p-12 rounded-2xl">
            <h4 className="text-2xl font-bold text-neutral-900 mb-4">
              Total control when you want it
            </h4>
            <p className="text-lg text-neutral-700 leading-relaxed">
              Drag players between teams. Re-run the balance. Lock the sides. Automatic when you want simple. Tweaker-friendly when you want control.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FairTeams;

