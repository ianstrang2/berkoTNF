import React, { useState, useEffect } from 'react';
import Card from '@/components/ui-kit/Card.component';
import Button from '@/components/ui-kit/Button.component';
import { SoftUIConfirmationModal } from '@/components/ui-kit';

type ConfigGroup = {
  group_name: string;
  configs: AppConfig[];
  subtitle?: string;
};

type AppConfig = {
  config_id: number;
  config_key: string;
  config_value: string;
  config_description: string;
  config_group: string;
};

// Order for fantasy points categories
const fantasyPointsOrder = [
  'heavy_win_clean_sheet',
  'heavy_win',
  'win_clean_sheet',
  'win',
  'draw_clean_sheet',
  'draw',
  'loss',
  'heavy_loss'
];

// Display names for fantasy points categories
const fantasyPointsDisplayNames: Record<string, string> = {
  'heavy_win_clean_sheet': 'Heavy Win & Clean Sheet',
  'heavy_win': 'Heavy Win',
  'win_clean_sheet': 'Win & Clean Sheet',
  'win': 'Win',
  'draw_clean_sheet': 'Draw & Clean Sheet',
  'draw': 'Draw',
  'loss': 'Loss',
  'heavy_loss': 'Heavy Loss'
};

const AppConfig = () => {
  const [configGroups, setConfigGroups] = useState<ConfigGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [isResetting, setIsResetting] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [originalData, setOriginalData] = useState<Record<string, string>>({});
  const [editingGroups, setEditingGroups] = useState<Record<string, boolean>>({});
  const [resetConfirmation, setResetConfirmation] = useState<{
    isOpen: boolean;
    groupName: string | null;
  }>({ isOpen: false, groupName: null });

  // Group subtitles
  const groupSubtitles: Record<string, string> = {
    'fantasy_points': 'Adjust point values awarded to players for match results. Recommended: Keep the default values, which have been tested and proven effective over many games.',
    'match_report': 'Adjust criteria for milestones highlighted on match reports. For players with 100+ games, 50-game milestones might work well. For fewer games (e.g., 80), consider setting lower milestone values.',
    'match_settings': 'Customise default values that appear when creating new matches. For example, setting the first value to 7 days for weekly matches will save time during match creation.'
  };

  // Fetch config data
  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/admin/app-config');
        if (!response.ok) {
          throw new Error('Failed to fetch configuration settings');
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch configuration settings');
        }
        
        // Group configs by config_group
        const groupedData: Record<string, AppConfig[]> = {};
        data.data.forEach((config: AppConfig) => {
          if (!groupedData[config.config_group]) {
            groupedData[config.config_group] = [];
          }
          groupedData[config.config_group].push(config);
        });
        
        // Convert to array of config groups
        const groupsArray: ConfigGroup[] = Object.entries(groupedData).map(([group_name, configs]) => ({
          group_name,
          configs,
          subtitle: groupSubtitles[group_name]
        }));
        
        // Sort groups
        groupsArray.sort((a, b) => a.group_name.localeCompare(b.group_name));

        // Sort configs within each group
        groupsArray.forEach(group => {
          if (group.group_name === 'fantasy_points') {
            // Custom sort for fantasy points
            group.configs.sort((a, b) => {
              const aIndex = fantasyPointsOrder.indexOf(a.config_key);
              const bIndex = fantasyPointsOrder.indexOf(b.config_key);
              if (aIndex === -1 && bIndex === -1) return a.config_key.localeCompare(b.config_key);
              if (aIndex === -1) return 1;
              if (bIndex === -1) return -1;
              return aIndex - bIndex;
            });
          } else {
            // Default sort for other groups
            group.configs.sort((a, b) => a.config_key.localeCompare(b.config_key));
          }
        });
        
        setConfigGroups(groupsArray);
        
        // Initialize form data
        const initialFormData: Record<string, string> = {};
        data.data.forEach((config: AppConfig) => {
          initialFormData[config.config_key] = config.config_value;
        });
        
        setFormData(initialFormData);
        setOriginalData(initialFormData);
      } catch (err: any) {
        console.error('Error fetching configuration settings:', err);
        setError(err.message || 'Failed to fetch configuration settings');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConfigData();
  }, []);

  // Check for changes when formData is updated
  useEffect(() => {
    // Create a map to track which groups have changes
    const groupChangesMap: Record<string, boolean> = {};
    
    configGroups.forEach(group => {
      groupChangesMap[group.group_name] = hasGroupChanges(group.group_name);
    });
    
    console.log('Groups with changes:', groupChangesMap);
  }, [formData, originalData, configGroups]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    console.log(`Input changed: ${name} = ${value} (original: ${originalData[name]})`);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const hasGroupChanges = (groupName: string) => {
    const groupConfigs = configGroups.find(g => g.group_name === groupName)?.configs || [];
    const hasChanges = groupConfigs.some(config => formData[config.config_key] !== originalData[config.config_key]);
    
    // Add console logs to debug the function
    console.log(`Checking changes for group: ${groupName}`);
    console.log('Group configs:', groupConfigs);
    console.log('Has changes:', hasChanges);
    
    return hasChanges;
  };

  const handleSaveGroup = async (groupName: string) => {
    try {
      setIsSaving(prev => ({ ...prev, [groupName]: true }));
      setError(null);
      setSuccessMessage(null);
      
      const groupConfigs = configGroups.find(g => g.group_name === groupName)?.configs || [];
      const changedKeys = groupConfigs
        .filter(config => formData[config.config_key] !== originalData[config.config_key])
        .map(config => config.config_key);
      
      if (changedKeys.length === 0) {
        setSuccessMessage(`No changes to save for ${formatConfigKey(groupName)}`);
        setIsSaving(prev => ({ ...prev, [groupName]: false }));
        setEditingGroups(prev => ({ ...prev, [groupName]: false }));
        return;
      }
      
      const changedConfigs = changedKeys.map(key => {
        // Find the config_id for this key
        const configGroup = configGroups.find(group => 
          group.configs.some(config => config.config_key === key)
        );
        
        const config = configGroup?.configs.find(config => config.config_key === key);
        
        return {
          config_id: config?.config_id,
          config_key: key,
          config_value: formData[key]
        };
      });
      
      const response = await fetch('/api/admin/app-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ configs: changedConfigs })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save ${formatConfigKey(groupName)} settings`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || `Failed to save ${formatConfigKey(groupName)} settings`);
      }
      
      // Update original data for this group
      const updatedOriginalData = { ...originalData };
      changedKeys.forEach(key => {
        updatedOriginalData[key] = formData[key];
      });
      setOriginalData(updatedOriginalData);
      
      setSuccessMessage(`${formatConfigKey(groupName)} settings saved successfully`);
      setEditingGroups(prev => ({ ...prev, [groupName]: false }));
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error(`Error saving ${groupName} settings:`, err);
      setError(err.message || `Failed to save ${formatConfigKey(groupName)} settings`);
    } finally {
      setIsSaving(prev => ({ ...prev, [groupName]: false }));
    }
  };

  const openResetConfirmation = (groupName: string) => {
    setResetConfirmation({
      isOpen: true,
      groupName
    });
  };

  const closeResetConfirmation = () => {
    setResetConfirmation({
      isOpen: false,
      groupName: null
    });
  };

  const handleResetGroup = async () => {
    if (!resetConfirmation.groupName) return;
    
    const groupName = resetConfirmation.groupName;
    console.log('Starting reset for group:', groupName);
    
    // Close dialog immediately to avoid UI hanging
    closeResetConfirmation();
    
    try {
      setIsResetting(prev => ({ ...prev, [groupName]: true }));
      console.log('Set isResetting to true for:', groupName);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch('/api/admin/app-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ group: groupName })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.error || `Failed to reset ${formatConfigKey(groupName)} settings`;
        console.error('Error response from server:', data);
        throw new Error(errorMessage);
      }
      
      if (!data.success) {
        const errorMessage = data.error || `Failed to reset ${formatConfigKey(groupName)} settings`;
        console.error('Unsuccessful response from server:', data);
        throw new Error(errorMessage);
      }
      
      console.log('Complete reset response:', data);
      console.log('Response data structure:', JSON.stringify(data, null, 2));
      
      // Update form data with reset values
      const updatedFormData = { ...formData };
      const updatedOriginalData = { ...originalData };
      
      // Extract the configs from the response
      let resetConfigs = [];
      
      if (Array.isArray(data.data)) {
        resetConfigs = data.data;
        console.log('Data is an array with length:', data.data.length);
      } else if (data.data && typeof data.data === 'object') {
        // If data.data is not an array but an object, check if it has configs property
        if (Array.isArray(data.data.configs)) {
          resetConfigs = data.data.configs;
          console.log('Found configs array in data.data.configs with length:', data.data.configs.length);
        } else {
          // If no configs array, treat the object itself as a collection of configs
          console.log('Data is an object, attempting to extract config values');
          resetConfigs = Object.values(data.data);
          console.log('Extracted values as array with length:', resetConfigs.length);
        }
      }
      
      console.log('Reset configs to process:', resetConfigs);
      
      // Process the configs
      resetConfigs.forEach((config: any) => {
        console.log('Processing config item:', config);
        
        // Try different property access patterns based on possible API response structures
        const configKey = config.config_key || config.key;
        const configValue = config.config_value || config.value;
        
        if (configKey && configValue !== undefined) {
          console.log(`Updating config ${configKey} to ${configValue}`);
          updatedFormData[configKey] = configValue;
          updatedOriginalData[configKey] = configValue;
        } else {
          console.error('Could not extract key/value from config object:', config);
          console.log('Object keys:', Object.keys(config));
        }
      });
      
      console.log('Final updated form data:', updatedFormData);
      
      // Update both form data and original data
      setFormData(updatedFormData);
      setOriginalData(updatedOriginalData);
      
      // Force a re-render by updating configGroups with new values
      setConfigGroups(prevGroups => {
        const updatedGroups = [...prevGroups];
        const targetGroupIndex = updatedGroups.findIndex(g => g.group_name === groupName);
        
        if (targetGroupIndex !== -1) {
          console.log(`Updating config group at index ${targetGroupIndex}`);
          const updatedConfigs = updatedGroups[targetGroupIndex].configs.map(config => {
            const newValue = updatedFormData[config.config_key];
            console.log(`Setting ${config.config_key} to ${newValue || config.config_value}`);
            return {
              ...config,
              config_value: newValue || config.config_value
            };
          });
          
          updatedGroups[targetGroupIndex] = {
            ...updatedGroups[targetGroupIndex],
            configs: updatedConfigs
          };
        } else {
          console.error(`Could not find config group with name ${groupName}`);
        }
        
        return updatedGroups;
      });
      
      // Manually trigger a re-fetch of the data to ensure UI is in sync
      const refetchConfigData = async () => {
        try {
          const refetchResponse = await fetch('/api/admin/app-config');
          const refetchData = await refetchResponse.json();
          
          if (refetchResponse.ok && refetchData.success) {
            // Process the refetched data the same way as in the initial load
            const groupedData: Record<string, AppConfig[]> = {};
            refetchData.data.forEach((config: AppConfig) => {
              if (!groupedData[config.config_group]) {
                groupedData[config.config_group] = [];
              }
              groupedData[config.config_group].push(config);
            });
            
            const groupsArray: ConfigGroup[] = Object.entries(groupedData).map(([group_name, configs]) => ({
              group_name,
              configs,
              subtitle: groupSubtitles[group_name]
            }));
            
            groupsArray.sort((a, b) => a.group_name.localeCompare(b.group_name));
            
            groupsArray.forEach(group => {
              if (group.group_name === 'fantasy_points') {
                group.configs.sort((a, b) => {
                  const aIndex = fantasyPointsOrder.indexOf(a.config_key);
                  const bIndex = fantasyPointsOrder.indexOf(b.config_key);
                  if (aIndex === -1 && bIndex === -1) return a.config_key.localeCompare(b.config_key);
                  if (aIndex === -1) return 1;
                  if (bIndex === -1) return -1;
                  return aIndex - bIndex;
                });
              } else {
                group.configs.sort((a, b) => a.config_key.localeCompare(b.config_key));
              }
            });
            
            setConfigGroups(groupsArray);
            
            const refreshedFormData: Record<string, string> = {};
            refetchData.data.forEach((config: AppConfig) => {
              refreshedFormData[config.config_key] = config.config_value;
            });
            
            setFormData(refreshedFormData);
            setOriginalData(refreshedFormData);
            
            console.log('Successfully refetched and updated config data');
          }
        } catch (error) {
          console.error('Error refetching config data:', error);
        }
      };
      
      // Wait a moment for the database changes to be committed before refetching
      setTimeout(() => {
        refetchConfigData();
      }, 500);
      
      setEditingGroups(prev => ({ ...prev, [groupName]: false }));
      
      setSuccessMessage(`${formatConfigKey(groupName)} settings reset to defaults`);
      console.log('Reset completed for group:', groupName);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error(`Error resetting ${groupName} settings:`, err);
      setError(err.message || `Failed to reset ${formatConfigKey(groupName)} settings`);
    } finally {
      setIsResetting(prev => {
        console.log('Resetting isResetting to false for:', groupName);
        return { ...prev, [groupName]: false };
      });
    }
  };

  const formatConfigKey = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Helper function to check if a field has been modified
  const isFieldModified = (configKey: string) => {
    return formData[configKey] !== originalData[configKey];
  };

  const renderConfigGroup = (group: ConfigGroup) => (
    <div key={group.group_name} className="mb-8">
      <div className="border-black/12.5 border-b-0 border-solid pb-0">
        <div className="flex items-center justify-between mb-2">
          <h5 className="mb-0 font-bold text-slate-700">{formatConfigKey(group.group_name)}</h5>
          <div className="flex items-center gap-2">
            {/* Always show the Save button, but disable it if no changes */}
            <Button
              onClick={() => handleSaveGroup(group.group_name)}
              disabled={isSaving[group.group_name] || !hasGroupChanges(group.group_name)}
              variant="primary"
              size="sm"
              className={`flex items-center gap-2 ${
                hasGroupChanges(group.group_name) 
                  ? 'bg-gradient-to-tl from-purple-700 to-pink-500 hover:shadow-lg-purple shadow-soft-md' 
                  : 'bg-gradient-to-tl from-slate-300 to-slate-400 opacity-60'
              }`}
            >
              {isSaving[group.group_name] ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]"></span>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </>
              )}
            </Button>
            <Button
              onClick={() => openResetConfirmation(group.group_name)}
              disabled={isResetting[group.group_name]}
              variant="outline"
              size="sm"
              className="text-slate-700 border-slate-200 hover:bg-slate-100 flex items-center gap-2"
            >
              {isResetting[group.group_name] ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]"></span>
                  Resetting...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </>
              )}
            </Button>
          </div>
        </div>
        {group.subtitle && (
          <p className="text-sm text-slate-500 mb-4">{group.subtitle}</p>
        )}
      </div>
      <div className="pt-0">
        <div className="overflow-hidden">
          {group.configs.map((config) => (
            <div key={config.config_key} className="p-4 border-b border-slate-100 last:border-b-0">
              <div className="flex flex-row items-center justify-between gap-4">
                <div className="flex-1">
                  <label htmlFor={config.config_key} className="block text-sm font-medium text-slate-700 mb-1">
                    {config.config_group === 'fantasy_points'
                      ? fantasyPointsDisplayNames[config.config_key] || formatConfigKey(config.config_key)
                      : formatConfigKey(config.config_key)}
                  </label>
                  <p className="text-xs text-slate-500">{config.config_description}</p>
                </div>
                <div className="w-32 flex-shrink-0">
                  <input
                    type="text"
                    id={config.config_key}
                    name={config.config_key}
                    value={formData[config.config_key] || ''}
                    onChange={handleInputChange}
                    className={`block w-full px-3 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm ${
                      isFieldModified(config.config_key) 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-slate-200'
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {isLoading && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-6 text-slate-700 shadow-soft-sm">
          <div className="flex items-center">
            <div className="mr-3">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]" role="status"></div>
            </div>
            <span>Loading configuration settings...</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6 text-red-700 shadow-soft-sm">
          <span>{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6 text-green-700 shadow-soft-sm">
          <span>{successMessage}</span>
        </div>
      )}
      
      {!isLoading && configGroups.map(renderConfigGroup)}

      {/* Reset Confirmation Dialog */}
      <SoftUIConfirmationModal
        isOpen={resetConfirmation.isOpen}
        onClose={closeResetConfirmation}
        onConfirm={handleResetGroup}
        title="Reset to Default"
        message={`Are you sure you want to reset ${resetConfirmation.groupName ? formatConfigKey(resetConfirmation.groupName) : ''} settings to their default values? This action cannot be undone.`}
        confirmText="Reset"
        cancelText="Cancel"
        isConfirming={resetConfirmation.groupName ? isResetting[resetConfirmation.groupName] : false}
      />
    </div>
  );
};

export default AppConfig; 