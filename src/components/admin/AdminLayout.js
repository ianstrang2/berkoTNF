import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';

const AdminLayout = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'poo') {
      localStorage.setItem('adminAuth', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="w-full">
        <Card>
          <h2 className="text-xl font-bold mb-4 text-primary-600">Admin Access</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm font-medium">
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
    );
  }

  return <>{children}</>;
};

console.log('AdminLayoutComponent file is being loaded');

export default AdminLayout;