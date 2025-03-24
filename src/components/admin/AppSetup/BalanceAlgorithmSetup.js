import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const BalanceAlgorithmSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [weights, setWeights] = useState([]);
  const [originalWeights, setOriginalWeights] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  
  useEffect(() => {
    fetchBalanceWeights();
  }, []);
  
  useEffect(() => {
    // Check if values have changed
    const weightsChanged = JSON.stringify(weights) !== JSON.stringify(originalWeights);
    setIsDirty(weightsChanged);
  }, [weights, originalWeights]);

  const fetchBalanceWeights = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/balance-algorithm');
      
      if (!response.ok) throw new Error('Failed to fetch balance algorithm weights');
      
      const data = await response.json();
      
      if (data.success) {
        setWeights(data.data);
        setOriginalWeights(data.data);
      }
    } catch (error) {
      console.error('Error fetching balance algorithm weights:', error);
      toast.error('Failed to load balance algorithm weights');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeightChange = (index, value) => {
    const newWeights = [...weights];
    newWeights[index].weight = Math.min(Math.max(0, value), 100);
    setWeights(newWeights);
  };

  const saveWeights = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/admin/balance-algorithm', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ weights })
      });
      
      if (!response.ok) throw new Error('Failed to save balance algorithm weights');
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Balance algorithm weights saved successfully');
        setOriginalWeights([...weights]);
        setIsDirty(false);
      }
    } catch (error) {
      console.error('Error saving balance algorithm weights:', error);
      toast.error(`Failed to save weights: ${error.message}`);
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/admin/balance-algorithm/reset', {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to reset balance algorithm weights');
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Balance algorithm weights reset to defaults');
        setWeights(data.data);
        setOriginalWeights(data.data);
        setIsDirty(false);
      }
    } catch (error) {
      console.error('Error resetting balance algorithm weights:', error);
      toast.error(`Failed to reset weights: ${error.message}`);
    } finally {
      setIsLoading(false);
      setShowResetConfirmation(false);
    }
  };

  // Calculate total weight percentage to show it to users
  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
  const normalizedWeights = weights.map(item => ({
    ...item,
    normalizedWeight: Math.round((item.weight / totalWeight) * 100)
  }));
  
  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Balance Algorithm Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Define how different player attributes are weighted when balancing teams
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowResetConfirmation(true)}
            variant="outline"
            disabled={isLoading}
          >
            Reset to Defaults
          </Button>
          <Button
            onClick={() => setShowConfirmation(true)}
            variant="primary"
            disabled={isLoading || !isDirty}
          >
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <div className="p-5">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <h3 className="text-amber-800 font-medium text-sm mb-2">About Balance Algorithm</h3>
            <p className="text-sm text-amber-700">
              The balance algorithm uses player assessment scores to create balanced teams. 
              These weights determine how much each attribute contributes to a player's overall value.
              Higher weights mean that attribute has more influence when creating teams.
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-gray-500 italic">Loading balance algorithm settings...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between text-sm font-medium text-gray-700 px-3">
                <span>Attribute</span>
                <span>Weight (0-100)</span>
              </div>
              
              {normalizedWeights.map((item, index) => (
                <div key={item.attribute_id} className="border-b border-gray-100 pb-5">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={item.weight}
                        onChange={(e) => handleWeightChange(index, parseInt(e.target.value))}
                        className="w-32 mr-4"
                        disabled={isLoading}
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.weight}
                        onChange={(e) => handleWeightChange(index, parseInt(e.target.value))}
                        className="w-16 border border-gray-300 rounded-md px-2 py-1 text-center"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="flex items-center text-xs mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-green-500 h-2" 
                        style={{ width: `${item.normalizedWeight}%` }}
                      />
                    </div>
                    <span className="ml-2 text-gray-500">
                      {item.normalizedWeight}% of total
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total weights:</span>
                  <span className="font-medium">{totalWeight}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Note: Values are normalized when calculating team balance. The actual numbers 
                  you set here determine the relative importance of each attribute.
                </p>
              </div>
            </div>
          )}
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
        onConfirm={resetToDefaults}
        title="Reset to Defaults?"
        message="Are you sure you want to reset all balance algorithm weights to their default values? This cannot be undone."
        confirmText="Reset to Defaults"
        cancelText="Cancel"
        confirmButtonClass="bg-amber-600 hover:bg-amber-700"
      />
    </div>
  );
};

export default BalanceAlgorithmSetup; 