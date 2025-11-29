import React from 'react';
import { NewMatchData } from '@/types/team-algorithm.types';
import Button from '@/components/ui-kit/Button.component';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 transition-opacity p-4 pt-8 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-soft-xl p-6 w-full max-w-md my-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
        <div className="overflow-y-auto pb-4" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
        <h2 className="text-xl font-bold text-slate-700 font-sans mb-4">
          {isEditing ? 'Edit Match' : 'Create New Match'}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-sm text-red-700">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Match Date</label>
            <input
              type="date"
              value={data.date}
              onChange={(e) => onChange('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 text-sm text-slate-600"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Team Size</label>
            <select
              value={data.team_size}
              onChange={(e) => onChange('team_size', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 text-sm text-slate-600"
              required
            >
              {[5, 6, 7, 8, 9, 10, 11].map(size => (
                <option key={size} value={size}>
                  {size}v{size}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="secondary"
              className="rounded-lg shadow-soft-sm"
              onClick={onClose}
              type="button"
            >
              Cancel
            </Button>
            
            <Button
              variant="primary"
              className="bg-gradient-to-tl from-purple-700 to-pink-500 shadow-soft-md rounded-lg"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : isEditing ? 'Update Match' : 'Create Match'}
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default MatchModal; 