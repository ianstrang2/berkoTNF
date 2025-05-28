import React, { useState, useEffect, ReactNode } from 'react';
import Button from '@/components/ui-kit/Button.component';
import SoftCard from '@/components/ui-kit/SoftCard.component';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'poo') { // Intentionally kept simple password for local dev
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
        <SoftCard>
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
        </SoftCard>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminLayout;
