'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, ShoppingCart, Bluetooth, Printer, Database } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { printerService } from '@/lib/printer/printerService';
import { PrinterConnectionStatus } from '@/types';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenPrinterModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenPrinterModal,
}) => {
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const [printerStatus, setPrinterStatus] = useState<PrinterConnectionStatus>('disconnected');
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = printerService.subscribeStatus((status) => {
      setPrinterStatus(status);
    });
    return () => unsubscribe();
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Mobile trigger & breadcrumb/title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {settings.businessName}
          </span>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>POS Counter #1</span>
            <span>•</span>
            <span className="font-mono">{currentTime}</span>
          </div>
        </div>
      </div>

      {/* Right: Badges, Printer status, New Sale, User */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Demo Mode Badge */}
        <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Database className="w-3 h-3 text-amber-600" />
          <span>Demo LocalStorage</span>
        </span>

        {/* Printer Status Pill */}
        <button
          type="button"
          onClick={onOpenPrinterModal}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
            printerStatus === 'connected'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : printerStatus === 'unsupported'
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
              : 'bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
          }`}
          title="Printer connection status (Click to configure)"
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {printerStatus === 'connected'
              ? 'Printer Ready'
              : printerStatus === 'connecting'
              ? 'Connecting...'
              : printerStatus === 'unsupported'
              ? 'Printer: Standard'
              : 'Thermal: Offline'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              printerStatus === 'connected'
                ? 'bg-emerald-500'
                : printerStatus === 'connecting'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-zinc-400'
            }`}
          />
        </button>

        {/* Quick New Sale button */}
        <Link
          href="/pos"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition active:scale-95"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span className="font-semibold">New Sale</span>
        </Link>

        {/* Logged in User */}
        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">
            {user?.name || 'Admin'}
          </span>
        </div>
      </div>
    </header>
  );
};
