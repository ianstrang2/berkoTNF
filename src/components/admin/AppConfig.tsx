import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const hasGroupChanges = (groupName: string) => {
    const groupConfigs = configGroups.find(g => g.group_name === groupName)?.configs || [];
    return groupConfigs.some(config => formData[config.config_key] !== originalData[config.config_key]);
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
    
    try {
      setIsResetting(prev => ({ ...prev, [groupName]: true }));
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
      
      // Update form data with reset values
      const updatedFormData = { ...formData };
      const updatedOriginalData = { ...originalData };
      
      data.data.forEach((config: AppConfig) => {
        updatedFormData[config.config_key] = config.config_value;
        updatedOriginalData[config.config_key] = config.config_value;
      });
      
      setFormData(updatedFormData);
      setOriginalData(updatedOriginalData);
      setEditingGroups(prev => ({ ...prev, [groupName]: false }));
      
      setSuccessMessage(`${formatConfigKey(groupName)} settings reset to defaults`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error(`Error resetting ${groupName} settings:`, err);
      setError(err.message || `Failed to reset ${formatConfigKey(groupName)} settings`);
    } finally {
      setIsResetting(prev => ({ ...prev, [groupName]: false }));
      closeResetConfirmation();
    }
  };

  const formatConfigKey = (key: string) => {
    // If it's a fantasy points key, use the display name
    if (fantasyPointsDisplayNames[key]) {
      return fantasyPointsDisplayNames[key];
    }
    // Otherwise use the default formatting
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderConfigGroup = (group: ConfigGroup) => (
    <Card 
      key={group.group_name} 
      title={formatConfigKey(group.group_name)} 
      icon={null} 
      footer={
        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
          <Button
            onClick={() => openResetConfirmation(group.group_name)}
            disabled={isLoading || isResetting[group.group_name] || isSaving[group.group_name]}
            variant="outline"
            className="border-neutral-300"
          >
            {isResetting[group.group_name] ? 'Resetting...' : 'Reset to Default'}
          </Button>
          {editingGroups[group.group_name] ? (
            <>
              <Button
                onClick={() => {
                  // Revert changes
                  const updatedFormData = { ...formData };
                  group.configs.forEach(config => {
                    updatedFormData[config.config_key] = originalData[config.config_key];
                  });
                  setFormData(updatedFormData);
                  setEditingGroups(prev => ({ ...prev, [group.group_name]: false }));
                }}
                variant="outline"
                className="border-neutral-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSaveGroup(group.group_name)}
                disabled={isLoading || !hasGroupChanges(group.group_name) || isSaving[group.group_name]}
                variant="primary"
              >
                {isSaving[group.group_name] ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setEditingGroups(prev => ({ ...prev, [group.group_name]: true }))}
              variant="primary"
            >
              Edit
            </Button>
          )}
        </div>
      }
      className="mb-6 shadow-card"
    >
      {group.subtitle && (
        <p className="text-base text-neutral-600 mb-6">{group.subtitle}</p>
      )}
      <div className="space-y-6">
        {group.configs.map(config => (
          <div key={config.config_id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label 
              htmlFor={config.config_key} 
              className="text-base font-medium text-neutral-700 md:col-span-1"
            >
              {formatConfigKey(config.config_key)}
            </label>
            <div className="md:col-span-2">
              <input
                type="text"
                id={config.config_key}
                name={config.config_key}
                value={formData[config.config_key] || ''}
                onChange={handleInputChange}
                disabled={!editingGroups[group.group_name]}
                className={`w-full rounded-md text-base ${editingGroups[group.group_name] ? 'border-neutral-300' : 'bg-neutral-50 border-neutral-200'} shadow-sm focus:border-primary-500 focus:ring-primary-500`}
              />
              <p className="mt-2 text-sm text-neutral-500">{config.config_description}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-neutral-900">App Configuration</h1>
      </div>
      
      {isLoading && (
        <div className="p-4 bg-info-50 border border-info-200 rounded-md mb-6">
          <span className="text-base text-info-700">Loading configuration settings...</span>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-error-50 border border-error-200 rounded-md mb-6 text-error-700">
          <span className="text-base">{error}</span>
        </div>
      )}
      
      {successMessage && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-md mb-6 text-success-700">
          <span className="text-base">{successMessage}</span>
        </div>
      )}

      <p className="mb-6 text-base text-neutral-600">
        Manage global application settings used throughout the app. 
        Click "Edit" to modify a section, then "Save Changes" when done.
      </p>
      
      {!isLoading && configGroups.map(renderConfigGroup)}

      {/* Reset Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={resetConfirmation.isOpen}
        title="Reset to Default"
        message={`Are you sure you want to reset ${resetConfirmation.groupName ? formatConfigKey(resetConfirmation.groupName) : ''} settings to their default values? This action cannot be undone.`}
        confirmText="Reset"
        cancelText="Cancel"
        onConfirm={handleResetGroup}
        onCancel={closeResetConfirmation}
        isConfirming={resetConfirmation.groupName ? isResetting[resetConfirmation.groupName] : false}
      />
    </div>
  );
};

export default AppConfig; 