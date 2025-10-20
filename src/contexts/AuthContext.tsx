"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { login, logout, getAuthToken, setAuthToken } from '@/lib/api';

interface StaffInfo {
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  staffInfo: StaffInfo | null;
  token: string | null;
  login: (cin: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Start with false to avoid loading screen

  useEffect(() => {
    // Check for existing auth token on mount
    const savedToken = getAuthToken();
    if (savedToken) {
      try {
        const savedStaffInfo = localStorage.getItem('staffInfo');
        if (savedStaffInfo) {
          setToken(savedToken);
          setStaffInfo(JSON.parse(savedStaffInfo));
          setIsAuthenticated(true);
        } else {
          // Token exists but no staff info, clear token
          setAuthToken(null);
        }
      } catch (error) {
        console.error('Error loading saved auth data:', error);
        setAuthToken(null);
        localStorage.removeItem('staffInfo');
      }
    }
  }, []);

  const handleLogin = async (cin: string) => {
    console.log('AuthContext handleLogin called with CIN:', cin);
    try {
      console.log('Calling API login...');
      const response = await login(cin.trim());
      console.log('API login response:', response);
      const { token: newToken, staff } = response.data;
      
      console.log('Setting authentication state...');
      setToken(newToken);
      setStaffInfo({
        firstName: staff.firstName,
        lastName: staff.lastName
      });
      setIsAuthenticated(true);
      
      // Save to localStorage
      try {
        localStorage.setItem('staffInfo', JSON.stringify({
          firstName: staff.firstName,
          lastName: staff.lastName
        }));
        console.log('Staff info saved to localStorage');
      } catch (error) {
        console.error('Error saving staff info:', error);
      }
      console.log('Login completed successfully');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setStaffInfo(null);
      setIsAuthenticated(false);
      localStorage.removeItem('staffInfo');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        staffInfo,
        token,
        login: handleLogin,
        logout: handleLogout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
