import React from 'react';
import Button from '@/components/ui-kit/Button.component';

type BalanceMethod = 'ability' | 'performance' | 'random';

interface BalanceOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (method: BalanceMethod) => void;
  isLoading: boolean;
}

const BalanceOptionsModal: React.FC<BalanceOptionsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const [balanceMethod, setBalanceMethod] = React.useState<BalanceMethod>('ability');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(balanceMethod);
  };

  const options = [
    { id: 'ability', title: 'Balance by your Player Ratings', description: "Balance players based on the ratings you've entered" },
    { id: 'performance', title: 'Balance by Performance Data', description: 'Balance players based on their actual performance' },
    { id: 'random', title: 'Random Assignment', description: 'Create unpredictable teams with random player distribution' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity">
      <div className="bg-white rounded-xl shadow-soft-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold text-slate-700 font-sans mb-4">Team Building Options</h2>
        <p className="text-xs text-slate-500 mb-3">Choose how to build the teams:</p>
        
        <div className="space-y-2">
          {options.map(option => (
            <div 
              key={option.id}
              className={`p-2 border rounded-lg cursor-pointer ${balanceMethod === option.id ? 'border-purple-500 bg-purple-50' : 'border-gray-300'}`}
              onClick={() => setBalanceMethod(option.id as BalanceMethod)}
            >
              <div className="flex items-center">
                <div className={`w-3.5 h-3.5 rounded-full mr-2 ${balanceMethod === option.id ? 'bg-gradient-to-tl from-purple-700 to-pink-500' : 'border border-gray-400'}`}></div>
                <div>
                  <h3 className="text-sm font-medium text-slate-700 font-sans">{option.title}</h3>
                  <p className="text-xs text-slate-500">{option.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Auto Assign'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BalanceOptionsModal; 