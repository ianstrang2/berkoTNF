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
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showValidationError, setShowValidationError] = useState<boolean>(false);

  // Technical attributes that need to sum to 100%
  const technicalAttributes: string[] = ['stamina_pace', 'control', 'goalscoring'];
  
  // Position groups that need validation
  const positionGroups: PositionGroup[] = ['defense', 'midfield', 'attack'];

  // Fetch balance weights on component mount
  useEffect(() => {
    fetchWeights();
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
        // Deduplicate weights if needed - we only want one entry per attribute per position
        const weightMap = new Map();
        data.data.forEach((weight: Weight) => {
          const key = `${weight.description}_${weight.name}`;
          
          // For duplicate entries, keep the one with highest ID (assuming newer is better)
          if (!weightMap.has(key) || weight.attribute_id > weightMap.get(key).attribute_id) {
            weightMap.set(key, weight);
          }
        });
        
        // Convert back to array
        const uniqueWeights = Array.from(weightMap.values());
        
        setWeights(uniqueWeights);
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
      case 'defense': return 'Defenders';
      case 'midfield': return 'Midfielders';
      case 'attack': return 'Attackers';
      case 'team': return 'Team-wide Factors';
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

  // Handle click on progress bar
  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>, attributeId: string): void => {
    // Get click position relative to the bar width
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    
    // Update the weight
    handleWeightChange(attributeId, percentage);
  };

  // Group weights by position (description field in API)
  const groupedWeights: Record<string, Weight[]> = weights.reduce((groups: Record<string, Weight[]>, weight) => {
    const group = weight.description;
    if (!groups[group]) {
      groups[group] = [];
    }
    
    // Check if this attribute already exists in this group
    const existingIndex = groups[group].findIndex(w => w.name === weight.name);
    
    if (existingIndex === -1) {
      // This is a new attribute, add it to the group
      groups[group].push(weight);
    } else {
      // This is a duplicate attribute, keep the one with the latest ID
      // This assumes newer entries have higher/more recent IDs
      if (weight.attribute_id > groups[group][existingIndex].attribute_id) {
        groups[group][existingIndex] = weight;
      }
    }
    
    return groups;
  }, {});

  // Define consistent attribute display order
  const attributeDisplayOrder: string[] = ['stamina_pace', 'control', 'goalscoring', 'resilience', 'teamwork'];

  // Get the position group display order
  const positionOrder: string[] = ['defense', 'midfield', 'attack', 'team'];

  // Sort attributes in each position group by the predefined order
  const sortedGroupedWeights: Record<string, Weight[]> = Object.keys(groupedWeights).reduce((sorted, group) => {
    sorted[group] = [...groupedWeights[group]].sort((a, b) => {
      const aIndex = attributeDisplayOrder.indexOf(a.name);
      const bIndex = attributeDisplayOrder.indexOf(b.name);
      
      // If both attributes are in the predefined order, sort by that order
      if (aIndex >= 0 && bIndex >= 0) {
        return aIndex - bIndex;
      }
      
      // If only one attribute is in the order, prefer that one
      if (aIndex >= 0) return -1;
      if (bIndex >= 0) return 1;
      
      // For attributes not in the predefined order, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
    
    return sorted;
  }, {} as Record<string, Weight[]>);

  // Get position-specific color
  const getPositionColor = (positionGroup: string): string => {
    return '#3B82F6'; // blue for all positions
  };

  // Format attribute name for display
  const formatAttributeName = (name: string): string => {
    switch(name) {
      case 'stamina_pace': return 'Stamina & Pace';
      case 'control': return 'Ball Control';
      case 'goalscoring': return 'Goalscoring';
      case 'resilience': return 'Resilience';
      case 'teamwork': return 'Teamwork';
      default: return name
        .replace(/_/g, ' ') // Replace underscores with spaces
        .split(' ') // Split into words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter
        .join(' '); // Join words back together
    }
  };

  // Format weight as percentage
  const formatWeight = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  return (
    <Card>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Balance Algorithm Settings</h2>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowResetConfirmation(true)}
            variant="secondary"
            disabled={loading || saving || isResetting}
          >
            Reset to Defaults
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
            Define how different player attributes are weighted when balancing teams
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {positionOrder.map(position => {
              const positionWeights = sortedGroupedWeights[position] || [];
              
              if (positionWeights.length === 0) return null;
              
              // Calculate technical total for this position (only applicable for defense, midfield, attack)
              const isTechnicalGroup = positionGroups.includes(position as PositionGroup);
              const { totals } = calculateTotals();
              const technicalTotal = isTechnicalGroup ? totals[position] || 0 : null;
              
              return (
                <div key={position} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-md">{getPositionName(position)}</h3>
                    {isTechnicalGroup && (
                      <div className="text-sm text-gray-500">
                        Total: <span className={Math.abs(technicalTotal! - 1) > 0.001 ? 'text-amber-500' : 'text-gray-500'}>
                          {(technicalTotal! * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 font-medium uppercase">TECHNICAL ATTRIBUTES</div>
                    
                    {positionWeights
                      .filter(w => technicalAttributes.includes(w.name))
                      .map(weight => (
                        <div key={weight.attribute_id} className="my-4">
                          <div className="flex justify-between items-center mb-1">
                            <div className="text-sm">
                              {formatAttributeName(weight.name)}
                              {weight.name === 'stamina_pace' && <span className="text-gray-400 text-xs"> (i)</span>}
                            </div>
                            <div className="font-medium">{formatWeight(weight.weight)}</div>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer" 
                            onClick={(e) => handleBarClick(e, weight.attribute_id)}
                          >
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                backgroundColor: getPositionColor(position),
                                width: `${weight.weight * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      ))
                    }
                    
                    {position === 'team' && (
                      <div className="mt-2">
                        {positionWeights.map(weight => (
                          <div key={weight.attribute_id} className="my-4">
                            <div className="flex justify-between items-center mb-1">
                              <div className="text-sm">
                                {formatAttributeName(weight.name)}
                                {weight.name === 'resilience' && <span className="text-gray-400 text-xs"> (i)</span>}
                              </div>
                              <div className="font-medium">{formatWeight(weight.weight)}</div>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer"
                              onClick={(e) => handleBarClick(e, weight.attribute_id)}
                            >
                              <div 
                                className="h-full rounded-full"
                                style={{ 
                                  backgroundColor: getPositionColor(position),
                                  width: `${weight.weight * 100}%`
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-10 border-t pt-6">
            <h3 className="font-medium text-md mb-4">How Team Balancing Works</h3>
            
            <ol className="space-y-3">
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">1</div>
                <div>Players are first allocated as defenders, based on highest desire to defend.</div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">2</div>
                <div>Next, players are assigned as attackers, prioritising those with highest goalscoring ability.</div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">3</div>
                <div>Remaining players are assigned to midfield positions.</div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">4</div>
                <div>Each player is evaluated within their assigned position using the position-specific weights you've set above. This creates a skill score for each player.</div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">5</div>
                <div>Players are distributed between teams in a "snake draft" pattern. The highest-scored defender goes to Team A, second-highest to Team B, and alternating from there. This repeats for midfielders and attackers.</div>
              </li>
              <li className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">6</div>
                <div>Finally, <strong>Resilience</strong> and <strong>Teamwork</strong> attributes are applied according to their weights. These are processed last, and their impact is proportional to the weight you've assigned them in the settings above.</div>
              </li>
            </ol>
          </div>
          
          <div className="mt-6 bg-blue-50 p-4 rounded-md text-sm">
            <div className="font-medium text-blue-800 mb-1">Important Note on Weights</div>
            <p className="text-blue-700">
              For each position group (Defenders, Midfielders, Attackers), the weights for technical attributes (Stamina & Pace, Ball Control, Goalscoring) should total 100%. Each slider will adjust in 5% increments. The system will validate the totals before saving.
            </p>
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