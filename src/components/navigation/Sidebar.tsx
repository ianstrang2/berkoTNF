import React, { useState, useEffect } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  toggleOnly?: boolean;
  hasSubItems?: boolean;
  subItems?: NavItem[];
}

interface SidebarProps {
  brandName?: string;
  logoLight?: string;
  logoDark?: string;
  navItems: NavItem[];
  isNeedHelp?: boolean;
  isSidebarMini?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  logoLight = "/logo.png", 
  logoDark = "/logo.png", 
  navItems = [], 
  isNeedHelp = false,
  isSidebarMini: propIsSidebarMini,
}) => {
  const { sidebarOpen, setSidebarOpen, expandedSection, setExpandedSection, isSidebarMini: contextIsSidebarMini, toggleSidebarMini } = useNavigation();
  const pathname = usePathname() || ''; // Provide empty string as fallback
  const [isHovering, setIsHovering] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Use the prop value if provided, otherwise fall back to the context value
  const isSidebarMini = propIsSidebarMini !== undefined ? propIsSidebarMini : contextIsSidebarMini;

  // Ensure component is fully mounted before any DOM manipulation
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check if any subItem is active to highlight parent
  const checkIfParentActive = (item: NavItem): boolean => {
    if (!item.subItems) return false;
    return item.subItems.some(subItem => subItem.href === pathname);
  };

  // Close sidebar when clicking on mobile
  const handleNavItemClick = () => {
    if (window.innerWidth < 1280) { // xl breakpoint
      setSidebarOpen(false);
    }
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Handle mouse enter/leave for mini sidebar
  const handleMouseEnter = () => {
    if (isSidebarMini) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    if (isSidebarMini) {
      setIsHovering(false);
    }
  };

  // Render one sidebar (mobile or desktop version)
  const renderSidebarContent = () => (
    <>
      {/* Logo section */}
      <div className="h-20">
        <i 
          className="absolute top-0 right-0 p-4 opacity-50 cursor-pointer fas fa-times text-slate-400 dark:text-white xl:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        ></i>

        {/* Brand/Logo */}
        <Link href="/" className="block px-8 py-6 m-0 text-sm whitespace-nowrap text-slate-700 dark:text-white">
          <img src={logoLight} className="inline-block h-full max-w-full transition-all duration-200 ease-soft-in-out max-h-8 dark:hidden" alt="main_logo" />
          <img src={logoDark} className="hidden h-full max-w-full transition-all duration-200 ease-soft-in-out max-h-8 dark:inline-block" alt="main_logo" />
          {(!isSidebarMini || isHovering) && (
            <span className="ml-2 font-semibold text-sm transition-all duration-200 ease-soft-in-out">StatKick</span>
          )}
        </Link>
      </div>
      
      <hr className="h-px mt-0 bg-transparent bg-gradient-to-r from-transparent via-black/40 to-transparent dark:bg-gradient-to-r dark:from-transparent dark:via-white dark:to-transparent" />

      {/* Navigation Items */}
      <div className="items-center block w-full h-auto grow basis-full" id="sidenav-collapse-main">
        <ul className="flex flex-col pl-0 mb-0 list-none">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || 
                            (item.href !== '/' && pathname.startsWith(item.href)) ||
                            checkIfParentActive(item);
            const isExpanded = expandedSection === item.label.toLowerCase();
            
            return (
              <li key={index} className="mt-0.5 w-full">
                {item.hasSubItems ? (
                  // Menu item with submenu
                  <>
                    <a 
                      href={item.toggleOnly || item.hasSubItems ? "javascript:;" : item.href}
                      onClick={(e) => {
                        if (item.toggleOnly || item.hasSubItems) {
                          e.preventDefault();
                          toggleSection(item.label.toLowerCase());
                        } else if (!item.hasSubItems) {
                          handleNavItemClick();
                        }
                      }}
                      className={`ease-soft-in-out text-sm py-2.7 my-0 mx-4 flex items-center whitespace-nowrap rounded-lg transition-all
                        ${isActive ? 'xl:shadow-soft-xl bg-white font-semibold text-slate-700' : 'font-normal text-slate-500'} 
                        ${isSidebarMini && !isHovering ? 'px-2 justify-center' : 'px-4'}
                        ${item.hasSubItems && (!isSidebarMini || isHovering) ? "after:content-['\\f107'] after:ml-auto after:font-bold after:font-[Font_Awesome_5_Free] after:text-slate-800/50 after:text-xs after:transition-all after:duration-200" : ''}
                        ${isExpanded && item.hasSubItems && (!isSidebarMini || isHovering) ? 'after:rotate-180' : ''}`}
                      aria-expanded={item.hasSubItems ? (isExpanded ? "true" : "false") : undefined}
                    >
                      <div 
                        className={`flex-none h-8 w-8 flex items-center justify-center rounded-lg p-2.5 bg-center ${isActive ? 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-sm' : 'bg-white text-slate-700 shadow-soft-2xl'} 
                        ${isSidebarMini && !isHovering ? 'mx-0' : 'mr-2'}`}
                      >
                        {item.icon}
                      </div>
                      
                      {(!isSidebarMini || isHovering) && (
                        <span className="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">
                          {item.label}
                        </span>
                      )}

                      {/* Mini mode indicator */}
                      {isSidebarMini && !isHovering && item.hasSubItems && (
                        <i className={`fa fa-caret-down text-xs absolute top-1 right-1 opacity-50 ${isExpanded ? 'rotate-180' : ''}`}></i>
                      )}
                    </a>
                    
                    {/* Submenu */}
                    <div 
                      className={`transition-all duration-200 ease-soft-in-out overflow-hidden ${isExpanded ? 'h-auto' : 'h-0'}`}
                    >
                      <ul className={`${isSidebarMini && !isHovering ? 'flex flex-col items-center pt-1' : 'flex flex-wrap pl-4 mb-0 ml-6 list-none'}`}>
                        {item.subItems?.map((subItem, subIndex) => {
                          const isSubActive = pathname === subItem.href;
                          return (
                            <li key={`${index}-${subIndex}`} className="w-full mt-0.5">
                              <Link
                                href={subItem.href}
                                onClick={handleNavItemClick}
                                className={`ease-soft-in-out py-1.6 ${isSidebarMini && !isHovering ? 'text-center flex justify-center my-1' : 'ml-5.4 pl-4 relative my-0 mr-4 flex items-center'} text-sm whitespace-nowrap bg-transparent transition-colors
                                  ${isSubActive 
                                  ? `${isSidebarMini && !isHovering ? '' : 'before:-left-5 before:h-2 before:w-2'} font-semibold text-slate-800 ${isSidebarMini && !isHovering ? '' : 'before:absolute before:top-1/2 before:-translate-y-1/2 before:rounded-3xl before:bg-slate-800 before:content-[""]'}` 
                                  : `${isSidebarMini && !isHovering ? '' : 'before:-left-4.5 before:h-1.25 before:w-1.25'} font-medium text-slate-800/50 ${isSidebarMini && !isHovering ? '' : 'before:absolute before:top-1/2 before:-translate-y-1/2 before:rounded-3xl before:bg-slate-800/50 before:content-[""]'}`}`}
                              >
                                {isSidebarMini && !isHovering ? (
                                  <span className="text-xs text-center text-slate-800/50">
                                    {subItem.label.slice(0, 1)}
                                  </span>
                                ) : (
                                  <>
                                    <span className="w-0 text-center transition-all duration-200 opacity-0 pointer-events-none ease-soft-in-out">
                                      {subItem.label.slice(0, 1)}
                                    </span>
                                    <span className="transition-all duration-100 pointer-events-none ease-soft">
                                      {subItem.label}
                                    </span>
                                  </>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </>
                ) : (
                  // Simple menu item without submenu
                  <Link
                    href={item.href}
                    onClick={handleNavItemClick}
                    className={`ease-soft-in-out text-sm py-2.7 my-0 mx-4 flex items-center whitespace-nowrap rounded-lg transition-all
                      ${isActive ? 'xl:shadow-soft-xl bg-white font-semibold text-slate-700' : 'font-normal text-slate-500'} 
                      ${isSidebarMini && !isHovering ? 'px-2 justify-center' : 'px-4'}`}
                  >
                    <div 
                      className={`flex-none h-8 w-8 flex items-center justify-center rounded-lg p-2.5 bg-center ${isActive ? 'bg-gradient-to-tl from-purple-700 to-pink-500 text-white shadow-soft-sm' : 'bg-white text-slate-700 shadow-soft-2xl'} 
                      ${isSidebarMini && !isHovering ? 'mx-0' : 'mr-2'}`}
                    >
                      {item.icon}
                    </div>
                    
                    {(!isSidebarMini || isHovering) && (
                      <span className="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">
                        {item.label}
                      </span>
                    )}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Help Card - Positioned relative to the bottom of the navigation */}
      {isNeedHelp && (
        <div className={`${isSidebarMini && !isHovering ? 'pt-2 mx-auto mt-4 w-16' : 'pt-4 mx-4 mt-4'}`}>
          <div className={`${isSidebarMini && !isHovering ? 'h-16 w-16' : ''} after:opacity-65 after:bg-gradient-to-tl after:from-slate-600 after:to-slate-300 relative flex min-w-0 flex-col items-center break-words rounded-2xl border-0 border-solid border-blue-900 bg-white bg-clip-border shadow-none after:absolute after:top-0 after:bottom-0 after:left-0 after:z-10 after:block after:h-full after:w-full after:rounded-2xl after:content-['']`} data-sidenav-card>
            <div className="absolute w-full h-full bg-center bg-cover mb-7 rounded-2xl" style={{backgroundImage: "url('/assets/img/curved-images/white-curved.jpg')"}}></div>
            <div className={`relative z-20 flex-auto w-full ${isSidebarMini && !isHovering ? 'p-2 flex justify-center items-center' : 'p-4 text-left'} text-white`}>
              <div className={`flex items-center justify-center ${isSidebarMini && !isHovering ? 'w-8 h-8 mb-0' : 'w-8 h-8 mb-4'} text-center bg-white bg-center rounded-lg icon shadow-soft-2xl`}>
                <i className="top-0 z-10 text-lg leading-none text-transparent ni ni-diamond bg-gradient-to-tl from-slate-600 to-slate-300 bg-clip-text opacity-80" aria-hidden="true" data-sidenav-card-icon></i>
              </div>
              {(!isSidebarMini || isHovering) && (
                <div className="transition-all duration-200 ease-nav-brand">
                  <h6 className="mb-0 text-white">Need help?</h6>
                  <p className="mt-0 mb-4 text-xs font-semibold leading-tight">Please check our docs</p>
                  <a href="#" target="_blank" className="inline-block w-full px-8 py-2 mb-0 text-xs font-bold text-center text-black uppercase transition-all ease-in bg-white border-0 border-white rounded-lg shadow-soft-md bg-150 leading-pro hover:shadow-soft-2xl hover:scale-102">Documentation</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  useEffect(() => {
    // Only run this effect on the client side after hydration
    if (!isClient) return;
    
    // This effect will update the main content margin when sidebar state changes
    const mainContent = document.querySelector('main');
    if (mainContent) {
      if (isSidebarMini && !isHovering) {
        mainContent.classList.remove('xl:ml-[17rem]');
        mainContent.classList.add('xl:ml-20');
      } else if (isSidebarMini && isHovering) {
        mainContent.classList.remove('xl:ml-20');
        mainContent.classList.add('xl:ml-[17rem]');
      } else if (!isSidebarMini) {
        mainContent.classList.remove('xl:ml-20');
        mainContent.classList.add('xl:ml-[17rem]');
      }
    }
  }, [isSidebarMini, isHovering, isClient]);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar - hidden on small screens, visible on xl and above */}
      <aside 
        data-mini={isSidebarMini ? "true" : "false"}
        className={`fixed inset-y-0 left-0 flex-wrap items-center justify-between block p-0 my-4 overflow-hidden transition-all duration-200 ease-soft-in-out z-990 ${isSidebarMini && !isHovering ? 'w-20' : 'w-64'} rounded-2xl xl:ml-4 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-white border-0 shadow-none dark:bg-gray-950 xl:translate-x-0 xl:bg-transparent`}
        id="sidenav-main"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {renderSidebarContent()}
      </aside>
    </>
  );
};

export default Sidebar; 