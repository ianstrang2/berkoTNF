import React from 'react';

interface NavPillsProps<T extends string> {
  items: {
    label: string;
    value: T;
  }[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  className?: string;
}

/**
 * Segmented control / pill-style tabs
 * - Clear active/inactive states on initial load
 * - No complex animations that can break on first render
 * - Mobile-first design
 */
export const NavPills = <T extends string>({ 
  items, 
  activeTab, 
  onTabChange,
  className = ''
}: NavPillsProps<T>) => {
  return (
    <div className={`relative ${className}`}>
      <div 
        className="flex p-1 bg-slate-100 rounded-xl" 
        role="tablist"
      >
        {items.map((item) => {
          const isActive = activeTab === item.value;
          
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onTabChange(item.value)}
              role="tab"
              aria-selected={isActive}
              className={`
                flex-1 py-1.5 px-2 text-xs sm:text-sm font-medium rounded-lg
                transition-all duration-200 ease-out
                ${isActive 
                  ? 'bg-white text-slate-800 shadow-soft-md' 
                  : 'bg-transparent text-slate-500 hover:text-slate-700'
                }
              `}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NavPills; 