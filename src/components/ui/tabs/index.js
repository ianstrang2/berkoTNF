import React from 'react'

const Tabs = ({ defaultValue, children, className = '' }) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue)
  
  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return null
        return React.cloneElement(child, { activeTab, setActiveTab })
      })}
    </div>
  )
}

const TabsList = ({ children, className = '' }) => (
  <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className}`}>
    {children}
  </div>
)

const TabsTrigger = ({ value, children, activeTab, setActiveTab, className = '' }) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all
      ${activeTab === value 
        ? 'bg-white text-black shadow-sm' 
        : 'text-gray-600 hover:text-black'
      } ${className}`}
    onClick={() => setActiveTab(value)}
  >
    {children}
  </button>
)

const TabsContent = ({ value, children, activeTab, className = '' }) => {
  if (activeTab !== value) return null
  return (
    <div className={`mt-2 ${className}`}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }