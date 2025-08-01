'use client';
import React, { useState, useEffect, useCallback } from 'react';

interface FantasyPointsData {
  config_description: string;
  config_value: string;
  display_name: string;
}

interface FantasyPointsTooltipProps {
  isOpen: boolean;
  onClose: () => void;
}

const FantasyPointsTooltip: React.FC<FantasyPointsTooltipProps> = ({ isOpen, onClose }) => {
  const [fantasyPointsData, setFantasyPointsData] = useState<FantasyPointsData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFantasyPointsData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/app-config?groups=fantasy_points');
      
      if (!response.ok) {
        throw new Error('Failed to fetch fantasy points configuration');
      }
      
      const result = await response.json();
      
      if (!result.success || !Array.isArray(result.data)) {
        throw new Error(result.error || 'Invalid response format');
      }
      
      // Map the configuration data to our interface
      const mappedData: FantasyPointsData[] = result.data.map((config: any) => ({
        config_description: config.config_description || getDefaultDescription(config.config_key),
        config_value: config.config_value,
        display_name: config.display_name || formatDisplayName(config.config_key)
      }));
      
      setFantasyPointsData(mappedData);
    } catch (err: any) {
      console.error('Error fetching fantasy points data:', err);
      setError(err.message || 'Failed to load fantasy points data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFantasyPointsData();
    }
  }, [isOpen, fetchFantasyPointsData]);

  // Fallback display names for configuration keys
  const formatDisplayName = (configKey: string): string => {
    const nameMap: { [key: string]: string } = {
      'fantasy_win_points': 'Points awarded for a win',
      'fantasy_draw_points': 'Points awarded for a draw',
      'fantasy_loss_points': 'Points awarded for a loss',
      'fantasy_heavy_win_points': 'Points awarded for a heavy win (4+ goal difference)',
      'fantasy_clean_sheet_win_points': 'Points awarded for a win with a clean sheet',
      'fantasy_heavy_clean_sheet_win_points': 'Points awarded for a heavy win with a clean sheet',
      'fantasy_clean_sheet_draw_points': 'Points awarded for a draw with a clean sheet',
      'fantasy_heavy_loss_points': 'Points awarded for a heavy loss (4+ goal difference)'
    };
    
    return nameMap[configKey] || configKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Fallback descriptions for configuration keys
  const getDefaultDescription = (configKey: string): string => {
    const descriptionMap: { [key: string]: string } = {
      'fantasy_win_points': 'Points awarded for a regular match win',
      'fantasy_draw_points': 'Points awarded for a match draw',
      'fantasy_loss_points': 'Points awarded for a match loss',
      'fantasy_heavy_win_points': 'Bonus points for winning by 4 or more goals',
      'fantasy_clean_sheet_win_points': 'Bonus points for winning without conceding',
      'fantasy_heavy_clean_sheet_win_points': 'Maximum points for heavy win with clean sheet',
      'fantasy_clean_sheet_draw_points': 'Points for drawing without conceding',
      'fantasy_heavy_loss_points': 'Penalty points for losing by 4 or more goals'
    };
    
    return descriptionMap[configKey] || '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Semi-transparent overlay */}
        <div 
          className="fixed inset-0 bg-neutral-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        />

        {/* Center dialog */}
        <span 
          className="hidden sm:inline-block sm:align-middle sm:h-screen" 
          aria-hidden="true"
        >
          &#8203;
        </span>
        
        <div 
          className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-soft-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6">
            <h3 className="text-lg leading-6 font-medium text-slate-700">
              Scoring System
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
          
          {/* Gradient line under title */}
          <div className="px-6">
            <div className="h-0.5 bg-gradient-to-l from-purple-700 to-pink-500"></div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                  <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">Loading fantasy points configuration...</p>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 text-red-500 bg-red-100 rounded-xl mb-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h6 className="mb-1 text-lg text-slate-700">Error Loading Data</h6>
                <p className="mb-0 text-sm text-slate-500">{error}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {fantasyPointsData.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-3 hover:bg-gray-50">
                    <span className="text-sm font-medium text-gray-600">{item.config_description}</span>
                    <span className="text-sm font-medium text-gray-900">{item.config_value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FantasyPointsTooltip; 