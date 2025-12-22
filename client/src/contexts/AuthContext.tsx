import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export type UserRole = 'admin' | 'sales' | 'sales_manager' | 'coach' | 'coach_manager' | 'media' | 'media_manager' | 'designer' | 'finance' | 'user';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normaliseUser = (payload: any): User => {
  // تبدیل role به lowercase و اطمینان از اینکه یکی از نقش‌های مجاز است
  let role = (payload.role || 'user').toString().toLowerCase() as UserRole;
  const validRoles: UserRole[] = ['admin', 'sales', 'sales_manager', 'coach', 'coach_manager', 'media', 'media_manager', 'designer', 'finance', 'user'];
  if (!validRoles.includes(role)) {
    console.warn(`Invalid role "${payload.role}", defaulting to "user"`);
    role = 'user';
  }
  
  return {
    id: payload.id,
    username: payload.username,
    email: payload.email,
    fullName: payload.fullName ?? payload.full_name ?? '',
    phone: payload.phone ?? null,
    avatarUrl: payload.avatarUrl ?? null,
    role: role,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get('/profile/me');
      setUser(normaliseUser(response.data));
    } catch (error) {
      console.error('Failed to fetch profile', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user: userPayload } = response.data;
      localStorage.setItem('token', token);
      setUser(normaliseUser(userPayload));
    } catch (error: any) {
      console.error('Login error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        response: error.response?.data,
        config: error.config
      });

      // Network errors
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || error.message?.includes('ERR_NETWORK')) {
        throw new Error('سرور بک‌اند در حال اجرا نیست. لطفاً ابتدا سرور را با دستور "npm run dev:server" اجرا کنید.');
      }
      
      // 404 errors
      if (error.response?.status === 404) {
        throw new Error('آدرس API یافت نشد. لطفاً مطمئن شوید که سرور روی پورت 3001 در حال اجرا است.');
      }
      
      // 401 errors
      if (error.response?.status === 401) {
        throw new Error('نام کاربری یا رمز عبور اشتباه است');
      }
      
      // 500 errors
      if (error.response?.status === 500) {
        throw new Error('خطا در سرور. لطفاً لاگ‌های سرور را بررسی کنید.');
      }
      
      // Other errors
      throw new Error(error.response?.data?.error || error.message || 'خطا در ورود به سیستم');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refetchProfile = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refetchProfile }}>
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

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'مدیر سیستم',
  sales: 'فروش',
  sales_manager: 'مدیر فروش',
  coach: 'کوچ',
  coach_manager: 'مدیر کوچ',
  media: 'مدیا',
  media_manager: 'مدیر مدیا',
  designer: 'طراح سایت',
  finance: 'مالی',
  user: 'کاربر',
};

export const translateRole = (role: UserRole) => ROLE_LABELS[role] || role;

