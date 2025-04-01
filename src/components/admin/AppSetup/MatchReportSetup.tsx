import React, { useState, useEffect } from 'react';
import { Button, Card, ConfirmationModal } from '@/components/ui-kit';

interface MatchReportSetting {
  id: number;
  key: string;
  name: string;
  value: string;
  description: string;
  min?: number;
}

interface Toast {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

const MatchReportSetup: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [settings, setSettings] = useState<MatchReportSetting[]>([]);
  const [originalSettings, setOriginalSettings] = useState<MatchReportSetting[]>([]);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState<boolean>(false);
  const [toast, setToast] = useState<Toast>({ show: false, message: '', type: 'success' });
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  useEffect(() => {
    // Check if values have changed
    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setIsDirty(settingsChanged);
  }, [settings, originalSettings]);

  // Show toast notification
  const showToast = (message: string, type: Toast['type'] = 'success'): void => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchSettings = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/match-report-settings');
      
      if (!response.ok) throw new Error('Failed to fetch match report settings');
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
        setOriginalSettings(data.data);
      }
    } catch (error) {
      console.error('Error fetching match report settings:', error);
      showToast('Failed to load match report settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = (id: number, value: string): void => {
    setSettings(prev => 
      prev.map(setting => 
        setting.id === id ? { ...setting, value } : setting
      )
    );
  };

  const saveSettings = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/admin/match-report-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings })
      });
      
      if (!response.ok) throw new Error('Failed to update match report settings');
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Match report settings updated successfully');
        setOriginalSettings([...settings]);
        setIsDirty(false);
      } else {
        showToast('Failed to update match report settings', 'error');
      }
    } catch (error) {
      console.error('Error updating match report settings:', error);
      showToast('Failed to update match report settings', 'error');
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
    }
  };

  const resetToDefaults = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/admin/match-report-settings/reset', {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to reset match report settings');
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Match report settings reset to defaults');
        setSettings(data.data);
        setOriginalSettings(data.data);
        setIsDirty(false);
      } else {
        showToast('Failed to reset match report settings', 'error');
      }
    } catch (error) {
      console.error('Error resetting match report settings:', error);
      showToast('Failed to reset match report settings', 'error');
    } finally {
      setIsLoading(false);
      setShowResetConfirmation(false);
    }
  };
  
  return (
    <Card>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-neutral-800">Match Report Settings</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowResetConfirmation(true)}
            variant="secondary"
            disabled={isLoading}
          >
            Reset to Default
          </Button>
          <Button
            onClick={() => setShowConfirmation(true)}
            disabled={isLoading || !isDirty}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {toast.show && (
        <div className={`mb-4 p-3 rounded-md ${toast.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {toast.message}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-md text-sm text-blue-700">
          <div className="font-medium mb-1">Information</div>
          <p>
            These settings control what appears in the "Stat Dive" section of match reports.
            Changing these values will affect how streaks and milestones are highlighted in future match reports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settings.map(setting => (
            <div key={setting.id}>
              <h3 className="text-md font-medium text-neutral-700 mb-3">{setting.name}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    {setting.name}
                  </label>
                  <input
                    type="number"
                    name={setting.key}
                    value={setting.value}
                    onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                    className="w-full rounded-md border-neutral-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    disabled={isLoading}
                    min={setting.min}
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    {setting.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Confirmation Modal */}
      {showConfirmation && (
        <ConfirmationModal
          isOpen={showConfirmation}
          title="Update Match Report Settings?"
          message="Changing these values will affect how streaks and milestones are highlighted in future match reports. Are you sure you want to update these settings?"
          confirmText="Update Settings"
          cancelText="Cancel"
          onConfirm={saveSettings}
          onClose={() => setShowConfirmation(false)}
          isConfirming={isLoading}
        />
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirmation && (
        <ConfirmationModal
          isOpen={showResetConfirmation}
          title="Reset to Defaults"
          message="Are you sure you want to reset all match report settings to their default values?"
          confirmText="Reset to Defaults"
          cancelText="Cancel"
          onConfirm={resetToDefaults}
          onClose={() => setShowResetConfirmation(false)}
          isConfirming={isLoading}
          confirmButtonClass="bg-red-500 hover:bg-red-600"
        />
      )}
    </Card>
  );
};

export default MatchReportSetup; 