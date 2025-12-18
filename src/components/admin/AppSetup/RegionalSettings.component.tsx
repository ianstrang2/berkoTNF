'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui-kit/Card.component';
import Button from '@/components/ui-kit/Button.component';
import SoftUIConfirmationModal from '@/components/ui-kit/SoftUIConfirmationModal.component';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { apiFetch } from '@/lib/apiConfig';

interface RegionalData {
  country: string;
  timezone: string;
  locale: string;
  currency: string;
}

// Country presets with auto-suggested defaults
const COUNTRY_PRESETS: Record<string, { timezone: string; locale: string; currency: string; label: string }> = {
  GB: { timezone: 'Europe/London', locale: 'en-GB', currency: 'GBP', label: 'United Kingdom' },
  US: { timezone: 'America/New_York', locale: 'en-US', currency: 'USD', label: 'United States' },
  IE: { timezone: 'Europe/Dublin', locale: 'en-IE', currency: 'EUR', label: 'Ireland' },
  DE: { timezone: 'Europe/Berlin', locale: 'de-DE', currency: 'EUR', label: 'Germany' },
  FR: { timezone: 'Europe/Paris', locale: 'fr-FR', currency: 'EUR', label: 'France' },
  ES: { timezone: 'Europe/Madrid', locale: 'es-ES', currency: 'EUR', label: 'Spain' },
  IT: { timezone: 'Europe/Rome', locale: 'it-IT', currency: 'EUR', label: 'Italy' },
  NL: { timezone: 'Europe/Amsterdam', locale: 'nl-NL', currency: 'EUR', label: 'Netherlands' },
  BE: { timezone: 'Europe/Brussels', locale: 'nl-BE', currency: 'EUR', label: 'Belgium' },
  PT: { timezone: 'Europe/Lisbon', locale: 'pt-PT', currency: 'EUR', label: 'Portugal' },
  AU: { timezone: 'Australia/Sydney', locale: 'en-AU', currency: 'AUD', label: 'Australia' },
  CA: { timezone: 'America/Toronto', locale: 'en-CA', currency: 'CAD', label: 'Canada' },
  NZ: { timezone: 'Pacific/Auckland', locale: 'en-NZ', currency: 'NZD', label: 'New Zealand' },
  SG: { timezone: 'Asia/Singapore', locale: 'en-SG', currency: 'SGD', label: 'Singapore' },
  AE: { timezone: 'Asia/Dubai', locale: 'en-AE', currency: 'AED', label: 'United Arab Emirates' },
  ZA: { timezone: 'Africa/Johannesburg', locale: 'en-ZA', currency: 'ZAR', label: 'South Africa' },
  JP: { timezone: 'Asia/Tokyo', locale: 'ja-JP', currency: 'JPY', label: 'Japan' },
  BR: { timezone: 'America/Sao_Paulo', locale: 'pt-BR', currency: 'BRL', label: 'Brazil' },
  MX: { timezone: 'America/Mexico_City', locale: 'es-MX', currency: 'MXN', label: 'Mexico' },
  IN: { timezone: 'Asia/Kolkata', locale: 'en-IN', currency: 'INR', label: 'India' },
};

// Common timezone options (grouped by region)
const TIMEZONE_OPTIONS = [
  { group: 'Europe', options: [
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Dublin', label: 'Dublin (GMT/IST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
    { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
    { value: 'Europe/Brussels', label: 'Brussels (CET/CEST)' },
    { value: 'Europe/Lisbon', label: 'Lisbon (WET/WEST)' },
  ]},
  { group: 'Americas', options: [
    { value: 'America/New_York', label: 'New York (EST/EDT)' },
    { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
    { value: 'America/Denver', label: 'Denver (MST/MDT)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
    { value: 'America/Toronto', label: 'Toronto (EST/EDT)' },
    { value: 'America/Vancouver', label: 'Vancouver (PST/PDT)' },
    { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
    { value: 'America/Mexico_City', label: 'Mexico City (CST/CDT)' },
  ]},
  { group: 'Asia Pacific', options: [
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Kolkata', label: 'Mumbai/Kolkata (IST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  ]},
  { group: 'Africa', options: [
    { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
    { value: 'Africa/Cairo', label: 'Cairo (EET)' },
    { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
  ]},
];

// Currency options - shorter labels for mobile
const CURRENCY_OPTIONS = [
  { value: 'GBP', label: '£ GBP (British Pound)' },
  { value: 'EUR', label: '€ EUR (Euro)' },
  { value: 'USD', label: '$ USD (US Dollar)' },
  { value: 'CAD', label: '$ CAD (Canadian)' },
  { value: 'AUD', label: '$ AUD (Australian)' },
  { value: 'NZD', label: '$ NZD (New Zealand)' },
  { value: 'CHF', label: 'CHF (Swiss Franc)' },
  { value: 'SEK', label: 'SEK (Swedish)' },
  { value: 'NOK', label: 'NOK (Norwegian)' },
  { value: 'DKK', label: 'DKK (Danish)' },
  { value: 'SGD', label: '$ SGD (Singapore)' },
  { value: 'AED', label: 'AED (UAE Dirham)' },
  { value: 'ZAR', label: 'ZAR (South African)' },
  { value: 'JPY', label: '¥ JPY (Japanese Yen)' },
  { value: 'BRL', label: 'R$ BRL (Brazilian)' },
  { value: 'MXN', label: '$ MXN (Mexican)' },
  { value: 'INR', label: '₹ INR (Indian Rupee)' },
];

// Shared select styles for mobile-friendly dropdowns
const selectClassName = "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white shadow-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-slate-50 disabled:text-slate-400 appearance-none cursor-pointer";

const RegionalSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  
  const [formData, setFormData] = useState<RegionalData>({
    country: 'GB',
    timezone: 'Europe/London',
    locale: 'en-GB',
    currency: 'GBP',
  });
  const [originalData, setOriginalData] = useState<RegionalData>({
    country: 'GB',
    timezone: 'Europe/London',
    locale: 'en-GB',
    currency: 'GBP',
  });
  
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showChangeWarning, setShowChangeWarning] = useState<boolean>(false);
  const [pendingSave, setPendingSave] = useState<boolean>(false);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = Object.keys(formData).some(
      key => formData[key as keyof RegionalData] !== originalData[key as keyof RegionalData]
    );
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
      
      const response = await apiFetch('/admin/regional-settings');
      
      if (!response.ok) throw new Error('Failed to fetch regional settings');
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const settings = {
          country: data.data.country || 'GB',
          timezone: data.data.timezone || 'Europe/London',
          locale: data.data.locale || 'en-GB',
          currency: data.data.currency || 'GBP',
        };
        setFormData(settings);
        setOriginalData(settings);
      }
    } catch (err) {
      console.error('Error fetching regional settings:', err);
      setError('Failed to load regional settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCountryChange = (newCountry: string) => {
    const preset = COUNTRY_PRESETS[newCountry];
    if (preset) {
      // Auto-suggest defaults when country changes
      setFormData({
        country: newCountry,
        timezone: preset.timezone,
        locale: preset.locale,
        currency: preset.currency,
      });
    } else {
      setFormData(prev => ({ ...prev, country: newCountry }));
    }
  };

  const handleFieldChange = (field: keyof RegionalData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const checkForSignificantChanges = (): boolean => {
    // Check if timezone or currency changed (these affect existing data display)
    return formData.timezone !== originalData.timezone || 
           formData.currency !== originalData.currency;
  };

  const handleSaveClick = () => {
    if (checkForSignificantChanges()) {
      setShowChangeWarning(true);
    } else {
      handleSaveAll();
    }
  };

  const handleSaveAll = async () => {
    setShowChangeWarning(false);
    
    try {
      setIsSaving(true);
      setError(null);
      
      const response = await apiFetch('/admin/regional-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save regional settings');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setOriginalData({ ...formData });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (err: any) {
      console.error('Error saving regional settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-slate-600">Loading regional settings...</div>;
  }

  if (error && !formData.country) {
    return <div className="p-4 text-red-600 bg-red-50 rounded-md">{error}</div>;
  }

  return (
    <div className="w-full">
      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Config Section */}
      <div className="space-y-3">
        <Card className="shadow-soft-md rounded-xl bg-white overflow-hidden">
          {/* Section Header - Collapsible */}
          <div className="w-full flex items-center justify-between p-4 border-b border-slate-100 group">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 flex-grow text-left hover:opacity-70 transition-opacity"
            >
              <h3 className="text-base font-semibold text-slate-700">Regional Settings</h3>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>

          {/* Section Content - Mobile-friendly stacked layout */}
          {isExpanded && (
            <div className="p-4 space-y-4">
              {/* Country */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Country
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  disabled={isSaving}
                  className={selectClassName}
                >
                  {Object.entries(COUNTRY_PRESETS).map(([code, { label }]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Timezone */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => handleFieldChange('timezone', e.target.value)}
                  disabled={isSaving}
                  className={selectClassName}
                >
                  {TIMEZONE_OPTIONS.map(group => (
                    <optgroup key={group.group} label={group.group}>
                      {group.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Currency */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleFieldChange('currency', e.target.value)}
                  disabled={isSaving}
                  className={selectClassName}
                >
                  {CURRENCY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Date Format */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Date Format
                </label>
                <select
                  value={formData.locale}
                  onChange={(e) => handleFieldChange('locale', e.target.value)}
                  disabled={isSaving}
                  className={selectClassName}
                >
                  <option value="en-GB">DD/MM/YYYY (UK)</option>
                  <option value="en-US">MM/DD/YYYY (US)</option>
                  <option value="en-AU">DD/MM/YYYY (Australia)</option>
                  <option value="en-CA">YYYY-MM-DD (Canada)</option>
                  <option value="en-IE">DD/MM/YYYY (Ireland)</option>
                  <option value="en-NZ">DD/MM/YYYY (New Zealand)</option>
                  <option value="de-DE">DD.MM.YYYY (Germany)</option>
                  <option value="fr-FR">DD/MM/YYYY (France)</option>
                  <option value="es-ES">DD/MM/YYYY (Spain)</option>
                  <option value="it-IT">DD/MM/YYYY (Italy)</option>
                  <option value="nl-NL">DD-MM-YYYY (Netherlands)</option>
                  <option value="pt-PT">DD/MM/YYYY (Portugal)</option>
                  <option value="pt-BR">DD/MM/YYYY (Brazil)</option>
                  <option value="ja-JP">YYYY/MM/DD (Japan)</option>
                </select>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Floating Save Button */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white rounded-full shadow-soft-xl px-2 py-2 border border-slate-200">
          <Button
            onClick={handleSaveClick}
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

      {/* Change Warning Modal */}
      <SoftUIConfirmationModal
        isOpen={showChangeWarning}
        onClose={() => setShowChangeWarning(false)}
        onConfirm={handleSaveAll}
        title="Confirm Regional Changes"
        message="Changing timezone or currency may affect how existing match times and historical data are displayed. This won't change the underlying data, only how it's shown. Are you sure you want to proceed?"
        confirmText="Save Changes"
        cancelText="Cancel"
        icon="warning"
        isConfirming={isSaving}
      />
    </div>
  );
};

export default RegionalSettings;

