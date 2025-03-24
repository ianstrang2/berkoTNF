import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const MatchReportSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [configs, setConfigs] = useState({
    win_streak_threshold: '4',
    loss_streak_threshold: '4',
    unbeaten_streak_threshold: '6',
    winless_streak_threshold: '6',
    goal_streak_threshold: '3',
    game_milestone_threshold: '50',
    goal_milestone_threshold: '50'
  });
  const [originalConfigs, setOriginalConfigs] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const hasChanges = JSON.stringify(configs) !== JSON.stringify(originalConfigs);
    setIsDirty(hasChanges);
  }, [configs, originalConfigs]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/app-config?group=match_report');
      
      if (!response.ok) throw new Error('Failed to fetch match report settings');
      
      const data = await response.json();
      
      if (data.success) {
        const configsObj = {};
        data.data.forEach(config => {
          configsObj[config.config_key] = config.config_value;
        });
        
        setConfigs(configsObj);
        setOriginalConfigs({...configsObj});
      }
    } catch (error) {
      console.error('Error fetching match report settings:', error);
      toast.error('Failed to load match report settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfigs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      const configsArray = Object.entries(configs).map(([config_key, config_value]) => ({
        config_key,
        config_value
      }));
      
      const response = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          configs: configsArray
        })
      });
      
      if (!response.ok) throw new Error('Failed to update match report settings');
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Match report settings updated successfully');
        setOriginalConfigs({...configs});
      }
    } catch (error) {
      console.error('Error updating match report settings:', error);
      toast.error('Failed to update match report settings');
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
    }
  };

  const handleResetToDefaults = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/admin/app-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          group: 'match_report'
        })
      });
      
      if (!response.ok) throw new Error('Failed to reset match report settings');
      
      const data = await response.json();
      
      if (data.success) {
        const configsObj = {};
        data.data.forEach(config => {
          configsObj[config.config_key] = config.config_value;
        });
        
        setConfigs(configsObj);
        setOriginalConfigs({...configsObj});
        toast.success('Match report settings reset to defaults');
      }
    } catch (error) {
      console.error('Error resetting match report settings:', error);
      toast.error('Failed to reset match report settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Match Report Settings</h2>
        <div className="flex gap-2">
          <Button
            onClick={handleResetToDefaults}
            variant="outline"
            disabled={isLoading}
          >
            Reset to Default
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

      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-md text-sm text-blue-700">
          <div className="font-medium mb-1">Information</div>
          <p>
            These settings control what appears in the "Stat Dive" section of match reports.
            Changing these values will affect how streaks and milestones are highlighted in future match reports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-3">Streak Thresholds</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Win Streak Threshold
                </label>
                <input
                  type="number"
                  name="win_streak_threshold"
                  value={configs.win_streak_threshold}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                  min="2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Minimum consecutive wins to highlight a win streak
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loss Streak Threshold
                </label>
                <input
                  type="number"
                  name="loss_streak_threshold"
                  value={configs.loss_streak_threshold}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                  min="2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Minimum consecutive losses to highlight a loss streak
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unbeaten Streak Threshold
                </label>
                <input
                  type="number"
                  name="unbeaten_streak_threshold"
                  value={configs.unbeaten_streak_threshold}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                  min="2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Minimum consecutive unbeaten matches to highlight an unbeaten streak
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Winless Streak Threshold
                </label>
                <input
                  type="number"
                  name="winless_streak_threshold"
                  value={configs.winless_streak_threshold}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                  min="2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Minimum consecutive winless matches to highlight a winless streak
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Streak Threshold
                </label>
                <input
                  type="number"
                  name="goal_streak_threshold"
                  value={configs.goal_streak_threshold}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                  min="2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Minimum consecutive matches with a goal to highlight a goal streak
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium text-gray-700 mb-3">Milestone Thresholds</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Game Milestones
                </label>
                <input
                  type="number"
                  name="game_milestone_threshold"
                  value={configs.game_milestone_threshold}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                  min="10"
                  step="10"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Milestone games to celebrate (e.g., 50th, 100th, 150th game). Milestones occur at multiples of this number.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Milestones
                </label>
                <input
                  type="number"
                  name="goal_milestone_threshold"
                  value={configs.goal_milestone_threshold}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                  min="10"
                  step="10"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Milestone goals to celebrate (e.g., 50th, 100th, 150th goal). Milestones occur at multiples of this number.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleSave}
        title="Update Match Report Settings?"
        message="Changing these values will affect how streaks and milestones are highlighted in future match reports. Are you sure you want to update these settings?"
        confirmText="Update Settings"
        cancelText="Cancel"
      />
    </div>
  );
};

export default MatchReportSetup; 