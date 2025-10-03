import React, { useState, useEffect } from 'react';
import { PlayerFormData } from '@/types/team-algorithm.types';
import ClubSelector from './ClubSelector.component';
import { Club } from '@/types/player.types';

// Define attribute descriptions for tooltips
const attributeDescriptions: Record<string, string> = {
  isAdmin: 'Club admin with full management access. Player must have claimed profile (phone verified) first.',
  isRinger: 'Occasional players not shown in any stats',
  isRetired: 'Player who is no longer actively playing but whose historical data is preserved.',
  goalscoring: 'Ability to score goals and convert chances.',
  defending: 'Willingness to be a defender.',
  staminaPace: 'Physical attributes like running speed and stamina over 90 minutes.',
  control: 'Technical ability to control and pass the ball.',
  teamwork: 'How well the player works with teammates and supports the team.',
  resilience: 'Mental strength and consistency when under pressure.'
};

// Tooltip component for attribute descriptions
const AttributeTooltip: React.FC<{ attribute: string; description: string; onClose: () => void }> = ({ 
  attribute, 
  description,
  onClose
}) => (
  <div className="absolute z-10 mt-2 p-2 bg-white rounded-lg shadow-soft-lg border border-gray-200 w-48 text-xs text-slate-600">
    <div className="flex justify-between items-center mb-1">
      <strong className="text-slate-700">{attribute}</strong>
      <button 
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600"
        aria-label="Close tooltip"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    <p>{description}</p>
  </div>
);

interface PlayerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (playerData: PlayerFormData) => Promise<void>;
  isProcessing: boolean;
  initialData?: Partial<PlayerFormData>;
  title?: string;
  submitButtonText?: string;
}

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
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [showRoleStatus, setShowRoleStatus] = useState(!!initialData); // Expanded if editing
  const [showRatings, setShowRatings] = useState(!!initialData); // Expanded if editing
  
  const [formData, setFormData] = useState<PlayerFormData>({
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    isAdmin: initialData?.isAdmin || false,
    isRinger: initialData?.isRinger !== undefined ? initialData.isRinger : false,
    isRetired: initialData?.isRetired || false,
    goalscoring: initialData?.goalscoring || 3,
    defending: initialData?.defending || 3,
    staminaPace: initialData?.staminaPace || 3,
    control: initialData?.control || 3,
    teamwork: initialData?.teamwork || 3,
    resilience: initialData?.resilience || 3,
    club: initialData?.club || null
  });

  // Effect to update form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData?.name || '',
        phone: initialData?.phone || '',
        isAdmin: initialData?.isAdmin || false,
        isRinger: initialData?.isRinger !== undefined ? initialData.isRinger : false,
        isRetired: initialData?.isRetired || false,
        goalscoring: initialData?.goalscoring || 3,
        defending: initialData?.defending || 3,
        staminaPace: initialData?.staminaPace || 3,
        control: initialData?.control || 3,
        teamwork: initialData?.teamwork || 3,
        resilience: initialData?.resilience || 3,
        club: initialData?.club || null
      });
    }
  }, [initialData]);

  // Effect to clear nameError when formData.name changes
  useEffect(() => {
    if (nameError) {
      setNameError(null);
    }
  }, [formData.name, nameError]);

  // Toggle tooltip display
  const toggleTooltip = (key: string) => {
    setActiveTooltip(activeTooltip === key ? null : key);
  };

  if (!isOpen) return null;

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    
    // Remove spaces and check format
    const cleaned = phone.replace(/\s+/g, '');
    
    // UK number patterns: 07XXX XXXXXX or +447XXX XXXXXX or 447XXX XXXXXX
    const ukPatterns = [
      /^07\d{9}$/,           // 07123456789
      /^\+447\d{9}$/,        // +447123456789
      /^447\d{9}$/,          // 447123456789
    ];
    
    if (ukPatterns.some(pattern => pattern.test(cleaned))) {
      return true;
    }
    
    setPhoneError('Invalid UK phone number. Use format: 07XXX XXXXXX');
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null); // Clear previous errors
    setPhoneError(null);
    
    // Validate phone if provided
    if (formData.phone && !validatePhone(formData.phone)) {
      return;
    }
    
    try {
      await onSubmit(formData);
      // Reset form after submission only on success
      setFormData({
        name: '',
        phone: '',
        isAdmin: false,
        isRinger: false,
        isRetired: false,
        goalscoring: 3,
        defending: 3,
        staminaPace: 3,
        control: 3,
        teamwork: 3,
        resilience: 3,
        club: null
      });
      // On successful submission, onClose should be called by the parent component if needed.
    } catch (error: any) {
      console.error('Error submitting player form:', error);
      // Check for Supabase unique constraint violation (example error check)
      // You might need to adjust this check based on the actual error structure from Supabase
      if (error.message && error.message.includes('duplicate key value violates unique constraint')) {
        setNameError('That name already exists. Please choose a different one.');
      } else {
        // Handle other types of errors (optional, or let parent handle)
        setNameError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const attributeFields = [
    { key: 'goalscoring', label: 'GOL' },
    { key: 'defending', label: 'DEF' },
    { key: 'staminaPace', label: 'S&P' },
    { key: 'control', label: 'CTL' },
    { key: 'teamwork', label: 'TMW' },
    { key: 'resilience', label: 'RES' }
  ];

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={onClose} aria-hidden="true"></div>
        
        {/* Modal panel */}
        <div className="relative bg-white rounded-2xl max-w-md w-full mx-auto shadow-soft-xl transform transition-all p-6" onClick={(e) => e.stopPropagation()}>
          {/* Header with close button */}
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-slate-700" id="modal-title">
              {title}
            </h3>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-slate-700 text-sm font-medium mb-2">Player Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-300 text-sm"
                placeholder="Enter player name"
                maxLength={14}
                required
              />
              <div className="text-xs text-slate-500 mt-1 flex justify-between">
                <span>{nameError && <span className="text-red-500">{nameError}</span>}</span>
                <span>{formData.name.length} / 14</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-slate-700 text-sm font-medium mb-2">
                Phone Number <span className="text-slate-400 font-normal">(Recommended)</span>
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  setPhoneError(null);
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none text-sm ${
                  phoneError 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-fuchsia-300'
                }`}
                placeholder="07XXX XXXXXX or +447XXX XXXXXX"
              />
              <div className="text-xs mt-1">
                {phoneError ? (
                  <span className="text-red-500">{phoneError}</span>
                ) : (
                  <span className="text-slate-500">Needed for the player to access the app</span>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-slate-700 text-sm font-medium mb-2">Club (Optional)</label>
              <ClubSelector 
                value={formData.club as Club | null}
                onChange={(club) => setFormData({ ...formData, club: club })}
              />
            </div>

            {/* Divider */}
            <div className="my-6 border-t border-gray-200"></div>
            
            {/* Collapsible: Role & Status */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowRoleStatus(!showRoleStatus)}
                className="w-full flex items-center justify-between text-left mb-3 hover:bg-slate-50 p-2 rounded-lg transition-colors"
              >
                <h4 className="text-sm font-medium text-slate-700">Role & Status</h4>
                <svg 
                  className={`w-5 h-5 text-slate-400 transition-transform ${showRoleStatus ? 'rotate-180' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showRoleStatus && (
                <div className="space-y-3 pl-2">
                  <div className="flex items-center justify-between gap-4">
                    {/* Ringer Section */}
                    <div className="flex items-center">
                  <label htmlFor="isRinger" className="text-slate-700 text-sm font-medium mr-2">Ringer</label>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 mr-3"
                    onClick={() => toggleTooltip('isRinger')}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.isRinger}
                      onChange={(e) => setFormData({ ...formData, isRinger: e.target.checked })}
                      className="mt-0.5 rounded-10 duration-250 ease-soft-in-out after:rounded-circle after:shadow-soft-2xl after:duration-250 checked:after:translate-x-5.3 h-5 relative float-left w-10 cursor-pointer appearance-none border border-solid border-gray-200 bg-slate-800/10 bg-none bg-contain bg-left bg-no-repeat align-top transition-all after:absolute after:top-px after:h-4 after:w-4 after:translate-x-px after:bg-white after:content-[''] checked:border-slate-800/95 checked:bg-slate-800/95 checked:bg-none checked:bg-right"
                      id="isRinger"
                    />
                    {activeTooltip === 'isRinger' && (
                      <AttributeTooltip 
                        attribute="Ringer" 
                        description={attributeDescriptions.isRinger}
                        onClose={() => setActiveTooltip(null)}
                      />
                    )}
                  </div>
                </div>

                {/* Admin Section */}
                <div className="flex items-center">
                  <label htmlFor="isAdmin" className="text-slate-700 text-sm font-medium mr-2">Admin</label>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 mr-3"
                    onClick={() => toggleTooltip('isAdmin')}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.isAdmin || false}
                      onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                      disabled={!(initialData?.authUserId || formData.authUserId)}
                      className="mt-0.5 rounded-10 duration-250 ease-soft-in-out after:rounded-circle after:shadow-soft-2xl after:duration-250 checked:after:translate-x-5.3 h-5 relative float-left w-10 cursor-pointer appearance-none border border-solid border-gray-200 bg-slate-800/10 bg-none bg-contain bg-left bg-no-repeat align-top transition-all after:absolute after:top-px after:h-4 after:w-4 after:translate-x-px after:bg-white after:content-[''] checked:border-slate-800/95 checked:bg-slate-800/95 checked:bg-none checked:bg-right disabled:opacity-30 disabled:cursor-not-allowed"
                      id="isAdmin"
                    />
                    {activeTooltip === 'isAdmin' && (
                      <AttributeTooltip 
                        attribute="Admin" 
                        description={attributeDescriptions.isAdmin}
                        onClose={() => setActiveTooltip(null)}
                      />
                    )}
                  </div>
                </div>

                {/* Retired Section */}
                <div className="flex items-center">
                  <label htmlFor="isRetired" className="text-slate-700 text-sm font-medium mr-2">Retired</label>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 mr-3"
                    onClick={() => toggleTooltip('isRetired')}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.isRetired}
                      onChange={(e) => setFormData({ ...formData, isRetired: e.target.checked })}
                      className="mt-0.5 rounded-10 duration-250 ease-soft-in-out after:rounded-circle after:shadow-soft-2xl after:duration-250 checked:after:translate-x-5.3 h-5 relative float-left w-10 cursor-pointer appearance-none border border-solid border-gray-200 bg-slate-800/10 bg-none bg-contain bg-left bg-no-repeat align-top transition-all after:absolute after:top-px after:h-4 after:w-4 after:translate-x-px after:bg-white after:content-[''] checked:border-slate-800/95 checked:bg-slate-800/95 checked:bg-none checked:bg-right"
                      id="isRetired"
                    />
                    {activeTooltip === 'isRetired' && (
                      <AttributeTooltip 
                        attribute="Retired" 
                        description={attributeDescriptions.isRetired}
                        onClose={() => setActiveTooltip(null)}
                      />
                    )}
                  </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible: Player Ratings */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowRatings(!showRatings)}
                className="w-full flex items-center justify-between text-left mb-3 hover:bg-slate-50 p-2 rounded-lg transition-colors"
              >
                <h4 className="text-sm font-medium text-slate-700">Player Ratings</h4>
                <svg 
                  className={`w-5 h-5 text-slate-400 transition-transform ${showRatings ? 'rotate-180' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showRatings && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {attributeFields.map(({ key, label }) => (
                  <div key={key} className="mb-2 relative">
                    <div className="flex items-center">
                      <label className="block text-slate-700 text-sm mb-1">
                        {label}
                      </label>
                      <button
                        type="button"
                        className="ml-1 text-slate-400 hover:text-slate-600"
                        onClick={() => toggleTooltip(key)}
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {activeTooltip === key && (
                        <AttributeTooltip 
                          attribute={label} 
                          description={attributeDescriptions[key as keyof typeof attributeDescriptions]}
                          onClose={() => setActiveTooltip(null)}
                        />
                      )}
                    </div>
                    <div className="flex items-center">
                      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer">
                        <div 
                          className="h-full rounded-full bg-gradient-to-tl from-purple-700 to-pink-500"
                          style={{ 
                            width: `${((formData[key as keyof PlayerFormData] as number) - 1) / 4 * 100}%`
                          }}
                        />
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={formData[key as keyof PlayerFormData] as number}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            [key]: parseFloat(e.target.value) 
                          })}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <div className="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-gradient-to-tl from-slate-100 to-slate-200 text-slate-700 text-xs font-bold shadow-soft-xs">
                        {formData[key as keyof PlayerFormData] as number}
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-2 border-t border-slate-200 mt-4">
              <button
                type="button"
                className="mr-3 inline-block px-4 py-2 text-xs font-medium text-center text-slate-700 uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-slate-100 to-slate-200 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-block px-4 py-2 text-xs font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-fuchsia-500 to-pink-400 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isProcessing || !formData.name || formData.name.length > 14 || !!nameError}
              >
                {isProcessing ? 'Processing...' : submitButtonText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlayerFormModal; 