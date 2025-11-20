'use client';
import React, { useState, useEffect } from 'react';
import { Season, SeasonFormData } from '@/types/season.types';

interface SeasonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SeasonFormData) => Promise<void>;
  isProcessing: boolean;
  initialData?: Season | null;
  title?: string;
  submitButtonText?: string;
}

const SeasonFormModal: React.FC<SeasonFormModalProps> = ({ 
  isOpen,
  onClose,
  onSubmit,
  isProcessing,
  initialData,
  title = "Create Season",
  submitButtonText = "Create Season"
}) => {
  const [formData, setFormData] = useState<SeasonFormData>({
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || ''
  });
  const [error, setError] = useState<string | null>(null);

  // Effect to update form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        startDate: initialData.startDate,
        endDate: initialData.endDate
      });
    } else {
      // For new seasons, suggest next year if current year exists
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      setFormData({
        startDate: `${nextYear}-01-01`,
        endDate: `${nextYear}-12-31`
      });
    }
  }, [initialData]);

  // Clear error when form data changes
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [formData.startDate, formData.endDate, error]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.startDate || !formData.endDate) {
      setError('Both start date and end date are required');
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (start >= end) {
      setError('Start date must be before end date');
      return;
    }

    // Check minimum season length (30 days)
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    
    if (daysDiff < 30) {
      setError('Season must be at least 30 days long');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleInputChange = (field: keyof SeasonFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calculate suggested half date
  const getSuggestedHalfDate = () => {
    if (!formData.startDate || !formData.endDate) return '';
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const timeDiff = end.getTime() - start.getTime();
    const halfDate = new Date(start.getTime() + timeDiff / 2);
    
    return halfDate.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" onClick={onClose} aria-hidden="true"></div>
        
      {/* Modal panel - mobile friendly with keyboard support */}
      <div className="relative bg-white rounded-2xl max-w-md w-full mx-auto shadow-soft-xl transform transition-all p-6 my-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
          {/* Header with close button */}
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-slate-700" id="modal-title">
              {title}
            </h3>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Start Date */}
            <div className="mb-4">
              <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                disabled={isProcessing}
                required
              />
            </div>

            {/* End Date */}
            <div className="mb-4">
              <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                disabled={isProcessing}
                required
              />
            </div>

            {/* Half Date Preview */}
            {formData.startDate && formData.endDate && (
              <div className="mb-4 p-3 border border-slate-200 rounded-lg">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Half Date:</span> {getSuggestedHalfDate()}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Automatically calculated as the midpoint between start and end dates
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-center gap-3 mt-6">
              <button
                type="submit"
                className="inline-block px-4 py-2 text-xs font-medium text-center text-white uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-purple-700 to-pink-500 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isProcessing || !formData.startDate || !formData.endDate}
              >
                {isProcessing ? 'Processing...' : submitButtonText}
              </button>
              <button
                type="button"
                className="inline-block px-4 py-2 text-xs font-medium text-center text-slate-700 uppercase align-middle transition-all border-0 rounded-lg cursor-pointer hover:scale-102 active:opacity-85 hover:shadow-soft-xs bg-gradient-to-tl from-slate-100 to-slate-200 leading-pro ease-soft-in tracking-tight-soft shadow-soft-md bg-150 bg-x-25 ml-3"
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SeasonFormModal;
