import React, { useState } from 'react';
import Button from '@/components/ui-kit/Button';

interface PlayerFormData {
  name: string;
  is_ringer: boolean;
  is_retired: boolean;
  goalscoring: number;
  defending: number;
  stamina_pace: number;
  control: number;
  teamwork: number;
  resilience: number;
}

interface AttributeTooltipProps {
  attribute: string;
  description: string;
}

interface PlayerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (playerData: PlayerFormData) => Promise<void>;
  isProcessing: boolean;
  initialData?: Partial<PlayerFormData>;
  title?: string;
  submitButtonText?: string;
}

const attributeDescriptions: Record<string, string> = {
  goalscoring: "Ability to score goals and finish chances",
  defending: "Defensive capabilities - tackling, marking, positioning",
  stamina_pace: "Physical attributes - endurance, speed, acceleration",
  control: "Ball control, passing, and technical ability",
  teamwork: "Ability to work with teammates, positional awareness",
  resilience: "Mental strength, reliability, consistency",
  is_ringer: "Ringers are players who don't appear in the stats"
};

const AttributeTooltip: React.FC<AttributeTooltipProps> = ({ attribute, description }) => {
  return (
    <div className="absolute z-10 right-0 top-0 mt-6 w-64 px-3 py-2 bg-neutral-800 text-white text-xs rounded shadow-lg">
      <p className="font-semibold mb-1">{attribute}</p>
      <p>{description}</p>
    </div>
  );
};

const PlayerFormModal: React.FC<PlayerFormModalProps> = ({ 
  isOpen,
  onClose,
  onSubmit,
  isProcessing,
  initialData,
  title = "Add Player",
  submitButtonText = "Create Player"
}) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<PlayerFormData>({
    name: initialData?.name || '',
    is_ringer: initialData?.is_ringer !== undefined ? initialData.is_ringer : true,
    is_retired: initialData?.is_retired || false,
    goalscoring: initialData?.goalscoring || 3,
    defending: initialData?.defending || 3,
    stamina_pace: initialData?.stamina_pace || 3,
    control: initialData?.control || 3,
    teamwork: initialData?.teamwork || 3,
    resilience: initialData?.resilience || 3
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await onSubmit(formData);
      // Reset form after submission
      setFormData({
        name: '',
        is_ringer: true,
        is_retired: false,
        goalscoring: 3,
        defending: 3,
        stamina_pace: 3,
        control: 3,
        teamwork: 3,
        resilience: 3
      });
    } catch (error) {
      console.error('Error submitting player form:', error);
    }
  };

  const attributeFields = [
    { key: 'goalscoring', label: 'Goalscoring' },
    { key: 'defending', label: 'Defending' },
    { key: 'stamina_pace', label: 'Stamina/Pace' },
    { key: 'control', label: 'Ball Control' },
    { key: 'teamwork', label: 'Teamwork' },
    { key: 'resilience', label: 'Resilience' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-1">Player Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter player name"
              required
            />
          </div>
          
          <div className="mb-4">
            <div className="flex items-center relative">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_ringer}
                  onChange={(e) => setFormData({ ...formData, is_ringer: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-2"
                />
                <span className="text-gray-700">Ringer</span>
              </label>
              <button
                type="button"
                className="ml-2 text-gray-400 hover:text-gray-600"
                onMouseEnter={() => setActiveTooltip('is_ringer')}
                onMouseLeave={() => setActiveTooltip(null)}
                onClick={() => setActiveTooltip(activeTooltip === 'is_ringer' ? null : 'is_ringer')}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </button>
              {activeTooltip === 'is_ringer' && (
                <AttributeTooltip 
                  attribute="Ringer" 
                  description={attributeDescriptions.is_ringer}
                />
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {attributeFields.map(({ key, label }) => (
              <div key={key} className="mb-2 relative">
                <div className="flex items-center">
                  <label className="block text-gray-700 mb-1">
                    {label}
                  </label>
                  <button
                    type="button"
                    className="ml-2 text-gray-400 hover:text-gray-600"
                    onMouseEnter={() => setActiveTooltip(key)}
                    onMouseLeave={() => setActiveTooltip(null)}
                    onClick={() => setActiveTooltip(activeTooltip === key ? null : key)}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {activeTooltip === key && (
                    <AttributeTooltip 
                      attribute={label} 
                      description={attributeDescriptions[key as keyof typeof attributeDescriptions]}
                    />
                  )}
                </div>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={formData[key as keyof PlayerFormData] as number}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      [key]: parseFloat(e.target.value) 
                    })}
                    className="w-full"
                  />
                  <span className="ml-2 w-10 text-center">
                    {formData[key as keyof PlayerFormData]}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800 transition-colors"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlayerFormModal; 