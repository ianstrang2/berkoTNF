import React from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
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
  const { sidebarOpen, setSidebarOpen } = useNavigation();
  const pathname = usePathname() || ''; // Provide empty string as fallback

  // Close sidebar when clicking on mobile
  const handleNavItemClick = () => {
    if (window.innerWidth < 768) { // md breakpoint
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar - hidden on small screens, visible on md and above */}
      <aside 
        className={`bg-[#f8f9fa] w-64 fixed inset-y-0 left-0 z-50 shadow-soft-xl rounded-xl ml-1 mt-4 pt-3 pb-4 px-4 overflow-y-auto transition-all duration-200 ease-soft-in-out hidden md:block md:z-10 md:translate-x-0`}
      >
        {/* Logo section */}
        <div className="flex justify-start">
          {/* Brand/Logo - with exactly the same layout as nav items */}
          <Link href="/" className="flex items-center py-2.5 px-4 mx-2">
            <div className="p-2 rounded-lg mr-3 flex items-center justify-center text-slate-700">
              <span className="flex items-center justify-center w-[18px] h-[18px]">
                <img src={logoLight} className="h-[18px] w-auto" alt="logo" />
              </span>
            </div>
            <span className="text-slate-700 font-semibold text-sm leading-6 font-sans">ScoreDraw</span>
          </Link>
        </div>
        
        <hr className="h-px mt-1 mb-2 bg-transparent bg-gradient-to-r from-transparent via-black/40 to-transparent" />

        {/* Navigation Items */}
        <div className="mb-24">
          <ul className="flex flex-col">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href || 
                              (item.href !== '/' && pathname.startsWith(item.href));
              
              return (
                <li key={index} className="mt-2">
                  <Link 
                    href={item.href} 
                    onClick={handleNavItemClick}
                    className={`flex items-center ${isActive ? 'py-2.5 px-4 w-full' : 'py-2 px-4'} mx-2 ${isActive ? 'rounded-lg font-semibold text-[#344767] bg-white shadow-soft-xl' : 'font-normal text-[#67748e]'} transition-colors`}
                  >
                    <div className={`w-8 h-8 p-2 mr-3 flex items-center justify-center ${isActive ? 'rounded-lg bg-gradient-to-tl from-purple-700 to-pink-500 shadow-soft-xl' : 'rounded-lg bg-white shadow-soft-md'}`}>
                      <span className={`flex items-center justify-center text-xs ${isActive ? 'text-white' : 'text-slate-700'}`}>
                        {item.icon}
                      </span>
                    </div>
                    <span className="text-sm leading-6">
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Help Card */}
        {isNeedHelp && (
          <div className="absolute bottom-6 w-full px-4 left-0">
            <div className="bg-gradient-to-tl from-slate-600 to-slate-300 rounded-xl p-4 text-white relative overflow-hidden">
              <div className="absolute inset-0 w-full h-full bg-center bg-cover opacity-30 bg-[url('/assets/img/curved-images/white-curved.jpg')]"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-center w-8 h-8 mb-3 text-center bg-white rounded-lg">
                  <i className="ni ni-support-16 text-lg bg-gradient-to-tl from-slate-600 to-slate-300 bg-clip-text text-transparent"></i>
                </div>
                <h5 className="mb-0 font-bold">Need help?</h5>
                <p className="mt-0 mb-4 text-xs font-semibold text-white/80">
                  Contact our support team
                </p>
                <a href="#" target="_blank" rel="noreferrer" className="inline-block w-full px-5 py-2.5 mb-0 font-bold text-center text-[#344767] uppercase align-middle transition-all bg-white border-0 rounded-lg cursor-pointer text-xs shadow-soft-md bg-150 ease-in tracking-tight">Documentation</a>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar - only visible when toggled */}
      {sidebarOpen && (
        <aside 
          className="bg-[#f8f9fa] w-64 fixed inset-y-0 left-0 z-50 shadow-soft-xl pt-3 pb-4 px-4 overflow-y-auto transition-all duration-200 ease-soft-in-out block md:hidden"
        >
          {/* Logo section */}
          <div className="flex justify-start">
            {/* Close Button - Mobile Only */}
            <button 
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1 opacity-50 cursor-pointer text-slate-400"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Brand/Logo - with exactly the same layout as nav items */}
            <Link href="/" className="flex items-center py-2.5 px-4 mx-2">
              <div className="p-2 rounded-lg mr-3 flex items-center justify-center text-slate-700">
                <span className="flex items-center justify-center w-[18px] h-[18px]">
                  <img src={logoLight} className="h-[18px] w-auto" alt="logo" />
                </span>
              </div>
              <span className="text-slate-700 font-semibold text-sm leading-6 font-sans">ScoreDraw</span>
            </Link>
          </div>
          
          <hr className="h-px mt-1 mb-2 bg-transparent bg-gradient-to-r from-transparent via-black/40 to-transparent" />

          {/* Navigation Items */}
          <div className="mb-24">
            <ul className="flex flex-col">
              {navItems.map((item, index) => {
                const isActive = pathname === item.href || 
                                (item.href !== '/' && pathname.startsWith(item.href));
                
                return (
                  <li key={index} className="mt-2">
                    <Link 
                      href={item.href} 
                      onClick={handleNavItemClick}
                      className={`flex items-center ${isActive ? 'py-2.5 px-4 w-full' : 'py-2 px-4'} mx-2 ${isActive ? 'rounded-lg font-semibold text-[#344767] bg-white shadow-soft-xl' : 'font-normal text-[#67748e]'} transition-colors`}
                    >
                      <div className={`w-8 h-8 p-2 mr-3 flex items-center justify-center ${isActive ? 'rounded-lg bg-gradient-to-tl from-purple-700 to-pink-500 shadow-soft-xl' : 'rounded-lg bg-white shadow-soft-md'}`}>
                        <span className={`flex items-center justify-center text-xs ${isActive ? 'text-white' : 'text-slate-700'}`}>
                          {item.icon}
                        </span>
                      </div>
                      <span className="text-sm leading-6">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Help Card */}
          {isNeedHelp && (
            <div className="absolute bottom-6 w-full px-4 left-0">
              <div className="bg-gradient-to-tl from-slate-600 to-slate-300 rounded-xl p-4 text-white relative overflow-hidden">
                <div className="absolute inset-0 w-full h-full bg-center bg-cover opacity-30 bg-[url('/assets/img/curved-images/white-curved.jpg')]"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-center w-8 h-8 mb-3 text-center bg-white rounded-lg">
                    <i className="ni ni-support-16 text-lg bg-gradient-to-tl from-slate-600 to-slate-300 bg-clip-text text-transparent"></i>
                  </div>
                  <h5 className="mb-0 font-bold">Need help?</h5>
                  <p className="mt-0 mb-4 text-xs font-semibold text-white/80">
                    Contact our support team
                  </p>
                  <a href="#" target="_blank" rel="noreferrer" className="inline-block w-full px-5 py-2.5 mb-0 font-bold text-center text-[#344767] uppercase align-middle transition-all bg-white border-0 rounded-lg cursor-pointer text-xs shadow-soft-md bg-150 ease-in tracking-tight">Documentation</a>
                </div>
              </div>
            </div>
          )}
        </aside>
      )}
    </>
  );
};

export default Sidebar; 