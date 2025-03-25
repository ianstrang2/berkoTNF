import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const MatchReportSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState([]);
  const [originalSettings, setOriginalSettings] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  useEffect(() => {
    // Check if values have changed
    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setIsDirty(settingsChanged);
  }, [settings, originalSettings]);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchSettings = async () => {
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

  const handleSettingChange = (id, value) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.id === id ? { ...setting, value } : setting
      )
    );
  };

  const saveSettings = async () => {
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

  const resetToDefaults = async () => {
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
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Match Report Settings</h2>
        <div className="flex gap-2">
          <Button
            onClick={resetToDefaults}
            variant="outline"
            disabled={isLoading}
          >
            Reset to Default
          </Button>
          <Button
            onClick={() => setShowConfirmation(true)}
            variant="primary"
            disabled={isLoading || !isDirty}
          >
            Save Changes
          </Button>
        </div>
      </div>

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
              <h3 className="text-md font-medium text-gray-700 mb-3">{setting.name}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {setting.name}
                  </label>
                  <input
                    type="number"
                    name={setting.key}
                    value={setting.value}
                    onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    disabled={isLoading}
                    min={setting.min}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {setting.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={saveSettings}
        title="Update Match Report Settings?"
        message="Changing these values will affect how streaks and milestones are highlighted in future match reports. Are you sure you want to update these settings?"
        confirmText="Update Settings"
        cancelText="Cancel"
      />

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default MatchReportSetup; 