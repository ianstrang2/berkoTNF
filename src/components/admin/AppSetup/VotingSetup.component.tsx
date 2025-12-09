'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui-kit/Card.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';
import { apiFetch } from '@/lib/apiConfig';

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

const DEFAULT_CONFIGS: ConfigMap = {
  voting_enabled: 'true',
  voting_mom_enabled: 'true',
  voting_dod_enabled: 'true',
  voting_mia_enabled: 'false',
  voting_duration_hours: '12'
};

/**
 * VotingSetup - Admin configuration for post-match voting
 * 
 * Settings:
 * - Master enable/disable toggle
 * - Individual category toggles (MoM, DoD, MiA)
 * - Voting duration in hours
 */
const VotingSetup: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [configs, setConfigs] = useState<ConfigMap>({ ...DEFAULT_CONFIGS });
  const [originalConfigs, setOriginalConfigs] = useState<ConfigMap>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState<boolean>(false);
  const [toast, setToast] = useState<Toast>({ show: false, message: '', type: 'success' });
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

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
      const response = await apiFetch('/admin/app-config?group=voting');
      
      if (!response.ok) throw new Error('Failed to fetch voting settings');
      
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        const configsObj: ConfigMap = {};
        data.data.forEach((config: ConfigItem) => {
          configsObj[config.config_key] = config.config_value;
        });
        
        // Merge with defaults
        const mergedConfigs = { ...DEFAULT_CONFIGS, ...configsObj };
        setConfigs(mergedConfigs);
        setOriginalConfigs(mergedConfigs);
      } else {
        // No configs found, use defaults
        setOriginalConfigs({ ...DEFAULT_CONFIGS });
      }
    } catch (error) {
      console.error('Error fetching voting settings:', error);
      showToast('Failed to load voting settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key: string): void => {
    setConfigs(prev => ({
      ...prev,
      [key]: prev[key] === 'true' ? 'false' : 'true'
    }));
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setConfigs(prev => ({
      ...prev,
      voting_duration_hours: e.target.value
    }));
  };

  const handleSave = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      const configsArray: ConfigItem[] = Object.entries(configs).map(([config_key, config_value]) => ({
        config_key,
        config_value
      }));
      
      const response = await apiFetch('/admin/app-config', {
        method: 'PUT',
        body: JSON.stringify({ configs: configsArray, config_group: 'voting' })
      });
      
      if (!response.ok) throw new Error('Failed to save voting settings');
      
      const data = await response.json();
      
      if (data.success) {
        setOriginalConfigs({ ...configs });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Error saving voting settings:', error);
      showToast('Failed to save voting settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToDefaults = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      const configsArray: ConfigItem[] = Object.entries(DEFAULT_CONFIGS).map(([config_key, config_value]) => ({
        config_key,
        config_value
      }));
      
      const response = await apiFetch('/admin/app-config', {
        method: 'PUT',
        body: JSON.stringify({ configs: configsArray, config_group: 'voting' })
      });
      
      if (!response.ok) throw new Error('Failed to reset voting settings');
      
      const data = await response.json();
      
      if (data.success) {
        setConfigs({ ...DEFAULT_CONFIGS });
        setOriginalConfigs({ ...DEFAULT_CONFIGS });
        showToast('Settings reset to defaults', 'success');
      }
    } catch (error) {
      console.error('Error resetting voting settings:', error);
      showToast('Failed to reset voting settings', 'error');
    } finally {
      setIsLoading(false);
      setShowResetConfirmation(false);
    }
  };

  const showToast = (message: string, type: Toast['type']): void => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const votingEnabled = configs.voting_enabled === 'true';

  return (
    <>
      <Card className="mb-4">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Post-Match Voting</h2>
                <p className="text-sm text-gray-500">Configure match awards voting</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowResetConfirmation(true)}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Reset to defaults
            </button>
          </div>

          {/* Master Toggle */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-900">Enable Voting</h3>
              <p className="text-sm text-gray-500">Allow players to vote after matches</p>
            </div>
            <button
              onClick={() => handleToggle('voting_enabled')}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                votingEnabled ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  votingEnabled ? 'translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          {/* Category Toggles */}
          <div className={`space-y-4 py-4 ${!votingEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Award Categories</h3>
            
            {/* Man of the Match */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="text-xl">💪</span>
                <div>
                  <span className="font-medium text-gray-900">Man of the Match</span>
                  <p className="text-xs text-gray-500">Best player award</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('voting_mom_enabled')}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  configs.voting_mom_enabled === 'true' ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    configs.voting_mom_enabled === 'true' ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {/* Donkey of the Day */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="text-xl">🫏</span>
                <div>
                  <span className="font-medium text-gray-900">Donkey of the Day</span>
                  <p className="text-xs text-gray-500">Worst performance award</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('voting_dod_enabled')}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  configs.voting_dod_enabled === 'true' ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    configs.voting_dod_enabled === 'true' ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {/* Missing in Action */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <span className="text-xl">🦝</span>
                <div>
                  <span className="font-medium text-gray-900">Missing in Action</span>
                  <p className="text-xs text-gray-500">Invisible player award</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('voting_mia_enabled')}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  configs.voting_mia_enabled === 'true' ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    configs.voting_mia_enabled === 'true' ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Duration Setting */}
          <div className={`py-4 border-t border-gray-100 ${!votingEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Voting Duration</h3>
                <p className="text-sm text-gray-500">How long voting stays open after match</p>
              </div>
              <select
                value={configs.voting_duration_hours}
                onChange={handleDurationChange}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
              </select>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={!isDirty || isLoading}
              className={`w-full px-4 py-3 text-sm font-semibold uppercase rounded-lg shadow-md transition-all ${
                saveSuccess
                  ? 'bg-gradient-to-tl from-green-600 to-green-500 text-white'
                  : isDirty
                  ? 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Card>

      {/* Toast */}
      {toast.show && (
        <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 ${
          toast.type === 'error' ? 'bg-red-500' : toast.type === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      {/* Reset Confirmation Modal */}
      <SoftUIConfirmationModal
        isOpen={showResetConfirmation}
        onClose={() => setShowResetConfirmation(false)}
        onConfirm={handleResetToDefaults}
        title="Reset to Defaults?"
        message="This will reset all voting settings to their default values."
        confirmText="Reset"
        cancelText="Cancel"
        icon="warning"
      />
    </>
  );
};

export default VotingSetup;

