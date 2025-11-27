'use client';
import React from 'react';

const OriginStory: React.FC = () => {
  return (
    <section className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Story Text */}
          <div className="space-y-6">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
              Built by the guys who actually run a kickabout.
            </h2>
            
            <div className="prose prose-lg text-gray-700 space-y-4">
              <p className="leading-relaxed">
                We ran the same nine-a-side for eight years. First with a simple spreadsheet. Then it developed into a beast - full of graphs, macros and little hacks to track streaks and in-form players.
              </p>
              
              <p className="leading-relaxed">
                In 2025, we finally admitted it needed a proper home — so we taught ourselves to code and turned it into an app.
              </p>
              
              <p className="leading-relaxed">
                Capo is built from that spreadsheet: every feature battle-tested in real games, every tweak born from real "this is actually annoying" moments. We're building the app we wish we'd had from day one — and we'll keep adding features as long as we're still playing.
              </p>
            </div>
          </div>

          {/* Right: Image */}
          <div className="relative">
            <div className="relative w-full rounded-2xl shadow-2xl overflow-hidden">
              <img 
                src="/img/marketing/original-story-spreadsheet.png"
                alt="The original spreadsheet that became Capo – football stats and team balancer built for a real 5-a-side group"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OriginStory;

