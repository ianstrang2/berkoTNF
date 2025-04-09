import React, { useState } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface BreadcrumbItem {
  name: string;
  path: string;
}

interface NavbarProps {
  pageTitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  searchPlaceholder?: string;
}

const Navbar: React.FC<NavbarProps> = ({ 
  pageTitle = "", 
  breadcrumbs = [],
  searchPlaceholder = "Type here..."
}) => {
  const { sidebarOpen, setSidebarOpen, isMobileView } = useNavigation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname() || '';

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // Generate page title from pathname if not provided
  const displayPageTitle = pageTitle || pathname.split('/').pop() || 'Dashboard';
  const formattedPageTitle = displayPageTitle.charAt(0).toUpperCase() + displayPageTitle.slice(1).replace(/-/g, ' ');
  
  // Generate breadcrumbs from pathname if not provided
  const displayBreadcrumbs = breadcrumbs.length > 0 ? breadcrumbs : [
    { name: "Pages", path: "#" },
    ...pathname.split('/').filter(Boolean).map((part, index, array) => ({
      name: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
      path: `/${array.slice(0, index + 1).join('/')}`
    }))
  ];

  if (displayBreadcrumbs.length === 1) {
    displayBreadcrumbs.push({ name: "Dashboard", path: "/" });
  }

  return (
    <nav className="relative flex flex-wrap items-center justify-between px-0 py-2 mx-6 transition-all ease-in shadow-none duration-250 rounded-2xl top-0 z-20 lg:flex-nowrap lg:justify-start">
      <div className="flex items-center justify-between w-full px-4 py-1 mx-auto flex-wrap-inherit">
        {/* Left side - Navigation */}
        <nav className="max-sm:w-full">
          {/* breadcrumb */}
          <ol className="flex flex-wrap pt-1 mr-12 bg-transparent rounded-lg sm:mr-16">
            {displayBreadcrumbs.map((item, index) => (
              <li key={index} className={`text-sm leading-[21px] ${index > 0 ? 'pl-2 before:float-left before:pr-2 before:text-[#344767]/40 before:content-["/"]' : ''}`}>
                <Link 
                  href={item.path} 
                  className={`${index === displayBreadcrumbs.length - 1 ? 'text-[#344767]' : 'opacity-50 text-[#344767]'} font-normal hover:text-[#344767]`}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ol>
          <h6 className="mb-0 font-bold text-base leading-[26px] text-[#344767] capitalize">{formattedPageTitle}</h6>
        </nav>

        {/* Mobile layout container - Reorganizes on small screens */}
        <div className="flex items-center max-sm:w-full max-sm:mt-4 max-sm:justify-between">
          {/* Search section - Left aligned on mobile */}
          <div className="flex items-center md:ml-auto md:pr-4 max-sm:ml-0 max-sm:pr-0 max-sm:w-auto">
            <div className="relative flex flex-wrap items-stretch w-full transition-all rounded-lg ease-soft">
              <span className="text-sm ease-soft leading-5.6 absolute z-10 -ml-px flex h-full items-center whitespace-nowrap rounded-lg rounded-tr-none rounded-br-none border border-r-0 border-transparent bg-transparent py-2 px-2.5 text-center font-normal text-slate-500 transition-all">
                <i className="ni ni-zoom-split-in text-[#67748e]"></i>
              </span>
              <input
                placeholder={searchPlaceholder}
                className="pl-9 pr-3 py-2.5 text-sm focus:shadow-soft-primary-outline ease w-1/100 leading-5.6 relative -ml-px block min-w-0 flex-auto rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding text-[#67748e] transition-all placeholder:text-[#67748e]/80 focus:border-fuchsia-300 focus:outline-none focus:transition-shadow"
              />
            </div>
          </div>
          
          {/* Right side controls - Hamburger menu + Sign In */}
          <ul className="flex flex-row items-center justify-end pl-0 mb-0 list-none">
            {/* Mobile menu toggle */}
            <li className="flex items-center pl-4 md:hidden">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="block p-0 transition-all ease-nav-brand text-sm text-[#67748e]"
                aria-expanded={sidebarOpen}
              >
                <div className="w-4.5 overflow-hidden">
                  <i className="ease-soft mb-0.75 relative block h-0.5 rounded-sm bg-[#67748e] transition-all"></i>
                  <i className="ease-soft mb-0.75 relative block h-0.5 rounded-sm bg-[#67748e] transition-all"></i>
                  <i className="ease-soft relative block h-0.5 rounded-sm bg-[#67748e] transition-all"></i>
                </div>
              </button>
            </li>
            
            {/* User profile/Sign In */}
            <li className="relative flex items-center pl-4">
              {/* Desktop: User Icon */}
              <div className="hidden sm:block">
                <button
                  onClick={toggleDropdown}
                  className="p-0 flex items-center transition-all text-sm ease-nav-brand"
                >
                  <div className="flex items-center justify-center w-10 h-10 text-white shadow-soft-2xl rounded-xl bg-gradient-to-tl from-purple-700 to-pink-500">
                    <i className="ni ni-single-02 text-white text-lg"></i>
                  </div>
                </button>
                
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 z-10 w-48 py-2 bg-white rounded-lg shadow-soft-3xl border-0">
                    <a href="#" className="block px-4 py-2 text-sm font-normal text-[#67748e] hover:bg-gray-100">Profile</a>
                    <a href="#" className="block px-4 py-2 text-sm font-normal text-[#67748e] hover:bg-gray-100">Settings</a>
                    <div className="h-px my-2 bg-gradient-to-r from-transparent via-black/40 to-transparent"></div>
                    <a href="#" className="block px-4 py-2 text-sm font-normal text-[#67748e] hover:bg-gray-100">
                      <i className="ni ni-button-power mr-2 text-[#67748e]"></i>
                      Sign out
                    </a>
                  </div>
                )}
              </div>
              
              {/* Mobile: Sign In text */}
              <div className="sm:hidden">
                <a href="#" className="text-sm font-semibold text-[#344767] hover:text-[#344767]/80 transition-colors">
                  Sign In
                </a>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 