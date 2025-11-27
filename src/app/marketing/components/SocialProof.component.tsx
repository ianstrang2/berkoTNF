'use client';
import React from 'react';

interface Testimonial {
  quote: string;
  author: string;
  group: string;
}

const SocialProof: React.FC = () => {
  const testimonials: Testimonial[] = [
    {
      quote: "I went from chasing people all week to just… not. The stats have made everyone weirdly invested.",
      author: "Alex C",
      group: "Berko TNF"
    },
    {
      quote: "Nobody argues about the teams anymore. Now they just argue about who's the Grim Reaper.",
      author: "Ali W",
      group: "Bath Legends"
    },
    {
      quote: "Feels like Fantasy Football but we're actually on the pitch. The app has basically become part of the post-match chat.",
      author: "Bertie A",
      group: "Harrow 8pmClub"
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            What groups are saying
          </h2>
          <p className="text-lg text-gray-600">
            Real feedback from organisers and players using Capo
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow border border-purple-100"
            >
              {/* Quote Icon */}
              <div className="text-purple-400 mb-4">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>

              {/* Quote Text */}
              <p className="text-gray-800 text-lg leading-relaxed mb-6 italic">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="border-t border-purple-200 pt-4">
                <p className="font-bold text-gray-900">{testimonial.author}</p>
                <p className="text-sm text-gray-600">{testimonial.group}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default SocialProof;

