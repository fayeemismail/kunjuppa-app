'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Banknote,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  ShoppingCart,
  Receipt,
  UserPlus,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { useOrderStore } from '@/store/orderStore';
import { useProductStore } from '@/store/productStore';
import { useCustomerStore } from '@/store/customerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ReceiptModal } from '@/components/receipt/ReceiptModal';
import { Order } from '@/types';

export default function DashboardPage() {
  const { getActiveOrders } = useOrderStore();
  const { getActiveProducts } = useProductStore();
  const { getActiveCustomers } = useCustomerStore();
  const { settings } = useSettingsStore();

  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  const activeOrders = getActiveOrders();
  const activeProducts = getActiveProducts();
  const activeCustomers = getActiveCustomers();

  // Calculate figures dynamically for TODAY
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOrders = activeOrders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    return orderDate >= todayStart;
  });

  const totalSalesToday = todayOrders.reduce((sum, order) => sum + order.grandTotal, 0);
  const totalOrdersToday = todayOrders.length;

  // Overall total revenue
  const totalAllTimeSales = activeOrders.reduce((sum, order) => sum + order.grandTotal, 0);

  // Low stock products
  const lowStockProducts = activeProducts.filter(
    (product) => product.stockQuantity <= settings.lowStockThreshold
  );

  // Recent 5 orders
  const recentOrders = [...activeOrders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome & Quick Shortcuts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Billing Dashboard
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Store overview, today’s sales figures, and critical stock notifications
          </p>
        </div>

        {/* Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/pos"
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New Sale (POS)</span>
          </Link>
          <Link
            href="/products?action=add"
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </Link>
          <Link
            href="/customers?action=add"
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-medium transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales Today */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Today&apos;s Sales</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(totalSalesToday, settings.currencySymbol)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>All-time: {formatCurrency(totalAllTimeSales, settings.currencySymbol)}</span>
          </div>
        </div>

        {/* Orders Today */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Orders Today</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {totalOrdersToday}
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            Total active orders: <span className="font-semibold">{activeOrders.length}</span>
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Products</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {activeProducts.length}
          </div>
          <div className="mt-2 text-xs text-zinc-500 flex items-center justify-between">
            <span>In stock items</span>
            {lowStockProducts.length > 0 && (
              <span className="text-amber-600 font-semibold">{lowStockProducts.length} low stock</span>
            )}
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Customers</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {activeCustomers.length}
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            Includes regular & retail patrons
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Orders + Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Recent Sales</h3>
              <p className="text-xs text-zinc-500">Latest completed customer checkouts</p>
            </div>
            <Link
              href="/orders"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
            >
              <span>View all orders</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-xs">
              No orders recorded yet. Make a sale in the POS screen!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold">
                    <th className="pb-3 pl-1">Order #</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Items</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Payment</th>
                    <th className="pb-3 pr-1 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition">
                      <td className="py-3 pl-1 font-semibold text-zinc-900 dark:text-zinc-100">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 max-w-[140px] truncate">{order.customerName}</td>
                      <td className="py-3 text-zinc-500">{formatDateTime(order.createdAt)}</td>
                      <td className="py-3">
                        {order.itemCount} ({order.totalQuantity} qty)
                      </td>
                      <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(order.grandTotal, settings.currencySymbol)}
                      </td>
                      <td className="py-3">
                        <span className="inline-block uppercase text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                          {order.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 pr-1 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptOrder(order)}
                          className="p-1 rounded-md text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-zinc-800 transition"
                          title="Print / View Receipt"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock Alerts (1 col) */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Stock Alerts</h3>
                <p className="text-[11px] text-zinc-500">
                  Below threshold of {settings.lowStockThreshold} units
                </p>
              </div>
            </div>
            <Link
              href="/products"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              Manage
            </Link>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[320px] pr-1">
            {lowStockProducts.length === 0 ? (
              <div className="p-6 text-center text-zinc-400 text-xs">
                All products have healthy inventory levels!
              </div>
            ) : (
              lowStockProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40"
                >
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {prod.name}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      SKU: {prod.sku} • {prod.category}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        prod.stockQuantity === 0
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {prod.stockQuantity} {prod.unit}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link
            href="/products"
            className="mt-4 w-full py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-center rounded-xl text-xs font-medium transition"
          >
            Open Inventory Restock
          </Link>
        </div>
      </div>

      {/* Receipt Modal */}
      {selectedReceiptOrder && (
        <ReceiptModal
          isOpen={!!selectedReceiptOrder}
          onClose={() => setSelectedReceiptOrder(null)}
          order={selectedReceiptOrder}
          settings={settings}
        />
      )}
    </div>
  );
}
