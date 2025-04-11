import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface NavPillsProps<T extends string> {
  items: {
    label: string;
    value: T;
  }[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  className?: string;
}

export const NavPills = <T extends string>({ 
  items, 
  activeTab, 
  onTabChange,
  className = ''
}: NavPillsProps<T>) => {
  const navRef = useRef<HTMLUListElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => {
    return items.findIndex(item => item.value === activeTab);
  });
  const [movingTabStyle, setMovingTabStyle] = useState({
    transform: 'translate3d(0px, 0px, 0px)',
    width: '0px',
    transition: '.5s ease',
    opacity: '1'
  });

  // Calculate moving tab position and width
  const updateMovingTab = (withTransition = true) => {
    if (!navRef.current) return;

    const nav = navRef.current;
    const activeLi = nav.children[activeIndex] as HTMLElement;
    
    if (!activeLi) return;

    // Calculate position
    let sum = 0;
    for (let i = 0; i < activeIndex; i++) {
      const child = nav.children[i] as HTMLElement;
      if (child) {
        sum += child.offsetWidth;
      }
    }
    
    // Update moving tab style
    setMovingTabStyle({
      transform: `translate3d(${sum}px, 0px, 0px)`,
      width: `${activeLi.offsetWidth}px`,
      transition: withTransition ? '.5s ease' : 'none',
      opacity: '1'
    });
  };

  // Handle client-side mounting
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initial setup and resize handling
  useLayoutEffect(() => {
    if (!isClient) return;

    const initializeTab = () => {
      updateMovingTab(true);
    };

    // Initialize on mount and when active tab changes
    initializeTab();

    // Handle resize
    const handleResize = () => {
      initializeTab();
    };

    const resizeObserver = new ResizeObserver(() => {
      initializeTab();
    });

    if (navRef.current) {
      resizeObserver.observe(navRef.current);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [isClient, activeIndex, items]);

  // Update active index when tab changes
  useEffect(() => {
    const index = items.findIndex(item => item.value === activeTab);
    if (index !== -1) {
      setActiveIndex(index);
    }
  }, [activeTab, items]);

  // Handle hover effect
  const handleMouseOver = (event: React.MouseEvent<HTMLLIElement>, index: number) => {
    if (!navRef.current) return;
    
    const nav = navRef.current;
    const hoveredLi = event.currentTarget;
    
    // Calculate position for hovered tab
    let sum = 0;
    for (let i = 0; i < index; i++) {
      const child = nav.children[i] as HTMLElement;
      if (child) {
        sum += child.offsetWidth;
      }
    }
    
    // Update moving tab style for hover
    setMovingTabStyle({
      transform: `translate3d(${sum}px, 0px, 0px)`,
      width: `${hoveredLi.offsetWidth}px`,
      transition: '.5s ease',
      opacity: '1'
    });
  };

  return (
    <div className={`relative right-0 ${className}`}>
      <ul 
        ref={navRef}
        className="relative flex flex-wrap p-1 mb-0 list-none bg-gray-50 dark:bg-gray-950 dark:shadow-soft-dark-xl rounded-xl" 
        role="tablist"
      >
        {items.map((item, index) => (
          <li 
            key={item.value} 
            className="z-30 flex-auto text-center"
            onMouseOver={(e) => handleMouseOver(e, index)}
          >
            <a
              href="javascript:;"
              className="block w-full py-1 transition-colors border-0 rounded-lg ease-soft-in-out bg-inherit bg-none dark:text-white text-xs md:text-sm"
              onClick={() => onTabChange(item.value)}
              role="tab"
              aria-selected={activeTab === item.value}
            >
              {item.label}
            </a>
          </li>
        ))}
        
        {/* Moving Tab Indicator */}
        <li 
          className="z-10 absolute text-slate-700 rounded-lg bg-inherit flex-auto text-center bg-none border-0 block"
          style={{
            ...movingTabStyle,
            padding: '0px'
          }}
        >
          <a 
            className="block w-full py-1 transition-colors border-0 rounded-lg ease-soft-in-out bg-white text-white dark:bg-slate-950 dark:text-slate-950 shadow-soft-xxs"
            href="javascript:;"
            style={{ animation: '.2s ease' }}
          >
            -
          </a>
        </li>
      </ul>
    </div>
  );
};

export default NavPills; 