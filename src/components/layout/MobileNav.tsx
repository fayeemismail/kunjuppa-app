'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Receipt, Package, Users, LayoutDashboard, Settings } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const { items, pendingOrders } = useCartStore();

  const totalCartCount = items.length + pendingOrders.length;

  const navItems = [
    {
      name: 'POS',
      href: '/pos',
      icon: ShoppingCart,
      badge: totalCartCount > 0 ? totalCartCount : undefined,
    },
    {
      name: 'Orders',
      href: '/orders',
      icon: Receipt,
    },
    {
      name: 'Products',
      href: '/products',
      icon: Package,
    },
    {
      name: 'Customers',
      href: '/customers',
      icon: Users,
    },
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 px-2 py-1 flex items-center justify-around select-none shadow-lg">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all relative ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold flex items-center justify-center ring-2 ring-white dark:ring-zinc-900">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};
