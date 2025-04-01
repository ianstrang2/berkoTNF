import React from 'react';
import { Card } from '@/components/ui-kit';

interface AttributeTooltipProps {
  children: React.ReactNode;
  attribute: string;
  description: string;
}

export const AttributeTooltip: React.FC<AttributeTooltipProps> = ({ children, attribute, description }) => {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
        <div className="bg-neutral-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
          <div className="font-medium">{attribute}</div>
          <div className="text-neutral-300">{description}</div>
        </div>
      </div>
    </div>
  );
};

interface AttributeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AttributeGuideModal: React.FC<AttributeGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-neutral-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <Card>
            <div className="px-4 pt-5 pb-4 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-neutral-900 mb-4">
                Attribute Guide
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-neutral-900">Goalscoring</h4>
                  <p className="text-sm text-neutral-500">
                    Ability to score goals and finish chances
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900">Defender</h4>
                  <p className="text-sm text-neutral-500">
                    Defensive abilities and positioning
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900">Stamina & Pace</h4>
                  <p className="text-sm text-neutral-500">
                    Physical attributes including speed and endurance
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900">Control</h4>
                  <p className="text-sm text-neutral-500">
                    Ball control and technical ability
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900">Teamwork</h4>
                  <p className="text-sm text-neutral-500">
                    Ability to work with teammates and follow tactics
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900">Resilience</h4>
                  <p className="text-sm text-neutral-500">
                    Mental strength and ability to handle pressure
                  </p>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}; 