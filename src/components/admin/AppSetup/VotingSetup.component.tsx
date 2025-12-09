'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui-kit/Card.component';
import Button from '@/components/ui-kit/Button.component';
import InfoPopover from '@/components/ui-kit/InfoPopover.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { apiFetch } from '@/lib/apiConfig';

interface ConfigItem {
  config_key: string;
  config_value: string;
  display_name: string;
  config_description?: string;
}

// Voting config definitions with display metadata
const VOTING_CONFIGS: ConfigItem[] = [
  {
    config_key: 'voting_enabled',
    config_value: 'true',
    display_name: 'Enable Voting',
    config_description: 'Allow players to vote for match awards after games'
  },
  {
    config_key: 'voting_mom_enabled',
    config_value: 'true',
    display_name: 'Man of the Match',
    config_description: 'Enable voting for best player award'
  },
  {
    config_key: 'voting_dod_enabled',
    config_value: 'true',
    display_name: 'Donkey of the Day',
    config_description: 'Enable voting for worst performance award'
  },
  {
    config_key: 'voting_mia_enabled',
    config_value: 'false',
    display_name: 'Missing in Action',
    config_description: 'Enable voting for invisible player award'
  },
  {
    config_key: 'voting_duration_hours',
    config_value: '12',
    display_name: 'Duration (Hours)',
    config_description: 'How long voting stays open after match result is submitted'
  }
];

const VotingSetup: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [originalData, setOriginalData] = useState<Record<string, string>>({});
  
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [resetConfirmation, setResetConfirmation] = useState<boolean>(false);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = Object.keys(formData).some(key => formData[key] !== originalData[key]);
    setHasUnsavedChanges(hasChanges);
  }, [formData, originalData]);

  // Warn before navigation if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchSettings = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiFetch('/admin/app-config?group=voting');
      
      if (!response.ok) throw new Error('Failed to fetch voting settings');
      
      const data = await response.json();
      
      const initialFormData: Record<string, string> = {};
      
      // Set defaults first
      VOTING_CONFIGS.forEach(config => {
        initialFormData[config.config_key] = config.config_value;
      });
      
      // Override with fetched values
      if (data.success && data.data) {
        data.data.forEach((config: { config_key: string; config_value: string }) => {
          initialFormData[config.config_key] = config.config_value;
        });
      }
      
      setFormData(initialFormData);
      setOriginalData(initialFormData);
    } catch (err) {
      console.error('Error fetching voting settings:', err);
      setError('Failed to load voting settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? String(checked) : value,
    }));
  };

  const handleSaveAll = async () => {
    const modifiedConfigs = Object.entries(formData)
      .filter(([key, value]) => value !== originalData[key])
      .map(([config_key, config_value]) => ({
        config_key,
        config_value,
      }));

    if (modifiedConfigs.length === 0) return;

    try {
      setIsSaving(true);
      setError(null);
      
      const response = await apiFetch('/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: modifiedConfigs,
          group: 'voting'
        })
      });
      
      if (!response.ok) throw new Error('Failed to save voting settings');
      
      const data = await response.json();
      
      if (data.success) {
        setOriginalData({ ...formData });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (err: any) {
      console.error('Error saving voting settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSection = () => {
    setResetConfirmation(true);
  };

  const confirmResetSection = async () => {
    setResetConfirmation(false);
    setError(null);

    try {
      setIsResetting(true);
      
      const response = await apiFetch('/admin/app-config/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: 'voting' })
      });
      
      if (!response.ok) throw new Error('Failed to reset voting settings');
      
      const data = await response.json();
      
      if (data.success) {
        // Update form data with reset values
        const newFormData: Record<string, string> = { ...formData };
        data.data.forEach((config: { config_key: string; config_value: string }) => {
          newFormData[config.config_key] = config.config_value;
        });
        
        setFormData(newFormData);
        setOriginalData(newFormData);
        
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        throw new Error(data.error || 'Failed to reset settings');
      }
    } catch (err: any) {
      console.error('Error resetting voting settings:', err);
      setError(err.message || 'Failed to reset settings');
    } finally {
      setIsResetting(false);
    }
  };

  const renderConfigItem = (config: ConfigItem) => {
    const currentValue = formData[config.config_key] || '';
    const isBoolean = config.config_key.includes('_enabled');
    const isDisabled = isSaving || isResetting;
    
    // For category toggles, disable them if master voting is disabled
    const isCategoryToggle = ['voting_mom_enabled', 'voting_dod_enabled', 'voting_mia_enabled'].includes(config.config_key);
    const votingDisabled = formData['voting_enabled'] === 'false';
    const isEffectivelyDisabled = isDisabled || (isCategoryToggle && votingDisabled);

    return (
      <div 
        key={config.config_key} 
        className={`flex items-center py-1.5 border-b border-slate-100 last:border-0 ${
          isCategoryToggle && votingDisabled ? 'opacity-50' : ''
        }`}
      >
        <div className="flex-grow flex items-center min-w-0">
          <span className="text-sm font-medium text-slate-700 truncate">
            {config.display_name}
          </span>
          {config.config_description && (
            <InfoPopover content={config.config_description} />
          )}
        </div>
        
        <div className="flex-shrink-0 ml-4">
          {isBoolean ? (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name={config.config_key}
                checked={currentValue === 'true'}
                onChange={handleInputChange}
                className="sr-only peer"
                disabled={isEffectivelyDisabled}
              />
              <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-tl peer-checked:from-purple-700 peer-checked:to-pink-500 ${
                isEffectivelyDisabled ? 'cursor-not-allowed' : ''
              }`}></div>
            </label>
          ) : (
            <input
              type="number"
              name={config.config_key}
              value={currentValue}
              onChange={handleInputChange}
              className={`w-24 text-right px-2 py-1 text-sm rounded-md border-slate-300 shadow-sm focus:ring-purple-500 focus:border-purple-500 disabled:bg-slate-50 disabled:text-slate-400 ${
                votingDisabled ? 'opacity-50' : ''
              }`}
              disabled={isDisabled || votingDisabled}
              min="1"
              max="168"
            />
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-4 text-center text-slate-600">Loading configuration...</div>;
  }

  if (error && Object.keys(formData).length === 0) {
    return <div className="p-4 text-red-600 bg-red-50 rounded-md">{error}</div>;
  }

  return (
    <div className="w-full">
      {/* Config Section */}
      <div className="space-y-3">
        <Card className="shadow-soft-md rounded-xl bg-white overflow-hidden">
          {/* Section Header - Collapsible */}
          <div className="w-full flex items-center justify-between p-4 border-b border-slate-100 group">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 flex-grow text-left hover:opacity-70 transition-opacity"
            >
              <h3 className="text-base font-semibold text-slate-700">Post-Match Voting</h3>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            
            {/* Reset Section Button - Always visible on mobile, hover on desktop */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleResetSection();
              }}
              disabled={isResetting}
              className="ml-2 p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors md:opacity-0 md:group-hover:opacity-100 opacity-100 disabled:opacity-50"
              title="Reset section to defaults"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* Section Content */}
          {isExpanded && (
            <div className="px-4 pb-4 space-y-0">
              {VOTING_CONFIGS.map(renderConfigItem)}
            </div>
          )}
        </Card>
      </div>

      {/* Floating Save Button */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white rounded-full shadow-soft-xl px-2 py-2 border border-slate-200">
          <Button
            onClick={handleSaveAll}
            disabled={isSaving || !hasUnsavedChanges}
            className={`font-semibold py-2 px-4 rounded-lg transition-all ${
              saveSuccess
                ? 'bg-gradient-to-tl from-green-600 to-green-500 text-white'
                : 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white hover:shadow-lg-purple'
            }`}
          >
            {isSaving ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'SAVE CHANGES?'}
          </Button>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      <SoftUIConfirmationModal
        isOpen={resetConfirmation}
        onClose={() => setResetConfirmation(false)}
        onConfirm={confirmResetSection}
        title="Reset Post-Match Voting?"
        message="Are you sure you want to reset voting settings to default values? This will enable voting with MoM and DoD categories, 12-hour duration."
        confirmText="Reset"
        cancelText="Cancel"
        icon="warning"
        isConfirming={isResetting}
      />
    </div>
  );
};

export default VotingSetup;
