import React, { useState } from 'react';

const Tabs = ({ value, onValueChange, defaultValue, children, className = '' }) => {
  const [internalTab, setInternalTab] = useState(defaultValue || value);

  const handleChange = (newValue) => {
    if (typeof onValueChange === "function") {
      onValueChange(newValue);
    } else {
      setInternalTab(newValue);
    }
  };

  const activeTab = value || internalTab;

  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        
        return React.cloneElement(child, {
          value: activeTab,
          onValueChange: handleChange,
        });
      })}
    </div>
  );
};

const TabsList = ({ children, value, onValueChange, className = '' }) => (
  <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className}`}>
    {React.Children.map(children, (child) =>
      React.isValidElement(child)
        ? React.cloneElement(child, {
            value,
            onValueChange,
          })
        : child
    )}
  </div>
);

const TabsTrigger = ({ value, triggerValue, children, onValueChange, className = '' }) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all
      ${value === triggerValue ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'} ${className}`}
    onClick={() => {
      if (typeof onValueChange === 'function') {
        onValueChange(triggerValue);
      }
    }}
  >
    {children}
  </button>
);

const TabsContent = ({ value, triggerValue, children, className = '' }) => {
  if (value !== triggerValue) return null;
  return <div className={`mt-2 ${className}`}>{children}</div>;
};

export { Tabs, TabsList, TabsTrigger, TabsContent };