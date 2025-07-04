'use client';

import React from 'react';
import { Check } from 'lucide-react';

type Step = 'Pool' | 'Teams' | 'Result' | 'Done';

interface StepperBarProps {
  currentStep: Step;
}

const steps: Step[] = ['Pool', 'Teams', 'Result', 'Done'];

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
                      ? 'bg-transparent border-2 border-gray-300'
                      : isActive
                      ? 'bg-transparent border-2 border-purple-700'
                      : 'bg-transparent border-2 border-gray-300'
                  }`}
                >
                  {isCompleted ? <Check size={16} className="text-purple-700" /> : 
                    <span className={`${isActive ? 'text-purple-700' : 'text-gray-400'}`}>
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