'use client';
import React from 'react';

const Comparison: React.FC = () => {
  const features = [
    {
      feature: 'Group chat & banter',
      whatsapp: { icon: '✅', text: 'Perfect for chat' },
      spond: { icon: '😐', text: 'Feels a bit corporate' },
      capo: { icon: '✅', text: 'Chat built in. Focus on the football.' }
    },
    {
      feature: 'RSVPs & numbers',
      whatsapp: { icon: '❌', text: 'Hidden in a long thread' },
      spond: { icon: '✅', text: 'Solid' },
      capo: { icon: '✅', text: 'One-tap RSVPs, clear numbers at a glance' }
    },
    {
      feature: 'Payments',
      whatsapp: { icon: '❌', text: 'Manual & awkward' },
      spond: { icon: '✅', text: 'Strong' },
      capo: { icon: '✅', text: 'Integrated match payments + automatic payouts' }
    },
    {
      feature: 'Dropouts & waiting list',
      whatsapp: { icon: '❌', text: 'Pure chaos' },
      spond: { icon: '❌', text: 'Manual' },
      capo: { icon: '✅', text: 'Auto waitlist + instant fill' }
    },
    {
      feature: 'Stats & streaks',
      whatsapp: { icon: '❌', text: 'None' },
      spond: { icon: '❌', text: 'None' },
      capo: { icon: '✅', text: 'Full history, stats, streaks, AI profiles' }
    },
    {
      feature: 'Team balancing',
      whatsapp: { icon: '❌', text: 'Someone gets blamed every week' },
      spond: { icon: '❌', text: 'Not built for this' },
      capo: { icon: '✅', text: 'AI-balanced teams with clear Balance Score' }
    },
    {
      feature: 'Vote after the match',
      whatsapp: { icon: '😐', text: 'Could use polls' },
      spond: { icon: '❌', text: 'None' },
      capo: { icon: '✅', text: 'Badges of pride or shame' }
    },
    {
      feature: 'Vibes / identity',
      whatsapp: { icon: '🔥', text: 'Fun but messy' },
      spond: { icon: '🥶', text: 'Efficient but lifeless' },
      capo: { icon: '⚡', text: 'Built for mates, banter and bragging rights' }
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Why use Capo instead of just WhatsApp or Spond?
          </h2>
          <p className="text-2xl text-purple-600 font-semibold">
            Keep the football where it lives. Chat included.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          {/* Scroll hint for mobile */}
          <p className="text-xs text-gray-400 text-center mb-2 sm:hidden">← Swipe to compare →</p>
          
          <table className="w-full border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left p-2 sm:p-4 text-gray-700 font-bold text-sm sm:text-lg w-1/4">Feature</th>
                <th className="p-2 sm:p-4 text-center text-gray-700 font-bold text-sm sm:text-lg w-1/4">WhatsApp</th>
                <th className="p-2 sm:p-4 text-center text-gray-700 font-bold text-sm sm:text-lg w-1/4">Spond</th>
                <th className="p-2 sm:p-4 text-center bg-purple-50 text-purple-900 font-bold text-sm sm:text-lg w-1/4 rounded-t-lg">
                  Capo
                  <div className="text-xs font-normal text-purple-700 mt-1">← Built for this</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((row, index) => (
                <tr 
                  key={index} 
                  className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <td className="p-2 sm:p-4 font-semibold text-gray-900 text-xs sm:text-base">{row.feature}</td>
                  
                  <td className="p-2 sm:p-4 text-center">
                    <div className="text-xl sm:text-2xl mb-1">{row.whatsapp.icon}</div>
                    <div className="text-xs sm:text-sm text-gray-600">{row.whatsapp.text}</div>
                  </td>
                  
                  <td className="p-2 sm:p-4 text-center">
                    <div className="text-xl sm:text-2xl mb-1">{row.spond.icon}</div>
                    <div className="text-xs sm:text-sm text-gray-600">{row.spond.text}</div>
                  </td>
                  
                  <td className="p-2 sm:p-4 text-center bg-purple-50">
                    <div className="text-xl sm:text-2xl mb-1">{row.capo.icon}</div>
                    <div className="text-xs sm:text-sm text-purple-900 font-medium">{row.capo.text}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default Comparison;

