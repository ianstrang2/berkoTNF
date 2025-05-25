'use client';
import React, { useState } from 'react';
import NavItem from './NavItem.component';
import Image from 'next/image';

export default function SideNav() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`hidden md:flex fixed left-0 top-0 h-full bg-white shadow-sm z-40 flex-col transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-56'}`}>
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        {!isCollapsed && (
          <div className="flex items-center justify-center w-full">
            <Image
              src="/img/logo.png"
              alt="Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="ml-2 font-semibold text-sm transition-all duration-200 ease-soft-in-out">StatKick</span>
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1 rounded-md text-neutral-500 hover:bg-neutral-100 transition-colors duration-200 ${!isCollapsed ? '' : 'w-full flex justify-center'}`}
        >
          {isCollapsed ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>
      
      <div className="flex-grow py-6">
        <div className={`flex ${isCollapsed ? 'flex-col items-center space-y-6' : 'flex-col space-y-2 px-3'}`}>
          <div className={isCollapsed ? 'w-full flex justify-center' : ''}>
            <NavItem
              href="/"
              icon={
                <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h2a1 1 0 001-1v-7m-6 0a1 1 0 00-1 1v3" />
                </svg>
              }
              label={isCollapsed ? '' : 'Dashboard'}
            />
          </div>
          
          <div className={isCollapsed ? 'w-full flex justify-center' : ''}>
            <NavItem
              href="/table"
              icon={
                <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
              label={isCollapsed ? '' : 'Table'}
            />
          </div>
          
          <div className={isCollapsed ? 'w-full flex justify-center' : ''}>
            <NavItem
              href="/records"
              icon={
                <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              }
              label={isCollapsed ? '' : 'Records'}
            />
          </div>
          
          <div className={isCollapsed ? 'w-full flex justify-center' : ''}>
            <NavItem
              href="/admin"
              icon={
                <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              label={isCollapsed ? '' : 'Admin'}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 