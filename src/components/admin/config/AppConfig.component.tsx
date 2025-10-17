import React, { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui-kit/Card.component';
import Button from '@/components/ui-kit/Button.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';
import { apiFetch } from '@/lib/apiConfig';

// Matches the structure of items from your app_config table
// including the new fields
interface AppConfigData {
  config_id: number;
  config_key: string;
  config_value: string;
  config_description: string;
  config_group: string;
  display_name: string;
  display_group: string;
  sort_order: number;
  // created_at and updated_at are not directly used in this component's logic for now
}

// Defines the structure for a display section/card
interface ConfigSection {
  id: string; // Typically the display_group name
  title: string; // User-friendly title, from display_group
  configs: AppConfigData[];
}

interface AppConfigProps {
  targetConfigGroups: string[]; // e.g., ['match_settings'] or ['fantasy_points', 'match_report', 'table_settings']
  pageTitle: string; // e.g., "General Settings" or "Stats Settings"
  pageDescription?: string;
}

const AppConfig: React.FC<AppConfigProps> = ({
  targetConfigGroups,
  pageTitle,
  pageDescription,
}) => {
  const [allFetchedConfigs, setAllFetchedConfigs] = useState<AppConfigData[]>([]);
  const [configSections, setConfigSections] = useState<ConfigSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [originalDataForEdit, setOriginalDataForEdit] = useState<Record<string, string>>({}); // For reverting changes in the currently edited section
  
  const [editingSectionTitle, setEditingSectionTitle] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null); // Store title of section being saved
  const [isResetting, setIsResetting] = useState<string | null>(null); // Store title of section being reset

  const [resetConfirmation, setResetConfirmation] = useState<{
    isOpen: boolean;
    sectionTitle: string | null;
    configsToReset: AppConfigData[];
    associatedConfigGroup: string | null; // Main config_group for API call
  }>({ isOpen: false, sectionTitle: null, configsToReset: [], associatedConfigGroup: null });

  const processAndSetFetchedData = useCallback((data: AppConfigData[]) => {
    const initialFormData: Record<string, string> = {};
    data.forEach(config => {
      initialFormData[config.config_key] = config.config_value;
    });
    setFormData(initialFormData);

    // Group by display_group
    const groupedByDisplayGroup: Record<string, AppConfigData[]> = {};
    data.forEach(config => {
      const groupKey = config.display_group || 'Uncategorized'; // Fallback
      if (!groupedByDisplayGroup[groupKey]) {
        groupedByDisplayGroup[groupKey] = [];
      }
      groupedByDisplayGroup[groupKey].push(config);
    });

    const sectionsArray: ConfigSection[] = Object.entries(groupedByDisplayGroup)
      .map(([title, configsInGroup]) => ({
        id: title, // Use title as a unique ID for the section card
        title: title,
        configs: [...configsInGroup].sort((a, b) => {
          if (a.sort_order === b.sort_order) {
            return (a.display_name || a.config_key).localeCompare(b.display_name || b.config_key);
          }
          return (a.sort_order || 999) - (b.sort_order || 999);
        }),
      }))
      .sort((a, b) => { // Optional: Sort sections themselves if needed, e.g., by first config's sort_order or a predefined section order
        const firstConfigAOrder = a.configs[0]?.sort_order || 999;
        const firstConfigBOrder = b.configs[0]?.sort_order || 999;
        if (firstConfigAOrder !== firstConfigBOrder) {
          return firstConfigAOrder - firstConfigBOrder;
        }
        return a.title.localeCompare(b.title);
      });
      
    setConfigSections(sectionsArray);
  }, []);


  useEffect(() => {
    const fetchConfigData = async () => {
      if (!targetConfigGroups || targetConfigGroups.length === 0) {
        setError("No target configuration groups specified.");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        
        // Assuming API can handle ?groups=group1,group2 or similar
        // Adjust if your API expects a different format for multiple groups
        const groupsQueryParam = targetConfigGroups.join(',');
        const response = await apiFetch(`/admin/app-config?groups=${encodeURIComponent(groupsQueryParam)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch configuration settings');
        }
        
        const result = await response.json();
        if (!result.success || !Array.isArray(result.data)) {
          throw new Error(result.error || 'Failed to fetch valid configuration settings data');
        }
        
        const typedData = result.data as AppConfigData[];
        setAllFetchedConfigs(typedData); // Store all raw fetched data if needed later
        processAndSetFetchedData(typedData);

      } catch (err: any) {
        console.error('Error fetching configuration settings:', err);
        setError(err.message || 'Failed to fetch configuration settings');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConfigData();
  }, [targetConfigGroups, processAndSetFetchedData]);

  const handleEditClick = (sectionTitle: string, sectionConfigs: AppConfigData[]) => {
    // Snapshot current values of this section for potential cancel
    const currentSectionFormData: Record<string, string> = {};
    sectionConfigs.forEach(config => {
      currentSectionFormData[config.config_key] = formData[config.config_key];
    });
    setOriginalDataForEdit(currentSectionFormData);
    setEditingSectionTitle(sectionTitle);
  };

  const handleCancelClick = (sectionTitle: string) => {
    // Revert formData for this section to what it was when edit began
    setFormData(prevFormData => ({
      ...prevFormData,
      ...originalDataForEdit, // Restore only the keys from the cancelled section
    }));
    setEditingSectionTitle(null);
    setOriginalDataForEdit({});
    setError(null); // Clear any validation errors from this section
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? String(checked) : value,
    }));
  };

  const getModifiedConfigsInSection = (sectionConfigs: AppConfigData[]) => {
    return sectionConfigs.filter(config => 
      formData[config.config_key] !== originalDataForEdit[config.config_key]
    );
  };
  
  const hasSectionChanges = (sectionConfigs: AppConfigData[]) => {
    if (editingSectionTitle === null) return false; // Ensure originalDataForEdit is populated
    return sectionConfigs.some(config => formData[config.config_key] !== originalDataForEdit[config.config_key]);
  };


  const handleSaveSection = async (sectionTitle: string, sectionConfigs: AppConfigData[]) => {
    setIsSaving(sectionTitle);
    setError(null);
    setSuccessMessage(null);

    const modifiedConfigs = getModifiedConfigsInSection(sectionConfigs).map(config => ({
      config_id: config.config_id,
      config_key: config.config_key,
      config_value: formData[config.config_key],
    }));

    if (modifiedConfigs.length === 0) {
      setSuccessMessage("No changes to save in this section.");
      setTimeout(() => setSuccessMessage(null), 3000);
      setEditingSectionTitle(null);
      setIsSaving(null);
      return;
    }

    try {
      const response = await apiFetch('/admin/app-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: modifiedConfigs }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to save ${sectionTitle} settings`);
      }

      setSuccessMessage(`${sectionTitle} settings saved successfully.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Update the main "original" data source (allFetchedConfigs) to reflect saved changes
      // and then re-process to update UI state properly
      const updatedAllConfigs = allFetchedConfigs.map(cfg => {
        const savedChange = modifiedConfigs.find(mc => mc.config_key === cfg.config_key);
        return savedChange ? { ...cfg, config_value: savedChange.config_value } : cfg;
      });
      setAllFetchedConfigs(updatedAllConfigs);
      processAndSetFetchedData(updatedAllConfigs); // This will update formData and sections

      setEditingSectionTitle(null);
      setOriginalDataForEdit({});
    } catch (err: any) {
      console.error(`Error saving ${sectionTitle} settings:`, err);
      setError(err.message || `Failed to save ${sectionTitle} settings`);
    } finally {
      setIsSaving(null);
    }
  };
  
  const openResetConfDialog = (sectionTitle: string, sectionConfigs: AppConfigData[]) => {
    // For reset, we generally reset a whole config_group.
    // Determine the primary config_group for this section.
    // This assumes all configs in a display_group belong to the same original config_group if reset is by group.
    // Or, the API needs to handle reset by display_group or a list of config_keys.
    // For now, let's use the config_group of the first item.
    const associatedConfigGroup = sectionConfigs.length > 0 ? sectionConfigs[0].config_group : null;
    if (!associatedConfigGroup) {
      setError("Cannot determine config group for reset.");
      return;
    }

    setResetConfirmation({
      isOpen: true,
      sectionTitle,
      configsToReset: sectionConfigs, // Could be used if API supports granular reset
      associatedConfigGroup
    });
  };

  const closeResetConfDialog = () => {
    setResetConfirmation({ isOpen: false, sectionTitle: null, configsToReset: [], associatedConfigGroup: null });
  };

  const handleResetSection = async () => {
    const { sectionTitle, associatedConfigGroup } = resetConfirmation;
    if (!sectionTitle || !associatedConfigGroup) return;

    setIsResetting(sectionTitle);
    setError(null);
    setSuccessMessage(null);
    closeResetConfDialog();

    try {
      const response = await apiFetch('/admin/app-config/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: associatedConfigGroup }), // API resets by main config_group
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Failed to reset ${sectionTitle} settings`);
      }
      
      setSuccessMessage(`${sectionTitle} (and potentially related) settings reset successfully. Reloading...`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // After reset, refetch all data for the current targetConfigGroups to get fresh values
      // This is simpler than trying to merge partial reset data.
      const groupsQueryParam = targetConfigGroups.join(',');
      const refetchResponse = await apiFetch(`/admin/app-config?groups=${encodeURIComponent(groupsQueryParam)}`);
      const refetchResult = await refetchResponse.json();
      if (refetchResult.success && Array.isArray(refetchResult.data)) {
          setAllFetchedConfigs(refetchResult.data as AppConfigData[]);
          processAndSetFetchedData(refetchResult.data as AppConfigData[]);
      } else {
          throw new Error("Failed to refetch data after reset.");
      }
      
      setEditingSectionTitle(null); // Exit edit mode for this section
      setOriginalDataForEdit({});

    } catch (err: any) {
      console.error(`Error resetting ${sectionTitle} settings:`, err);
      setError(err.message || `Failed to reset ${sectionTitle} settings`);
    } finally {
      setIsResetting(null);
    }
  };

  const renderConfigSectionCard = (section: ConfigSection) => {
    const isEditingThisSection = editingSectionTitle === section.title;

    const cardContent = (
      // The Card component itself always has its standard styling now
      <Card 
        key={section.id} // Key moved to Card from wrapper if wrapper is conditional
        className={`shadow-soft-xl rounded-2xl bg-white w-full h-full`} // ensure w-full, h-full if parent controls size
      >
        <div className={`p-6`}>
          {/* Card Header */}
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
            <h3 className="text-xl font-semibold text-slate-700">{section.title}</h3>
            <div className="flex items-center">
              {isEditingThisSection ? (
                <Button
                  onClick={() => handleCancelClick(section.title)}
                  disabled={isSaving === section.title || isResetting === section.title}
                  className="text-slate-700 border-slate-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-opacity-50 rounded-md font-semibold py-2 px-3"
                  size="sm"
                  variant="outline"
                >
                  Cancel
                </Button>
              ) : (
                <Button
                  onClick={() => handleEditClick(section.title, section.configs)}
                  disabled={isLoading || !!editingSectionTitle} // Disable if any section is being edited or loading
                  className="text-slate-700 border-slate-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-opacity-50 rounded-md font-semibold py-2 px-3"
                  size="sm"
                  variant="outline"
                >
                  Edit
                </Button>
              )}
            </div>
          </div>

          {/* Card Body - Config Items */}
          <div className={`space-y-2 pt-2 ${isEditingThisSection ? 'opacity-100' : 'opacity-90'}`}>
            {section.configs.map((config, index) => {
              const isModified = isEditingThisSection && originalDataForEdit[config.config_key] !== formData[config.config_key];
              const itemWrapperClasses = index < section.configs.length - 1 ? "border-b border-slate-200" : "";

              return (
                <div key={config.config_key} className={itemWrapperClasses}>
                  {isEditingThisSection ? (
                    // Edit Mode View
                    <div className="py-2.5">
                      <label htmlFor={config.config_key} className="block text-sm font-medium text-slate-700 mb-1">
                        {config.display_name || config.config_key}
                        {isModified && <span className="text-purple-600 ml-1">*</span>}
                      </label>
                      {config.config_key.includes('show_') || typeof formData[config.config_key] === 'boolean' || formData[config.config_key] === 'true' || formData[config.config_key] === 'false' ? (
                        <div className="flex items-center mt-2">
                          <input
                            type="checkbox"
                            name={config.config_key}
                            id={config.config_key}
                            checked={formData[config.config_key] === 'true'}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 focus:ring-offset-0"
                            disabled={isSaving === section.title || isResetting === section.title}
                          />
                          <label htmlFor={config.config_key} className="ml-2 block text-sm text-slate-700">
                            {formData[config.config_key] === 'true' ? 'Enabled' : 'Disabled'}
                          </label>
                        </div>
                      ) : (
                        <input
                          type={config.config_key.includes('days') || config.config_key.includes('size') || config.config_key.includes('limit') || config.config_key.includes('threshold') || config.config_key.includes('points') || config.config_key.includes('duration') || config.config_key.includes('games') || config.config_key.includes('window') ? 'number' : 'text'}
                          name={config.config_key}
                          id={config.config_key}
                          value={formData[config.config_key] || ''}
                          onChange={handleInputChange}
                          className="w-full rounded-md border-slate-300 shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm disabled:bg-slate-50 disabled:text-slate-400"
                          disabled={isSaving === section.title || isResetting === section.title}
                        />
                      )}
                      {config.config_description && (
                        <p className="mt-1 text-xs text-slate-500">{config.config_description}</p>
                      )}
                    </div>
                  ) : (
                    // Read-Only View - More Compact
                    <div className="flex justify-between items-center py-2.5">
                      <div className="flex-grow pr-4">
                        <span className="text-sm font-medium text-slate-700">{config.display_name || config.config_key}</span>
                        {config.config_description && (
                          <p className="mt-0.5 text-xs text-slate-500 max-w-md">
                            {config.config_description}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right pl-2">
                        <span className="text-sm text-slate-600">
                          {formData[config.config_key] === 'true' || formData[config.config_key] === 'false' ? 
                            (formData[config.config_key] === 'true' ? 
                              <span className="px-2 py-0.5 text-xs font-semibold text-green-700 bg-green-100 rounded-full">Enabled</span> : 
                              <span className="px-2 py-0.5 text-xs font-semibold text-red-700 bg-red-100 rounded-full">Disabled</span>
                            ) : 
                            (formData[config.config_key] || 'Not set')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Card Footer - Action Buttons (only in edit mode) */}
          {isEditingThisSection && (
            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end gap-3">
              <Button
                onClick={() => openResetConfDialog(section.title, section.configs)}
                disabled={isSaving === section.title || isResetting === section.title}
                variant="outline"
                size="sm"
                className="text-slate-700 border-slate-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-opacity-50 rounded-md font-semibold py-2 px-3"
              >
                {isResetting === section.title ? 'Resetting...' : 'Reset'}
              </Button>
              <Button
                onClick={() => handleSaveSection(section.title, section.configs)}
                disabled={isSaving === section.title || isResetting === section.title || !hasSectionChanges(section.configs)}
                size="sm"
                className="bg-gradient-to-tl from-purple-700 to-pink-500 hover:shadow-lg-purple shadow-soft-md text-white font-semibold py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
              >
                {isSaving === section.title ? 'Saving...' : 'SAVE'}
              </Button>
            </div>
          )}
        </div>
      </Card>
    );

    if (isEditingThisSection) {
      // Wrap the cardContent in a div that provides the gradient border
      // For a 2px border, use p-0.5. For 1px, use p-px.
      // The inner Card component's rounded value needs to be adjusted based on this padding.
      // If Card is rounded-2xl (1rem), and border is p-0.5 (2px), inner should be rounded-[calc(1rem-2px)]
      // For simplicity here, we ensure the Card itself fills the wrapper and has slightly less rounding.
      // The wrapper gets the mb-8 for spacing.
      return (
        <div 
          key={`${section.id}-wrapper`} // Ensure unique key for the wrapper
          className="mb-8 rounded-2xl p-0.5 bg-gradient-to-tl from-purple-700 to-pink-500 transition-all duration-300"
        >
          {/* Adjust Card rounding to be slightly less than wrapper if needed, or ensure it fills. */}
          {/* Forcing card to not have its own margin here and adopt wrapper's rounding for content clipping */}
          {React.cloneElement(cardContent, { className: 'shadow-soft-xl rounded-[calc(1rem-2px)] bg-white w-full h-full mb-0'})}
        </div>
      );
    } else {
      // If not editing, return the cardContent directly with its margin
      return <div className="mb-8" key={`${section.id}-wrapper`}>{cardContent}</div>;
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading configuration...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 bg-red-50 rounded-md">Error: {error}</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h5 className="mb-2 font-bold text-slate-700">{pageTitle}</h5>
        {pageDescription && <p className="text-sm text-slate-600 mt-1">{pageDescription}</p>}
      </div>

      {successMessage && (
        <div className="mb-4 p-3 rounded-md bg-green-100 text-green-700 border border-green-200 shadow-sm">
          {successMessage}
        </div>
      )}
      
      {configSections.length > 0 ? (
        configSections.map(renderConfigSectionCard)
      ) : (
        <p>No configuration settings found for the targeted group(s).</p>
      )}

      <SoftUIConfirmationModal
        isOpen={resetConfirmation.isOpen}
        onClose={closeResetConfDialog}
        onConfirm={handleResetSection}
        title={`Reset ${resetConfirmation.sectionTitle || ''} Settings?`}
        message={`Are you sure you want to reset the settings in the "${resetConfirmation.sectionTitle || ''}" section to their default values? This action might affect related settings if the reset is processed by the main configuration group.`}
        confirmText="Confirm Reset"
        cancelText="Cancel"
        icon="warning"
        isConfirming={!!isResetting} // True if any section is resetting
      />
    </div>
  );
};

export default AppConfig; 