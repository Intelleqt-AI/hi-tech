import React, { createContext, useContext, useEffect, useState } from 'react';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at?: string;
  updated_at?: string;
  user_id: string;
}

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
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

// Helper function to decode JWT token payload
const decodeJwtPayload = (token: string): any | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('access');
        const storedUser = localStorage.getItem('user');

        if (token) {
          // Try to parse stored user data first
          let parsedUser: User | null = null;

          if (storedUser && storedUser !== 'undefined') {
            try {
              parsedUser = JSON.parse(storedUser);
            } catch (e) {
              // Silently fail if stored user is invalid
            }
          }

          // If no stored user, try to extract from JWT
          if (!parsedUser) {
            const tokenPayload = decodeJwtPayload(token);
            if (tokenPayload) {
              parsedUser = {
                id: tokenPayload.user_id || tokenPayload.sub || 'authenticated',
                email: tokenPayload.email || 'user@example.com',
                first_name: tokenPayload.first_name,
                last_name: tokenPayload.last_name,
                full_name: tokenPayload.full_name || `${tokenPayload.first_name || ''} ${tokenPayload.last_name || ''}`.trim() || 'User',
                role: tokenPayload.role || 'user',
              };
            }
          }

          if (parsedUser) {
            setUser(parsedUser);
            setProfile({
              id: parsedUser.id,
              email: parsedUser.email,
              full_name: parsedUser.full_name || `${parsedUser.first_name || ''} ${parsedUser.last_name || ''}`.trim() || 'User',
              role: parsedUser.role || 'user',
              user_id: parsedUser.id,
            });
          } else {
            // Fallback: Token exists but we couldn't extract user info
            const minimalUser: User = { id: 'authenticated', email: 'user@example.com' };
            setUser(minimalUser);
            setProfile({
              id: 'authenticated',
              email: 'user@example.com',
              full_name: 'Authenticated User',
              role: 'user',
              user_id: 'authenticated',
            });
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

  const signOut = async () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setUser(null);
    setProfile(null);
    window.location.href = '/login';
  };

  const value = {
    user,
    profile,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
