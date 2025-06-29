'use client';

import React from 'react';
import { Check } from 'lucide-react';

type Step = 'Pool' | 'Teams' | 'Complete' | 'Done';

interface StepperBarProps {
  currentStep: Step;
}

const steps: Step[] = ['Pool', 'Teams', 'Complete', 'Done'];

const StepperBar: React.FC<StepperBarProps> = ({ currentStep }) => {
  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <div className="w-full py-4 mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isActive = index === currentStepIndex;

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center text-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-green-600 text-white'
                      : isActive
                      ? 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white ring-4 ring-purple-500/30'
                      : 'bg-transparent border-2 border-gray-300'
                  }`}
                >
                  {isCompleted ? <Check size={16} /> : 
                    <span className={`${isActive ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-tl from-purple-700 to-pink-500'}`}>
                      {index + 1}
                    </span>
                  }
                </div>
                <p className={`mt-2 text-xs md:text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 md:mx-4 rounded ${isCompleted ? 'bg-gradient-to-tl from-purple-700 to-pink-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepperBar; 