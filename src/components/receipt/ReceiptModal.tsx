'use client';

import React, { useState, useEffect } from 'react';
import { Order, PendingOrder, BusinessSettings, PrinterConnectionStatus, ReceiptWidth } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { formatReceiptText, PrintableReceiptData } from '@/lib/printer/receiptFormatter';
import { printerService } from '@/lib/printer/printerService';
import { useToast } from '@/components/ui/Toast';
import {
  Printer,
  Bluetooth,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Save,
  Check,
} from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | PendingOrder | null;
  settings: BusinessSettings;
  onSavePendingOrder?: (pendingOrder: PendingOrder) => void;
  onMarkPrinted?: (id: string) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
  settings,
  onSavePendingOrder,
  onMarkPrinted,
}) => {
  const { showToast } = useToast();
  const [activeWidth, setActiveWidth] = useState<ReceiptWidth>(settings.receiptWidth);
  const [printerStatus, setPrinterStatus] = useState<PrinterConnectionStatus>('disconnected');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasPrintedLocally, setHasPrintedLocally] = useState(false);

  useEffect(() => {
    setActiveWidth(settings.receiptWidth);
  }, [settings.receiptWidth, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setHasPrintedLocally(false);
    const unsubscribe = printerService.subscribeStatus((status, devName) => {
      setPrinterStatus(status);
      setDeviceName(devName);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!order) return null;

  const isPending = !('orderNumber' in order);
  const billIdentifier = 'orderNumber' in order ? order.orderNumber : (order as PendingOrder).label;

  const currentSettings: BusinessSettings = {
    ...settings,
    receiptWidth: activeWidth,
  };

  const isIOS = printerService.isIOSDevice();

  const handleConnectPrinter = async (filterOnly: boolean = true) => {
    if (isIOS) {
      showToast(
        'Apple iOS does not support Web Bluetooth in Safari. Please use "Browser Print / AirPrint" or open in the free "Bluefy" app.',
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

  const handleDisconnectPrinter = async () => {
    await printerService.disconnect();
    showToast('Printer disconnected', 'info');
  };

  const recordPrintSuccess = () => {
    setHasPrintedLocally(true);
    if (onMarkPrinted) {
      onMarkPrinted(order.id);
    }
  };

  const handleBluetoothPrint = async () => {
    setIsPrinting(true);
    try {
      const res = await printerService.printReceipt(order, currentSettings);
      if (res.success) {
        showToast('Receipt printed successfully via Bluetooth!', 'success');
        recordPrintSuccess();
      } else {
        showToast(res.message, 'error');
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleTestPrint = async () => {
    setIsPrinting(true);
    try {
      const res = await printerService.printTest(currentSettings);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleBrowserPrint = () => {
    window.print();
    recordPrintSuccess();
  };

  const handleSaveToOrders = () => {
    if (isPending && onSavePendingOrder) {
      onSavePendingOrder(order as PendingOrder);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isPending ? 'Print Draft Bill & Save' : 'Print & Receipt Preview'}
      subtitle={`${billIdentifier} • ${new Date(order.createdAt).toLocaleDateString()}`}
      maxWidth="2xl"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Receipt Visual Paper Preview */}
        <div className="flex-1 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-3 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Receipt Preview
              </span>
              {isPending && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  (order as PendingOrder).isPrinted || hasPrintedLocally
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {(order as PendingOrder).isPrinted || hasPrintedLocally ? 'Printed' : 'Unprinted'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveWidth('58mm')}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  activeWidth === '58mm'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                58 mm
              </button>
              <button
                type="button"
                onClick={() => setActiveWidth('80mm')}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  activeWidth === '80mm'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                80 mm
              </button>
            </div>
          </div>

          {/* Thermal Paper Simulation */}
          <div
            id="printable-receipt-area"
            className={`w-full ${
              activeWidth === '58mm' ? 'max-w-[280px]' : 'max-w-[370px]'
            } bg-[#fffdfa] text-zinc-900 border border-amber-200/70 dark:border-zinc-700 rounded-sm shadow-md p-4 transition-all select-none`}
            style={{ fontFamily: "'Courier New', Courier, monospace" }}
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-dashed border-zinc-400">
              <h4 className="font-bold text-sm tracking-wide">{currentSettings.businessName.toUpperCase()}</h4>
              <p className="text-[11px] text-zinc-700 mt-0.5 leading-tight">{currentSettings.address}</p>
              <p className="text-[11px] text-zinc-700">Tel: {currentSettings.phone}</p>
              {currentSettings.gstin && (
                <p className="text-[10px] text-zinc-600">GSTIN: {currentSettings.gstin}</p>
              )}
            </div>

            {/* Meta */}
            <div className="py-2 text-[11px] border-b border-dashed border-zinc-400 space-y-0.5">
              <div className="flex justify-between font-semibold">
                <span>Bill: {billIdentifier}</span>
                <span>
                  {new Date(order.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex justify-between text-zinc-700">
                <span>Date: {new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
                <span className="uppercase font-semibold text-emerald-700">
                  {order.paymentMethod}
                </span>
              </div>
              <div className="text-zinc-800">Cust: {order.customerName}</div>
              {order.customerPhone && (
                <div className="text-zinc-600 text-[10px]">Ph: {order.customerPhone}</div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2 text-[11px]">
              <div className="flex justify-between font-bold border-b border-zinc-300 pb-1 mb-1.5 text-[10px] uppercase">
                <span>Item</span>
                <div className="flex gap-4">
                  <span>Qty</span>
                  <span>Price</span>
                  <span>Total</span>
                </div>
              </div>

              <div className="space-y-1.5">
                {order.items.map((item: any, idx: number) => {
                  const itemName = item.productName || item.name || 'Item';
                  return (
                    <div key={idx} className="leading-tight">
                      <div className="font-semibold text-zinc-800 text-[11px] truncate">
                        {itemName}
                        {item.isCustomPrice && (
                          <span className="text-[9px] text-emerald-700 font-normal ml-1">
                            (Spl Price)
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-zinc-600 text-[10px]">
                        <span>
                          {item.quantity} {item.unit} @ {currentSettings.currencySymbol}
                          {item.unitPrice.toFixed(0)}
                        </span>
                        <span className="font-medium text-zinc-900">
                          {currentSettings.currencySymbol}
                          {item.lineTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-dashed border-zinc-400 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between text-zinc-700">
                <span>Subtotal:</span>
                <span>
                  {currentSettings.currencySymbol}
                  {order.subtotal.toFixed(2)}
                </span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>
                    Discount ({order.discountType === 'percentage' ? `${order.discountValue}%` : 'Flat'}):
                  </span>
                  <span>
                    -{currentSettings.currencySymbol}
                    {order.discountAmount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm border-t border-b border-zinc-800 py-1 my-1">
                <span>TOTAL:</span>
                <span>
                  {currentSettings.currencySymbol}
                  {order.grandTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-600 pt-0.5">
                <span>Items: {order.itemCount}</span>
                <span>Qty: {order.totalQuantity}</span>
              </div>
            </div>

            {/* Barcode & Footer */}
            <div className="mt-4 pt-2 border-t border-dashed border-zinc-400 text-center space-y-2">
              <div className="flex flex-col items-center justify-center">
                <div className="h-7 w-36 bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px,#000_4px,#000_7px,transparent_7px,transparent_9px)]" />
                <span className="text-[9px] tracking-widest text-zinc-600 mt-0.5">
                  *{billIdentifier}*
                </span>
              </div>
              <p className="text-[10px] text-zinc-600 italic whitespace-pre-line leading-tight">
                {currentSettings.receiptFooter}
              </p>
            </div>
          </div>
        </div>

        {/* Printer Controls & Actions */}
        <div className="w-full lg:w-72 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 pt-4 lg:pt-0 lg:pl-6">
          <div className="space-y-4">
            {/* Status card */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-500">Hardware Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                    printerStatus === 'connected'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                      : isIOS
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                      : printerStatus === 'connecting'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                      : printerStatus === 'unsupported'
                      ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
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
                    ? 'Connected'
                    : isIOS
                    ? 'Apple iOS (AirPrint)'
                    : printerStatus === 'connecting'
                    ? 'Connecting...'
                    : printerStatus === 'unsupported'
                    ? 'BLE Unavailable'
                    : 'Disconnected'}
                </span>
              </div>

              {printerStatus === 'connected' ? (
                <div className="text-xs space-y-1 text-zinc-700 dark:text-zinc-300">
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> {deviceName || 'Thermal Printer'}
                  </p>
                  <p className="text-[11px] text-zinc-500">ESC/POS Ready</p>
                  <button
                    onClick={handleDisconnectPrinter}
                    className="text-[11px] text-rose-600 hover:underline pt-1 block"
                  >
                    Disconnect
                  </button>
                </div>
              ) : isIOS ? (
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-2">
                  <p className="leading-relaxed">
                    Apple iOS Safari does not support Web Bluetooth. Use <strong className="text-zinc-800 dark:text-zinc-200">AirPrint / Browser Print</strong> below to print directly, or open this web app in the free <strong className="text-blue-600">Bluefy</strong> browser from the App Store.
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-zinc-500 space-y-2">
                  <p className="leading-relaxed">
                    Connect your Bluetooth thermal printer for direct wireless print.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleConnectPrinter(true)}
                    disabled={isConnecting}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 disabled:opacity-50"
                  >
                    <Bluetooth className="w-3.5 h-3.5" />
                    <span>{isConnecting ? 'Searching...' : 'Pair Thermal Printer (Filtered)'}</span>
                  </button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => handleConnectPrinter(false)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline"
                    >
                      Can&apos;t find printer? Show all devices
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Print Buttons */}
            {isIOS ? (
              <div>
                <button
                  type="button"
                  onClick={handleBrowserPrint}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-950/20 transition active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt (AirPrint / System)</span>
                </button>
                <p className="text-[10px] text-zinc-500 text-center mt-1.5">
                  Tap & select your printer or save as PDF.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleBluetoothPrint}
                  disabled={printerStatus !== 'connected' || isPrinting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isPrinting ? 'Printing...' : 'Print via Bluetooth (ESC/POS)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBrowserPrint}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition shadow-xs"
                >
                  <FileText className="w-4 h-4" />
                  <span>Browser Print / PDF</span>
                </button>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 text-center">
                  Works with USB, network printers, or system dialog.
                </p>
              </div>
            )}

            {/* "Save to Orders" option for pending bills */}
            {isPending && onSavePendingOrder && (
              <div className="pt-3 border-t border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                  Ready to Finalize?
                </span>
                <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mb-2 leading-relaxed">
                  After printing (or whenever ready), click below to deduct stock and record into permanent Orders.
                </p>
                <button
                  type="button"
                  onClick={handleSaveToOrders}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-[0.99]"
                >
                  <Save className="w-4 h-4" />
                  <span>Save to Orders Now</span>
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
