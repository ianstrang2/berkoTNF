import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const TeamTemplatesSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Form state for editing template
  const [formData, setFormData] = useState({
    template_id: null,
    team_size: '',
    name: '',
    description: '',
    team_a_name: 'Orange',
    team_b_name: 'Green',
    defenders_per_team: '',
    midfielders_per_team: '',
    attackers_per_team: '',
    is_default: false,
    balanceWeights: []
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/team-templates');
      
      if (!response.ok) throw new Error('Failed to fetch team templates');
      
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Error fetching team templates:', error);
      toast.error('Failed to load team templates');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplateDetails = async (templateId) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/team-templates?templateId=${templateId}`);
      
      if (!response.ok) throw new Error('Failed to fetch template details');
      
      const data = await response.json();
      
      if (data.success) {
        setSelectedTemplate(data.data);
        
        // Initialize form data with the selected template
        setFormData({
          template_id: data.data.template_id,
          team_size: data.data.team_size,
          name: data.data.name,
          description: data.data.description,
          team_a_name: data.data.team_a_name,
          team_b_name: data.data.team_b_name,
          defenders_per_team: data.data.defenders_per_team,
          midfielders_per_team: data.data.midfielders_per_team,
          attackers_per_team: data.data.attackers_per_team,
          is_default: data.data.is_default,
          balanceWeights: data.data.balanceWeights || []
        });
      }
    } catch (error) {
      console.error('Error fetching template details:', error);
      toast.error('Failed to load template details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (templateId) => {
    fetchTemplateDetails(templateId);
    setIsEditMode(false);
  };

  const handleCreateNew = () => {
    // Reset form data
    setFormData({
      template_id: null,
      team_size: '9',
      name: '',
      description: '',
      team_a_name: 'Orange',
      team_b_name: 'Green',
      defenders_per_team: '3',
      midfielders_per_team: '4',
      attackers_per_team: '2',
      is_default: false,
      balanceWeights: []
    });
    
    setSelectedTemplate(null);
    setIsEditMode(true);
  };

  const handleEditTemplate = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    if (selectedTemplate) {
      // Reset form data to selected template
      setFormData({
        template_id: selectedTemplate.template_id,
        team_size: selectedTemplate.team_size,
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        team_a_name: selectedTemplate.team_a_name,
        team_b_name: selectedTemplate.team_b_name,
        defenders_per_team: selectedTemplate.defenders_per_team,
        midfielders_per_team: selectedTemplate.midfielders_per_team,
        attackers_per_team: selectedTemplate.attackers_per_team,
        is_default: selectedTemplate.is_default,
        balanceWeights: selectedTemplate.balanceWeights || []
      });
    }
    setIsEditMode(false);
  };

  const handleFormInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveTemplate = async () => {
    try {
      setIsLoading(true);
      
      // Validate form data
      const totalPlayers = 
        parseInt(formData.defenders_per_team) + 
        parseInt(formData.midfielders_per_team) + 
        parseInt(formData.attackers_per_team);
      
      if (totalPlayers !== parseInt(formData.team_size)) {
        toast.error(`Total positions (${totalPlayers}) must equal team size (${formData.team_size})`);
        return;
      }
      
      // Determine if creating new or updating existing
      const isNew = !formData.template_id;
      const url = '/api/admin/team-templates';
      const method = isNew ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error(`Failed to ${isNew ? 'create' : 'update'} template`);
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Template ${isNew ? 'created' : 'updated'} successfully`);
        
        // Refresh data
        fetchTemplates();
        if (!isNew) {
          fetchTemplateDetails(formData.template_id);
        } else {
          fetchTemplateDetails(data.data.template_id);
        }
        
        setIsEditMode(false);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(`Failed to save template: ${error.message}`);
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
    }
  };

  const handleDeleteTemplate = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/admin/team-templates?templateId=${selectedTemplate.template_id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete template');
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Template deleted successfully');
        setSelectedTemplate(null);
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(`Failed to delete template: ${error.message}`);
    } finally {
      setIsLoading(false);
      setShowDeleteConfirmation(false);
    }
  };

  const handleSetDefaultTemplate = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/admin/team-templates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: selectedTemplate.template_id,
          is_default: true
        })
      });
      
      if (!response.ok) throw new Error('Failed to set template as default');
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Template set as default');
        fetchTemplates();
        fetchTemplateDetails(selectedTemplate.template_id);
      }
    } catch (error) {
      console.error('Error setting default template:', error);
      toast.error(`Failed to set default template: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const promptForSave = (action) => {
    setConfirmationAction(action);
    setShowConfirmation(true);
  };

  // Helper to determine if template positions can be saved
  const canSaveTemplate = () => {
    if (!formData.name || !formData.team_size || 
        !formData.defenders_per_team || !formData.midfielders_per_team || 
        !formData.attackers_per_team) {
      return false;
    }
    
    const totalPlayers = 
      parseInt(formData.defenders_per_team || 0) + 
      parseInt(formData.midfielders_per_team || 0) + 
      parseInt(formData.attackers_per_team || 0);
    
    return totalPlayers === parseInt(formData.team_size);
  };

  // Suggested team positions based on team size
  const getSuggestedPositions = (size) => {
    const teamSizeInt = parseInt(size);
    switch(teamSizeInt) {
      case 5:
        return { defenders: 1, midfielders: 3, attackers: 1 };
      case 6:
        return { defenders: 2, midfielders: 3, attackers: 1 };
      case 7:
        return { defenders: 2, midfielders: 3, attackers: 2 };
      case 8:
        return { defenders: 3, midfielders: 3, attackers: 2 };
      case 9:
        return { defenders: 3, midfielders: 4, attackers: 2 };
      case 11:
        return { defenders: 4, midfielders: 4, attackers: 3 };
      default:
        // Balanced distribution for other team sizes
        const defenders = Math.floor(teamSizeInt * 0.3);
        const attackers = Math.floor(teamSizeInt * 0.2);
        const midfielders = teamSizeInt - defenders - attackers;
        return { defenders, midfielders, attackers };
    }
  };

  const handleTeamSizeChange = (e) => {
    const newSize = e.target.value;
    const positions = getSuggestedPositions(newSize);
    
    setFormData(prev => ({
      ...prev,
      team_size: newSize,
      defenders_per_team: positions.defenders.toString(),
      midfielders_per_team: positions.midfielders.toString(),
      attackers_per_team: positions.attackers.toString()
    }));
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Team Balancing Templates</h2>
        <Button
          onClick={handleCreateNew}
          variant="primary"
          disabled={isLoading}
        >
          Create New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Templates</h3>
            
            {isLoading && <p className="text-gray-500 italic">Loading templates...</p>}
            
            {!isLoading && templates.length === 0 && (
              <p className="text-gray-500">No templates found. Click "Create New Template" to add one.</p>
            )}
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {templates.map(template => (
                <div 
                  key={template.template_id}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    selectedTemplate?.template_id === template.template_id 
                      ? 'bg-primary-50 border border-primary-200' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => handleTemplateSelect(template.template_id)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{template.name}</span>
                    <span className="text-sm bg-gray-200 px-2 py-0.5 rounded-full">
                      {template.team_size}-a-side
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <span>{template.defenders_per_team} Def</span>
                    <span className="text-gray-300">|</span>
                    <span>{template.midfielders_per_team} Mid</span>
                    <span className="text-gray-300">|</span>
                    <span>{template.attackers_per_team} Att</span>
                    
                    {template.is_default && (
                      <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Template Details or Edit Form */}
        <div className="lg:col-span-2">
          <Card>
            {isEditMode ? (
              // Edit Form
              <>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-800">
                    {formData.template_id ? 'Edit Template' : 'Create New Template'}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => promptForSave('save')}
                      variant="primary"
                      disabled={isLoading || !canSaveTemplate()}
                    >
                      Save Template
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Template Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleFormInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        disabled={isLoading}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team Size *
                      </label>
                      <select
                        name="team_size"
                        value={formData.team_size}
                        onChange={handleTeamSizeChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        disabled={isLoading}
                        required
                      >
                        <option value="5">5-a-side</option>
                        <option value="6">6-a-side</option>
                        <option value="7">7-a-side</option>
                        <option value="8">8-a-side</option>
                        <option value="9">9-a-side</option>
                        <option value="11">11-a-side</option>
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleFormInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        disabled={isLoading}
                        rows={2}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team A Name
                      </label>
                      <input
                        type="text"
                        name="team_a_name"
                        value={formData.team_a_name}
                        onChange={handleFormInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team B Name
                      </label>
                      <input
                        type="text"
                        name="team_b_name"
                        value={formData.team_b_name}
                        onChange={handleFormInputChange}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <hr className="border-gray-200" />
                  
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-3">
                      Team Positions
                    </h4>
                    
                    <div className="bg-gray-50 p-3 rounded-md mb-4 text-sm">
                      <span className="font-medium">Total positions per team:</span>{' '}
                      {
                        (parseInt(formData.defenders_per_team || 0) + 
                        parseInt(formData.midfielders_per_team || 0) + 
                        parseInt(formData.attackers_per_team || 0))
                      }{' '}
                      <span className="text-gray-500">
                        (should equal team size: {formData.team_size})
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Defenders
                        </label>
                        <input
                          type="number"
                          name="defenders_per_team"
                          value={formData.defenders_per_team}
                          onChange={handleFormInputChange}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                          disabled={isLoading}
                          min="1"
                          max={formData.team_size - 2}
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Midfielders
                        </label>
                        <input
                          type="number"
                          name="midfielders_per_team"
                          value={formData.midfielders_per_team}
                          onChange={handleFormInputChange}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                          disabled={isLoading}
                          min="1"
                          max={formData.team_size - 2}
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Attackers
                        </label>
                        <input
                          type="number"
                          name="attackers_per_team"
                          value={formData.attackers_per_team}
                          onChange={handleFormInputChange}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:ring-primary-500 focus:border-primary-500"
                          disabled={isLoading}
                          min="1"
                          max={formData.team_size - 2}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_default"
                      id="is_default"
                      checked={formData.is_default}
                      onChange={handleFormInputChange}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      disabled={isLoading}
                    />
                    <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
                      Set as default template for {formData.team_size}-a-side games
                    </label>
                  </div>
                </div>
              </>
            ) : (
              // Template Details View
              selectedTemplate ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-800">
                        {selectedTemplate.name}
                      </h3>
                      <div className="text-sm text-gray-500">
                        {selectedTemplate.team_size}-a-side
                        {selectedTemplate.is_default && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!selectedTemplate.is_default && (
                        <Button
                          onClick={handleSetDefaultTemplate}
                          variant="outline"
                          disabled={isLoading}
                          className="text-green-700 border-green-300 hover:bg-green-50"
                        >
                          Set as Default
                        </Button>
                      )}
                      <Button
                        onClick={handleEditTemplate}
                        variant="outline"
                        disabled={isLoading}
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => setShowDeleteConfirmation(true)}
                        variant="outline"
                        disabled={isLoading || selectedTemplate.is_default}
                        className="text-red-700 border-red-300 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {selectedTemplate.description && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                        <p className="text-gray-700">{selectedTemplate.description}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Team Names</h4>
                        <div className="flex gap-2 items-center">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <span>{selectedTemplate.team_a_name}</span>
                          <span className="px-2 text-gray-300">vs</span>
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span>{selectedTemplate.team_b_name}</span>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Team Size</h4>
                        <p>{selectedTemplate.team_size} players per team</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Team Configuration</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 p-3 rounded-md text-center">
                          <span className="text-lg font-semibold text-gray-800">
                            {selectedTemplate.defenders_per_team}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">Defenders</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md text-center">
                          <span className="text-lg font-semibold text-gray-800">
                            {selectedTemplate.midfielders_per_team}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">Midfielders</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md text-center">
                          <span className="text-lg font-semibold text-gray-800">
                            {selectedTemplate.attackers_per_team}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">Attackers</div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Balance Algorithm</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        This template uses weighted attributes to balance teams. The algorithm will try to create teams with similar overall scores.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Select a template from the list or create a new one.</p>
                </div>
              )
            )}
          </Card>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={
          confirmationAction === 'save' ? handleSaveTemplate : null
        }
        title={`${formData.template_id ? 'Update' : 'Create'} Template?`}
        message={`Are you sure you want to ${formData.template_id ? 'update' : 'create'} this team template?${formData.is_default ? ' This will be set as the default template for ' + formData.team_size + '-a-side games.' : ''}`}
        confirmText={formData.template_id ? 'Update Template' : 'Create Template'}
        cancelText="Cancel"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDeleteTemplate}
        title="Delete Template?"
        message="Are you sure you want to delete this template? This action cannot be undone."
        confirmText="Delete Template"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default TeamTemplatesSetup; 