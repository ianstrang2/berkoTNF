'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui-kit/Card.component';
import Button from '@/components/ui-kit/Button.component';
import InfoPopover from '@/components/ui-kit/InfoPopover.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAppConfig, useUpdateAppConfig, useResetAppConfig, AppConfigData } from '@/hooks/queries/useAppConfig.hook';

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
  // Use React Query for data fetching
  const { data: fetchedConfigs, isLoading, error: fetchError } = useAppConfig({
    groups: targetConfigGroups,
    complexity: targetComplexityLevel
  });
  const updateMutation = useUpdateAppConfig();
  const resetMutation = useResetAppConfig();
  
  const [configSections, setConfigSections] = useState<ConfigSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [originalData, setOriginalData] = useState<Record<string, string>>({});
  
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

  // Process fetched data when it changes
  useEffect(() => {
    if (fetchedConfigs) {
      processAndSetFetchedData(fetchedConfigs);
    }
  }, [fetchedConfigs, processAndSetFetchedData]);

  // Set error from fetch if any
  useEffect(() => {
    if (fetchError) {
      setError((fetchError as Error).message || 'Failed to fetch configuration settings');
    }
  }, [fetchError]);

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
    if (!fetchedConfigs) return;

    const modifiedConfigs = fetchedConfigs
      .filter(config => formData[config.config_key] !== originalData[config.config_key])
      .map(config => ({
        config_key: config.config_key,
        config_value: formData[config.config_key],
      }));

    if (modifiedConfigs.length === 0) {
      return;
    }

    try {
      await updateMutation.mutateAsync(modifiedConfigs);

      // Update original data to reflect saved changes
      setOriginalData({ ...formData });
      
      // Show success flash
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings');
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
      const configGroup = section.configs[0]?.config_group;
      if (!configGroup) {
        throw new Error('Cannot determine config group for reset');
      }

      // Use React Query mutation
      await resetMutation.mutateAsync(configGroup);
      
      // Update form data to match reset values (React Query auto-refetches)
      if (fetchedConfigs) {
        const newFormData: Record<string, string> = {};
        const newOriginalData: Record<string, string> = {};
        
        fetchedConfigs.forEach(config => {
          newFormData[config.config_key] = config.config_value;
          newOriginalData[config.config_key] = config.config_value;
        });
        
        setFormData(newFormData);
        setOriginalData(newOriginalData);
      }
      
      // Show success flash
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

    } catch (err: any) {
      console.error('Error resetting section:', err);
      setError(err.message || 'Failed to reset section');
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
                disabled={updateMutation.isPending}
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
              disabled={updateMutation.isPending}
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
            disabled={updateMutation.isPending || !hasUnsavedChanges}
            className={`font-semibold py-2 px-4 rounded-lg transition-all ${
              saveSuccess
                ? 'bg-gradient-to-tl from-green-600 to-green-500 text-white'
                : 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white hover:shadow-lg-purple'
            }`}
          >
            {updateMutation.isPending ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'SAVE CHANGES?'}
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

