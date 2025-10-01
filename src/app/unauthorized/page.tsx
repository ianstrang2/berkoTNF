/**
 * Unauthorized Page
 * 
 * /unauthorized
 * Shown when user tries to access a route they don't have permission for
 */

'use client';

import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="rounded-md bg-yellow-50 p-6">
          <h1 className="text-6xl font-bold text-yellow-800 mb-4">403</h1>
          <h2 className="text-2xl font-semibold text-yellow-900 mb-2">
            Access Denied
          </h2>
          <p className="text-yellow-700 mb-6">
            You don't have permission to access this page.
          </p>
          <div className="space-x-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              Go Back
            </button>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

