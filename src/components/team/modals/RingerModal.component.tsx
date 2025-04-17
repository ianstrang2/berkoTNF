import React from 'react';
import { RingerForm } from '@/types/team-algorithm.types';
import Button from '@/components/ui-kit/Button.component';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity">
      <div className="bg-white rounded-xl shadow-soft-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-slate-700 font-sans mb-4">Add Ringer Player</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 text-sm text-slate-600"
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
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <input
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={form[key as keyof RingerForm]}
                onChange={(e) => onChange(key, parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>
          ))}
          
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
              {isLoading ? 'Adding...' : 'Add Ringer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RingerModal; 