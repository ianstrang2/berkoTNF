'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export default function NavItem({ href, icon, label }: NavItemProps) {
  const pathname = usePathname() || '';
  const isActive = pathname === href || 
                  (href !== '/' && pathname.startsWith(href)) ||
                  (href === '/records' && pathname.startsWith('/records/')) ||
                  (href === '/admin' && pathname.startsWith('/admin/'));

  return (
    <Link 
      href={href}
      className={`flex items-center space-x-2 p-2 rounded-md transition-colors ${
        isActive 
          ? 'text-primary-600 bg-primary-50' 
          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
      }`}
    >
      <div className="w-5 h-5">
        {icon}
      </div>
      {label && <span className="text-sm font-medium">{label}</span>}
    </Link>
  );
} 