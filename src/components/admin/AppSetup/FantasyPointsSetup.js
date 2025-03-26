import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const FantasyPointsSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [configs, setConfigs] = useState({
    fantasy_win_points: '20',
    fantasy_draw_points: '10',
    fantasy_loss_points: '-10',
    fantasy_heavy_win_points: '30',
    fantasy_clean_sheet_win_points: '30',
    fantasy_heavy_clean_sheet_win_points: '40',
    fantasy_clean_sheet_draw_points: '20',
    fantasy_heavy_loss_points: '-20'
  });
  const [originalConfigs, setOriginalConfigs] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

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
      const response = await fetch('/api/admin/app-config?group=fantasy_points');
      
      if (!response.ok) throw new Error('Failed to fetch fantasy points settings');
      
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
      console.error('Error fetching fantasy points settings:', error);
      showToast('Failed to load fantasy points settings', 'error');
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

  const handleResetToDefaults = async () => {
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
        const configsObj = {};
        data.data.forEach(config => {
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
    }
  };

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-neutral-800">Fantasy Points</h2>
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
        <div className="bg-warning-50 border border-warning-200 p-4 rounded-md text-sm text-warning-700">
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
                  Heavy Win
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
                  Heavy Win with Clean Sheet
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleSave}
        title="Update Fantasy Points Settings?"
        message="Warning: Changing these numbers will affect all historical fantasy points scores. All player statistics and leaderboards will be recalculated based on these new values. Are you sure you want to continue?"
        confirmText="Update Fantasy Points"
        cancelText="Cancel"
        confirmButtonClass="bg-yellow-600 hover:bg-yellow-700"
      />

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-md z-50 flex items-center space-x-2 ${
          toast.type === 'error' ? 'bg-error-600 text-white' : 'bg-success-600 text-white'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default FantasyPointsSetup; 