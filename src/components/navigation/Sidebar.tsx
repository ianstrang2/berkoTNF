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
}

const Sidebar: React.FC<SidebarProps> = ({ 
  logoLight = "/logo.png", 
  logoDark = "/logo.png", 
  navItems = [], 
  isNeedHelp = false,
}) => {
  const { sidebarOpen, setSidebarOpen, expandedSection, setExpandedSection, isSidebarMini, toggleSidebarMini } = useNavigation();
  const pathname = usePathname() || ''; // Provide empty string as fallback
  const [isHovering, setIsHovering] = useState(false);

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
            <span className="ml-1 font-semibold transition-all duration-200 ease-soft-in-out">ScoreDraw</span>
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
                {/* Main Menu Item */}
                {item.hasSubItems ? (
                  <>
                    <a 
                      href="javascript:;"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleSection(item.label.toLowerCase());
                      }}
                      className={`after:ease-soft-in-out after:font-awesome-5-free ease-soft-in-out text-sm py-2.7 my-0 mx-4 flex items-center whitespace-nowrap rounded-lg px-4 transition-all after:ml-auto after:inline-block after:font-bold after:text-slate-800/50 after:antialiased after:transition-all after:duration-200 ${isExpanded ? 'after:rotate-180' : ''} after:content-['\f107'] dark:text-white dark:opacity-80 dark:after:text-white/50 dark:after:text-white ${isActive ? 'bg-white xl:shadow-soft-xl font-semibold text-slate-700' : 'font-medium text-slate-500'}`}
                      aria-expanded={isExpanded ? "true" : "false"}
                    >
                      <div className={`${isActive ? 'stroke-none shadow-soft-sm bg-gradient-to-tl from-purple-700 to-pink-500 text-white' : 'stroke-none shadow-soft-2xl bg-white text-center text-black'} mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center fill-current p-2.5`}>
                        {item.icon}
                      </div>
                      {(!isSidebarMini || isHovering) && (
                        <span className="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">
                          {item.label}
                        </span>
                      )}
                    </a>
                    
                    {/* Sub Menu Items */}
                    <div className={`h-auto overflow-hidden transition-all duration-200 ease-soft-in-out ${(isExpanded && (!isSidebarMini || isHovering)) ? '' : 'max-h-0'}`} id={`${item.label.toLowerCase()}Examples`}>
                      <ul className="flex flex-wrap pl-4 mb-0 ml-6 list-none transition-all duration-200 ease-soft-in-out">
                        {item.subItems?.map((subItem, subIndex) => {
                          const isSubActive = pathname === subItem.href;
                          
                          return (
                            <li key={`${index}-${subIndex}`} className="w-full">
                              <Link
                                href={subItem.href}
                                onClick={handleNavItemClick}
                                className={`ease-soft-in-out py-1.6 ml-5.4 pl-4 text-sm relative my-0 mr-4 flex items-center whitespace-nowrap rounded-lg bg-transparent pr-4 shadow-none transition-colors ${isSubActive 
                                  ? 'before:-left-5 before:h-2 before:w-2 font-semibold text-slate-800 before:absolute before:top-1/2 before:-translate-y-1/2 before:rounded-3xl before:bg-slate-800 before:content-[""] dark:text-white dark:opacity-100 dark:before:bg-white dark:before:opacity-80' 
                                  : 'before:-left-4.5 before:h-1.25 before:w-1.25 font-medium text-slate-800/50 before:absolute before:top-1/2 before:-translate-y-1/2 before:rounded-3xl before:bg-slate-800/50 before:content-[""] dark:text-white dark:opacity-60 dark:before:bg-white dark:before:opacity-80'}`}
                              >
                                {isSidebarMini && !isHovering ? (
                                  <span className="block text-sm text-center">{subItem.label.slice(0, 1)}</span>
                                ) : (
                                  <span className="transition-all duration-100 pointer-events-none ease-soft">{subItem.label}</span>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </>
                ) : (
                  <Link 
                    href={item.toggleOnly ? '#' : item.href}
                    onClick={(e) => {
                      if (item.toggleOnly) {
                        e.preventDefault();
                        toggleSection(item.label.toLowerCase());
                      } else {
                        handleNavItemClick();
                      }
                    }}
                    className={`group ease-soft-in-out text-sm py-2.7 my-0 mx-4 flex items-center whitespace-nowrap rounded-lg px-4 transition-all ${isActive ? 'bg-white shadow-soft-xl font-semibold text-slate-700' : 'font-medium text-slate-500'} dark:text-white dark:opacity-80`}
                  >
                    <div className={`${isActive ? 'stroke-none shadow-soft-sm bg-gradient-to-tl from-purple-700 to-pink-500 text-white' : 'stroke-none shadow-soft-2xl bg-white text-center text-black'} mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-center fill-current p-2.5 z-10`}>
                      {item.icon}
                    </div>
                    {(!isSidebarMini || isHovering) && (
                      <span className="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">
                        {item.label}
                      </span>
                    )}
                    {item.toggleOnly && !isSidebarMini && (
                      <i className={`ml-auto fa fa-caret-down text-xs transition-transform duration-300 ease-soft-in-out ${expandedSection === item.label.toLowerCase() ? 'rotate-180' : ''} opacity-60 text-slate-500`}></i>
                    )}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Help Card - Positioned relative to the bottom of the navigation */}
      {isNeedHelp && (!isSidebarMini || isHovering) && (
        <div className="pt-4 mx-4 mt-4">
          <div className="after:opacity-65 after:bg-gradient-to-tl after:from-slate-600 after:to-slate-300 relative flex min-w-0 flex-col items-center break-words rounded-2xl border-0 border-solid border-blue-900 bg-white bg-clip-border shadow-none after:absolute after:top-0 after:bottom-0 after:left-0 after:z-10 after:block after:h-full after:w-full after:rounded-2xl after:content-['']" data-sidenav-card>
            <div className="absolute w-full h-full bg-center bg-cover mb-7 rounded-2xl" style={{backgroundImage: "url('/assets/img/curved-images/white-curved.jpg')"}}></div>
            <div className="relative z-20 flex-auto w-full p-4 text-left text-white">
              <div className="flex items-center justify-center w-8 h-8 mb-4 text-center bg-white bg-center rounded-lg icon shadow-soft-2xl">
                <i className="top-0 z-10 text-lg leading-none text-transparent ni ni-diamond bg-gradient-to-tl from-slate-600 to-slate-300 bg-clip-text opacity-80" aria-hidden="true" data-sidenav-card-icon></i>
              </div>
              <div className="transition-all duration-200 ease-nav-brand">
                <h6 className="mb-0 text-white">Need help?</h6>
                <p className="mt-0 mb-4 text-xs font-semibold leading-tight">Please check our docs</p>
                <a href="#" target="_blank" className="inline-block w-full px-8 py-2 mb-0 text-xs font-bold text-center text-black uppercase transition-all ease-in bg-white border-0 border-white rounded-lg shadow-soft-md bg-150 leading-pro hover:shadow-soft-2xl hover:scale-102">Documentation</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  useEffect(() => {
    // This effect will update the main content margin when sidebar state changes
    const mainContent = document.querySelector('main');
    if (mainContent) {
      if (isSidebarMini && !isHovering) {
        mainContent.classList.remove('xl:ml-[17rem]');
        mainContent.classList.add('xl:ml-24');
      } else if (isSidebarMini && isHovering) {
        mainContent.classList.remove('xl:ml-24');
        mainContent.classList.add('xl:ml-[17rem]');
      } else if (!isSidebarMini) {
        mainContent.classList.remove('xl:ml-24');
        mainContent.classList.add('xl:ml-[17rem]');
      }
    }
  }, [isSidebarMini, isHovering]);

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
        className={`fixed inset-y-0 left-0 flex-wrap items-center justify-between block p-0 my-4 overflow-hidden transition-all duration-200 ease-soft-in-out z-990 ${isSidebarMini && !isHovering ? 'w-[80px]' : 'w-64'} rounded-2xl xl:ml-4 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} bg-white border-0 shadow-none dark:bg-gray-950 xl:translate-x-0 xl:bg-transparent`}
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