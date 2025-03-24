import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

type TeamTemplate = {
  template_id: number;
  team_size: number;
  name: string;
  defenders: number;
  midfielders: number;
  attackers: number;
  is_default: boolean;
};

const TeamTemplates = () => {
  const [templates, setTemplates] = useState<TeamTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState<number | null>(null);
  const [defaultTeamSize, setDefaultTeamSize] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<number, {
    defenders: number;
    midfielders: number;
    attackers: number;
  }>>({});
  const [resetConfirmation, setResetConfirmation] = useState<{
    isOpen: boolean;
    templateId: number | null;
  }>({ isOpen: false, templateId: null });

  // Fetch templates and default team size on component mount
  useEffect(() => {
    fetchTemplates();
    fetchDefaultTeamSize();
  }, []);

  const fetchDefaultTeamSize = async () => {
    try {
      const response = await fetch('/api/admin/app-config?group=match_settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const defaultSizeSetting = data.data.find((config: any) => 
            config.config_key === 'default_team_size'
          );
          if (defaultSizeSetting) {
            setDefaultTeamSize(parseInt(defaultSizeSetting.config_value));
          }
        }
      }
    } catch (err) {
      console.error('Error fetching default team size:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/team-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch team templates');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch team templates');
      }
      
      // Sort templates by team size
      const sortedTemplates = data.data
        .sort((a: TeamTemplate, b: TeamTemplate) => a.team_size - b.team_size);

      setTemplates(sortedTemplates);
      
      // Initialize form data
      const initialFormData: Record<number, any> = {};
      sortedTemplates.forEach((template: TeamTemplate) => {
        initialFormData[template.template_id] = {
          defenders: template.defenders,
          midfielders: template.midfielders,
          attackers: template.attackers
        };
      });
      setFormData(initialFormData);
    } catch (err: any) {
      console.error('Error fetching team templates:', err);
      setError(err.message || 'Failed to fetch team templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    templateId: number, 
    field: 'defenders' | 'midfielders' | 'attackers', 
    value: number
  ) => {
    setFormData(prev => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [field]: value
      }
    }));
  };

  const validateForm = (templateId: number) => {
    const template = templates.find(t => t.template_id === templateId);
    if (!template) return false;
    
    const { defenders, midfielders, attackers } = formData[templateId];
    const totalPlayers = defenders + midfielders + attackers;
    
    if (totalPlayers !== template.team_size) {
      setError(`Total players (${totalPlayers}) does not match team size (${template.team_size})`);
      return false;
    }
    
    return true;
  };

  const handleSave = async (templateId: number) => {
    if (!validateForm(templateId)) return;
    
    try {
      setIsSaving(templateId);
      setError(null);
      setSuccessMessage(null);
      
      const template = templates.find(t => t.template_id === templateId);
      if (!template) return;
      
      const response = await fetch('/api/admin/team-templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: templateId,
          defenders: formData[templateId].defenders,
          midfielders: formData[templateId].midfielders,
          attackers: formData[templateId].attackers
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update ${template.team_size}-a-side template`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || `Failed to update ${template.team_size}-a-side template`);
      }
      
      // Update templates
      setTemplates(prev => prev.map(t => 
        t.template_id === templateId 
          ? { 
              ...t, 
              defenders: formData[templateId].defenders,
              midfielders: formData[templateId].midfielders,
              attackers: formData[templateId].attackers
            } 
          : t
      ));
      
      setEditingTemplateId(null);
      setSuccessMessage(`${template.team_size}-a-side template updated successfully`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error updating team template:', err);
      setError(err.message || 'Failed to update team template');
    } finally {
      setIsSaving(null);
    }
  };

  const openResetConfirmation = (templateId: number) => {
    setResetConfirmation({
      isOpen: true,
      templateId
    });
  };

  const closeResetConfirmation = () => {
    setResetConfirmation({
      isOpen: false,
      templateId: null
    });
  };

  const handleResetToDefault = async () => {
    if (!resetConfirmation.templateId) return;
    
    const templateId = resetConfirmation.templateId;
    
    try {
      setIsResetting(templateId);
      setError(null);
      setSuccessMessage(null);
      
      const template = templates.find(t => t.template_id === templateId);
      if (!template) return;
      
      const response = await fetch(`/api/admin/team-templates/reset?templateId=${templateId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reset ${template.team_size}-a-side template`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || `Failed to reset ${template.team_size}-a-side template`);
      }
      
      // Update templates and form data
      const updatedTemplate = data.data;
      
      setTemplates(prev => prev.map(t => 
        t.template_id === templateId ? updatedTemplate : t
      ));
      
      setFormData(prev => ({
        ...prev,
        [templateId]: {
          defenders: updatedTemplate.defenders,
          midfielders: updatedTemplate.midfielders,
          attackers: updatedTemplate.attackers
        }
      }));
      
      setEditingTemplateId(null);
      setSuccessMessage(`${template.team_size}-a-side template reset to defaults`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error resetting team template:', err);
      setError(err.message || 'Failed to reset team template');
    } finally {
      setIsResetting(null);
      closeResetConfirmation();
    }
  };

  const cancelEdit = (templateId: number) => {
    const template = templates.find(t => t.template_id === templateId);
    if (!template) return;
    
    setFormData(prev => ({
      ...prev,
      [templateId]: {
        defenders: template.defenders,
        midfielders: template.midfielders,
        attackers: template.attackers
      }
    }));
    
    setEditingTemplateId(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Team Templates</h1>
      </div>
      
      {isLoading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
          Loading team templates...
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4 text-red-700">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-4 text-green-700">
          {successMessage}
        </div>
      )}

      <p className="mb-6 text-gray-600">
        Manage team formations by adjusting the number of players in each position. 
        The total number of players must match the team size.
        {defaultTeamSize && (
          <span className="block mt-2">
            The default team size for new matches is currently set to <strong>{defaultTeamSize}-a-side</strong> and can be changed in App Configuration.
          </span>
        )}
      </p>
      
      {!isLoading && (
        <Card
          title="Team Templates"
          icon={null}
          footer={null}
        >
          <p className="text-sm text-gray-600 mb-4">
            Recommended: Keep the default values, which have been tested and proven effective over many games.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Size
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Defenders
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Midfielders
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attackers
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map(template => (
                  <tr key={template.template_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {template.team_size}-a-side
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingTemplateId === template.template_id ? (
                        <input
                          type="number"
                          min="0"
                          max={template.team_size}
                          value={formData[template.template_id]?.defenders || 0}
                          onChange={(e) => handleInputChange(
                            template.template_id, 
                            'defenders', 
                            parseInt(e.target.value) || 0
                          )}
                          className="w-16 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      ) : (
                        template.defenders
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingTemplateId === template.template_id ? (
                        <input
                          type="number"
                          min="0"
                          max={template.team_size}
                          value={formData[template.template_id]?.midfielders || 0}
                          onChange={(e) => handleInputChange(
                            template.template_id, 
                            'midfielders', 
                            parseInt(e.target.value) || 0
                          )}
                          className="w-16 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      ) : (
                        template.midfielders
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingTemplateId === template.template_id ? (
                        <input
                          type="number"
                          min="0"
                          max={template.team_size}
                          value={formData[template.template_id]?.attackers || 0}
                          onChange={(e) => handleInputChange(
                            template.template_id, 
                            'attackers', 
                            parseInt(e.target.value) || 0
                          )}
                          className="w-16 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                      ) : (
                        template.attackers
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingTemplateId === template.template_id ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => openResetConfirmation(template.template_id)}
                            disabled={isResetting === template.template_id}
                            variant="outline"
                            className="text-xs"
                          >
                            {isResetting === template.template_id ? 'Resetting...' : 'Reset to Default'}
                          </Button>
                          <Button
                            onClick={() => cancelEdit(template.template_id)}
                            variant="outline"
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleSave(template.template_id)}
                            disabled={isSaving === template.template_id}
                            variant="primary"
                            className="text-xs"
                          >
                            {isSaving === template.template_id ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setEditingTemplateId(template.template_id)}
                          variant="primary"
                          className="text-xs"
                        >
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Reset Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={resetConfirmation.isOpen}
        title="Reset to Default"
        message="Are you sure you want to reset this template to its default values? This action cannot be undone."
        confirmText="Reset"
        cancelText="Cancel"
        onConfirm={handleResetToDefault}
        onCancel={closeResetConfirmation}
        isConfirming={isResetting !== null}
      />
    </div>
  );
};

export default TeamTemplates; 