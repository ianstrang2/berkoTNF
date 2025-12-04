'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Card from '@/components/ui-kit/Card.component';
import Button from '@/components/ui-kit/Button.component';
import InfoPopover from '@/components/ui-kit/InfoPopover.component';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { 
  useSuperadminConfig, 
  useUpdateSuperadminConfig, 
  SuperadminConfigData 
} from '@/hooks/queries/useSuperadminConfig.hook';

interface ConfigSection {
  id: string;
  title: string;
  configs: SuperadminConfigData[];
  isExpanded: boolean;
}

// Map section param to display_group
const SECTION_TO_GROUP: Record<string, string> = {
  stats: 'Stats',
  rsvp: 'RSVP',
  system: 'System',
};

const SuperadminSettings: React.FC = () => {
  const searchParams = useSearchParams();
  const currentSection = searchParams?.get('section') || 'stats';
  const currentGroup = SECTION_TO_GROUP[currentSection] || 'Stats';
  
  // Fetch config data
  const { data: fetchedConfigs, isLoading, error: fetchError } = useSuperadminConfig();
  const updateMutation = useUpdateSuperadminConfig();
  
  const [configSections, setConfigSections] = useState<ConfigSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [originalData, setOriginalData] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Memoize filtered configs to prevent infinite loops
  const filteredConfigs = useMemo(() => {
    return fetchedConfigs?.filter(c => c.display_group === currentGroup) || [];
  }, [fetchedConfigs, currentGroup]);

  // Check for unsaved changes - memoized to prevent loops
  const hasUnsavedChanges = useMemo(() => {
    return filteredConfigs.some(config => 
      formData[config.config_key] !== originalData[config.config_key]
    );
  }, [formData, originalData, filteredConfigs]);

  // Process fetched data when it changes
  useEffect(() => {
    if (filteredConfigs.length === 0) return;
    
    const initialFormData: Record<string, string> = {};
    filteredConfigs.forEach(config => {
      initialFormData[config.config_key] = config.config_value;
    });
    
    setFormData(prev => {
      const hasChanges = Object.keys(initialFormData).some(
        key => prev[key] !== initialFormData[key]
      );
      if (!hasChanges && Object.keys(prev).length > 0) return prev;
      return { ...prev, ...initialFormData };
    });
    
    setOriginalData(prev => {
      const hasChanges = Object.keys(initialFormData).some(
        key => prev[key] !== initialFormData[key]
      );
      if (!hasChanges && Object.keys(prev).length > 0) return prev;
      return { ...prev, ...initialFormData };
    });

    const sectionsArray: ConfigSection[] = [{
      id: currentGroup,
      title: currentGroup,
      configs: [...filteredConfigs].sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999)),
      isExpanded: true,
    }];
      
    setConfigSections(sectionsArray);
  }, [filteredConfigs, currentGroup]);

  // Set error from fetch if any
  useEffect(() => {
    if (fetchError) {
      setError((fetchError as Error).message || 'Failed to fetch configuration settings');
    }
  }, [fetchError]);

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
    const modifiedConfigs = filteredConfigs
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

      const newOriginal = { ...originalData };
      modifiedConfigs.forEach(({ config_key, config_value }) => {
        newOriginal[config_key] = config_value;
      });
      setOriginalData(newOriginal);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings');
    }
  };

  // Determine input type based on config key and value
  const getInputType = (config: SuperadminConfigData): 'number' | 'text' | 'checkbox' => {
    const key = config.config_key;
    const value = config.config_value;
    
    if (key.includes('enabled') || value === 'true' || value === 'false') {
      return 'checkbox';
    }
    
    if (value.includes(',') || key.includes('hours_before')) {
      return 'text';
    }
    
    if (key.includes('minutes') || 
        key.includes('hours') || 
        key.includes('weight') || 
        key.includes('min_') ||
        key.includes('ttl')) {
      return 'number';
    }
    
    return 'text';
  };

  const renderConfigItem = (config: SuperadminConfigData) => {
    const currentValue = formData[config.config_key] || '';
    const inputType = getInputType(config);

    return (
      <div key={config.config_key} className="flex items-center py-3 border-b border-slate-100 last:border-0">
        <div className="flex-grow flex items-center min-w-0">
          <span className="text-sm font-medium text-slate-700">
            {config.display_name}
          </span>
          {config.config_description && (
            <InfoPopover content={config.config_description} />
          )}
        </div>
        
        <div className="flex-shrink-0 ml-4">
          {inputType === 'checkbox' ? (
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
              type={inputType}
              name={config.config_key}
              value={currentValue}
              onChange={handleInputChange}
              className={`w-24 ${inputType === 'text' ? 'text-left' : 'text-right'} px-2 py-1.5 text-sm rounded-md border border-slate-300 shadow-sm focus:ring-purple-500 focus:border-purple-500 disabled:bg-slate-50 disabled:text-slate-400`}
              disabled={updateMutation.isPending}
              step={config.config_key.includes('weight') ? '0.1' : '1'}
            />
          )}
        </div>
      </div>
    );
  };

  const sectionHasConfigs = filteredConfigs.length > 0;

  if (isLoading) {
    return (
      <div className="p-4 text-center text-slate-600">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-2">Loading configuration...</p>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-600 bg-red-50 rounded-md">{error}</div>;
  }

  return (
    <div className="w-full">
      {/* Config Sections */}
      {!sectionHasConfigs ? (
        <Card className="shadow-soft-md rounded-xl bg-white p-8 text-center">
          <div className="text-4xl mb-3">⚙️</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Settings Yet</h3>
          <p className="text-sm text-slate-500">
            {currentGroup} settings will appear here once configured.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {configSections.map(section => (
            <Card key={section.id} className="shadow-soft-md rounded-xl bg-white overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <h3 className="text-base font-semibold text-slate-700">{section.title}</h3>
                {section.isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Section Content */}
              {section.isExpanded && (
                <div className="px-4 pb-4">
                  {section.configs.map(renderConfigItem)}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

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
    </div>
  );
};

export default SuperadminSettings;
