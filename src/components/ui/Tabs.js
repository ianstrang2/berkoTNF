'use client';
import React, { useState } from 'react';

const Tabs = ({ 
  children, 
  defaultTab = 0,
  onChange,
  variant = 'underline',
  className = '', 
  tabListClassName = '',
  tabPanelClassName = '',
  ...props 
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const handleTabChange = (index) => {
    setActiveTab(index);
    if (onChange) {
      onChange(index);
    }
  };
  
  // Filter out only Tab components from children
  const tabs = React.Children.toArray(children).filter(
    (child) => child.type && child.type.displayName === 'Tab'
  );
  
  const tabVariants = {
    underline: {
      tabList: 'flex border-b border-neutral-200',
      tab: {
        active: 'py-2 px-4 text-sm font-medium border-b-2 border-primary-500 text-primary-600',
        inactive: 'py-2 px-4 text-sm font-medium border-b-2 border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300',
      },
    },
    pills: {
      tabList: 'flex space-x-2',
      tab: {
        active: 'py-2 px-4 text-sm font-medium rounded-md bg-primary-500 text-white',
        inactive: 'py-2 px-4 text-sm font-medium rounded-md text-neutral-500 bg-white hover:bg-neutral-50',
      },
    },
    cards: {
      tabList: 'flex space-x-1',
      tab: {
        active: 'py-2 px-4 text-sm font-medium rounded-t-md bg-white border-t border-l border-r border-neutral-200 text-neutral-900',
        inactive: 'py-2 px-4 text-sm font-medium rounded-t-md text-neutral-500 bg-neutral-50 hover:bg-neutral-100',
      },
    },
  };
  
  const currentVariant = tabVariants[variant] || tabVariants.underline;
  
  return (
    <div className={`w-full ${className}`} {...props}>
      <div className={`${currentVariant.tabList} ${tabListClassName}`} role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={index}
            role="tab"
            aria-selected={activeTab === index}
            aria-controls={`tabpanel-${index}`}
            id={`tab-${index}`}
            tabIndex={activeTab === index ? 0 : -1}
            className={activeTab === index ? currentVariant.tab.active : currentVariant.tab.inactive}
            onClick={() => handleTabChange(index)}
          >
            {tab.props.label}
          </button>
        ))}
      </div>
      <div className={`mt-4 ${tabPanelClassName}`}>
        {tabs.map((tab, index) => (
          <div
            key={index}
            role="tabpanel"
            aria-labelledby={`tab-${index}`}
            id={`tabpanel-${index}`}
            className={`${activeTab === index ? 'block' : 'hidden'}`}
          >
            {tab.props.children}
          </div>
        ))}
      </div>
    </div>
  );
};

const Tab = ({ children, label }) => {
  return children;
};

Tab.displayName = 'Tab';

export { Tabs, Tab };
export default Tabs; 