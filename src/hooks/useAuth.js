import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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