import React, { useState } from 'react';

type AttributeKey = 'goalscoring' | 'defender' | 'stamina_pace' | 'control' | 'teamwork' | 'resilience';

interface AttributeScale {
  value: number;
  label: string;
  description: string;
}

interface AttributeGuide {
  title: string;
  scales: AttributeScale[];
}

interface AttributeGuides {
  [key: string]: AttributeGuide;
}

const attributeGuides: AttributeGuides = {
  goalscoring: {
    title: 'GOL',
    scales: [
      { value: 1, label: 'Rarely scores', description: 'misses chances, barely threatens' },
      { value: 2, label: 'Occasional scorer', description: 'nabs one now and then' },
      { value: 3, label: 'Average scorer', description: 'consistent but not standout' },
      { value: 4, label: 'Frequent scorer', description: 'often on the scoresheet' },
      { value: 5, label: 'Prolific', description: 'goal machine, always dangerous' },
    ],
  },
  defender: {
    title: 'DEF',
    scales: [
      { value: 1, label: 'Hates defending', description: 'avoids it, stays forward' },
      { value: 2, label: 'Reluctant defender', description: 'grumbles but does it' },
      { value: 3, label: 'Neutral', description: 'will defend if asked, no preference' },
      { value: 4, label: 'Willing defender', description: 'happy to drop back' },
      { value: 5, label: 'Prefers defending', description: 'loves the backline, thrives there' },
    ],
  },
  stamina_pace: {
    title: 'S&P',
    scales: [
      { value: 1, label: 'Slow and fades', description: 'lacks speed, tires quickly' },
      { value: 2, label: 'Steady but sluggish', description: 'moderate endurance, little burst' },
      { value: 3, label: 'Balanced mover', description: 'decent stamina, average pace' },
      { value: 4, label: 'Quick endurer', description: 'good speed, lasts well' },
      { value: 5, label: 'Relentless sprinter', description: 'fast and tireless all game' },
    ],
  },
  control: {
    title: 'CTL',
    scales: [
      { value: 1, label: 'Sloppy', description: 'loses ball often, wild passes' },
      { value: 2, label: 'Shaky', description: 'inconsistent touch, hit-or-miss passing' },
      { value: 3, label: 'Steady', description: 'decent retention, reliable passes' },
      { value: 4, label: 'Skilled', description: 'good control, accurate distribution' },
      { value: 5, label: 'Composed', description: 'excellent touch, precise playmaking' },
    ],
  },
  teamwork: {
    title: 'TMW',
    scales: [
      { value: 1, label: 'Lone wolf', description: 'solo runs, ignores teammates' },
      { value: 2, label: 'Selfish leaner', description: 'plays for self more than team' },
      { value: 3, label: 'Cooperative', description: 'works with others when convenient' },
      { value: 4, label: 'Supportive', description: 'links up well, helps teammates' },
      { value: 5, label: 'Team player', description: 'always collaborates, team-first mindset' },
    ],
  },
  resilience: {
    title: 'RES',
    scales: [
      { value: 1, label: 'Fragile', description: 'head drops fast, gives up when behind' },
      { value: 2, label: 'Wobbly', description: 'loses focus if losing, inconsistent effort' },
      { value: 3, label: 'Steady', description: 'keeps going, unaffected by score' },
      { value: 4, label: 'Gritty', description: 'fights harder when down, lifts others' },
      { value: 5, label: 'Rock solid', description: 'unshakable, thrives under pressure' },
    ],
  },
};

interface AttributeTooltipProps {
  attribute: AttributeKey;
}

export const AttributeTooltip: React.FC<AttributeTooltipProps> = ({ attribute }) => {
  const guide = attributeGuides[attribute];
  if (!guide) return null;

  return (
    <div className="absolute z-50 w-64 p-3 text-sm bg-white border border-neutral-200 rounded-lg shadow-lg">
      <h4 className="font-semibold mb-2">{guide.title}</h4>
      <ul className="space-y-1">
        {guide.scales.map(({ value, label, description }) => (
          <li key={value} className="flex items-start text-xs">
            <span className="font-medium mr-1">{value}:</span>
            <span>{label} ({description})</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface AttributeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AttributeGuideModal: React.FC<AttributeGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<AttributeKey>('goalscoring');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={onClose} aria-hidden="true"></div>
        
        {/* Modal panel */}
        <div className="relative bg-white rounded-2xl max-w-md w-full mx-auto shadow-2xl transform transition-all p-5">
          {/* Header with close button */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-700" id="modal-title">
              Player Grading Guide
            </h3>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Tab navigation */}
          <div className="border-b border-slate-200 mb-4">
            <nav className="-mb-px flex justify-between">
              {Object.entries(attributeGuides).map(([key, guide]) => (
                <button
                  key={key}
                  className={`pb-2 px-0 border-b-2 font-medium text-xs transition-colors focus:outline-none
                    ${activeTab === key 
                      ? 'border-fuchsia-500 text-fuchsia-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`
                  }
                  onClick={() => setActiveTab(key as AttributeKey)}
                >
                  {guide.title}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Tab content */}
          <div className="mb-5 max-h-60 overflow-y-auto">
            {Object.entries(attributeGuides).map(([key, guide]) => (
              activeTab === key && (
                <div key={key} className="space-y-3">
                  <ul className="space-y-2 text-slate-600">
                    {guide.scales.map(({ value, label, description }) => (
                      <li key={value} className="flex items-start">
                        <div className="inline-flex items-center justify-center w-5 h-5 mr-2 rounded-full bg-gradient-to-tl 
                          from-slate-100 to-slate-200 shadow-soft-xs text-slate-700 font-bold text-[10px] flex-shrink-0">
                          {value}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-slate-700">{label}</span>
                          <span className="ml-1 text-slate-500 text-xs">({description})</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
          
          {/* Footer with close button */}
          <div className="flex justify-end pt-1 border-t border-slate-200">
            <button
              onClick={onClose}
              className="mt-3 inline-block px-4 py-2 text-xs font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-purple-700 to-pink-500 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AttributeGuide = {
  AttributeTooltip,
  AttributeGuideModal
};

export default AttributeGuide; 