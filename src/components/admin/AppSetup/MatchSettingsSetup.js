import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const MatchSettingsSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [configs, setConfigs] = useState({
    days_between_matches: '7',
    default_team_size: '9'
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
      const response = await fetch('/api/admin/app-config?group=match_settings');
      
      if (!response.ok) throw new Error('Failed to fetch match settings');
      
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
      console.error('Error fetching match settings:', error);
      toast.error('Failed to load match settings');
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
      
      if (!response.ok) throw new Error('Failed to update match settings');
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Match settings updated successfully');
        setOriginalConfigs({...configs});
      }
    } catch (error) {
      console.error('Error updating match settings:', error);
      toast.error('Failed to update match settings');
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
          group: 'match_settings'
        })
      });
      
      if (!response.ok) throw new Error('Failed to reset match settings');
      
      const data = await response.json();
      
      if (data.success) {
        const configsObj = {};
        data.data.forEach(config => {
          configsObj[config.config_key] = config.config_value;
        });
        
        setConfigs(configsObj);
        setOriginalConfigs({...configsObj});
        toast.success('Match settings reset to defaults');
      }
    } catch (error) {
      console.error('Error resetting match settings:', error);
      toast.error('Failed to reset match settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Match Settings</h2>
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
        <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-600">
          These settings control the defaults for new matches. Changing these values will only affect future matches.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Days Between Matches
            </label>
            <select
              name="days_between_matches"
              value={configs.days_between_matches}
              onChange={handleInputChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
              disabled={isLoading}
            >
              <option value="7">7 days (Weekly)</option>
              <option value="14">14 days (Bi-weekly)</option>
              <option value="28">28 days (Monthly)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Default number of days between matches when scheduling new matches
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Team Size
            </label>
            <select
              name="default_team_size"
              value={configs.default_team_size}
              onChange={handleInputChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
              disabled={isLoading}
            >
              <option value="5">5-a-side</option>
              <option value="6">6-a-side</option>
              <option value="7">7-a-side</option>
              <option value="8">8-a-side</option>
              <option value="9">9-a-side</option>
              <option value="11">11-a-side</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Default team size for new matches
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleSave}
        title="Update Match Settings?"
        message="Are you sure you want to update the match settings? Changing these values will only affect future matches."
        confirmText="Update Settings"
        cancelText="Cancel"
      />
    </div>
  );
};

export default MatchSettingsSetup; 