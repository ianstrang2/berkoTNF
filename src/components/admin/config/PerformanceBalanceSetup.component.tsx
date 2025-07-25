'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui-kit/Button.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';

interface AppConfigData {
  config_key: string;
  config_value: string;
  config_description?: string;
  display_name?: string;
  display_group?: string;
  sort_order?: number;
}

const PerformanceBalanceSetup: React.FC = () => {
  const [configs, setConfigs] = useState<AppConfigData[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [originalFormData, setOriginalFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState<boolean>(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState<boolean>(false);

  // Fetch performance configuration from database
  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/app-config?groups=performance');
      
      if (!response.ok) {
        throw new Error('Failed to fetch performance configuration');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Sort configs by sort_order, then by display_name
        const sortedConfigs = [...data.data].sort((a, b) => {
          if (a.sort_order !== b.sort_order) {
            return (a.sort_order || 999) - (b.sort_order || 999);
          }
          return (a.display_name || a.config_key).localeCompare(b.display_name || b.config_key);
        });
        
        setConfigs(sortedConfigs);
        
        // Initialize form data
        const initialFormData: Record<string, string> = {};
        sortedConfigs.forEach(config => {
          initialFormData[config.config_key] = config.config_value;
        });
        setFormData(initialFormData);
        setOriginalFormData({ ...initialFormData });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load performance configuration');
      console.error('Error fetching performance configuration:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save configuration changes
  const saveConfigs = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Prepare configs for update (only changed ones)
      const changedConfigs = configs
        .filter(config => formData[config.config_key] !== originalFormData[config.config_key])
        .map(config => ({
          config_key: config.config_key,
          config_value: formData[config.config_key]
        }));
      
      if (changedConfigs.length === 0) {
        setShowSaveConfirmation(false);
        return;
      }
      
      const response = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configs: changedConfigs
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save performance configuration');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Update original form data to match current state
        setOriginalFormData({ ...formData });
        setHasChanges(false);
        setShowSaveConfirmation(false);
      } else {
        throw new Error(result.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save performance configuration');
      console.error('Error saving performance configuration:', err);
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch('/api/admin/app-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group: 'performance'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset to defaults');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh the data
        await fetchConfigs();
        setShowResetConfirmation(false);
      } else {
        throw new Error(result.error || 'Failed to reset configuration');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset performance configuration');
      console.error('Error resetting performance configuration:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle form field changes
  const handleFieldChange = (configKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [configKey]: value
    }));
  };

  // Custom handler for algorithm weighting slider
  const handleWeightChange = (powerWeight: number) => {
    const goalWeight = 1 - powerWeight;
    setFormData(prev => ({
      ...prev,
      'performance_power_weight': powerWeight.toFixed(1),
      'performance_goal_weight': goalWeight.toFixed(1)
    }));
  };

  // Check for changes
  useEffect(() => {
    const hasAnyChanges = configs.some(config => 
      formData[config.config_key] !== originalFormData[config.config_key]
    );
    setHasChanges(hasAnyChanges);
  }, [formData, originalFormData, configs]);

  // Load configs on mount
  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-600">Loading performance configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-700 font-medium">Error Loading Configuration</div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
        <Button 
          onClick={fetchConfigs} 
          variant="outline" 
          size="sm" 
          className="mt-3"
        >
          Retry
        </Button>
      </div>
    );
  }

  // Get weight configs for special slider handling
  const powerWeightConfig = configs.find(c => c.config_key === 'performance_power_weight');
  const goalWeightConfig = configs.find(c => c.config_key === 'performance_goal_weight');
  const powerWeight = parseFloat(formData['performance_power_weight'] || '0.5');
  const goalWeight = parseFloat(formData['performance_goal_weight'] || '0.5');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-[20px] leading-[28px]" style={{ fontFamily: '"Open Sans"', color: 'rgb(52, 71, 103)' }}>Performance Algorithm Settings</h3>
          <p className="text-sm text-slate-500 mt-2">
            Define how the performance-based balancing algorithm works
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowResetConfirmation(true)}
            variant="outline"
            size="sm"
            disabled={loading || saving}
          >
            Reset to Defaults
          </Button>
          <Button
            onClick={() => setShowSaveConfirmation(true)}
            variant="primary"
            size="sm"
            disabled={!hasChanges || loading || saving}
            className="bg-gradient-to-tl from-purple-700 to-pink-500 hover:shadow-lg-purple shadow-soft-md"
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Team Balancing Weighting - Custom Slider */}
      <div className="bg-white rounded-xl shadow-soft-xl border p-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-700">
                Team Balancing Weighting
                {(formData['performance_power_weight'] !== originalFormData['performance_power_weight'] || 
                  formData['performance_goal_weight'] !== originalFormData['performance_goal_weight']) && 
                  <span className="text-purple-600 ml-1">*</span>}
              </label>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>More Power Rating</span>
                <span>Balanced</span>
                <span>More Goal Threat</span>
              </div>
              
              <div className="h-2 bg-gray-200 rounded-lg overflow-hidden cursor-pointer" 
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = Math.max(0, Math.min(1, x / rect.width));
                  handleWeightChange(percentage);
                }}
              >
                <div 
                  className="h-full rounded-lg bg-gradient-to-r from-purple-700 to-pink-500"
                  style={{ 
                    width: `${powerWeight * 100}%`
                  }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-slate-500">
                <span>Power Rating: {Math.round(powerWeight * 100)}%</span>
                <span>Goal Threat: {Math.round(goalWeight * 100)}%</span>
              </div>
            </div>
          </div>
          
          {/* Other Configuration Fields */}
          {configs
            .filter(config => config.config_key !== 'performance_power_weight' && config.config_key !== 'performance_goal_weight')
            .map((config, index, filteredConfigs) => {
              const isModified = formData[config.config_key] !== originalFormData[config.config_key];
              const itemWrapperClasses = index < filteredConfigs.length - 1 ? "border-t border-slate-200 pt-6 pb-6" : "border-t border-slate-200 pt-6";

              return (
                <div key={config.config_key} className={itemWrapperClasses}>
                  <div className="space-y-2">
                    <label htmlFor={config.config_key} className="text-sm font-medium text-slate-700">
                      {config.display_name || config.config_key}
                      {isModified && <span className="text-purple-600 ml-1">*</span>}
                    </label>
                    
                    {config.config_key === 'performance_half_life_days' ? (
                      <select
                        id={config.config_key}
                        value={formData[config.config_key] || ''}
                        onChange={(e) => handleFieldChange(config.config_key, e.target.value)}
                        className="w-full rounded-md border-slate-300 shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      >
                        <option value="365">1 Year (365 days)</option>
                        <option value="547">1.5 Years (547 days)</option>
                        <option value="730">2 Years (730 days)</option>
                        <option value="1095">3 Years (1095 days)</option>
                        <option value="1460">4 Years (1460 days)</option>
                      </select>
                    ) : (
                      <input
                        type="number"
                        id={config.config_key}
                        min={config.config_key === 'performance_qualification_threshold' ? '1' : undefined}
                        max={config.config_key === 'performance_qualification_threshold' ? '50' : undefined}
                        value={formData[config.config_key] || ''}
                        onChange={(e) => handleFieldChange(config.config_key, e.target.value)}
                        className="w-full rounded-md border-slate-300 shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                      />
                    )}
                    
                    {config.config_description && (
                      <p className="text-xs text-slate-500">
                        {config.config_description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Save Confirmation Modal */}
      <SoftUIConfirmationModal
        isOpen={showSaveConfirmation}
        onConfirm={saveConfigs}
        onClose={() => setShowSaveConfirmation(false)}
        title="Save Performance Algorithm Settings"
        message="Are you sure you want to save these performance algorithm settings? This will affect how teams are balanced when using the Performance algorithm."
        confirmText={saving ? 'Saving...' : 'Save Settings'}
        cancelText="Cancel"
        isConfirming={saving}
        icon="info"
      />

      {/* Reset Confirmation Modal */}
      <SoftUIConfirmationModal
        isOpen={showResetConfirmation}
        onConfirm={resetToDefaults}
        onClose={() => setShowResetConfirmation(false)}
        title="Reset to Defaults"
        message="Are you sure you want to reset the performance algorithm settings to default values? This will restore all performance configuration to factory defaults."
        confirmText={saving ? 'Resetting...' : 'Reset to Defaults'}
        cancelText="Cancel"
        isConfirming={saving}
        icon="warning"
      />
    </div>
  );
};

export default PerformanceBalanceSetup; 