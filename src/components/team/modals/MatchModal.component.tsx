import React from 'react';
import { NewMatchData } from '@/types/team-algorithm.types';

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: NewMatchData;
  onChange: (field: string, value: any) => void;
  onSubmit: () => void;
  isLoading: boolean;
  error: string | null;
  isEditing: boolean;
}

const MatchModal: React.FC<MatchModalProps> = ({
  isOpen,
  onClose,
  data,
  onChange,
  onSubmit,
  isLoading,
  error,
  isEditing
}) => {
  if (!isOpen) return null;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">
          {isEditing ? 'Edit Match' : 'Create New Match'}
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Match Date</label>
            <input
              type="date"
              value={data.date}
              onChange={(e) => onChange('date', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
            <select
              value={data.team_size}
              onChange={(e) => onChange('team_size', parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              {[5, 6, 7, 8, 9, 10, 11].map(size => (
                <option key={size} value={size}>
                  {size}v{size}
                </option>
              ))}
            </select>
          </div>
          
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
              {isLoading ? 'Saving...' : isEditing ? 'Update Match' : 'Create Match'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MatchModal; 