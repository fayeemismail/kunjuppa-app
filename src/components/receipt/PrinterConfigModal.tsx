'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useSettingsStore } from '@/store/settingsStore';
import { printerService } from '@/lib/printer/printerService';
import { PrinterConnectionStatus, ReceiptWidth } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { Printer, Bluetooth, RefreshCw, CheckCircle, Info, ExternalLink } from 'lucide-react';

interface PrinterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterConfigModal: React.FC<PrinterConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, updateSettings } = useSettingsStore();
  const { showToast } = useToast();
  const [printerStatus, setPrinterStatus] = useState<PrinterConnectionStatus>('disconnected');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrintingTest, setIsPrintingTest] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = printerService.subscribeStatus((status, devName) => {
      setPrinterStatus(status);
      setDeviceName(devName);
    });
    return () => unsub();
  }, [isOpen]);

  const isIOS = printerService.isIOSDevice();

  const handleConnect = async (filterOnly: boolean = true) => {
    if (isIOS) {
      showToast(
        'Apple iOS does not support Web Bluetooth in Safari. Use Browser Print / AirPrint, or open this web app in Bluefy.',
        'info'
      );
      return;
    }
    setIsConnecting(true);
    try {
      const res = await printerService.connect({ filterPrintersOnly: filterOnly });
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await printerService.disconnect();
    showToast('Printer disconnected.', 'info');
  };

  const handleTestPrint = async () => {
    setIsPrintingTest(true);
    try {
      if (printerStatus === 'connected') {
        const res = await printerService.printTest(settings);
        if (res.success) {
          showToast(res.message, 'success');
        } else {
          showToast(res.message, 'error');
        }
      } else {
        // Fallback test via browser window.print
        showToast('Bluetooth not connected. You can use Browser Print on any order!', 'info');
      }
    } finally {
      setIsPrintingTest(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Receipt Printer Settings & Hardware"
      subtitle="Configure ESC/POS thermal printer or standard browser printing"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Status indicator */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Hardware Status
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                printerStatus === 'connected'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                  : isIOS
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                  : printerStatus === 'connecting'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  printerStatus === 'connected'
                    ? 'bg-emerald-500'
                    : isIOS
                    ? 'bg-blue-500'
                    : printerStatus === 'connecting'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-zinc-400'
                }`}
              />
              {printerStatus === 'connected'
                ? `Connected: ${deviceName || 'Thermal Printer'}`
                : isIOS
                ? 'Apple iOS (AirPrint)'
                : printerStatus === 'connecting'
                ? 'Searching & Pairing...'
                : 'No Bluetooth Printer Connected'}
            </span>
          </div>

          <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300 space-y-2">
            {printerStatus === 'connected' ? (
              <div className="flex items-center justify-between pt-1">
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Ready for ESC/POS printing
                </span>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-rose-600 hover:underline text-xs"
                >
                  Disconnect
                </button>
              </div>
            ) : isIOS ? (
              <div className="space-y-1.5 text-zinc-500">
                <p className="leading-relaxed">
                  Apple iOS Safari does not support Web Bluetooth. You can print seamlessly to any network or AirPrint printer using <strong className="text-zinc-800 dark:text-zinc-200">Browser Print / AirPrint</strong>, or open this web app in the free <strong className="text-blue-600">Bluefy</strong> browser from the App Store for direct Web Bluetooth.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-zinc-500 leading-relaxed">
                  Connect your Bluetooth thermal printer (POS-58, MTP, RPP, etc.) for direct wireless receipt printing.
                </p>
                <button
                  type="button"
                  onClick={() => handleConnect(true)}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition active:scale-95 disabled:opacity-50 shadow-xs"
                >
                  <Bluetooth className="w-4 h-4" />
                  {isConnecting ? 'Searching for printers...' : 'Pair Thermal Printer (Filtered)'}
                </button>
                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleConnect(false)}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline"
                  >
                    Can&apos;t find printer? Show all devices
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Paper Width Selection */}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            Default Paper Roll Width
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateSettings({ receiptWidth: '58mm' })}
              className={`p-3 rounded-xl border text-left transition ${
                settings.receiptWidth === '58mm'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <div className="font-semibold text-sm">58 mm (2-inch roll)</div>
              <div className="text-xs text-zinc-500 mt-0.5">32 character column limit</div>
            </button>

            <button
              type="button"
              onClick={() => updateSettings({ receiptWidth: '80mm' })}
              className={`p-3 rounded-xl border text-left transition ${
                settings.receiptWidth === '80mm'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <div className="font-semibold text-sm">80 mm (3-inch roll)</div>
              <div className="text-xs text-zinc-500 mt-0.5">48 character standard layout</div>
            </button>
          </div>
        </div>

        {/* Test Print Button */}
        {printerStatus === 'connected' && (
          <button
            type="button"
            onClick={handleTestPrint}
            disabled={isPrintingTest}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPrintingTest ? 'animate-spin' : ''}`} />
            Print Test Slip to Bluetooth
          </button>
        )}

        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
