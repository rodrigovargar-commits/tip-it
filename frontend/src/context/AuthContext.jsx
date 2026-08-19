import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem('tipit_token');
    if (!token) {
      setUser(null);
      setWorker(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/users/me');
      setUser(data.user);
      setWorker(data.worker);
      localStorage.setItem('tipit_user', JSON.stringify(data.user));
    } catch {
      localStorage.removeItem('tipit_token');
      localStorage.removeItem('tipit_user');
      setUser(null);
      setWorker(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = async (token, userData) => {
    localStorage.setItem('tipit_token', token);
    localStorage.setItem('tipit_user', JSON.stringify(userData));
    setUser(userData);
    await refreshMe();
  };

  const logout = () => {
    localStorage.removeItem('tipit_token');
    localStorage.removeItem('tipit_user');
    setUser(null);
    setWorker(null);
  };

  return (
    <AuthContext.Provider value={{ user, worker, loading, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
