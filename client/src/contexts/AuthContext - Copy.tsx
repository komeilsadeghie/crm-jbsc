import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get user info
      // For now, we'll just check if token exists
      // In production, verify with backend
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
    } catch (error: any) {
      // بررسی نوع خطا
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        throw new Error('سرور بک‌اند در حال اجرا نیست. لطفاً ابتدا سرور را با دستور "npm run dev:server" اجرا کنید.');
      }
      if (error.response?.status === 401) {
        throw new Error('نام کاربری یا رمز عبور اشتباه است');
      }
      if (error.response?.status === 500) {
        throw new Error('خطا در سرور. لطفاً لاگ‌های سرور را بررسی کنید.');
      }
      throw new Error(error.response?.data?.error || error.message || 'خطا در ورود به سیستم');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

