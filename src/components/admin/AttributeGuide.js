import React from 'react';

const attributeGuides = {
  goalscoring: {
    title: 'Goalscoring',
    scales: [
      { value: 1, label: 'Rarely scores', description: 'misses chances, barely threatens' },
      { value: 2, label: 'Occasional scorer', description: 'nabs one now and then' },
      { value: 3, label: 'Average scorer', description: 'consistent but not standout' },
      { value: 4, label: 'Frequent scorer', description: 'often on the scoresheet' },
      { value: 5, label: 'Prolific', description: 'goal machine, always dangerous' },
    ],
  },
  defender: {
    title: 'Defender',
    scales: [
      { value: 1, label: 'Hates defending', description: 'avoids it, stays forward' },
      { value: 2, label: 'Reluctant defender', description: 'grumbles but does it' },
      { value: 3, label: 'Neutral', description: 'will defend if asked, no preference' },
      { value: 4, label: 'Willing defender', description: 'happy to drop back' },
      { value: 5, label: 'Prefers defending', description: 'loves the backline, thrives there' },
    ],
  },
  stamina_pace: {
    title: 'Stamina & Pace',
    scales: [
      { value: 1, label: 'Slow and fades', description: 'lacks speed, tires quickly' },
      { value: 2, label: 'Steady but sluggish', description: 'moderate endurance, little burst' },
      { value: 3, label: 'Balanced mover', description: 'decent stamina, average pace' },
      { value: 4, label: 'Quick endurer', description: 'good speed, lasts well' },
      { value: 5, label: 'Relentless sprinter', description: 'fast and tireless all game' },
    ],
  },
  control: {
    title: 'Control',
    scales: [
      { value: 1, label: 'Sloppy', description: 'loses ball often, wild passes' },
      { value: 2, label: 'Shaky', description: 'inconsistent touch, hit-or-miss passing' },
      { value: 3, label: 'Steady', description: 'decent retention, reliable passes' },
      { value: 4, label: 'Skilled', description: 'good control, accurate distribution' },
      { value: 5, label: 'Composed', description: 'excellent touch, precise playmaking' },
    ],
  },
  teamwork: {
    title: 'Teamwork',
    scales: [
      { value: 1, label: 'Lone wolf', description: 'solo runs, ignores teammates' },
      { value: 2, label: 'Selfish leaner', description: 'plays for self more than team' },
      { value: 3, label: 'Cooperative', description: 'works with others when convenient' },
      { value: 4, label: 'Supportive', description: 'links up well, helps teammates' },
      { value: 5, label: 'Team player', description: 'always collaborates, team-first mindset' },
    ],
  },
  resilience: {
    title: 'Resilience',
    scales: [
      { value: 1, label: 'Fragile', description: 'head drops fast, gives up when behind' },
      { value: 2, label: 'Wobbly', description: 'loses focus if losing, inconsistent effort' },
      { value: 3, label: 'Steady', description: 'keeps going, unaffected by score' },
      { value: 4, label: 'Gritty', description: 'fights harder when down, lifts others' },
      { value: 5, label: 'Rock solid', description: 'unshakable, thrives under pressure' },
    ],
  },
};

export const AttributeTooltip = ({ attribute }) => {
  const guide = attributeGuides[attribute];
  if (!guide) return null;

  return (
    <div className="absolute z-50 w-64 p-3 text-sm bg-white border border-gray-200 rounded-lg shadow-lg">
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

export const AttributeGuideModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = React.useState('goalscoring');

  return (
    isOpen && (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" onClick={onClose}>
            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>

          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Player Grading Guide
                    </h3>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Tabs for desktop, accordion for mobile */}
                  <div className="mt-4">
                    <div className="sm:hidden">
                      {/* Mobile accordion */}
                      <div className="space-y-4">
                        {Object.entries(attributeGuides).map(([key, guide]) => (
                          <div key={key} className="border rounded-lg overflow-hidden">
                            <button
                              className="w-full px-4 py-2 text-left font-medium bg-gray-50 hover:bg-gray-100"
                              onClick={() => setActiveTab(key)}
                            >
                              {guide.title}
                            </button>
                            {activeTab === key && (
                              <div className="p-4 border-t">
                                <ul className="space-y-2">
                                  {guide.scales.map(({ value, label, description }) => (
                                    <li key={value} className="flex items-start">
                                      <span className="font-medium mr-2">{value}:</span>
                                      <span>{label} ({description})</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="hidden sm:block">
                      {/* Desktop tabs */}
                      <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                          {Object.entries(attributeGuides).map(([key, guide]) => (
                            <button
                              key={key}
                              className={`
                                whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                                ${activeTab === key
                                  ? 'border-primary-500 text-primary-600'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                              `}
                              onClick={() => setActiveTab(key)}
                            >
                              {guide.title}
                            </button>
                          ))}
                        </nav>
                      </div>

                      <div className="mt-4">
                        {Object.entries(attributeGuides).map(([key, guide]) => (
                          activeTab === key && (
                            <div key={key} className="space-y-4">
                              <ul className="space-y-3">
                                {guide.scales.map(({ value, label, description }) => (
                                  <li key={value} className="flex items-start">
                                    <span className="font-medium mr-2">{value}:</span>
                                    <span>{label} ({description})</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );
};

export default { AttributeTooltip, AttributeGuideModal }; 