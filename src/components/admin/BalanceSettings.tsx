import React, { useState, useEffect, useRef } from 'react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';
import { AttributeTooltip } from './AttributeGuide';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

type BalanceWeight = {
  weight_id: number;
  template_id: number;
  position_group: string;
  attribute: string;
  weight: number;
  name: string;
  description: string;
  position_group_name: string;
};

const BalanceSettings = () => {
  const [weights, setWeights] = useState<BalanceWeight[]>([]);
  const [originalWeights, setOriginalWeights] = useState<BalanceWeight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setActiveTooltip(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch weights on component mount
  useEffect(() => {
    const fetchWeights = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/admin/balance-algorithm');
        if (!response.ok) {
          throw new Error('Failed to fetch balance weights');
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch balance weights');
        }
        
        setWeights(data.data);
        setOriginalWeights(data.data);
      } catch (err: any) {
        console.error('Error fetching balance weights:', err);
        setError(err.message || 'Failed to fetch balance weights');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWeights();
  }, []);

  // Ensure weights in a position group sum to 100%
  const normalizeWeights = (
    updatedWeights: BalanceWeight[], 
    positionGroup: string, 
    changedWeightId: number
  ) => {
    // Get only the attribute weights (not team-wide factors like resilience/teamwork)
    const groupWeights = updatedWeights.filter(w => 
      w.position_group === positionGroup && 
      w.attribute !== 'resilience' && 
      w.attribute !== 'teamwork'
    );
    
    // Calculate sum of weights in this group
    const weightSum = groupWeights.reduce((sum, w) => sum + w.weight, 0);
    
    // If sum is not 100%, adjust other weights proportionally
    if (Math.abs(weightSum - 100) > 0.01) {
      // Get weight that was just changed
      const changedWeight = groupWeights.find(w => w.weight_id === changedWeightId);
      if (!changedWeight) return updatedWeights;
      
      // If changed weight is 100%, set others to 0
      if (changedWeight.weight === 100) {
        return updatedWeights.map(w => {
          if (w.position_group === positionGroup && 
              w.weight_id !== changedWeightId && 
              w.attribute !== 'resilience' && 
              w.attribute !== 'teamwork') {
            return { ...w, weight: 0 };
          }
          return w;
        });
      }
      
      // Otherwise, adjust other weights proportionally
      const otherWeights = groupWeights.filter(w => w.weight_id !== changedWeightId);
      const otherWeightsSum = otherWeights.reduce((sum, w) => sum + w.weight, 0);
      
      // If other weights sum to 0, distribute remaining evenly
      if (otherWeightsSum === 0) {
        const remainingWeight = 100 - changedWeight.weight;
        const equalShare = remainingWeight / otherWeights.length;
        
        return updatedWeights.map(w => {
          if (w.position_group === positionGroup && 
              w.weight_id !== changedWeightId && 
              w.attribute !== 'resilience' && 
              w.attribute !== 'teamwork') {
            return { ...w, weight: equalShare };
          }
          return w;
        });
      }
      
      // Otherwise, scale other weights to make total 100%
      const scaleFactor = (100 - changedWeight.weight) / otherWeightsSum;
      
      return updatedWeights.map(w => {
        if (w.position_group === positionGroup && 
            w.weight_id !== changedWeightId && 
            w.attribute !== 'resilience' && 
            w.attribute !== 'teamwork') {
          // Calculate new weight and round to nearest integer
          const newWeight = Math.round(w.weight * scaleFactor);
          return { ...w, weight: newWeight };
        }
        return w;
      });
    }
    
    return updatedWeights;
  };

  // Handle weight slider change
  const handleWeightChange = (weightId: number, newValue: number) => {
    let updatedWeights = weights.map(weight => 
      weight.weight_id === weightId 
        ? { ...weight, weight: newValue } 
        : weight
    );
    
    // Find the changed weight
    const changedWeight = updatedWeights.find(w => w.weight_id === weightId);
    if (!changedWeight) return;
    
    // If this is not resilience or teamwork, normalize weights in the position group
    if (changedWeight.attribute !== 'resilience' && changedWeight.attribute !== 'teamwork') {
      updatedWeights = normalizeWeights(updatedWeights, changedWeight.position_group, weightId);
    }
    
    setWeights(updatedWeights);
  };

  // Check if weights have been modified
  const hasChanges = () => {
    return weights.some((weight, index) => 
      weight.weight !== originalWeights[index]?.weight
    );
  };

  // Save changes
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch('/api/admin/balance-algorithm', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ weights })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save balance weights');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save balance weights');
      }
      
      setWeights(data.data);
      setOriginalWeights(data.data);
      
      setSuccessMessage('Balance weights saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error saving balance weights:', err);
      setError(err.message || 'Failed to save balance weights');
    } finally {
      setIsSaving(false);
    }
  };

  // Open reset confirmation dialog
  const openResetConfirmation = () => {
    setShowResetConfirmation(true);
  };

  // Close reset confirmation dialog
  const closeResetConfirmation = () => {
    setShowResetConfirmation(false);
  };

  // Reset to defaults
  const handleReset = async () => {
    try {
      setIsResetting(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch('/api/admin/balance-algorithm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'reset' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset balance weights');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to reset balance weights');
      }
      
      setWeights(data.data);
      setOriginalWeights(data.data);
      
      setSuccessMessage('Balance weights reset to defaults');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error resetting balance weights:', err);
      setError(err.message || 'Failed to reset balance weights');
    } finally {
      setIsResetting(false);
      closeResetConfirmation();
    }
  };

  // Group weights by position group
  const groupedWeights = weights.reduce((groups, weight) => {
    const group = groups[weight.position_group] || [];
    group.push(weight);
    groups[weight.position_group] = group;
    return groups;
  }, {} as Record<string, BalanceWeight[]>);

  // Custom slider color based on position group
  const getSliderColor = (positionGroup: string) => {
    switch (positionGroup) {
      case 'defense': return 'bg-blue-500';
      case 'midfield': return 'bg-green-500';
      case 'attack': return 'bg-red-500';
      case 'team': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  // Custom slider background color based on position group
  const getSliderBgColor = (positionGroup: string) => {
    switch (positionGroup) {
      case 'defense': return 'bg-blue-100';
      case 'midfield': return 'bg-green-100';
      case 'attack': return 'bg-red-100';
      case 'team': return 'bg-purple-100';
      default: return 'bg-gray-100';
    }
  };

  const getPositionGroupColor = (positionGroup: string) => {
    switch (positionGroup) {
      case 'defense': return 'text-blue-700';
      case 'midfield': return 'text-green-700';
      case 'attack': return 'text-red-700';
      case 'team': return 'text-purple-700';
      default: return 'text-gray-700';
    }
  };

  // Check if a weight has been modified
  const isWeightModified = (weightId: number) => {
    const weight = weights.find(w => w.weight_id === weightId);
    const originalWeight = originalWeights.find(w => w.weight_id === weightId);
    return weight && originalWeight && weight.weight !== originalWeight.weight;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Balance Algorithm Settings</h1>
        <div className="flex gap-2">
          <Button
            onClick={openResetConfirmation}
            disabled={isLoading || isResetting || isSaving}
            variant="outline"
            className="border-gray-300"
          >
            {isResetting ? 'Resetting...' : 'Reset to Defaults'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !hasChanges() || isSaving}
            variant="primary"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
      
      {isLoading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
          Loading balance weights...
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4 text-red-700">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-4 text-green-700">
          {successMessage}
        </div>
      )}

      {hasChanges() && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4 text-yellow-700">
          You have unsaved changes. Click "Save Changes" to apply them.
        </div>
      )}

      <p className="mb-6 text-gray-600">
        These weights determine how player attributes are used to balance teams. Higher weights give more importance to an attribute when creating balanced teams.
        For each position group, the technical attributes (stamina, control, finishing) should sum to 100%. The team-wide factors (resilience, teamwork) are applied equally to all players.
      </p>
      
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(groupedWeights).map(([positionGroup, groupWeights]) => (
            <Card 
              key={positionGroup} 
              title={groupWeights[0]?.position_group_name || positionGroup}
              titleClass={getPositionGroupColor(positionGroup)}
              icon={null}
              footer={null}
              className="overflow-hidden"
            >
              <div className="space-y-6">
                {groupWeights.map(weight => (
                  <div key={weight.weight_id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-gray-800">{weight.name}</span>
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => setActiveTooltip(activeTooltip === `${weight.position_group}-${weight.attribute}` ? null : `${weight.position_group}-${weight.attribute}`)}
                          aria-label={activeTooltip === `${weight.position_group}-${weight.attribute}` ? "Close description" : "View description"}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        {activeTooltip === `${weight.position_group}-${weight.attribute}` && (
                          <div ref={tooltipRef} className="absolute z-10 mt-2 ml-6 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-semibold">{weight.name}</span>
                              <button 
                                onClick={() => setActiveTooltip(null)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <p>{weight.description}</p>
                            <p className="mt-2">
                              <span className="font-semibold">Higher value:</span> More importance when balancing teams
                            </p>
                            <p className="mt-1">
                              <span className="font-semibold">Lower value:</span> Less importance when balancing teams
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center">
                        {isWeightModified(weight.weight_id) && (
                          <span className="mr-2 text-xs font-medium text-yellow-600">Modified</span>
                        )}
                        <span className="text-sm font-medium text-gray-700">{weight.weight}%</span>
                      </div>
                    </div>
                    <div className={`relative h-2 w-full rounded-full overflow-hidden ${getSliderBgColor(positionGroup)}`}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={weight.weight}
                        onChange={(e) => handleWeightChange(weight.weight_id, parseInt(e.target.value))}
                        className="appearance-none absolute w-full h-full opacity-0 cursor-pointer"
                      />
                      <div 
                        className={`absolute top-0 left-0 h-full ${getSliderColor(positionGroup)} transition-all duration-200`}
                        style={{ width: `${weight.weight}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
      
      <Card
        title="How Team Balancing Works"
        icon={null}
        footer={null}
        className="mt-10 bg-gray-50 border border-gray-200"
      >
        <p className="text-gray-600 mb-4">
          The team balancing algorithm creates teams by following this sequence:
        </p>
        <ul className="space-y-4">
          <li className="flex items-start">
            <span className="text-gray-600">
              • Players are first allocated as defenders, based on highest desire to defend.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-gray-600">
              • Next, players are assigned as attackers, prioritising those with highest goalscoring ability.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-gray-600">
              • Remaining players are assigned to midfield positions.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-gray-600">
              • Each player is evaluated within their assigned position using the position-specific weights you've set above. This creates a skill score for each player.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-gray-600">
              • Players are distributed between teams in a "snake draft" pattern. The highest-scored defender goes to Team A, second-highest to Team B, and alternating from there. This repeats for midfielders and attackers.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-gray-600">
              • Finally, <strong>Resilience</strong> and <strong>Teamwork</strong> attributes are applied according to their weights. These are processed last, and their impact is proportional to the weight you've assigned them in the settings above.
            </span>
          </li>
        </ul>
        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-md">
          <h3 className="font-medium text-blue-800 mb-2">Important Note on Weights</h3>
          <p className="text-blue-700 text-sm">
            For each position group (Defenders, Midfielders, Attackers), the weights for technical attributes 
            (Stamina & Pace, Ball Control, Finishing) should always sum to 100%. When you adjust one slider, 
            the others will automatically adjust to maintain this balance.
          </p>
        </div>
      </Card>

      {/* Reset Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showResetConfirmation}
        title="Reset Balance Algorithm"
        message="Are you sure you want to reset all balance weights to their default values? This action cannot be undone and will affect how teams are balanced."
        confirmText="Reset"
        cancelText="Cancel"
        onConfirm={handleReset}
        onCancel={closeResetConfirmation}
        isConfirming={isResetting}
      />
    </div>
  );
};

export default BalanceSettings; 