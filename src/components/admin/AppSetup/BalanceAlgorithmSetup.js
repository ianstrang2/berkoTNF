import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/card';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const BalanceAlgorithmSetup = () => {
  const [weights, setWeights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showValidationError, setShowValidationError] = useState(false);

  // Attribute descriptions for tooltips
  const attributeDescriptions = {
    stamina_pace: "Stamina & Pace: Player's energy levels and speed during a match",
    control: "Ball Control: Player's ability to control and pass the ball",
    goalscoring: "Goalscoring: Player's likelyhood to get a goal in a match",
    resilience: "Resilience: How well a player maintains performance when team is losing",
    teamwork: "Teamwork: Player's ability to collaborate with teammates effectively"
  };

  // Technical attributes that need to sum to 100%
  const technicalAttributes = ['stamina_pace', 'control', 'goalscoring'];
  
  // Position groups that need validation
  const positionGroups = ['defense', 'midfield', 'attack'];

  // Fetch balance weights on component mount
  useEffect(() => {
    fetchWeights();
  }, []);

  // Handle click outside to close tooltips
  useEffect(() => {
    function handleClickOutside(event) {
      if (!event.target.closest('.tooltip-trigger')) {
        setActiveTooltip(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch balance weights from API
  const fetchWeights = async () => {
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals for each position group's technical attributes
  const calculateTotals = () => {
    const totals = {};
    const errors = {};
    
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
  const validateWeights = () => {
    const { errors } = calculateTotals();
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setShowValidationError(true);
      return false;
    }
    
    return true;
  };

  // Save updated weights to API
  const saveWeights = async () => {
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
      setError(err.message);
    } finally {
      setSaving(false);
      setShowConfirmation(false);
    }
  };

  // Reset weights to defaults
  const resetWeights = async () => {
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
      setError(err.message);
    } finally {
      setIsResetting(false);
      setShowResetConfirmation(false);
    }
  };

  // Round value to nearest 5%
  const roundToFive = (value) => {
    return Math.round(value * 20) / 20; // Round to nearest 0.05 (5%)
  };

  // Handle weight change via slider
  const handleWeightChange = (attributeId, newValue) => {
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
  const groupedWeights = weights.reduce((groups, weight) => {
    const group = weight.description;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(weight);
    return groups;
  }, {});

  // Get the position group display order
  const positionOrder = ['defense', 'midfield', 'attack', 'team'];

  // Get position-specific color
  const getPositionColor = (positionGroup) => {
    switch(positionGroup) {
      case 'defense': return 'bg-info-500';
      case 'midfield': return 'bg-success-500';
      case 'attack': return 'bg-error-500';
      case 'team': return 'bg-secondary-500';
      default: return 'bg-neutral-400';
    }
  };

  // Get border color for position
  const getPositionBorderColor = (positionGroup) => {
    switch(positionGroup) {
      case 'defense': return 'border-info-500';
      case 'midfield': return 'border-success-500';
      case 'attack': return 'border-error-500';
      case 'team': return 'border-secondary-500';
      default: return 'border-neutral-400';
    }
  };

  // Get the position descriptive name
  const getPositionName = (positionGroup) => {
    switch(positionGroup) {
      case 'defense': return 'Defenders';
      case 'midfield': return 'Midfielders';
      case 'attack': return 'Attackers';
      case 'team': return 'Team-wide Factors';
      default: return positionGroup;
    }
  };

  // Format attribute name for display
  const formatAttributeName = (name) => {
    switch(name) {
      case 'stamina_pace': return 'Stamina & Pace';
      case 'control': return 'Ball Control';
      case 'goalscoring': return 'Goalscoring';
      case 'resilience': return 'Resilience';
      case 'teamwork': return 'Teamwork';
      case 'defender': return 'Desire to Defend';
      default: return name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Format weight value for display
  const formatWeight = (value) => {
    return (value * 100).toFixed(0) + '%';  // Convert decimal to percentage
  };

  // Display tooltip for attribute
  const toggleTooltip = (attributeName) => {
    setActiveTooltip(activeTooltip === attributeName ? null : attributeName);
  };

  // Calculate totals for display
  const { totals } = calculateTotals();

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800">Balance Algorithm Settings</h2>
          <p className="text-base text-neutral-600 mt-1">
            Define how different player attributes are weighted when balancing teams
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowResetConfirmation(true)}
            disabled={loading || saving || isResetting}
            variant="outline"
          >
            {isResetting ? 'Resetting...' : 'Reset to Defaults'}
          </Button>
          <Button
            onClick={() => setShowConfirmation(true)}
            disabled={loading || saving || !hasChanges}
            variant="primary"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded mb-6">
          <span className="text-base">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded mb-6">
          <span className="text-base">{success}</span>
        </div>
      )}

      {/* Validation Error Message */}
      {showValidationError && Object.keys(validationErrors).length > 0 && (
        <div className="bg-warning-50 border border-warning-200 text-warning-700 px-4 py-3 rounded mb-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium mb-2">Please fix the following issues before saving:</p>
              <ul className="list-disc pl-5">
                {Object.values(validationErrors).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
              <p className="mt-2 text-sm">Each position group must have technical attributes (Stamina & Pace, Ball Control, Goalscoring) that total exactly 100%.</p>
            </div>
            <button 
              onClick={() => setShowValidationError(false)}
              className="text-warning-700 hover:text-warning-900"
              aria-label="Close message"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-base">Loading balance weights...</span>
        </div>
      ) : weights.length === 0 ? (
        <div className="bg-warning-50 border border-warning-200 text-warning-700 px-4 py-3 rounded mb-6">
          <span className="text-base">No balance weights found. Please check the API connection or reset to defaults.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {positionOrder.map(positionGroup => {
            // Skip if no weights for this position
            if (!groupedWeights[positionGroup] || groupedWeights[positionGroup].length === 0) {
              return null;
            }

            // Calculate total for this position's technical attributes
            const total = totals[positionGroup] || 0;
            const isTotalValid = Math.abs(total - 1) <= 0.001; // Within 0.1% of 100%
            const totalClass = isTotalValid 
              ? 'text-success-600' 
              : 'text-error-600 font-bold';

            // Filter technical attributes for this position
            const techAttributes = groupedWeights[positionGroup]
              .filter(w => technicalAttributes.includes(w.name));
            
            // Filter non-technical attributes for this position
            const otherAttributes = groupedWeights[positionGroup]
              .filter(w => !technicalAttributes.includes(w.name));

            return (
              <Card
                key={positionGroup}
                className="shadow-card"
              >
                <div className="mb-4 pb-2 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{getPositionName(positionGroup)}</h3>
                    
                    {/* Only show total for positions with technical attributes */}
                    {positionGroup !== 'team' && (
                      <div className="flex items-center">
                        <span className="text-sm mr-2">Total:</span>
                        <span className={`text-sm font-medium ${totalClass}`}>
                          {(total * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Technical attributes section */}
                {techAttributes.length > 0 && (
                  <div className="space-y-4 mb-6">
                    <h4 className="text-sm uppercase text-neutral-500 font-medium">Technical Attributes</h4>
                    {techAttributes.map(weight => (
                      <div key={weight.attribute_id} className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center relative">
                            <span className="font-medium text-base text-neutral-700">
                              {formatAttributeName(weight.name)}
                              <button
                                type="button"
                                className="ml-1 text-neutral-400 hover:text-neutral-600 focus:outline-none tooltip-trigger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTooltip(weight.attribute_id);
                                }}
                                aria-label={`Show ${formatAttributeName(weight.name)} information`}
                              >
                                <span className="text-xs">(?)</span>
                              </button>
                            </span>
                            {activeTooltip === weight.attribute_id && (
                              <div className="absolute z-50 mt-2 ml-0 top-6 left-0 bg-white border border-neutral-200 rounded-lg shadow-elevated p-3 w-64">
                                <p className="text-sm text-neutral-700">
                                  {attributeDescriptions[weight.name] || weight.description}
                                </p>
                              </div>
                            )}
                          </div>
                          <span className={`text-base font-medium ${hasChanges ? 'text-primary-600' : 'text-neutral-700'}`}>
                            {formatWeight(weight.weight)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <div className="relative w-full h-4 bg-neutral-200 rounded-md overflow-hidden">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"  // Step by 5%
                              value={weight.weight}
                              onChange={(e) => handleWeightChange(weight.attribute_id, parseFloat(e.target.value))}
                              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div 
                              className={`h-full bg-primary-500 transition-all duration-300`}
                              style={{ width: `${Math.max(0, Math.min(100, weight.weight * 100))}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Other attributes section */}
                {otherAttributes.length > 0 && (
                  <div className="space-y-4">
                    {techAttributes.length > 0 && (
                      <h4 className="text-sm uppercase text-neutral-500 font-medium">Other Attributes</h4>
                    )}
                    {otherAttributes.map(weight => (
                      <div key={weight.attribute_id} className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center relative">
                            <span className="font-medium text-base text-neutral-700">
                              {formatAttributeName(weight.name)}
                              <button
                                type="button"
                                className="ml-1 text-neutral-400 hover:text-neutral-600 focus:outline-none tooltip-trigger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTooltip(weight.attribute_id);
                                }}
                                aria-label={`Show ${formatAttributeName(weight.name)} information`}
                              >
                                <span className="text-xs">(?)</span>
                              </button>
                            </span>
                            {activeTooltip === weight.attribute_id && (
                              <div className="absolute z-50 mt-2 ml-0 top-6 left-0 bg-white border border-neutral-200 rounded-lg shadow-elevated p-3 w-64">
                                <p className="text-sm text-neutral-700">
                                  {attributeDescriptions[weight.name] || weight.description}
                                </p>
                              </div>
                            )}
                          </div>
                          <span className={`text-base font-medium ${hasChanges ? 'text-primary-600' : 'text-neutral-700'}`}>
                            {formatWeight(weight.weight)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <div className="relative w-full h-4 bg-neutral-200 rounded-md overflow-hidden">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"  // Step by 5%
                              value={weight.weight}
                              onChange={(e) => handleWeightChange(weight.attribute_id, parseFloat(e.target.value))}
                              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div 
                              className={`h-full bg-primary-500 transition-all duration-300`}
                              style={{ width: `${Math.max(0, Math.min(100, weight.weight * 100))}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      
      <Card
        title="How Team Balancing Works"
        className="mb-6 bg-neutral-50 border border-neutral-200 shadow-card"
      >
        <p className="text-base text-neutral-600 mb-4">
          The team balancing algorithm creates teams by following this sequence:
        </p>
        <ul key="balancing-steps" className="space-y-4">
          <li key="step-1" className="flex items-start">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-500 text-white text-sm mr-3 shrink-0">1</span>
            <span className="text-base text-neutral-600">
              Players are first allocated as defenders, based on highest desire to defend.
            </span>
          </li>
          <li key="step-2" className="flex items-start">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-500 text-white text-sm mr-3 shrink-0">2</span>
            <span className="text-base text-neutral-600">
              Next, players are assigned as attackers, prioritising those with highest goalscoring ability.
            </span>
          </li>
          <li key="step-3" className="flex items-start">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-500 text-white text-sm mr-3 shrink-0">3</span>
            <span className="text-base text-neutral-600">
              Remaining players are assigned to midfield positions.
            </span>
          </li>
          <li key="step-4" className="flex items-start">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-500 text-white text-sm mr-3 shrink-0">4</span>
            <span className="text-base text-neutral-600">
              Each player is evaluated within their assigned position using the position-specific weights you've set above. This creates a skill score for each player.
            </span>
          </li>
          <li key="step-5" className="flex items-start">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-500 text-white text-sm mr-3 shrink-0">5</span>
            <span className="text-base text-neutral-600">
              Players are distributed between teams in a "snake draft" pattern. The highest-scored defender goes to Team A, second-highest to Team B, and alternating from there. This repeats for midfielders and attackers.
            </span>
          </li>
          <li key="step-6" className="flex items-start">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-500 text-white text-sm mr-3 shrink-0">6</span>
            <span className="text-base text-neutral-600">
              Finally, <strong>Resilience</strong> and <strong>Teamwork</strong> attributes are applied according to their weights. These are processed last, and their impact is proportional to the weight you've assigned them in the settings above.
            </span>
          </li>
        </ul>
        <div className="mt-6 p-4 bg-info-50 border border-info-100 rounded-md">
          <h3 className="font-medium text-info-800 mb-2">Important Note on Weights</h3>
          <p className="text-sm text-info-700">
            For each position group (Defenders, Midfielders, Attackers), the weights for technical attributes 
            (Stamina & Pace, Ball Control, Goalscoring) should total 100%. Each slider will adjust in 5% increments.
            The system will validate the totals before saving.
          </p>
        </div>
      </Card>

      {/* Save Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={saveWeights}
        title="Save Balance Algorithm Settings?"
        message="Are you sure you want to save these changes? This will affect how teams are balanced for all future matches."
        confirmText="Save Changes"
        cancelText="Cancel"
      />

      {/* Reset Confirmation Modal */}
      <ConfirmationModal
        isOpen={showResetConfirmation}
        onClose={() => setShowResetConfirmation(false)}
        onConfirm={resetWeights}
        title="Reset Balance Algorithm"
        message="Are you sure you want to reset all balance weights to their default values? This action cannot be undone and will affect how teams are balanced."
        confirmText="Reset"
        cancelText="Cancel"
      />
    </div>
  );
};

export default BalanceAlgorithmSetup; 