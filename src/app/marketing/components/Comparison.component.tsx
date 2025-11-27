'use client';
import React from 'react';

const Comparison: React.FC = () => {
  const features = [
    {
      feature: 'Group chat & banter',
      whatsapp: { icon: '✅', text: 'Perfect for chat' },
      spond: { icon: '😐', text: 'Feels a bit corporate' },
      capo: { icon: '👍', text: 'Keep chat on WhatsApp. We focus on the football.' }
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
            Keep the chat where it lives. Let Capo run the football.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left p-4 text-gray-700 font-bold text-lg w-1/4">Feature</th>
                <th className="p-4 text-center text-gray-700 font-bold text-lg w-1/4">WhatsApp</th>
                <th className="p-4 text-center text-gray-700 font-bold text-lg w-1/4">Spond</th>
                <th className="p-4 text-center bg-purple-50 text-purple-900 font-bold text-lg w-1/4 rounded-t-lg">
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
                  <td className="p-4 font-semibold text-gray-900">{row.feature}</td>
                  
                  <td className="p-4 text-center">
                    <div className="text-2xl mb-1">{row.whatsapp.icon}</div>
                    <div className="text-sm text-gray-600">{row.whatsapp.text}</div>
                  </td>
                  
                  <td className="p-4 text-center">
                    <div className="text-2xl mb-1">{row.spond.icon}</div>
                    <div className="text-sm text-gray-600">{row.spond.text}</div>
                  </td>
                  
                  <td className="p-4 text-center bg-purple-50">
                    <div className="text-2xl mb-1">{row.capo.icon}</div>
                    <div className="text-sm text-purple-900 font-medium">{row.capo.text}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile-friendly Cards (shown on small screens) */}
        <div className="lg:hidden mt-8 space-y-6">
          {features.map((row, index) => (
            <div key={index} className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 text-lg mb-4">{row.feature}</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{row.whatsapp.icon}</div>
                  <div>
                    <div className="font-semibold text-sm text-gray-700">WhatsApp</div>
                    <div className="text-sm text-gray-600">{row.whatsapp.text}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{row.spond.icon}</div>
                  <div>
                    <div className="font-semibold text-sm text-gray-700">Spond</div>
                    <div className="text-sm text-gray-600">{row.spond.text}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 bg-purple-50 -m-4 mt-2 p-4 rounded-b-lg">
                  <div className="text-2xl">{row.capo.icon}</div>
                  <div>
                    <div className="font-semibold text-sm text-purple-900">Capo</div>
                    <div className="text-sm text-purple-900 font-medium">{row.capo.text}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Comparison;

