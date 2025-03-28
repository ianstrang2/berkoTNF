import React, { useState, useEffect } from 'react';
import Button from '@/components/ui-kit/Button';
import Card from '@/components/ui-kit/Card';
import ConfirmationModal from '@/components/ui-kit/ConfirmationModal';

// Define types
interface Weight {
  attribute_id: string;
  name: string;
  description: string;
  weight: number;
}

interface ValidationErrors {
  [key: string]: string;
}

interface AttributeDescriptions {
  [key: string]: string;
}

type PositionGroup = 'defense' | 'midfield' | 'attack' | 'team';

const BalanceAlgorithmSetup: React.FC = () => {
  const [weights, setWeights] = useState<Weight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showValidationError, setShowValidationError] = useState<boolean>(false);

  // Attribute descriptions for tooltips
  const attributeDescriptions: AttributeDescriptions = {
    stamina_pace: "Stamina & Pace: Player's energy levels and speed during a match",
    control: "Ball Control: Player's ability to control and pass the ball",
    goalscoring: "Goalscoring: Player's likelyhood to get a goal in a match",
    resilience: "Resilience: How well a player maintains performance when team is losing",
    teamwork: "Teamwork: Player's ability to collaborate with teammates effectively"
  };

  // Technical attributes that need to sum to 100%
  const technicalAttributes: string[] = ['stamina_pace', 'control', 'goalscoring'];
  
  // Position groups that need validation
  const positionGroups: PositionGroup[] = ['defense', 'midfield', 'attack'];

  // Fetch balance weights on component mount
  useEffect(() => {
    fetchWeights();
  }, []);

  // Handle click outside to close tooltips
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (event.target instanceof Element && !event.target.closest('.tooltip-trigger')) {
        setActiveTooltip(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch balance weights from API
  const fetchWeights = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/balance-algorithm');
      
      if (!response.ok) {
        throw new Error('Failed to fetch balance weights');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setWeights(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch balance weights');
      }
    } catch (err) {
      console.error('Error fetching balance weights:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance weights');
    } finally {
      setLoading(false);
    }
  };

  // Get position name for display
  const getPositionName = (positionGroup: string): string => {
    switch(positionGroup) {
      case 'defense': return 'Defense';
      case 'midfield': return 'Midfield';
      case 'attack': return 'Attack';
      case 'team': return 'Overall Team';
      default: return positionGroup;
    }
  };

  // Calculate totals for each position group's technical attributes
  const calculateTotals = (): { totals: Record<string, number>; errors: ValidationErrors } => {
    const totals: Record<string, number> = {};
    const errors: ValidationErrors = {};
    
    positionGroups.forEach(group => {
      const groupWeights = weights.filter(w => 
        w.description === group && technicalAttributes.includes(w.name)
      );
      
      const total = groupWeights.reduce((sum, w) => sum + w.weight, 0);
      totals[group] = total;
      
      // Check if total is not 100%
      if (Math.abs(total - 1) > 0.001) { // Use a small epsilon for floating point comparison
        errors[group] = `${getPositionName(group)} technical attributes total ${(total * 100).toFixed(0)}% instead of 100%`;
      }
    });
    
    return { totals, errors };
  };

  // Validate weights before saving
  const validateWeights = (): boolean => {
    const { errors } = calculateTotals();
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setShowValidationError(true);
      return false;
    }
    
    return true;
  };

  // Save updated weights to API
  const saveWeights = async (): Promise<void> => {
    // Validate weights first
    if (!validateWeights()) {
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/admin/balance-algorithm', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ weights }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save balance weights');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Balance weights saved successfully');
        setHasChanges(false);
      } else {
        throw new Error(data.error || 'Failed to save balance weights');
      }
    } catch (err) {
      console.error('Error saving balance weights:', err);
      setError(err instanceof Error ? err.message : 'Failed to save balance weights');
    } finally {
      setSaving(false);
      setShowConfirmation(false);
    }
  };

  // Reset weights to defaults
  const resetWeights = async (): Promise<void> => {
    setIsResetting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/admin/balance-algorithm/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset balance weights');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setWeights(data.data);
        setSuccess('Balance weights reset to defaults successfully');
        setHasChanges(false);
      } else {
        throw new Error(data.error || 'Failed to reset balance weights');
      }
    } catch (err) {
      console.error('Error resetting balance weights:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset balance weights');
    } finally {
      setIsResetting(false);
      setShowResetConfirmation(false);
    }
  };

  // Round value to nearest 5%
  const roundToFive = (value: number): number => {
    return Math.round(value * 20) / 20; // Round to nearest 0.05 (5%)
  };

  // Handle weight change via slider
  const handleWeightChange = (attributeId: string, newValue: number): void => {
    // Round to nearest 5%
    newValue = roundToFive(newValue);
    
    // Find the weight being changed
    const changedWeightIndex = weights.findIndex(w => w.attribute_id === attributeId);
    if (changedWeightIndex === -1) return;
    
    const changedWeight = weights[changedWeightIndex];
    const oldValue = changedWeight.weight;
    
    // Only proceed if there's an actual change
    if (oldValue === newValue) return;
    
    // Update the weight
    const updatedWeights = [...weights];
    updatedWeights[changedWeightIndex] = {
      ...changedWeight,
      weight: newValue
    };
    
    setWeights(updatedWeights);
    setHasChanges(true);
  };

  // Group weights by position (description field in API)
  const groupedWeights: Record<string, Weight[]> = weights.reduce((groups: Record<string, Weight[]>, weight) => {
    const group = weight.description;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(weight);
    return groups;
  }, {});

  // Get the position group display order
  const positionOrder: string[] = ['defense', 'midfield', 'attack', 'team'];

  // Get position-specific color
  const getPositionColor = (positionGroup: string): string => {
    switch(positionGroup) {
      case 'defense': return 'bg-info-500';
      case 'midfield': return 'bg-success-500';
      case 'attack': return 'bg-error-500';
      case 'team': return 'bg-secondary-500';
      default: return 'bg-neutral-400';
    }
  };

  // Get border color for position
  const getPositionBorderColor = (positionGroup: string): string => {
    switch(positionGroup) {
      case 'defense': return 'border-info-500';
      case 'midfield': return 'border-success-500';
      case 'attack': return 'border-error-500';
      case 'team': return 'border-secondary-500';
      default: return 'border-neutral-400';
    }
  };

  // Format attribute name for display
  const formatAttributeName = (name: string): string => {
    return name
      .replace(/_/g, ' ') // Replace underscores with spaces
      .split(' ') // Split into words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
      .join(' '); // Join words back together
  };

  // Format weight as percentage
  const formatWeight = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  // Toggle tooltip visibility
  const toggleTooltip = (attributeName: string): void => {
    setActiveTooltip(activeTooltip === attributeName ? null : attributeName);
  };

  return (
    <Card>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Team Balance Algorithm Setup</h2>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowResetConfirmation(true)}
            variant="secondary"
            disabled={loading || saving || isResetting}
          >
            Reset to Default
          </Button>
          <Button
            onClick={() => setShowConfirmation(true)}
            disabled={!hasChanges || loading || saving || isResetting}
          >
            Save Changes
          </Button>
        </div>
      </div>
      
      {(error || success) && (
        <div className={`mb-4 p-3 rounded-md ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {error || success}
        </div>
      )}
      
      {loading ? (
        <div className="py-8 text-center">
          <div className="inline-block w-8 h-8 border-4 border-t-primary-500 border-r-primary-300 border-b-primary-200 border-l-primary-100 rounded-full animate-spin"></div>
          <p className="mt-2 text-neutral-600">Loading balance settings...</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-neutral-600">
            Adjust the weights to control how different player attributes are balanced during team creation.
            Technical attributes within each position group must total 100%.
          </p>
          
          {showValidationError && Object.keys(validationErrors).length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 text-amber-700 rounded-md">
              <p className="font-medium mb-1">Please fix the following errors before saving:</p>
              <ul className="list-disc pl-5">
                {Object.entries(validationErrors).map(([group, error]) => (
                  <li key={group}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="space-y-8">
            {positionOrder.map(position => {
              const positionWeights = groupedWeights[position] || [];
              
              if (positionWeights.length === 0) return null;
              
              // Calculate technical total for this position (only applicable for defense, midfield, attack)
              const isTechnicalGroup = positionGroups.includes(position as PositionGroup);
              const { totals } = calculateTotals();
              const technicalTotal = isTechnicalGroup ? totals[position] || 0 : null;
              
              return (
                <div key={position} className="border rounded-lg p-4">
                  <h3 className="font-medium text-lg mb-3">
                    {getPositionName(position)}
                    {isTechnicalGroup && (
                      <span className={`ml-2 text-sm font-normal ${Math.abs(technicalTotal! - 1) > 0.001 ? 'text-amber-500' : 'text-green-500'}`}>
                        (Technical Attributes: {(technicalTotal! * 100).toFixed(0)}%)
                      </span>
                    )}
                  </h3>
                  
                  <div className="space-y-4">
                    {positionWeights.map(weight => {
                      const isTechnical = technicalAttributes.includes(weight.name);
                      return (
                        <div key={weight.attribute_id} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <span className="font-medium">
                                {formatAttributeName(weight.name)}
                              </span>
                              
                              {attributeDescriptions[weight.name] && (
                                <button
                                  className="ml-1 text-neutral-400 hover:text-neutral-600 tooltip-trigger"
                                  onClick={() => toggleTooltip(weight.name)}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                  </svg>
                                  
                                  {activeTooltip === weight.name && (
                                    <div className="absolute z-10 mt-2 p-2 bg-white shadow-lg rounded-md border text-sm w-64">
                                      {attributeDescriptions[weight.name]}
                                    </div>
                                  )}
                                </button>
                              )}
                              
                              {isTechnical && (
                                <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                                  Technical
                                </span>
                              )}
                            </div>
                            <span className="font-semibold">{formatWeight(weight.weight)}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <span className="text-xs mr-2">0%</span>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={weight.weight}
                              onChange={(e) => handleWeightChange(weight.attribute_id, parseFloat(e.target.value))}
                              className="flex-1"
                            />
                            <span className="text-xs ml-2">100%</span>
                          </div>
                          
                          <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getPositionColor(position)}`}
                              style={{ width: `${weight.weight * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      
      {/* Save Confirmation Modal */}
      {showConfirmation && (
        <ConfirmationModal
          isOpen={showConfirmation}
          title="Save Changes"
          message="Are you sure you want to save these changes? This will affect how teams are balanced in future matches."
          confirmText="Save Changes"
          cancelText="Cancel"
          onConfirm={saveWeights}
          onClose={() => setShowConfirmation(false)}
          isConfirming={saving}
        />
      )}
      
      {/* Reset Confirmation Modal */}
      {showResetConfirmation && (
        <ConfirmationModal
          isOpen={showResetConfirmation}
          title="Reset to Default"
          message="Are you sure you want to reset all balance algorithm settings to their default values? This action cannot be undone."
          confirmText="Reset to Default"
          cancelText="Cancel"
          onConfirm={resetWeights}
          onClose={() => setShowResetConfirmation(false)}
          isConfirming={isResetting}
          confirmButtonClass="bg-red-500 hover:bg-red-600"
        />
      )}
    </Card>
  );
};

export default BalanceAlgorithmSetup; 