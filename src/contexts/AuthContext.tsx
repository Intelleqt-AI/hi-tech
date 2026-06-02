import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchData } from '@/lib/Api';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role: string;
  date_joined?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (): Promise<User | null> => {
    try {
      const data = await fetchData('users/profile/');
      return {
        id: String(data.id),
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email,
        role: data.role || 'member',
        date_joined: data.date_joined,
      };
    } catch {
      return null;
    }
  };

  const initAuth = async () => {
    const token = localStorage.getItem('access');
    if (!token) {
      setLoading(false);
      return;
    }
    const profile = await fetchProfile();
    setUser(profile);
    setLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const refetchUser = async () => {
    const profile = await fetchProfile();
    if (profile) setUser(profile);
  };

  const signOut = async () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};
