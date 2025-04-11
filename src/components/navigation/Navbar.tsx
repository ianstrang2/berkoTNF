'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigation } from '@/contexts/NavigationContext';

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
  const { sidebarOpen, setSidebarOpen, isSidebarMini, toggleSidebarMini } = useNavigation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLLIElement>(null);
  const pathname = usePathname() || '';
  const [isClient, setIsClient] = useState(false);

  // Mark as client-side rendered
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    // Skip during server rendering
    if (!isClient) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isClient]);

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

  if (displayBreadcrumbs.length === 0) {
    displayBreadcrumbs.push({ name: "Dashboard", path: "/" });
  }

  return (
    <nav navbar-main="true" className="relative flex flex-wrap items-center justify-between px-0 py-2 mx-6 mt-6 transition-all shadow-none duration-250 ease-soft-in rounded-2xl lg:flex-nowrap lg:justify-start" navbar-scroll="true">
      <div className="flex items-center justify-between w-full px-4 py-1 mx-auto flex-wrap-inherit">
        <nav>
          {/* breadcrumb */}
          <ol className="flex flex-wrap pt-1 mr-12 bg-transparent rounded-lg sm:mr-16">
            <li className="text-sm leading-normal breadcrumb-item">
              <Link href="/" className="text-slate-700 opacity-30 dark:text-white">
                <svg width="12px" height="12px" className="mb-1" viewBox="0 0 45 40" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
                  <title>home</title>
                  <g className="dark:fill-white" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                    <g className="dark:fill-white" transform="translate(-1716.000000, -439.000000)" fill="#252f40" fillRule="nonzero">
                      <g className="dark:fill-white" transform="translate(1716.000000, 291.000000)">
                        <g className="dark:fill-white" transform="translate(0.000000, 148.000000)">
                          <path d="M46.7199583,10.7414583 L40.8449583,0.949791667 C40.4909749,0.360605034 39.8540131,0 39.1666667,0 L7.83333333,0 C7.1459869,0 6.50902508,0.360605034 6.15504167,0.949791667 L0.280041667,10.7414583 C0.0969176761,11.0460037 -1.23209662e-05,11.3946378 -1.23209662e-05,11.75 C-0.00758042603,16.0663731 3.48367543,19.5725301 7.80004167,19.5833333 L7.81570833,19.5833333 C9.75003686,19.5882688 11.6168794,18.8726691 13.0522917,17.5760417 C16.0171492,20.2556967 20.5292675,20.2556967 23.494125,17.5760417 C26.4604562,20.2616016 30.9794188,20.2616016 33.94575,17.5760417 C36.2421905,19.6477597 39.5441143,20.1708521 42.3684437,18.9103691 C45.1927731,17.649886 47.0084685,14.8428276 47.0000295,11.75 C47.0000295,11.3946378 46.9030823,11.0460037 46.7199583,10.7414583 Z"></path>
                          <path d="M39.198,22.4912623 C37.3776246,22.4928106 35.5817531,22.0149171 33.951625,21.0951667 L33.92225,21.1107282 C31.1430221,22.6838032 27.9255001,22.9318916 24.9844167,21.7998837 C24.4750389,21.605469 23.9777983,21.3722567 23.4960833,21.1018359 L23.4745417,21.1129513 C20.6961809,22.6871153 17.4786145,22.9344611 14.5386667,21.7998837 C14.029926,21.6054643 13.533337,21.3722507 13.0522917,21.1018359 C11.4250962,22.0190609 9.63246555,22.4947009 7.81570833,22.4912623 C7.16510551,22.4842162 6.51607673,22.4173045 5.875,22.2911849 L5.875,44.7220845 C5.875,45.9498589 6.7517757,46.9451667 7.83333333,46.9451667 L19.5833333,46.9451667 L19.5833333,33.6066734 L27.4166667,33.6066734 L27.4166667,46.9451667 L39.1666667,46.9451667 C40.2482243,46.9451667 41.125,45.9498589 41.125,44.7220845 L41.125,22.2822926 C40.4887822,22.4116582 39.8442868,22.4815492 39.198,22.4912623 Z"></path>
                        </g>
                      </g>
                    </g>
                  </g>
                </svg>
              </Link>
            </li>
            {displayBreadcrumbs.map((item, index) => (
              <li key={index} className={`text-sm ${index > 0 ? 'pl-2 leading-normal before:float-left before:pr-2 before:text-gray-600 before:content-["/"]' : 'leading-normal'}`}>
                <Link href={item.path} className={`${index === displayBreadcrumbs.length - 1 ? 'text-slate-700 capitalize dark:text-white dark:before:text-white' : 'opacity-50 text-slate-700 dark:text-white'}`}>
                  {item.name}
                </Link>
              </li>
            ))}
          </ol>
          <h6 className="mb-0 font-bold capitalize dark:text-white">{formattedPageTitle}</h6>
        </nav>

        <div className="flex items-center">
          <a
            onClick={toggleSidebarMini}
            href="javascript:;"
            className="hidden p-0 text-sm transition-all ease-nav-brand text-slate-500 xl:block"
            aria-expanded={isSidebarMini ? "true" : "false"}
          >
            <div className="w-4.5 overflow-hidden">
              <i className={`ease-soft mb-0.75 relative block h-0.5 ${isSidebarMini ? '' : 'translate-x-[5px]'} rounded-sm bg-slate-500 transition-all dark:bg-white`}></i>
              <i className="ease-soft mb-0.75 relative block h-0.5 rounded-sm bg-slate-500 transition-all dark:bg-white"></i>
              <i className={`ease-soft relative block h-0.5 ${isSidebarMini ? '' : 'translate-x-[5px]'} rounded-sm bg-slate-500 transition-all dark:bg-white`}></i>
            </div>
          </a>
        </div>

        <div className="flex items-center mt-2 grow sm:mt-0 sm:mr-6 md:mr-0 lg:flex lg:basis-auto" id="navbar">
          <div className="flex items-center md:ml-auto md:pr-4">
            {/* Search box removed */}
          </div>
          <ul className="flex flex-row justify-end pl-0 mb-0 list-none md-max:w-full">
            {/* Sign In, Settings, and Notifications icons removed */}
            <li className="flex items-center pl-4 xl:hidden">
              <a 
                href="javascript:;" 
                className="block p-0 text-sm transition-all ease-nav-brand text-slate-500 dark:text-white"
                aria-expanded={sidebarOpen ? "true" : "false"}
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <div className="w-4.5 overflow-hidden">
                  <i className="ease-soft mb-0.75 relative block h-0.5 rounded-sm bg-slate-500 transition-all dark:bg-white"></i>
                  <i className="ease-soft mb-0.75 relative block h-0.5 rounded-sm bg-slate-500 transition-all dark:bg-white"></i>
                  <i className="ease-soft relative block h-0.5 rounded-sm bg-slate-500 transition-all dark:bg-white"></i>
                </div>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 