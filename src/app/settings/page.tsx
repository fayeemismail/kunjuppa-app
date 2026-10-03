'use client';

import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  Printer,
  Sliders,
  Database,
  RotateCcw,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Receipt,
  Bluetooth,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useProductStore } from '@/store/productStore';
import { useCustomerStore } from '@/store/customerStore';
import { useOrderStore } from '@/store/orderStore';
import { storage } from '@/lib/storage';
import { useToast } from '@/components/ui/Toast';
import { printerService } from '@/lib/printer/printerService';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BusinessSettings, ReceiptWidth } from '@/types';

export default function SettingsPage() {
  const { showToast } = useToast();
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const { loadProducts } = useProductStore();
  const { loadCustomers } = useCustomerStore();
  const { loadOrders } = useOrderStore();

  // Form states
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [email, setEmail] = useState(settings.email);
  const [gstin, setGstin] = useState(settings.gstin || '');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [currencyCode, setCurrencyCode] = useState(settings.currencyCode);
  const [receiptWidth, setReceiptWidth] = useState<ReceiptWidth>(settings.receiptWidth);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [lowStockThreshold, setLowStockThreshold] = useState(settings.lowStockThreshold);

  // Modals & triggers
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    if (!businessName.trim()) {
      showToast('Business name cannot be empty.', 'error');
      return;
    }

    updateSettings({
      businessName: businessName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      email: email.trim(),
      gstin: gstin.trim() || undefined,
      currencySymbol: currencySymbol.trim(),
      currencyCode: currencyCode.trim(),
      receiptWidth,
      receiptFooter,
      lowStockThreshold: Number(lowStockThreshold) || 10,
    });

    showToast('Store settings saved successfully!', 'success');
  };

  const handleResetData = () => {
    storage.resetAllData();
    resetSettings();
    loadProducts();
    loadCustomers();
    loadOrders();
    setBusinessName(settings.businessName);
    setPhone(settings.phone);
    setAddress(settings.address);
    setEmail(settings.email);
    setGstin(settings.gstin || '');
    setReceiptWidth(settings.receiptWidth);
    setReceiptFooter(settings.receiptFooter);
    setLowStockThreshold(settings.lowStockThreshold);
    showToast('All products, customers, and orders reset to sample demo data.', 'info');
  };

  const handleExportData = () => {
    const dataStr = storage.exportDataJson();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pos_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Application backup downloaded as JSON.', 'success');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = storage.importDataJson(content);
      if (success) {
        loadProducts();
        loadCustomers();
        loadOrders();
        showToast('Backup restored successfully!', 'success');
      } else {
        showToast('Invalid backup file format.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handlePrintTestSlip = async () => {
    setIsTestingPrinter(true);
    try {
      const res = await printerService.printTest(settings);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } finally {
      setIsTestingPrinter(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto select-none pb-10">
      {/* Top Header */}
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-emerald-600" />
          <span>System & Hardware Configuration</span>
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Customize retail store profile, ESC/POS thermal printer layout, and local database storage
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Store Profile Card */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <Store className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Retail Store Profile
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Business / Store Name *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Contact Phone Number *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Store Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Store Address (Printed on receipts) *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="e.g. 32AAAAA0000A1Z5"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 uppercase font-mono focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Low Stock Threshold (Alert limit)
              </label>
              <input
                type="number"
                min="1"
                required
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 10)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Currency & Receipt Customization */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              Receipt & Currency Formatting
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                required
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 font-bold focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Receipt Roll Width
              </label>
              <select
                value={receiptWidth}
                onChange={(e) => setReceiptWidth(e.target.value as ReceiptWidth)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              >
                <option value="58mm">58 mm (2-inch pocket thermal roll - 32 cols)</option>
                <option value="80mm">80 mm (3-inch standard counter roll - 48 cols)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Receipt Footer Message
              </label>
              <textarea
                rows={2}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="Thank you message, return policies, or store timings"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-950/20 transition active:scale-[0.99]"
          >
            Save Store Settings
          </button>
        </div>
      </form>

      {/* Local Data Management Section */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <Database className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
            Local Storage Data Management
          </h3>
        </div>

        <p className="text-xs text-zinc-500 leading-relaxed">
          In this frontend-only phase, all products, orders, customers, and configuration changes are
          persisted in your browser’s LocalStorage. You can export a snapshot backup, import previous data,
          or reset back to the default seed database.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Export JSON */}
          <button
            type="button"
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Database (JSON)</span>
          </button>

          {/* Import JSON */}
          <label className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-medium cursor-pointer transition">
            <Upload className="w-3.5 h-3.5" />
            <span>Import Database (JSON)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </label>

          {/* Reset to Seed Data */}
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs font-medium transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Initial Sample Data</span>
          </button>
        </div>
      </div>

      {/* Session Management */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
          User Session
        </h3>
        <p className="text-xs text-zinc-500">
          Sign out of this device. Your local database records remain safely preserved in LocalStorage.
        </p>
        <button
          type="button"
          onClick={() => {
            const { logout } = useAuthStore.getState();
            logout();
            window.location.href = '/login';
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out / Logout Session</span>
        </button>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetData}
        title="Reset All Data"
        message="This will reset all products, customers, orders, and store settings back to the initial AED cigarette catalog. Any newly added records will be overwritten."
        confirmLabel="Reset Everything"
        variant="danger"
      />
    </div>
  );
}
