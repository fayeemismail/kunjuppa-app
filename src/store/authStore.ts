import { create } from 'zustand';
import { User } from '@/types';
import { storage } from '@/lib/storage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  checkAuth: () => {
    storage.initializeSeedData();
    const stored = storage.getAuthUser();
    if (stored) {
      set({ user: stored, isAuthenticated: true, isLoading: false });
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: (email, password) => {
    const trimmedEmail = email.trim().toLowerCase();
    // Validate credentials
    if (trimmedEmail === 'admin@example.com' && password === 'Admin@123') {
      const demoUser: User = {
        id: 'usr-admin-01',
        name: 'Kunjuppa Admin',
        email: 'admin@example.com',
        role: 'admin',
      };
      storage.setAuthUser(demoUser);
      set({ user: demoUser, isAuthenticated: true });
      return { success: true };
    }

    return {
      success: false,
      error: 'Invalid credentials. Use email: admin@example.com and password: Admin@123',
    };
  },

  logout: () => {
    storage.setAuthUser(null);
    set({ user: null, isAuthenticated: false });
  },
}));
