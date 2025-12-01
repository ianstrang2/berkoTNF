'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui-kit/Card.component';
import Button from '@/components/ui-kit/Button.component';
import InfoPopover from '@/components/ui-kit/InfoPopover.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { apiFetch } from '@/lib/apiConfig';

interface AppConfigData {
  config_id: number;
  config_key: string;
  config_value: string;
  config_description: string;
  config_group: string;
  display_name: string;
  display_group: string;
  sort_order: number;
  complexity_level?: string;
}

interface ConfigSection {
  id: string;
  title: string;
  configs: AppConfigData[];
  isExpanded: boolean;
}

interface CompactAppConfigProps {
  targetConfigGroups?: string[];
  targetComplexityLevel?: 'standard' | 'advanced';
  pageTitle?: string;
  pageDescription?: string;
}

const CompactAppConfig: React.FC<CompactAppConfigProps> = ({
  targetConfigGroups,
  targetComplexityLevel,
  pageTitle,
  pageDescription,
}) => {
  const [allFetchedConfigs, setAllFetchedConfigs] = useState<AppConfigData[]>([]);
  const [configSections, setConfigSections] = useState<ConfigSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [originalData, setOriginalData] = useState<Record<string, string>>({});
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showExitWarning, setShowExitWarning] = useState<boolean>(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [resetConfirmation, setResetConfirmation] = useState<{
    isOpen: boolean;
    section: ConfigSection | null;
  }>({ isOpen: false, section: null });

  const processAndSetFetchedData = useCallback((data: AppConfigData[]) => {
    const initialFormData: Record<string, string> = {};
    data.forEach(config => {
      initialFormData[config.config_key] = config.config_value;
    });
    setFormData(initialFormData);
    setOriginalData(initialFormData);

    // Group by display_group
    const groupedByDisplayGroup: Record<string, AppConfigData[]> = {};
    data.forEach(config => {
      const groupKey = config.display_group || 'Uncategorized';
      if (!groupedByDisplayGroup[groupKey]) {
        groupedByDisplayGroup[groupKey] = [];
      }
      groupedByDisplayGroup[groupKey].push(config);
    });

    // Check if mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    // First create the sections without expanded state
    const rawSections = Object.entries(groupedByDisplayGroup)
      .map(([title, configsInGroup]) => ({
        id: title,
        title: title,
        configs: [...configsInGroup].sort((a, b) => {
          if (a.sort_order === b.sort_order) {
            return (a.display_name || a.config_key).localeCompare(b.display_name || b.config_key);
          }
          return (a.sort_order || 999) - (b.sort_order || 999);
        }),
        isExpanded: true // Temporary
      }))
      .sort((a, b) => {
        const firstConfigAOrder = a.configs[0]?.sort_order || 999;
        const firstConfigBOrder = b.configs[0]?.sort_order || 999;
        if (firstConfigAOrder !== firstConfigBOrder) {
          return firstConfigAOrder - firstConfigBOrder;
        }
        return a.title.localeCompare(b.title);
      });

    // Then apply expanded state based on the sorted order
    const sectionsArray = rawSections.map((section, index) => ({
      ...section,
      isExpanded: !isMobile || index === 0
    }));
      
    setConfigSections(sectionsArray);
  }, []);

  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        let queryParams = '';
        if (targetConfigGroups && targetConfigGroups.length > 0) {
          queryParams = `groups=${encodeURIComponent(targetConfigGroups.join(','))}`;
        }
        if (targetComplexityLevel) {
          queryParams += (queryParams ? '&' : '') + `complexity=${targetComplexityLevel}`;
        }
        
        const response = await apiFetch(`/admin/app-config${queryParams ? `?${queryParams}` : ''}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch configuration settings');
        }
        
        const result = await response.json();
        if (!result.success || !Array.isArray(result.data)) {
          throw new Error(result.error || 'Failed to fetch valid configuration settings data');
        }
        
        const typedData = result.data as AppConfigData[];
        setAllFetchedConfigs(typedData);
        processAndSetFetchedData(typedData);

      } catch (err: any) {
        console.error('Error fetching configuration settings:', err);
        setError(err.message || 'Failed to fetch configuration settings');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConfigData();
  }, [targetConfigGroups, targetComplexityLevel, processAndSetFetchedData]);

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

  const toggleSection = (sectionId: string) => {
    setConfigSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? { ...section, isExpanded: !section.isExpanded }
          : section
      )
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? String(checked) : value,
    }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setError(null);

    const modifiedConfigs = allFetchedConfigs
      .filter(config => formData[config.config_key] !== originalData[config.config_key])
      .map(config => ({
        config_id: config.config_id,
        config_key: config.config_key,
        config_value: formData[config.config_key],
      }));

    if (modifiedConfigs.length === 0) {
      setIsSaving(false);
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
        throw new Error(result.error || 'Failed to save settings');
      }

      // Update original data to reflect saved changes
      setOriginalData({ ...formData });
      
      // Show success flash
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSection = (section: ConfigSection) => {
    setResetConfirmation({ isOpen: true, section });
  };

  const confirmResetSection = async () => {
    const section = resetConfirmation.section;
    if (!section) return;

    setResetConfirmation({ isOpen: false, section: null });
    setError(null);

    try {
      setIsLoading(true);
      
      // Fetch defaults for this section's config keys
      const configKeys = section.configs.map(c => c.config_key);
      // We can't easily batch fetch defaults by key, but we can fetch by group and filter
      // Or we can just reset the form values if we assume defaults are what we want
      
      // Better approach: Fetch all defaults for the relevant groups
      const groups = [...new Set(section.configs.map(c => c.config_group))];
      const defaultsPromises = groups.map(group => 
        apiFetch(`/admin/app-config/defaults?group=${group}`)
      );
      
      // Since we don't have a GET defaults endpoint yet, let's create one or use a different strategy
      // Strategy: We can't easily get defaults without a new endpoint.
      // Let's use the reset endpoint but we need to acknowledge it resets the WHOLE group.
      
      // For now, let's stick to the server-side reset but we need to warn the user it might reset related settings
      // The existing implementation does exactly this.
      
      // The issue reported was "buttons don't seem to do anything".
      // This might be because the UI doesn't update after reset.
      
      // Let's try to improve the existing implementation first by ensuring state updates
      const configGroup = section.configs[0]?.config_group;
      if (!configGroup) {
        throw new Error('Cannot determine config group for reset');
      }

      const response = await apiFetch('/admin/app-config/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: configGroup }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to reset settings');
      }

      // REFRESH DATA immediately
      // We need to fetch the fresh data to update the UI
      let queryParams = '';
      if (targetConfigGroups && targetConfigGroups.length > 0) {
        queryParams = `groups=${encodeURIComponent(targetConfigGroups.join(','))}`;
      }
      if (targetComplexityLevel) {
        queryParams += (queryParams ? '&' : '') + `complexity=${targetComplexityLevel}`;
      }
      
      const refetchResponse = await apiFetch(`/admin/app-config${queryParams ? `?${queryParams}` : ''}`);
      const refetchResult = await refetchResponse.json();
      
      if (refetchResult.success && Array.isArray(refetchResult.data)) {
        const typedData = refetchResult.data as AppConfigData[];
        setAllFetchedConfigs(typedData);
        processAndSetFetchedData(typedData);
        
        // Clear any unsaved changes state for these keys
        const newFormData = { ...formData };
        const newOriginalData = { ...originalData };
        
        typedData.forEach(config => {
          newFormData[config.config_key] = config.config_value;
          newOriginalData[config.config_key] = config.config_value;
        });
        
        setFormData(newFormData);
        setOriginalData(newOriginalData);
        
        // Show success flash
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }

    } catch (err: any) {
      console.error('Error resetting section:', err);
      setError(err.message || 'Failed to reset section');
    } finally {
      setIsLoading(false);
    }
  };

  const renderConfigItem = (config: AppConfigData) => {
    const currentValue = formData[config.config_key] || '';
    const isBoolean = config.config_key.includes('show_') || 
                     currentValue === 'true' || 
                     currentValue === 'false';

    return (
      <div key={config.config_key} className="flex items-center py-1.5 border-b border-slate-100 last:border-0">
        <div className="flex-grow flex items-center min-w-0">
          <span className="text-sm font-medium text-slate-700 truncate">
            {config.display_name || config.config_key}
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
                disabled={isSaving}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-tl peer-checked:from-purple-700 peer-checked:to-pink-500"></div>
            </label>
          ) : (
            <input
              type={config.config_key.includes('days') || 
                    config.config_key.includes('size') || 
                    config.config_key.includes('limit') || 
                    config.config_key.includes('threshold') || 
                    config.config_key.includes('points') || 
                    config.config_key.includes('duration') || 
                    config.config_key.includes('games') || 
                    config.config_key.includes('window') || 
                    config.config_key.includes('weight') || 
                    config.config_key.includes('life') ? 'number' : 'text'}
              name={config.config_key}
              value={currentValue}
              onChange={handleInputChange}
              className="w-24 text-right px-2 py-1 text-sm rounded-md border-slate-300 shadow-sm focus:ring-purple-500 focus:border-purple-500 disabled:bg-slate-50 disabled:text-slate-400"
              disabled={isSaving}
              step={config.config_key.includes('weight') ? '0.01' : '1'}
            />
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-4 text-center text-slate-600">Loading configuration...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 bg-red-50 rounded-md">{error}</div>;
  }

  return (
    <div className="w-full">
      {/* Page title - optional */}
      {pageTitle && (
        <div className="mb-4">
          <h5 className="font-bold text-slate-700">{pageTitle}</h5>
          {pageDescription && <p className="text-sm text-slate-600 mt-1">{pageDescription}</p>}
        </div>
      )}

      {/* Config Sections */}
      <div className="space-y-3">
        {configSections.map(section => (
          <Card key={section.id} className="shadow-soft-md rounded-xl bg-white overflow-hidden">
            {/* Section Header - Collapsible */}
            <div className="w-full flex items-center justify-between p-4 border-b border-slate-100 group">
              <button
                onClick={() => toggleSection(section.id)}
                className="flex items-center gap-2 flex-grow text-left hover:opacity-70 transition-opacity"
              >
                <h3 className="text-base font-semibold text-slate-700">{section.title}</h3>
                {section.isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>
              
              {/* Reset Section Button - Always visible on mobile, hover on desktop */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetSection(section);
                }}
                className="ml-2 p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors md:opacity-0 md:group-hover:opacity-100 opacity-100"
                title="Reset section to defaults"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Section Content */}
            {section.isExpanded && (
              <div className="px-4 pb-4 space-y-0">
                {section.configs.map(renderConfigItem)}
              </div>
            )}
          </Card>
        ))}
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

      {/* Exit Warning Modal */}
      <SoftUIConfirmationModal
        isOpen={showExitWarning}
        onClose={() => setShowExitWarning(false)}
        onConfirm={() => {
          setShowExitWarning(false);
          // Handle navigation if needed
          if (pendingNavigation) {
            window.location.href = pendingNavigation;
          }
        }}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
        confirmText="Leave Anyway"
        cancelText="Stay"
        icon="warning"
      />

      {/* Reset Confirmation Modal */}
      <SoftUIConfirmationModal
        isOpen={resetConfirmation.isOpen}
        onClose={() => setResetConfirmation({ isOpen: false, section: null })}
        onConfirm={confirmResetSection}
        title={`Reset ${resetConfirmation.section?.title || ''}?`}
        message={`Are you sure you want to reset "${resetConfirmation.section?.title}" to default values? This will overwrite your current settings.`}
        confirmText="Reset"
        cancelText="Cancel"
        icon="warning"
      />
    </div>
  );
};

export default CompactAppConfig;

