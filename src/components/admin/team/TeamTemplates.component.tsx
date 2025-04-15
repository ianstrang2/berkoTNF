import React, { useState, useEffect } from 'react';
import { Card, Button, ConfirmationDialog } from '@/components/ui-kit';

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
    <div className="w-full">
      {isLoading && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-6 text-slate-700 shadow-soft-sm">
          <div className="flex items-center">
            <div className="mr-3">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em]" role="status"></div>
            </div>
            <span>Loading team templates...</span>
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

      {!isLoading && (
        <>
          <div className="border-black/12.5 border-b-0 border-solid pb-0">
            <h5 className="mb-2 font-bold text-slate-700">Team Templates</h5>
            <p className="text-sm text-slate-500 mb-2">
              Manage team formations by adjusting the number of players in each position. 
              The total number of players must match the team size.
              {defaultTeamSize && (
                <span className="block mt-2">
                  The default team size for new matches is currently set to <strong>{defaultTeamSize}-a-side</strong> and can be changed in App Configuration.
                </span>
              )}
            </p>
            <p className="mt-2 mb-4 text-sm text-slate-500">
              Recommended: Keep the default values, which have been tested and proven effective over many games.
            </p>
          </div>
          <div className="pt-0">
            <div className="overflow-x-auto">
              <table className="items-center w-full mb-0 align-top border-slate-200 text-slate-500">
                <thead className="align-bottom">
                  <tr>
                    <th className="px-6 py-3 font-bold uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">
                      Team Size
                    </th>
                    <th className="px-6 py-3 font-bold uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">
                      Defenders
                    </th>
                    <th className="px-6 py-3 font-bold uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">
                      Midfielders
                    </th>
                    <th className="px-6 py-3 font-bold uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">
                      Attackers
                    </th>
                    <th className="px-6 py-3 font-bold text-right uppercase align-middle bg-transparent border-b border-gray-200 border-solid shadow-none text-xxs tracking-none whitespace-nowrap text-slate-400 opacity-70">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map(template => (
                    <tr key={template.template_id}>
                      <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
                        <p className="mb-0 font-semibold leading-normal text-sm">{template.team_size}-a-side</p>
                      </td>
                      <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
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
                            className="w-16 rounded-lg border-slate-200 shadow-soft-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                          />
                        ) : (
                          <span className="font-normal leading-normal text-sm">{template.defenders}</span>
                        )}
                      </td>
                      <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
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
                            className="w-16 rounded-lg border-slate-200 shadow-soft-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                          />
                        ) : (
                          <span className="font-normal leading-normal text-sm">{template.midfielders}</span>
                        )}
                      </td>
                      <td className="p-2 align-middle bg-transparent border-b whitespace-nowrap">
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
                            className="w-16 rounded-lg border-slate-200 shadow-soft-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                          />
                        ) : (
                          <span className="font-normal leading-normal text-sm">{template.attackers}</span>
                        )}
                      </td>
                      <td className="p-2 text-right align-middle bg-transparent border-b whitespace-nowrap">
                        {editingTemplateId === template.template_id ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              onClick={() => openResetConfirmation(template.template_id)}
                              disabled={isResetting === template.template_id}
                              variant="outline"
                              size="sm"
                              className="text-slate-700 border-slate-200 hover:bg-slate-100"
                            >
                              {isResetting === template.template_id ? 'Resetting...' : 'Reset'}
                            </Button>
                            <Button
                              onClick={() => cancelEdit(template.template_id)}
                              variant="outline"
                              size="sm"
                              className="text-slate-700 border-slate-200 hover:bg-slate-100"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleSave(template.template_id)}
                              disabled={isSaving === template.template_id}
                              variant="primary"
                              size="sm"
                              className="bg-gradient-to-tl from-purple-700 to-pink-500 hover:shadow-lg-purple shadow-soft-md"
                            >
                              {isSaving === template.template_id ? 'Saving...' : 'Save'}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setEditingTemplateId(template.template_id)}
                            variant="primary"
                            size="sm"
                            className="bg-gradient-to-tl from-purple-700 to-pink-500 hover:shadow-lg-purple shadow-soft-md inline-flex visibility-visible opacity-100"
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
          </div>
        </>
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