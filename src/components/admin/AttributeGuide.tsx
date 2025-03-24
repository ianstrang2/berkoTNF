import React from 'react';

type AttributeTooltipProps = {
  attribute: string;
  isOpen: boolean;
};

export const AttributeTooltip: React.FC<AttributeTooltipProps> = ({ attribute, isOpen }) => {
  if (!isOpen) return null;
  
  const attributeDescriptions: Record<string, string[]> = {
    goalscoring: [
      '1: Rarely scores (misses chances, barely threatens)',
      '2: Occasional scorer (nabs one now and then)',
      '3: Average scorer (consistent but not standout)',
      '4: Frequent scorer (often on the scoresheet)',
      '5: Prolific (goal machine, always dangerous)'
    ],
    defender: [
      '1: Hates defending (avoids it, stays forward)',
      '2: Reluctant defender (grumbles but does it)',
      '3: Neutral (will defend if asked, no preference)',
      '4: Willing defender (happy to drop back)',
      '5: Prefers defending (loves the backline, thrives there)'
    ],
    stamina_pace: [
      '1: Slow and fades (lacks speed, tires quickly)',
      '2: Steady but sluggish (moderate endurance, little burst)',
      '3: Balanced mover (decent stamina, average pace)',
      '4: Quick endurer (good speed, lasts well)',
      '5: Relentless sprinter (fast and tireless all game)'
    ],
    control: [
      '1: Sloppy (loses ball often, wild passes)',
      '2: Shaky (inconsistent touch, hit-or-miss passing)',
      '3: Steady (decent retention, reliable passes)',
      '4: Skilled (good control, accurate distribution)',
      '5: Composed (excellent touch, precise playmaking)'
    ],
    teamwork: [
      '1: Lone wolf (solo runs, ignores teammates)',
      '2: Selfish leaner (plays for self more than team)',
      '3: Cooperative (works with others when convenient)',
      '4: Supportive (links up well, helps teammates)',
      '5: Team player (always collaborates, team-first mindset)'
    ],
    resilience: [
      '1: Fragile (head drops fast, gives up when behind)',
      '2: Wobbly (loses focus if losing, inconsistent effort)',
      '3: Steady (keeps going, unaffected by score)',
      '4: Gritty (fights harder when down, lifts others)',
      '5: Rock solid (unshakable, thrives under pressure)'
    ]
  };

  const descriptions = attributeDescriptions[attribute] || [];

  return (
    <div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64 text-sm">
      <h4 className="font-semibold mb-2 capitalize">{attribute.replace('_', ' ')}</h4>
      <ul className="space-y-1">
        {descriptions.map((desc, index) => (
          <li key={index} className="text-xs">{desc}</li>
        ))}
      </ul>
    </div>
  );
}; 