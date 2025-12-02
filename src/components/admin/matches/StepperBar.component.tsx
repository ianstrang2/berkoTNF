'use client';

import React from 'react';
import { Check } from 'lucide-react';

type Step = 'Pool' | 'Teams' | 'Done';

interface StepperBarProps {
  currentStep: Step;
  variant?: 'full' | 'compact';
}

const steps: Step[] = ['Pool', 'Teams', 'Done'];

const StepperBar: React.FC<StepperBarProps> = ({ currentStep, variant = 'full' }) => {
  const currentStepIndex = steps.indexOf(currentStep);

  // Compact variant: small inline circles without text
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isActive = index === currentStepIndex;

          return (
            <React.Fragment key={step}>
              <div
                className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-all duration-300 ${
                  isActive
                    ? 'border-2 border-gray-500'
                    : 'border border-gray-300'
                }`}
                title={step}
              >
                {isCompleted ? (
                  <Check size={10} strokeWidth={3} className="text-gray-400" />
                ) : (
                  <span className={isActive ? 'text-gray-600' : 'text-gray-400'}>
                    {index + 1}
                  </span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className="w-2 h-0.5 rounded bg-gray-200" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  // Full variant: original layout with text labels
  return (
    <div className="w-full py-4 mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isActive = index === currentStepIndex;

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center text-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                  isActive ? 'border-gray-500' : 'border-gray-300'
                }`}>
                  {isCompleted ? (
                    <Check size={16} strokeWidth={3} className="text-gray-400" />
                  ) : (
                    <span className={`text-sm font-bold ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                      {index + 1}
                    </span>
                  )}
                </div>
                <p className={`mt-2 text-xs md:text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-1 mx-2 md:mx-4 rounded bg-gray-200" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepperBar; 