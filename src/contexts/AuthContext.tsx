
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at?: string;
  updated_at?: string;
  user_id: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('access');

        if (token) {
          let parsedUser = null;
          try {
            if (storedUser && storedUser !== 'undefined') {
              parsedUser = JSON.parse(storedUser);
            }
          } catch (e) {
            // Silently fail if stored user is invalid
          }

          if (parsedUser) {
            setUser(parsedUser);
            setProfile({
              id: parsedUser.id || parsedUser.pk || '',
              email: parsedUser.email || '',
              full_name: parsedUser.full_name || parsedUser.username || 'User',
              role: parsedUser.role || 'user',
              user_id: parsedUser.id || parsedUser.pk || ''
            });
          } else {
            const minimalUser = { id: 'authenticated', email: 'user@example.com' };
            setUser(minimalUser);
            setProfile({
              id: 'authenticated',
              email: 'user@example.com',
              full_name: 'Authenticated User',
              role: 'user',
              user_id: 'authenticated'
            });
          }
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error('AuthProvider: Init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('AuthProvider: Profile fetch error:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    // This will be handled by useLogin hook in AuthPage
    // But we can keep it here if needed
    throw new Error("Use useLogin hook for signing in");
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    localStorage.clear();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    window.location.href = '/';
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
