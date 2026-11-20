import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserStats, UserSettings } from '../types';
import { api } from '../services/api';
import { signOutGoogle } from '../services/googleAuth';

interface AuthContextType {
  user: User | null;
  stats: UserStats | null;
  settings: UserSettings | null;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUserData = async () => {
    try {
      const profile = await api.users.getProfile();
      setUser(profile);
      const userStats = await api.users.getStats().catch(() => null);
      if (userStats) setStats(userStats);
      const userSettings = await api.users.getSettings().catch(() => null);
      if (userSettings) setSettings(userSettings);
    } catch (e) {
      setUser(null);
      localStorage.removeItem('paaaaaatify_access_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('paaaaaatify_access_token');
    if (token) {
      fetchUserData();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: any) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login(credentials);
      localStorage.setItem('paaaaaatify_access_token', res.access_token);
      localStorage.setItem('paaaaaatify_refresh_token', res.refresh_token);
      setUser(res.user);
      await fetchUserData();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(data);
      localStorage.setItem('paaaaaatify_access_token', res.access_token);
      localStorage.setItem('paaaaaatify_refresh_token', res.refresh_token);
      setUser(res.user);
      await fetchUserData();
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (credential: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.google(credential);
      localStorage.setItem('paaaaaatify_access_token', res.access_token);
      localStorage.setItem('paaaaaatify_refresh_token', res.refresh_token);
      setUser(res.user);
      await fetchUserData();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout().catch(() => {});
      await signOutGoogle().catch(() => {});
    } finally {
      localStorage.removeItem('paaaaaatify_access_token');
      localStorage.removeItem('paaaaaatify_refresh_token');
      setUser(null);
      setStats(null);
    }
  };

  const refreshProfile = async () => {
    await fetchUserData();
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = await api.users.updateSettings(newSettings);
    setSettings(updated);
  };

  const deleteAccount = async () => {
    try {
      await api.users.deleteAccount();
    } finally {
      localStorage.removeItem('paaaaaatify_access_token');
      localStorage.removeItem('paaaaaatify_refresh_token');
      setUser(null);
      setStats(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        stats,
        settings,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshProfile,
        updateSettings,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

