'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Receipt,
  Eye,
  Trash2,
  RotateCcw,
  CheckSquare,
  Square,
  Filter,
  Calendar,
  CreditCard,
  Printer,
  X,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { useOrderStore } from '@/store/orderStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Order } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ReceiptModal } from '@/components/receipt/ReceiptModal';

export default function OrdersPage() {
  const { showToast } = useToast();
  const { orders, softDeleteOrder, restoreOrder, bulkSoftDeleteOrders, bulkRestoreOrders } =
    useOrderStore();
  const { settings } = useSettingsStore();

  // Active vs Archived tab
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isBulkRestoreConfirmOpen, setIsBulkRestoreConfirmOpen] = useState(false);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab check
      if (activeTab === 'active' && order.isDeleted) return false;
      if (activeTab === 'archived' && !order.isDeleted) return false;

      // Date range filter
      if (dateFilter !== 'all') {
        const orderTime = new Date(order.createdAt).getTime();
        const now = Date.now();
        if (dateFilter === 'today') {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          if (orderTime < todayStart.getTime()) return false;
        } else if (dateFilter === '7days') {
          if (now - orderTime > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (dateFilter === '30days') {
          if (now - orderTime > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      // Payment method
      if (paymentMethodFilter !== 'all' && order.paymentMethod !== paymentMethodFilter) {
        return false;
      }

      // Search (orderNumber, customerName, phone)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesNo = order.orderNumber.toLowerCase().includes(q);
        const matchesCust = order.customerName.toLowerCase().includes(q);
        const matchesPhone = order.customerPhone?.includes(q);
        return matchesNo || matchesCust || matchesPhone;
      }

      return true;
    });
  }, [orders, activeTab, dateFilter, paymentMethodFilter, searchQuery]);

  // Bulk selection handling
  const allFilteredSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedIds.includes(o.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered
      const filteredSet = new Set(filteredOrders.map((o) => o.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      // Select all filtered
      const newIds = new Set([...selectedIds, ...filteredOrders.map((o) => o.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const toggleSelectOrder = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  // Actions
  const handleSingleDelete = (id: string) => {
    softDeleteOrder(id);
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    showToast('Order moved to archive.', 'info');
  };

  const handleSingleRestore = (id: string) => {
    restoreOrder(id);
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    showToast('Order restored from archive.', 'success');
  };

  const handleBulkDelete = () => {
    const res = bulkSoftDeleteOrders(selectedIds);
    setSelectedIds([]);
    showToast(`Archived ${res.count} orders.`, 'info');
  };

  const handleBulkRestore = () => {
    const res = bulkRestoreOrders(selectedIds);
    setSelectedIds([]);
    showToast(`Restored ${res.count} orders.`, 'success');
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto select-none">
      {/* Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Order History & Invoices
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Browse, print thermal receipts, or manage archived sales transactions
          </p>
        </div>

        {/* Active vs Archived Tab Switch */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('active');
              setSelectedIds([]);
            }}
            className={`px-4 py-1.5 rounded-lg transition ${
              activeTab === 'active'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Active Orders ({orders.filter((o) => !o.isDeleted).length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('archived');
              setSelectedIds([]);
            }}
            className={`px-4 py-1.5 rounded-lg transition ${
              activeTab === 'archived'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Archived ({orders.filter((o) => o.isDeleted).length})
          </button>
        </div>
      </div>

      {/* Filter and Bulk Action Toolbar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order # or Customer..."
            className="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Filter & Payment Method Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Dates</option>
            <option value="today">Today Only</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>

          {/* Payment Method */}
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Payments</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI / QR</option>
            <option value="card">Card</option>
          </select>

          {/* Bulk Action Buttons (shown when items are selected) */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                {selectedIds.length} selected
              </span>

              {activeTab === 'active' ? (
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteConfirmOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Archive Selected</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsBulkRestoreConfirmOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Selected</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-zinc-400">
            <Receipt className="w-12 h-12 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              No orders found
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              {activeTab === 'active'
                ? 'Try adjusting your search query or filters.'
                : 'There are no archived orders.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-4 w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-zinc-400 hover:text-zinc-600 flex items-center"
                    >
                      {allFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-2">Order #</th>
                  <th className="py-3.5 px-3">Date & Time</th>
                  <th className="py-3.5 px-3">Customer</th>
                  <th className="py-3.5 px-3">Items / Qty</th>
                  <th className="py-3.5 px-3">Subtotal</th>
                  <th className="py-3.5 px-3">Discount</th>
                  <th className="py-3.5 px-3">Grand Total</th>
                  <th className="py-3.5 px-3">Payment</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
                {filteredOrders.map((order) => {
                  const isSelected = selectedIds.includes(order.id);

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition ${
                        isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSelectOrder(order.id)}
                          className="text-zinc-400 hover:text-zinc-600 flex items-center"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Order Number */}
                      <td className="py-3 px-2 font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                        {order.orderNumber}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-zinc-500 whitespace-nowrap">
                        {formatDateTime(order.createdAt)}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3 font-medium text-zinc-900 dark:text-zinc-100 max-w-[150px] truncate">
                        {order.customerName}
                        {order.customerPhone && (
                          <span className="block text-[10px] text-zinc-400 font-normal">
                            {order.customerPhone}
                          </span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3 px-3">
                        <span className="font-semibold">{order.itemCount}</span> items (
                        {order.totalQuantity} units)
                      </td>

                      {/* Subtotal */}
                      <td className="py-3 px-3 text-zinc-500">
                        {formatCurrency(order.subtotal, settings.currencySymbol)}
                      </td>

                      {/* Discount */}
                      <td className="py-3 px-3">
                        {order.discountAmount > 0 ? (
                          <span className="text-emerald-600 font-medium">
                            -{formatCurrency(order.discountAmount, settings.currencySymbol)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>

                      {/* Grand Total */}
                      <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                        {formatCurrency(order.grandTotal, settings.currencySymbol)}
                      </td>

                      {/* Payment */}
                      <td className="py-3 px-3">
                        <span className="inline-block uppercase text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                          {order.paymentMethod}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => setViewingOrder(order)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            title="View Full Order Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Print receipt */}
                          <button
                            type="button"
                            onClick={() => setPrintingOrder(order)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition"
                            title="Print Thermal Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Archive / Restore */}
                          {activeTab === 'active' ? (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(order.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Archive Order"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRestoreConfirmId(order.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                              title="Restore Order"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {viewingOrder && (
        <Modal
          isOpen={!!viewingOrder}
          onClose={() => setViewingOrder(null)}
          title={`Order Details: ${viewingOrder.orderNumber}`}
          subtitle={`Placed on ${formatDateTime(viewingOrder.createdAt)}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Customer Snapshot Banner */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 flex justify-between items-start text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                  Customer Information
                </span>
                <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  {viewingOrder.customerName}
                </p>
                {viewingOrder.customerPhone && (
                  <p className="text-zinc-500 font-mono mt-0.5">{viewingOrder.customerPhone}</p>
                )}
                {viewingOrder.customerSnapshot?.address && (
                  <p className="text-zinc-500 mt-0.5">{viewingOrder.customerSnapshot.address}</p>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">
                  Payment Details
                </span>
                <span className="inline-block uppercase font-bold text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                  {viewingOrder.paymentMethod}
                </span>
                <p className="text-zinc-500 text-[11px] mt-1 capitalize">
                  Status: {viewingOrder.paymentStatus}
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Order Items ({viewingOrder.itemCount})
              </h4>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Rate</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {viewingOrder.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                          {item.productName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-500 text-[11px]">
                          {item.sku}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400">
                          {formatCurrency(item.unitPrice, settings.currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(item.lineTotal, settings.currencySymbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Totals */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Subtotal:</span>
                <span className="font-semibold">
                  {formatCurrency(viewingOrder.subtotal, settings.currencySymbol)}
                </span>
              </div>
              {viewingOrder.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>
                    Discount (
                    {viewingOrder.discountType === 'percentage'
                      ? `${viewingOrder.discountValue}%`
                      : 'Flat'}
                    ):
                  </span>
                  <span>
                    -{formatCurrency(viewingOrder.discountAmount, settings.currencySymbol)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-zinc-900 dark:text-zinc-100 pt-1 border-t border-zinc-200 dark:border-zinc-700">
                <span>Grand Total:</span>
                <span className="text-emerald-600">
                  {formatCurrency(viewingOrder.grandTotal, settings.currencySymbol)}
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setPrintingOrder(viewingOrder);
                  setViewingOrder(null);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-semibold hover:bg-zinc-800 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-medium hover:bg-zinc-200"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Thermal Receipt Modal */}
      {printingOrder && (
        <ReceiptModal
          isOpen={!!printingOrder}
          onClose={() => setPrintingOrder(null)}
          order={printingOrder}
          settings={settings}
        />
      )}

      {/* Single Soft-Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) handleSingleDelete(deleteConfirmId);
        }}
        title="Archive Order"
        message="Are you sure you want to move this order to the archive? Archived orders are retained for historical reference. (Note: Stock is not restored upon order deletion)."
        confirmLabel="Archive Order"
        variant="warning"
      />

      {/* Single Restore Confirm */}
      <ConfirmDialog
        isOpen={!!restoreConfirmId}
        onClose={() => setRestoreConfirmId(null)}
        onConfirm={() => {
          if (restoreConfirmId) handleSingleRestore(restoreConfirmId);
        }}
        title="Restore Order"
        message="Are you sure you want to restore this order to active history?"
        confirmLabel="Restore"
        variant="info"
      />

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title="Archive Selected Orders"
        message={`Are you sure you want to archive ${selectedIds.length} selected orders? They will remain accessible in the Archived tab.`}
        confirmLabel={`Archive ${selectedIds.length} Orders`}
        variant="warning"
      />

      {/* Bulk Restore Confirm */}
      <ConfirmDialog
        isOpen={isBulkRestoreConfirmOpen}
        onClose={() => setIsBulkRestoreConfirmOpen(false)}
        onConfirm={handleBulkRestore}
        title="Restore Selected Orders"
        message={`Are you sure you want to restore ${selectedIds.length} selected orders to active orders?`}
        confirmLabel={`Restore ${selectedIds.length} Orders`}
        variant="info"
      />
    </div>
  );
}
