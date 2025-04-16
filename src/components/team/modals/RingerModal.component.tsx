import React from 'react';
import { RingerForm } from '@/types/team-algorithm.types';

interface RingerModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: RingerForm;
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const RingerModal: React.FC<RingerModalProps> = ({
  isOpen,
  onClose,
  form,
  onChange,
  onSubmit,
  isLoading
}) => {
  if (!isOpen) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Add Ringer Player</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          
          {/* Player attributes */}
          {[
            { key: 'goalscoring', label: 'Goalscoring' },
            { key: 'defending', label: 'Defending' },
            { key: 'stamina_pace', label: 'Stamina/Pace' },
            { key: 'control', label: 'Control' },
            { key: 'teamwork', label: 'Teamwork' },
            { key: 'resilience', label: 'Resilience' }
          ].map(({ key, label }) => (
            <div key={key} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={form[key as keyof RingerForm]}
                onChange={(e) => onChange(key, parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>
          ))}
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              {isLoading ? 'Adding...' : 'Add Ringer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RingerModal; 