'use client';
import React, { useState, useEffect } from 'react';
import Button from '@/components/ui-kit/Button.component';
import Card from '@/components/ui-kit/Card.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';
import { apiFetch } from '@/lib/apiConfig';

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

type PositionGroup = 'defense' | 'midfield' | 'attack';

const BalanceAlgorithmSetup: React.FC = () => {
  const [weights, setWeights] = useState<Weight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState<boolean>(false);
  const [resetModalTest, setResetModalTest] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [showExitWarning, setShowExitWarning] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showValidationError, setShowValidationError] = useState<boolean>(false);
  const [teamSize, setTeamSize] = useState<string>('9');

  // All attributes that need to sum to 100% within each position group
  const allAttributes: string[] = ['stamina_pace', 'control', 'goalscoring', 'teamwork', 'resilience'];
  
  // Position groups that need validation
  const positionGroups: PositionGroup[] = ['defense', 'midfield', 'attack'];

  // Fetch balance weights on component mount
  useEffect(() => {
    // Close any existing SweetAlert modals
    if (typeof window !== 'undefined' && (window as any).Swal) {
      (window as any).Swal.close();
    }
    fetchWeights();
  }, []);

  // Fetch balance weights from API
  const fetchWeights = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiFetch('/admin/balance-algorithm');
      
      if (!response.ok) {
        throw new Error('Failed to fetch balance weights');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Deduplicate weights if needed - we only want one entry per attribute per position
        const weightMap = new Map();
        data.data.forEach((weight: Weight) => {
          const key = `${weight.description}_${weight.name}`;
          
          // For duplicate entries, keep the one with the highest ID (assuming newer is better)
          if (!weightMap.has(key) || weight.attribute_id > weightMap.get(key).attribute_id) {
            weightMap.set(key, weight);
          }
        });
        
        // Convert back to array
        const uniqueWeights = Array.from(weightMap.values());
        
        // Ensure teamwork and resilience attributes exist for each position group
        const completeWeights = ensurePositionAttributes(uniqueWeights);
        setWeights(completeWeights);
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

  // Ensure all position groups have teamwork and resilience attributes
  const ensurePositionAttributes = (weights: Weight[]): Weight[] => {
    const result = [...weights];
    let hasNewAttributes = false;
    
    // Check for each position group
    positionGroups.forEach(position => {
      // Get weights for this position
      const positionWeights = weights.filter(w => w.description === position);
      
      // Check for teamwork
      if (!positionWeights.some(w => w.name === 'teamwork')) {
        // Generate a temporary ID for new attribute (negative to avoid conflicts)
        const tempId = `-${position}-teamwork-${Date.now()}`;
        result.push({
          attribute_id: tempId,
          name: 'teamwork',
          description: position,
          weight: 0.1 // Default 10% weight
        });
        hasNewAttributes = true;
      }
      
      // Check for resilience
      if (!positionWeights.some(w => w.name === 'resilience')) {
        // Generate a temporary ID for new attribute (negative to avoid conflicts)
        const tempId = `-${position}-resilience-${Date.now()}`;
        result.push({
          attribute_id: tempId,
          name: 'resilience',
          description: position,
          weight: 0.1 // Default 10% weight
        });
        hasNewAttributes = true;
      }
    });
    
    // If we added new attributes, we need to normalize the weights
    if (hasNewAttributes) {
      // First, scale down existing weights to make room for new attributes
      positionGroups.forEach(position => {
        const positionWeights = result.filter(w => 
          w.description === position && 
          !['teamwork', 'resilience'].includes(w.name)
        );
        
        // Scale down existing weights by 20% to make room for teamwork and resilience
        positionWeights.forEach(weight => {
          const index = result.findIndex(w => w.attribute_id === weight.attribute_id);
          if (index >= 0) {
            result[index] = {
              ...weight,
              weight: weight.weight * 0.8
            };
          }
        });
      });
      
      // Now normalize each position group to ensure weights sum to 1.0
      positionGroups.forEach(position => {
        const positionWeights = result.filter(w => w.description === position);
        const total = positionWeights.reduce((sum, w) => sum + w.weight, 0);
        
        // If the total is not 1.0, adjust weights proportionally
        if (Math.abs(total - 1.0) > 0.001) {
          positionWeights.forEach(weight => {
            const index = result.findIndex(w => w.attribute_id === weight.attribute_id);
            if (index >= 0) {
              result[index] = {
                ...weight,
                weight: weight.weight / total
              };
            }
          });
        }
      });
      
      // Set that we have changes that need to be saved
      setHasChanges(true);
    }
    
    return result;
  };

  // Get position name for display
  const getPositionName = (positionGroup: string): string => {
    switch(positionGroup) {
      case 'defense': return 'Defenders';
      case 'midfield': return 'Midfielders';
      case 'attack': return 'Attackers';
      default: return positionGroup;
    }
  };

  // Calculate totals for each position group's attributes
  const calculateTotals = (): { totals: Record<string, number>; errors: ValidationErrors } => {
    const totals: Record<string, number> = {};
    const errors: ValidationErrors = {};
    
    positionGroups.forEach(group => {
      const groupWeights = weights.filter(w => 
        w.description === group && allAttributes.includes(w.name)
      );
      
      const total = groupWeights.reduce((sum, w) => sum + w.weight, 0);
      totals[group] = total;
      
      // Check if total is not 100%
      if (Math.abs(total - 1) > 0.001) { // Use a small epsilon for floating point comparison
        errors[group] = `${getPositionName(group)} attributes total ${(total * 100).toFixed(0)}% instead of 100%`;
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
    
    try {
      const response = await apiFetch('/admin/balance-algorithm', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ weights })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setHasChanges(false);
      } else {
        throw new Error(data.error || 'Failed to save balance weights');
      }
    } catch (err) {
      console.error('Error saving balance weights:', err);
      setError(err instanceof Error ? err.message : 'Failed to save balance weights');
    } finally {
      setSaving(false);
    }
  };


  // Modified save handler with success flash
  const handleSave = async () => {
    await saveWeights();
  };

  // Check for unsaved changes and warn before navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Reset weights to defaults
  const resetWeights = async (): Promise<void> => {
    setIsResetting(true);
    setError(null);
    
    try {
      const response = await apiFetch('/admin/balance-algorithm/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setWeights(data.data);
        setHasChanges(false);
        setShowResetConfirmation(false);
      } else {
        throw new Error(data.error || 'Failed to reset balance weights');
      }
    } catch (err) {
      console.error('Error resetting balance weights:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset balance weights');
    } finally {
      setIsResetting(false);
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
  const positionOrder: string[] = ['defense', 'midfield', 'attack'];

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
    return '#8B5CF6'; // purple for all positions (matches tailwind purple-500)
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
    <div className="w-full relative">
      {/* Floating Save Button - Only show when changes detected */}
      {hasChanges && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white rounded-full shadow-soft-xl px-2 py-2 border border-slate-200">
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`font-semibold py-2 px-4 rounded-lg transition-all ${
              saving
                ? 'bg-slate-400 text-white'
                : 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white hover:shadow-lg-purple'
            }`}
          >
            {saving ? 'Saving...' : 'SAVE CHANGES?'}
          </Button>
        </div>
      )}
      
      {/* Reset Button - Icon style matching other screens - MOVED TO TOP */}
      <div className="flex justify-end mb-4 relative z-10">
            <button
              type="button"
              onClick={() => setShowResetConfirmation(true)}
          disabled={loading || saving || isResetting}
          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Reset to defaults"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {showValidationError && Object.keys(validationErrors).length > 0 && (
        <div className="mb-4 p-3 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
          <p className="font-medium mb-1">Please fix the following errors:</p>
          <ul className="list-disc pl-5 text-sm">
            {Object.entries(validationErrors).map(([group, error]) => (
              <li key={group}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {loading ? (
        <div className="py-8 text-center">
          <div className="inline-block w-8 h-8 border-4 border-t-purple-500 border-r-purple-300 border-b-purple-200 border-l-purple-100 rounded-full animate-spin"></div>
          <p className="mt-2 text-slate-600">Loading balance settings...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {positionOrder.map(position => {
              const positionWeights = sortedGroupedWeights[position] || [];
              
              if (positionWeights.length === 0) return null;
              
              // Calculate total for this position
              const isPositionGroup = positionGroups.includes(position as PositionGroup);
              const { totals } = calculateTotals();
              const positionTotal = isPositionGroup ? totals[position] || 0 : null;
              
              return (
                <div key={position} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-base text-slate-700">{getPositionName(position)}</h3>
                    {isPositionGroup && (
                      <div className="text-xs text-gray-500">
                        Total: <span className={Math.abs(positionTotal! - 1) > 0.001 ? 'text-amber-500 font-medium' : 'text-gray-500'}>
                          {(positionTotal! * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 space-y-2.5">
                    <div className="text-xs text-gray-500 font-medium uppercase mb-2">ATTRIBUTES</div>
                    
                    {positionWeights
                      .filter(w => allAttributes.includes(w.name))
                      .map(weight => (
                        <div key={weight.attribute_id}>
                          <div className="flex justify-between items-center mb-1">
                            <div className="text-sm text-slate-700">
                              {formatAttributeName(weight.name)}
                            </div>
                            <div className="text-sm font-medium text-slate-700">{formatWeight(weight.weight)}</div>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer" 
                            onClick={(e) => handleBarClick(e, weight.attribute_id)}
                          >
                            <div 
                              className="h-full rounded-full bg-gradient-to-tl from-purple-700 to-pink-500"
                              style={{ 
                                width: `${weight.weight * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      
      {/* Modals - Only render ONE at a time to avoid SweetAlert conflicts */}
      {!showExitWarning && (
        <SoftUIConfirmationModal
          isOpen={showResetConfirmation}
          onClose={() => setShowResetConfirmation(false)}
          onConfirm={resetWeights}
          title="Reset Balance Algorithm"
          message="Are you sure you want to reset the balance algorithm to default values? This will discard all your customizations."
          confirmText="Reset"
          cancelText="Cancel"
          isConfirming={isResetting}
          icon="warning"
        />
      )}

      {!showResetConfirmation && (
        <SoftUIConfirmationModal
          isOpen={showExitWarning}
          onClose={() => setShowExitWarning(false)}
          onConfirm={() => setShowExitWarning(false)}
          title="Unsaved Changes"
          message="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
          confirmText="Leave Anyway"
          cancelText="Stay"
          icon="warning"
        />
      )}
    </div>
  );
};

export default BalanceAlgorithmSetup; 