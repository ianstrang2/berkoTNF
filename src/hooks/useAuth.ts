import { useState, useEffect } from 'react';

type User = {
  uid: string;
} | null;

export function useAuth() {
  const [user, setUser] = useState<User>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if user is authenticated via localStorage
    const isAuthenticated = localStorage.getItem('isAdmin') === 'true';
    setUser(isAuthenticated ? { uid: 'admin' } : null);
    setIsAdmin(isAuthenticated);
    setLoading(false);
  }, []);

  return { user, isAdmin, loading };
}

export default useAuth; 