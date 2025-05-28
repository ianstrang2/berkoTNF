import React, { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui-kit/Button.component';
import Card from '@/components/ui-kit/Card.component';
import ConfirmationModal from '@/components/ui-kit/ConfirmationModal.component';

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
  type: 'success' | 'error' | 'warning';
}

const FantasyPointsSetup: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [configs, setConfigs] = useState<ConfigMap>({
    fantasy_win_points: '20',
    fantasy_draw_points: '10',
    fantasy_loss_points: '-10',
    fantasy_heavy_win_points: '30',
    fantasy_clean_sheet_win_points: '30',
    fantasy_heavy_clean_sheet_win_points: '40',
    fantasy_clean_sheet_draw_points: '20',
    fantasy_heavy_loss_points: '-20'
  });
  const [originalConfigs, setOriginalConfigs] = useState<ConfigMap>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState<boolean>(false);
  const [toast, setToast] = useState<Toast>({ show: false, message: '', type: 'success' });

  const fetchSettings = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/settings/fantasy-points');
      
      if (!response.ok) throw new Error('Failed to fetch fantasy points settings');
      
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
      console.error('Error fetching fantasy points settings:', error);
      showToast('Failed to load fantasy points settings', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const hasChanges = JSON.stringify(configs) !== JSON.stringify(originalConfigs);
    setIsDirty(hasChanges);
  }, [configs, originalConfigs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
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
      
      if (!response.ok) throw new Error('Failed to update fantasy points settings');
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Fantasy points settings updated successfully');
        setOriginalConfigs({...configs});
      }
    } catch (error) {
      console.error('Error updating fantasy points settings:', error);
      showToast('Failed to update fantasy points settings', 'error');
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
          group: 'fantasy_points'
        })
      });
      
      if (!response.ok) throw new Error('Failed to reset fantasy points settings');
      
      const data = await response.json();
      
      if (data.success) {
        const configsObj: ConfigMap = {};
        data.data.forEach((config: ConfigItem) => {
          configsObj[config.config_key] = config.config_value;
        });
        
        setConfigs(configsObj);
        setOriginalConfigs({...configsObj});
        showToast('Fantasy points settings reset to defaults');
      }
    } catch (error) {
      console.error('Error resetting fantasy points settings:', error);
      showToast('Failed to reset fantasy points settings', 'error');
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
        <h2 className="text-xl font-semibold text-neutral-800">Fantasy Points</h2>
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
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-sm text-amber-700">
          <div className="font-medium mb-1">Warning</div>
          <p>
            Changing these values will affect all historical fantasy points calculations. 
            All player statistics and leaderboards will be recalculated based on these new values.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-medium text-neutral-700 mb-3">Core Points</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Win
                </label>
                <input
                  type="number"
                  name="fantasy_win_points"
                  value={configs.fantasy_win_points}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-neutral-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Draw
                </label>
                <input
                  type="number"
                  name="fantasy_draw_points"
                  value={configs.fantasy_draw_points}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-neutral-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Loss
                </label>
                <input
                  type="number"
                  name="fantasy_loss_points"
                  value={configs.fantasy_loss_points}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-neutral-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium text-neutral-700 mb-3">Bonus Points</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Heavy Win (e.g., by 5+ goals)
                </label>
                <input
                  type="number"
                  name="fantasy_heavy_win_points"
                  value={configs.fantasy_heavy_win_points}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-neutral-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Clean Sheet Win
                </label>
                <input
                  type="number"
                  name="fantasy_clean_sheet_win_points"
                  value={configs.fantasy_clean_sheet_win_points}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-neutral-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Heavy & Clean Sheet Win
                </label>
                <input
                  type="number"
                  name="fantasy_heavy_clean_sheet_win_points"
                  value={configs.fantasy_heavy_clean_sheet_win_points}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-neutral-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Clean Sheet Draw
                </label>
                <input
                  type="number"
                  name="fantasy_clean_sheet_draw_points"
                  value={configs.fantasy_clean_sheet_draw_points}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-neutral-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Heavy Loss
                </label>
                <input
                  type="number"
                  name="fantasy_heavy_loss_points"
                  value={configs.fantasy_heavy_loss_points}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-neutral-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      {showConfirmation && (
        <ConfirmationModal
          isOpen={showConfirmation}
          title="Save Changes"
          message="Are you sure you want to save these changes? This will affect all historical fantasy points calculations."
          confirmText="Save Changes"
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
          message="Are you sure you want to reset all fantasy points settings to their default values? This will affect all historical fantasy points calculations."
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

export default FantasyPointsSetup; 