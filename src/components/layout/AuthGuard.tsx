'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useProductStore } from '@/store/productStore';
import { useCustomerStore } from '@/store/customerStore';
import { useOrderStore } from '@/store/orderStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useCartStore } from '@/store/cartStore';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const { loadProducts, isLoaded: productsLoaded } = useProductStore();
  const { loadCustomers, isLoaded: customersLoaded } = useCustomerStore();
  const { loadOrders, isLoaded: ordersLoaded } = useOrderStore();
  const { loadSettings, isLoaded: settingsLoaded } = useSettingsStore();
  const { loadPendingOrders } = useCartStore();

  useEffect(() => {
    checkAuth();
    loadProducts();
    loadCustomers();
    loadOrders();
    loadSettings();
    loadPendingOrders();
  }, [checkAuth, loadProducts, loadCustomers, loadOrders, loadSettings, loadPendingOrders]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && pathname !== '/login') {
        router.replace('/login');
      } else if (isAuthenticated && pathname === '/login') {
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // If on login page, render children directly
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Loading state while reading localStorage
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading POS application...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return <>{children}</>;
};
