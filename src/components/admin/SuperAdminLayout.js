import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const SuperAdminLayout = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const superAdminAuth = localStorage.getItem('superAdminAuth');
    if (superAdminAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'wee') {
      localStorage.setItem('superAdminAuth', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Card>
            <h2 className="text-2xl font-bold mb-6 text-center text-primary-600">Super Admin Access</h2>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm font-medium text-center">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                variant="primary"
                className="w-full"
              >
                Login
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SuperAdminLayout; 