import React, { useState, useEffect } from 'react';
import { Button, Card, ConfirmationModal } from '@/components/ui-kit';

interface ConfigItem {
  config_key: string;
  config_value: string;
}

interface ConfigMap {
  [key: string]: string;
}

interface Toast {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

const MatchSettingsSetup: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [configs, setConfigs] = useState<ConfigMap>({
    days_between_matches: '7',
    default_team_size: '9'
  });
  const [originalConfigs, setOriginalConfigs] = useState<ConfigMap>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState<boolean>(false);
  const [toast, setToast] = useState<Toast>({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const hasChanges = JSON.stringify(configs) !== JSON.stringify(originalConfigs);
    setIsDirty(hasChanges);
  }, [configs, originalConfigs]);

  const fetchSettings = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/app-config?group=match_settings');
      
      if (!response.ok) throw new Error('Failed to fetch match settings');
      
      const data = await response.json();
      
      if (data.success) {
        const configsObj: ConfigMap = {};
        data.data.forEach((config: ConfigItem) => {
          configsObj[config.config_key] = config.config_value;
        });
        
        setConfigs(configsObj);
        setOriginalConfigs({...configsObj});
      }
    } catch (error) {
      console.error('Error fetching match settings:', error);
      showToast('Failed to load match settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setConfigs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      const configsArray: ConfigItem[] = Object.entries(configs).map(([config_key, config_value]) => ({
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
        showToast('Match settings updated successfully');
        setOriginalConfigs({...configs});
      }
    } catch (error) {
      console.error('Error updating match settings:', error);
      showToast('Failed to update match settings', 'error');
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
    }
  };

  const handleResetToDefaults = async (): Promise<void> => {
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
        const configsObj: ConfigMap = {};
        data.data.forEach((config: ConfigItem) => {
          configsObj[config.config_key] = config.config_value;
        });
        
        setConfigs(configsObj);
        setOriginalConfigs({...configsObj});
        showToast('Match settings reset to defaults');
      }
    } catch (error) {
      console.error('Error resetting match settings:', error);
      showToast('Failed to reset match settings', 'error');
    } finally {
      setIsLoading(false);
      setShowResetConfirmation(false);
    }
  };

  // Show toast notification
  const showToast = (message: string, type: Toast['type'] = 'success'): void => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  return (
    <Card>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-neutral-800">Match Settings</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowResetConfirmation(true)}
            variant="secondary"
            disabled={isLoading}
          >
            Reset to Default
          </Button>
          <Button
            onClick={() => setShowConfirmation(true)}
            disabled={isLoading || !isDirty}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {toast.show && (
        <div className={`mb-4 p-3 rounded-md ${toast.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {toast.message}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-neutral-50 p-4 rounded-md text-sm text-neutral-600">
          These settings control the defaults for new matches. Changing these values will only affect future matches.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Days Between Matches
            </label>
            <select
              name="days_between_matches"
              value={configs.days_between_matches}
              onChange={handleInputChange}
              className="w-full rounded-md border-neutral-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
              disabled={isLoading}
            >
              <option value="7">7 days (Weekly)</option>
              <option value="14">14 days (Bi-weekly)</option>
              <option value="28">28 days (Monthly)</option>
            </select>
            <p className="mt-1 text-xs text-neutral-500">
              Default number of days between matches when scheduling new matches
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Default Team Size
            </label>
            <select
              name="default_team_size"
              value={configs.default_team_size}
              onChange={handleInputChange}
              className="w-full rounded-md border-neutral-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
              disabled={isLoading}
            >
              <option value="5">5-a-side</option>
              <option value="6">6-a-side</option>
              <option value="7">7-a-side</option>
              <option value="8">8-a-side</option>
              <option value="9">9-a-side</option>
              <option value="11">11-a-side</option>
            </select>
            <p className="mt-1 text-xs text-neutral-500">
              Default team size for new matches
            </p>
          </div>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      {showConfirmation && (
        <ConfirmationModal
          isOpen={showConfirmation}
          title="Update Match Settings?"
          message="Are you sure you want to update the match settings? Changing these values will only affect future matches."
          confirmText="Update Settings"
          cancelText="Cancel"
          onConfirm={handleSave}
          onClose={() => setShowConfirmation(false)}
          isConfirming={isLoading}
        />
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirmation && (
        <ConfirmationModal
          isOpen={showResetConfirmation}
          title="Reset to Defaults"
          message="Are you sure you want to reset all match settings to their default values?"
          confirmText="Reset to Defaults"
          cancelText="Cancel"
          onConfirm={handleResetToDefaults}
          onClose={() => setShowResetConfirmation(false)}
          isConfirming={isLoading}
          confirmButtonClass="bg-red-500 hover:bg-red-600"
        />
      )}
    </Card>
  );
};

export default MatchSettingsSetup; 