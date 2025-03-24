import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/players', label: 'Players', icon: 'group' },
  { href: '/admin/teams', label: 'Teams', icon: 'sports_soccer' },
  { href: '/admin/matches', label: 'Matches', icon: 'event' },
  { href: '/admin/reports', label: 'Reports', icon: 'assessment' },
  { href: '/admin/users', label: 'Users', icon: 'manage_accounts' },
  { href: '/admin/app-setup', label: 'App Setup', icon: 'settings' },
];

const AdminNavbar = () => {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const isActive = (path) => {
    if (path === '/admin' && router.pathname === '/admin') {
      return true;
    }
    return router.pathname.startsWith(path) && path !== '/admin';
  };
  
  return (
    <>
      {/* Top mobile navbar */}
      <div className="lg:hidden bg-white shadow-md px-4 py-2 flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-green-500 material-icons-outlined mr-2">sports_soccer</span>
          <span className="font-semibold text-gray-800">PlayerPath Admin</span>
        </div>
        <button 
          onClick={toggleMobileMenu} 
          className="p-2 text-gray-600 hover:text-gray-900"
        >
          <span className="material-icons-outlined">
            {isMobileMenuOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>
      
      {/* Sidebar for desktop / Mobile menu */}
      <div className={`
        fixed top-0 left-0 h-screen bg-white shadow-lg z-50 transition-all duration-300 ease-in-out
        lg:w-64 lg:translate-x-0 lg:z-10
        ${isMobileMenuOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}
      `}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-center lg:justify-start">
            <span className="text-green-500 material-icons-outlined mr-2">sports_soccer</span>
            <span className="font-semibold text-gray-800">PlayerPath Admin</span>
          </div>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link 
                  href={item.href}
                  className={`
                    flex items-center p-2 rounded-md w-full text-sm font-medium transition-colors duration-200
                    ${isActive(item.href) 
                      ? 'bg-green-100 text-green-700' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
                  `}
                >
                  <span className="material-icons-outlined mr-3 text-inherit">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          
          <div className="pt-8 mt-8 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="flex items-center w-full p-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
            >
              <span className="material-icons-outlined mr-3">logout</span>
              Sign Out
            </button>
          </div>
        </nav>
      </div>
      
      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleMobileMenu}
        />
      )}
    </>
  );
};

export default AdminNavbar; 