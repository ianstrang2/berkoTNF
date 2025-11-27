'use client';
import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: "Do all my players have to download the app?",
      answer: "Not straight away. You can happily start as the only person using Capo – running your games, logging scores and tracking attendance – while you drop screenshots and stats into the group chat. Once people see their goals, streaks and AI-written profiles, they usually ask \"what's that app?\" and join in. It's built to spread naturally."
    },
    {
      question: "Is Capo free?",
      answer: "Capo is free forever for organisers. If you use in-app payments, players pay a small fee per match and Capo handles the payouts – basically turning it into a football match payments app so you never chase money again. If you prefer to collect cash or bank transfers yourself, Capo stays 100% free for everyone."
    },
    {
      question: "Is Capo only for 5-a-side?",
      answer: "Nope. Capo is built for small-sided football in general – 5-a-side, 6-a-side, 7-a-side, even 8s and 9s. The same organiser tools work for any format: RSVPs, waiting lists, AI-balanced teams, payments, stats and streaks. If you're wondering how to organise a weekly five-a-side or seven-a-side game without chaos, this is exactly what it's for."
    },
    {
      question: "Isn't WhatsApp enough?",
      answer: "WhatsApp is perfect for chat and banter – we use it too. It's just not built to run football: no proper RSVPs, no logic for dropouts, no payments, no team balancing, no stats. That's how you end up scrolling through 200 messages trying to work out who's actually in. Keep the chat on WhatsApp. Let Capo be the football match organiser app that quietly handles the boring bits in the background."
    },
    {
      question: "How is this different from Spond?",
      answer: "Spond is great for formal clubs, parents and big teams. Capo is built for mates and small-sided games – think your regular 5-a-side or 7-a-side. It mixes all the sensible organiser stuff (RSVPs, payments, attendance tracking) with the fun things you actually talk about: stats, streaks, AI profiles and fair teams. Less \"school newsletter\", more \"this is our kickabout\"."
    },
    {
      question: "Is it complicated to set up?",
      answer: "No. Most captains can organise their first game in a few minutes. Create your group, drop in your pitch, set your usual time and invite the squad. After that, Capo becomes your weekly football attendance tracker and team picker – you mostly just create new matches and hit \"Finish\" at full-time."
    },
    {
      question: "What if someone doesn't pay?",
      answer: "If you use in-app payments, players pay when they RSVP – so by the time you kick off, the match is already paid for. No awkward chasing, no IOUs, no fronting pitch money. Capo effectively becomes your football match payments app: it tracks who's in, who's paid and sends the money where it needs to go."
    },
    {
      question: "Does Capo balance teams fairly?",
      answer: "Yes. Capo includes an AI team balancer built specifically for football. It looks at recent performances and form so your small-sided games feel fair – whether it's 5-a-side, 6-a-side or 7-a-side. You can always nudge things manually if you fancy it, but most organisers just hit \"Balance Teams\" and get on with their night."
    },
    {
      question: "Can Capo track goals and streaks?",
      answer: "It can — that's half the fun. Capo is a proper football stats app for casual players: it tracks goals, appearances, wins, losses, streaks, form and records over time. If you like the idea of fantasy-football-style stats but for your actual five-a-side performances, this is exactly that. All the organiser needs to do is enter who scored — Capo updates all the stats, streaks, tables and profiles automatically."
    },
    {
      question: "Can I use Capo for leagues, or just one-off games?",
      answer: "You can do both. Capo works great for a single weekly kickabout, but it also doubles as a light football league tracking app – keeping a running table, points, streaks and history for your group across the season."
    },
    {
      question: "What platforms is Capo on?",
      answer: "Capo is available on iOS and Android, plus web access. Captains can run everything from their phone at the side of the pitch – from RSVPs and team selection to final score and match report."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 lg:py-32 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            FAQs
          </h2>
          <p className="text-lg text-gray-600">
            Everything you need to know about Capo
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Question Button */}
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 text-lg pr-4">
                  {faq.question}
                </span>
                <svg 
                  className={`w-6 h-6 text-purple-600 flex-shrink-0 transition-transform ${
                    openIndex === index ? 'transform rotate-180' : ''
                  }`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Answer */}
              {openIndex === index && (
                <div className="px-6 pb-5 text-gray-700 leading-relaxed border-t border-gray-100 pt-4">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;

