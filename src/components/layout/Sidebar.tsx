'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  Settings,
  LogOut,
  Store,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useProductStore } from '@/store/productStore';
import { useSettingsStore } from '@/store/settingsStore';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const { products } = useProductStore();
  const { settings } = useSettingsStore();

  const lowStockCount = products.filter(
    (p) => !p.isDeleted && p.stockQuantity <= settings.lowStockThreshold
  ).length;

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'New Sale / POS', href: '/pos', icon: ShoppingCart },
    { name: 'Orders', href: '/orders', icon: Receipt },
    {
      name: 'Products',
      href: '/products',
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    if (onCloseMobile) onCloseMobile();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-zinc-900 text-zinc-100 flex flex-col h-[100dvh] md:h-full border-r border-zinc-800 select-none overflow-hidden">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm tracking-tight text-white truncate">
              {settings.businessName || 'POS Billing'}
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium">Smart Retail POS</p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    isActive
                      ? 'bg-emerald-700 text-white'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Direct Logout in list for guaranteed mobile visibility */}
        <div className="pt-2 mt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Logout Session</span>
            </div>
          </button>
        </div>
      </nav>

      {/* User Footer with safe padding */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/80 pb-20 md:pb-3 shrink-0">
        <div className="px-2 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-emerald-900/60 border border-emerald-600/40 text-emerald-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-zinc-200 truncate">{user?.name || 'Admin User'}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user?.email || 'admin@example.com'}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition shrink-0"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
