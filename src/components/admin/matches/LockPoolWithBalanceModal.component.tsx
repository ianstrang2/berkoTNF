'use client';

import React from 'react';
import Button from '@/components/ui-kit/Button.component';
import { COPY_CONSTANTS } from '@/utils/teamSplit.util';
import { Users, Zap, Shuffle } from 'lucide-react';

type BalanceMethod = 'ability' | 'performance' | 'random';

interface LockPoolWithBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (method: BalanceMethod) => void;
  isLoading: boolean;
  poolSize: number;
  sizeA: number;
  sizeB: number;
}

const LockPoolWithBalanceModal: React.FC<LockPoolWithBalanceModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  poolSize,
  sizeA,
  sizeB,
}) => {
  // Check if Ability balancing should be disabled (4v4 or uneven teams)
  const isUneven = sizeA !== sizeB;
  const isSimplified = sizeA === 4 && sizeB === 4;
  const isAbilityDisabled = isUneven || isSimplified;

  const [balanceMethod, setBalanceMethod] = React.useState<BalanceMethod>(
    isAbilityDisabled ? 'performance' : 'ability'
  );

  // Update default selection when team sizes change
  React.useEffect(() => {
    if (isAbilityDisabled && balanceMethod === 'ability') {
      setBalanceMethod('performance');
    }
  }, [isAbilityDisabled, balanceMethod]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(balanceMethod);
  };

  const options = [
    { 
      id: 'ability' as BalanceMethod, 
      title: 'Balance by Player Ratings', 
      description: isAbilityDisabled ? COPY_CONSTANTS.ABILITY_RESTRICTION : "Uses your custom ratings for each player",
      disabled: isAbilityDisabled,
      icon: Users
    },
    { 
      id: 'performance' as BalanceMethod, 
      title: 'Balance by Performance', 
      description: 'Uses actual match performance data',
      disabled: false,
      icon: Zap
    },
    { 
      id: 'random' as BalanceMethod, 
      title: 'Random Assignment', 
      description: 'Randomly distributes players to teams',
      disabled: false,
      icon: Shuffle
    }
  ];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 transition-opacity p-4 pt-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl shadow-soft-xl p-5 w-full max-w-md my-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
          {/* Header */}
          <div className="text-center mb-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-tl from-purple-700 to-pink-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-700 font-sans">Lock Pool & Balance</h2>
            <p className="text-sm text-slate-500 mt-1">
              {poolSize} players → <span className="font-semibold">{sizeA}v{sizeB}</span>
            </p>
          </div>
          
          <p className="text-xs text-slate-500 mb-3 text-center">Choose how to balance teams:</p>
          
          <div className="space-y-2">
            {options.map(option => {
              const Icon = option.icon;
              return (
                <div 
                  key={option.id}
                  className={`p-3 border rounded-lg transition-all ${
                    option.disabled 
                      ? 'cursor-not-allowed opacity-50 border-gray-200 bg-gray-50' 
                      : 'cursor-pointer hover:shadow-soft-sm'
                  } ${
                    balanceMethod === option.id && !option.disabled 
                      ? 'border-purple-500 bg-purple-50' 
                      : option.disabled 
                        ? 'border-gray-200' 
                        : 'border-gray-300'
                  }`}
                  onClick={() => !option.disabled && setBalanceMethod(option.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      balanceMethod === option.id && !option.disabled 
                        ? 'bg-gradient-to-tl from-purple-700 to-pink-500' 
                        : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        balanceMethod === option.id && !option.disabled 
                          ? 'text-white' 
                          : option.disabled 
                            ? 'text-gray-400' 
                            : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium font-sans ${option.disabled ? 'text-gray-400' : 'text-slate-700'}`}>
                        {option.title}
                      </h3>
                      <p className={`text-xs mt-0.5 ${option.disabled ? 'text-gray-400' : 'text-slate-500'}`}>
                        {option.description}
                      </p>
                    </div>
                    {/* Radio indicator */}
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center ${
                      balanceMethod === option.id && !option.disabled 
                        ? 'bg-gradient-to-tl from-purple-700 to-pink-500' 
                        : option.disabled 
                          ? 'border-2 border-gray-300' 
                          : 'border-2 border-gray-400'
                    }`}>
                      {balanceMethod === option.id && !option.disabled && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex gap-3 mt-5">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleConfirm} 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Processing...' : 'Lock & Balance'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LockPoolWithBalanceModal;

