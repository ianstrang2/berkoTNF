'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const TeamAlgorithm = dynamic(() => import('@/components/admin/TeamAlgorithm'), { ssr: false });
const PlayerRatings = dynamic(() => import('@/components/admin/PlayerRatings'), { ssr: false });
const SuperAdminPanel = dynamic(() => import('@/components/admin/SuperAdminPanel'), { ssr: false });
const SuperAdminLayout = dynamic(() => import('@/components/admin/SuperAdminLayout'), { ssr: false });

const AdminPanel = () => {
  const [currentSection, setCurrentSection] = useState(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!currentSection ? (
        <div>
          <h1 className="text-4xl font-bold text-center text-primary-600 mb-8">
            Admin Dashboard
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card 
              onClick={() => setCurrentSection('algorithm')}
              className="hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-primary-50 rounded-lg text-primary-600 group-hover:bg-primary-100 transition-colors duration-200">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.871 4A17.926 17.926 0 003 12c0 2.874.673 5.59 1.871 8m14.13 0a17.926 17.926 0 001.87-8c0-2.874-.673-5.59-1.87-8M9 9h1.246a1 1 0 01.961.725l1.586 5.55a1 1 0 00.961.725H15m1-7h-.08a2 2 0 00-1.519.698L9.6 15.302A2 2 0 018.08 16H8" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors duration-200">
                Team Algorithm
              </h2>
              <p className="text-gray-600">
                Generate balanced teams based on player attributes
              </p>
            </Card>

            <Card
              onClick={() => setCurrentSection('ratings')}
              className="hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-primary-50 rounded-lg text-primary-600 group-hover:bg-primary-100 transition-colors duration-200">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors duration-200">
                Player Ratings
              </h2>
              <p className="text-gray-600">
                Update player attributes and ratings
              </p>
            </Card>

            <Card
              onClick={() => setCurrentSection('superadmin')}
              className="hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden group col-span-1 md:col-span-2"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-red-50 rounded-lg text-red-600 group-hover:bg-red-100 transition-colors duration-200">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-red-600 transition-colors duration-200">
                Super Admin Access
              </h2>
              <p className="text-gray-600">
                Access advanced management features
              </p>
            </Card>
          </div>
        </div>
      ) : (
        <div>
          <Button
            onClick={() => setCurrentSection(null)}
            variant="primary"
            size="md"
            className="mb-6"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            }
          >
            Back to Dashboard
          </Button>
          {currentSection === 'algorithm' && <TeamAlgorithm />}
          {currentSection === 'ratings' && <PlayerRatings />}
          {currentSection === 'superadmin' && (
            <SuperAdminLayout>
              <SuperAdminPanel />
            </SuperAdminLayout>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
