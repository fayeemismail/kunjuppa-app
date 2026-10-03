'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  RotateCcw,
  Eye,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  IndianRupee,
  X,
  FileText,
} from 'lucide-react';
import { useCustomerStore } from '@/store/customerStore';
import { useOrderStore } from '@/store/orderStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Customer } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

function CustomersPageContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { customers, addCustomer, updateCustomer, softDeleteCustomer, restoreCustomer } =
    useCustomerStore();
  const { orders } = useOrderStore();
  const { settings } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Handle shortcut
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openAddModal();
    }
  }, [searchParams]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (activeTab === 'active' && c.isDeleted) return false;
      if (activeTab === 'archived' && !c.isDeleted) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = c.phone.includes(q);
        const matchesEmail = c.email?.toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesEmail;
      }
      return true;
    });
  }, [customers, activeTab, searchQuery]);

  const openAddModal = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormEmail(c.email || '');
    setFormAddress(c.address || '');
    setFormNotes(c.notes || '');
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      showToast('Customer name is required.', 'error');
      return;
    }
    if (!formPhone.trim()) {
      showToast('Phone number is required.', 'error');
      return;
    }

    if (editingCustomer) {
      const res = updateCustomer(editingCustomer.id, {
        name: formName,
        phone: formPhone,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });

      if (res.success) {
        showToast(`Customer "${formName}" updated!`, 'success');
        setEditingCustomer(null);
      } else {
        showToast(res.error || 'Failed to update customer.', 'error');
      }
    } else {
      const res = addCustomer({
        name: formName,
        phone: formPhone,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });

      if (res.success) {
        showToast(`Customer "${formName}" added successfully!`, 'success');
        setIsAddModalOpen(false);
      } else {
        showToast(res.error || 'Failed to add customer.', 'error');
      }
    }
  };

  const handleSoftDelete = (id: string) => {
    softDeleteCustomer(id);
    showToast('Customer moved to archive.', 'info');
  };

  const handleRestore = (id: string) => {
    restoreCustomer(id);
    showToast('Customer restored to active patrons.', 'success');
  };

  // Get customer metrics (orders and total spent)
  const getCustomerMetrics = (customerId: string) => {
    const custOrders = orders.filter((o) => o.customerId === customerId && !o.isDeleted);
    const orderCount = custOrders.length;
    const totalSpent = custOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    return { orderCount, totalSpent, orders: custOrders };
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Customer Directory
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Maintain regular patron profiles, contact books, order histories, and delivery details
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'active'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60'
              }`}
            >
              Active ({customers.filter((c) => !c.isDeleted).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('archived')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'archived'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60'
              }`}
            >
              Archived ({customers.filter((c) => c.isDeleted).length})
            </button>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, phone, or email..."
            className="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="py-16 text-center text-zinc-400">
            <Users className="w-12 h-12 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              No customers found
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Try adjusting your search criteria or register a new customer.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-3">Phone Number</th>
                  <th className="py-3.5 px-3">Email Address</th>
                  <th className="py-3.5 px-3">Address</th>
                  <th className="py-3.5 px-3">Orders</th>
                  <th className="py-3.5 px-3">Total Spend</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
                {filteredCustomers.map((c) => {
                  const { orderCount, totalSpent } = getCustomerMetrics(c.id);

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition"
                    >
                      {/* Name */}
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        {c.name}
                        {c.notes && (
                          <span className="block text-[10px] text-zinc-400 font-normal truncate max-w-[200px]">
                            {c.notes}
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-3 font-mono text-zinc-700 dark:text-zinc-300">
                        {c.phone}
                      </td>

                      {/* Email */}
                      <td className="py-3 px-3 text-zinc-500">{c.email || '-'}</td>

                      {/* Address */}
                      <td className="py-3 px-3 text-zinc-500 max-w-[180px] truncate">
                        {c.address || '-'}
                      </td>

                      {/* Order Count */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
                          {orderCount} orders
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                        {formatCurrency(totalSpent, settings.currencySymbol)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingCustomer(c)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            title="View Customer Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {activeTab === 'active' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(c)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                                title="Edit Customer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(c.id)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title="Archive Customer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRestoreConfirmId(c.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                              title="Restore to Active Directory"
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

      {/* Add / Edit Customer Modal */}
      {(isAddModalOpen || editingCustomer) && (
        <Modal
          isOpen={isAddModalOpen || !!editingCustomer}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingCustomer(null);
          }}
          title={editingCustomer ? 'Edit Customer Details' : 'Add New Customer'}
          subtitle={
            editingCustomer
              ? `ID: ${editingCustomer.id}`
              : 'Register customer profile for receipts and sales history'
          }
          maxWidth="md"
        >
          <form onSubmit={handleSaveCustomer} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Mohammed Rasheed"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="e.g. 9847012345"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Address (Optional)
              </label>
              <textarea
                rows={2}
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="Street address or delivery location"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Internal Notes (Optional)
              </label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Preferences, credit limits, or delivery instructions"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCustomer(null);
                }}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition"
              >
                {editingCustomer ? 'Update Customer' : 'Save Customer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Customer Details Modal */}
      {viewingCustomer && (() => {
        const { orderCount, totalSpent, orders: custOrders } = getCustomerMetrics(viewingCustomer.id);

        return (
          <Modal
            isOpen={!!viewingCustomer}
            onClose={() => setViewingCustomer(null)}
            title={viewingCustomer.name}
            subtitle="Customer Profile & Lifetime Purchases"
            maxWidth="lg"
          >
            <div className="space-y-4 text-xs">
              {/* Stats overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Total Spend</span>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(totalSpent, settings.currencySymbol)}
                  </p>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Orders</span>
                  <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {orderCount}
                  </p>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Phone</span>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 font-mono">
                    {viewingCustomer.phone}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                {viewingCustomer.email && (
                  <div>
                    <span className="text-zinc-400">Email: </span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                      {viewingCustomer.email}
                    </span>
                  </div>
                )}
                {viewingCustomer.address && (
                  <div>
                    <span className="text-zinc-400">Address: </span>
                    <span className="text-zinc-800 dark:text-zinc-200">
                      {viewingCustomer.address}
                    </span>
                  </div>
                )}
                {viewingCustomer.notes && (
                  <div>
                    <span className="text-zinc-400">Notes: </span>
                    <span className="text-zinc-800 dark:text-zinc-200 italic">
                      "{viewingCustomer.notes}"
                    </span>
                  </div>
                )}
              </div>

              {/* Purchase history list */}
              <div>
                <h4 className="font-bold text-zinc-800 dark:text-zinc-200 mb-2">
                  Transaction History ({custOrders.length})
                </h4>
                {custOrders.length === 0 ? (
                  <div className="p-4 text-center text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                    No completed purchases yet.
                  </div>
                ) : (
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                        <tr>
                          <th className="py-2 px-3">Bill #</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Items</th>
                          <th className="py-2 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {custOrders.map((ord) => (
                          <tr key={ord.id}>
                            <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                              {ord.orderNumber}
                            </td>
                            <td className="py-2 px-3 text-zinc-500">{formatDateTime(ord.createdAt)}</td>
                            <td className="py-2 px-3">{ord.itemCount} items</td>
                            <td className="py-2 px-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                              {formatCurrency(ord.grandTotal, settings.currencySymbol)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewingCustomer(null)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Delete / Archive Confirm */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) handleSoftDelete(deleteConfirmId);
        }}
        title="Archive Customer"
        message="Are you sure you want to archive this customer? Existing orders will preserve this customer's details, but they will be hidden from new orders."
        confirmLabel="Archive Customer"
        variant="warning"
      />

      {/* Restore Confirm */}
      <ConfirmDialog
        isOpen={!!restoreConfirmId}
        onClose={() => setRestoreConfirmId(null)}
        onConfirm={() => {
          if (restoreConfirmId) handleRestore(restoreConfirmId);
        }}
        title="Restore Customer"
        message="Are you sure you want to restore this customer to the active directory?"
        confirmLabel="Restore Customer"
        variant="info"
      />
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-zinc-400">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading customers...</p>
        </div>
      }
    >
      <CustomersPageContent />
    </Suspense>
  );
}
