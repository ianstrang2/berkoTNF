import React, { useState } from 'react';

const Sidebar = ({ 
  brandName = "Soft UI Dashboard PRO", 
  logoLight = "/assets/img/logo-ct-dark.png", 
  logoDark = "/assets/img/logo-ct.png", 
  navItems = [], 
  isNeedHelp = true,
  docsUrl = "https://www.creative-tim.com/learning-lab/tailwind/html/quick-start/soft-ui-dashboard/"
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  // Mobile class handling
  const mobileClasses = isMobileOpen ? 'translate-x-0' : '-translate-x-full';

  return (
    <>
      {/* Mobile Toggle Button (outside sidebar) */}
      <button 
        onClick={toggleMobileMenu}
        className="fixed bottom-4 right-4 z-[999] p-3 bg-primary-500 text-white rounded-full shadow-lg xl:hidden"
      >
        {isMobileOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 flex-wrap items-center justify-between block w-full p-0 my-4 overflow-y-auto transition-all duration-200 ${mobileClasses} bg-white border-0 shadow-none xl:ml-4 dark:bg-gray-950 ease-soft-in-out z-990 max-w-64 rounded-2xl xl:translate-x-0 xl:bg-transparent`}
      >
        <div className="h-20">
          {/* Close Button - Mobile Only */}
          <button 
            onClick={toggleMobileMenu}
            className="absolute top-0 right-0 p-4 opacity-50 cursor-pointer text-slate-400 dark:text-white xl:hidden"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Brand/Logo */}
          <a className="block px-8 py-6 m-0 text-sm whitespace-nowrap text-slate-700 dark:text-white" href="#" target="_blank">
            <img src={logoLight} className="inline-block h-full max-w-full transition-all duration-200 ease-soft-in-out max-h-8 dark:hidden" alt="main_logo" />
            <img src={logoDark} className="hidden h-full max-w-full transition-all duration-200 ease-soft-in-out max-h-8 dark:inline-block" alt="main_logo" />
            <span className="ml-1 font-semibold transition-all duration-200 ease-soft-in-out">{brandName}</span>
          </a>
        </div>
        
        <hr className="h-px mt-0 bg-transparent bg-gradient-to-r from-transparent via-black/40 to-transparent dark:bg-gradient-to-r dark:from-transparent dark:via-white dark:to-transparent" />

        {/* Navigation Items */}
        <div className="items-center block w-full h-auto grow basis-full" id="sidenav-collapse-main">
          <ul className="flex flex-col pl-0 mb-0 list-none">
            {navItems.map((item, index) => (
              <li key={index} className="mt-0.5 w-full">
                <a 
                  href={item.route} 
                  className={`${item.isActive ? 'bg-white shadow-soft-xl dark:bg-gray-700' : ''} py-2.7 text-sm ease-nav-brand my-0 mx-4 flex items-center whitespace-nowrap px-4 transition-colors dark:text-white dark:opacity-80`}
                >
                  {item.icon && (
                    <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white bg-center stroke-0 text-center xl:p-2.5">
                      {item.icon}
                    </div>
                  )}
                  <span className="ml-1 duration-300 opacity-100 pointer-events-none ease-soft">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Help Card */}
        {isNeedHelp && (
          <div className="pt-4 mx-4 mt-4">
            <div className="relative flex min-w-0 flex-col items-center break-words rounded-2xl border-0 bg-white bg-clip-border shadow-none after:absolute after:top-0 after:bottom-0 after:left-0 after:z-10 after:block after:h-full after:w-full after:rounded-2xl after:content-[''] after:opacity-65 after:bg-gradient-to-tl after:from-slate-600 after:to-slate-300">
              <div className="absolute w-full h-full bg-center bg-cover mb-7 rounded-2xl" style={{ backgroundImage: "url('/assets/img/curved-images/white-curved.jpg')" }}></div>
              <div className="relative z-20 flex-auto w-full p-4 text-left text-white">
                <div className="flex items-center justify-center w-8 h-8 mb-4 text-center bg-white bg-center rounded-lg icon shadow-soft-2xl">
                  <i className="top-0 z-10 text-transparent ni leading-none ni-diamond text-lg bg-gradient-to-tl from-slate-600 to-slate-300 bg-clip-text opacity-80"></i>
                </div>
                <div className="transition-all duration-200 ease-nav-brand">
                  <h6 className="mb-0 text-white">Need help?</h6>
                  <p className="mt-0 mb-4 font-semibold leading-tight text-xs">Please check our docs</p>
                  <a href={docsUrl} target="_blank" rel="noreferrer" className="inline-block w-full px-8 py-2 mb-0 font-bold text-center text-black uppercase transition-all ease-in bg-white border-0 border-white rounded-lg shadow-soft-md bg-150 leading-pro text-xs hover:shadow-soft-2xl hover:scale-102">Documentation</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar; 