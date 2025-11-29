import React from 'react';
import Button from '@/components/ui-kit/Button.component';
import { COPY_CONSTANTS } from '@/utils/teamSplit.util';

type BalanceMethod = 'ability' | 'performance' | 'random';

interface BalanceOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (method: BalanceMethod) => void;
  isLoading: boolean;
  actualSizeA?: number;
  actualSizeB?: number;
}

const BalanceOptionsModal: React.FC<BalanceOptionsModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  actualSizeA,
  actualSizeB,
}) => {
  // Check if Ability balancing should be disabled (4v4 or uneven teams)
  const isUneven = actualSizeA && actualSizeB && actualSizeA !== actualSizeB;
  const isSimplified = actualSizeA === 4 && actualSizeB === 4;
  const isAbilityDisabled = isUneven || isSimplified;

  const [balanceMethod, setBalanceMethod] = React.useState<BalanceMethod>(
    isAbilityDisabled ? 'performance' : 'ability'
  );

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(balanceMethod);
  };

  const options = [
    { 
      id: 'ability', 
      title: 'Balance by your Player Ratings', 
      description: isAbilityDisabled ? COPY_CONSTANTS.ABILITY_RESTRICTION : "Balance players based on the ratings you've entered",
      disabled: isAbilityDisabled 
    },
    { id: 'performance', title: 'Balance by Performance Data', description: 'Balance players based on their actual performance', disabled: false },
    { id: 'random', title: 'Random Assignment', description: 'Create unpredictable teams with random player distribution', disabled: false }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 transition-opacity p-4 pt-8 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-soft-xl p-6 w-full max-w-md my-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
        <div className="overflow-y-auto pb-4" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
        <h2 className="text-lg font-bold text-slate-700 font-sans mb-4">Team Building Options</h2>
        <p className="text-xs text-slate-500 mb-3">Choose how to build the teams:</p>
        
        <div className="space-y-2">
          {options.map(option => (
            <div 
              key={option.id}
              className={`p-2 border rounded-lg ${
                option.disabled 
                  ? 'cursor-not-allowed opacity-50 border-gray-200 bg-gray-50' 
                  : 'cursor-pointer'
              } ${
                balanceMethod === option.id && !option.disabled 
                  ? 'border-purple-500 bg-purple-50' 
                  : option.disabled 
                    ? 'border-gray-200' 
                    : 'border-gray-300'
              }`}
              onClick={() => !option.disabled && setBalanceMethod(option.id as BalanceMethod)}
            >
              <div className="flex items-center">
                <div className={`w-3.5 h-3.5 rounded-full mr-2 ${
                  balanceMethod === option.id && !option.disabled 
                    ? 'bg-gradient-to-tl from-purple-700 to-pink-500' 
                    : option.disabled 
                      ? 'border border-gray-300 bg-gray-200' 
                      : 'border border-gray-400'
                }`}></div>
                <div>
                  <h3 className={`text-sm font-medium font-sans ${option.disabled ? 'text-gray-400' : 'text-slate-700'}`}>
                    {option.title}
                  </h3>
                  <p className={`text-xs ${option.disabled ? 'text-gray-400' : 'text-slate-500'}`}>
                    {option.description}
                  </p>
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
    </div>
  );
};

export default BalanceOptionsModal; 