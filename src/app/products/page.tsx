'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  RotateCcw,
  Eye,
  AlertTriangle,
  X,
  Boxes,
  Barcode,
  Tag,
  CheckCircle,
} from 'lucide-react';
import { useProductStore } from '@/store/productStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Product, UnitType } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const UNIT_OPTIONS: UnitType[] = ['piece', 'kg', 'litre', 'packet', 'box', 'meter', 'dozen'];

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { products, addProduct, updateProduct, softDeleteProduct, restoreProduct } =
    useProductStore();
  const { settings } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState('Groceries');
  const [formSellingPrice, setFormSellingPrice] = useState<number | ''>('');
  const [formCostPrice, setFormCostPrice] = useState<number | ''>('');
  const [formStock, setFormStock] = useState<number | ''>('');
  const [formUnit, setFormUnit] = useState<UnitType>('piece');
  const [formDescription, setFormDescription] = useState('');

  // Handle action=add param from dashboard shortcut
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openAddModal();
    }
  }, [searchParams]);

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Tab check
      if (activeTab === 'active' && p.isDeleted) return false;
      if (activeTab === 'archived' && !p.isDeleted) return false;

      // Category
      if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;

      // Stock filter
      if (stockFilter === 'in_stock' && p.stockQuantity <= 0) return false;
      if (stockFilter === 'low_stock' && (p.stockQuantity > settings.lowStockThreshold || p.stockQuantity <= 0))
        return false;
      if (stockFilter === 'out_of_stock' && p.stockQuantity > 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesBarcode = p.barcode?.toLowerCase().includes(q);
        return matchesName || matchesSku || matchesBarcode;
      }

      return true;
    });
  }, [products, activeTab, categoryFilter, stockFilter, searchQuery, settings.lowStockThreshold]);

  const openAddModal = () => {
    setFormName('');
    setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormBarcode('');
    setFormCategory('Groceries');
    setFormSellingPrice('');
    setFormCostPrice('');
    setFormStock(10);
    setFormUnit('piece');
    setFormDescription('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormBarcode(p.barcode || '');
    setFormCategory(p.category);
    setFormSellingPrice(p.sellingPrice);
    setFormCostPrice(p.costPrice !== undefined ? p.costPrice : '');
    setFormStock(p.stockQuantity);
    setFormUnit(p.unit);
    setFormDescription(p.description || '');
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      showToast('Product name is required.', 'error');
      return;
    }
    if (!formSku.trim()) {
      showToast('SKU is required.', 'error');
      return;
    }
    const sellPrice = Number(formSellingPrice);
    if (isNaN(sellPrice) || sellPrice < 0) {
      showToast('Please enter a valid non-negative selling price.', 'error');
      return;
    }
    const stockQty = Number(formStock);
    if (isNaN(stockQty) || stockQty < 0) {
      showToast('Please enter a valid non-negative stock quantity.', 'error');
      return;
    }

    if (editingProduct) {
      // Update
      const res = updateProduct(editingProduct.id, {
        name: formName,
        sku: formSku,
        barcode: formBarcode.trim() || undefined,
        category: formCategory,
        sellingPrice: sellPrice,
        costPrice: formCostPrice !== '' ? Number(formCostPrice) : undefined,
        stockQuantity: stockQty,
        unit: formUnit,
        description: formDescription.trim() || undefined,
      });

      if (res.success) {
        showToast(`Product "${formName}" updated!`, 'success');
        setEditingProduct(null);
      } else {
        showToast(res.error || 'Failed to update product.', 'error');
      }
    } else {
      // Add
      const res = addProduct({
        name: formName,
        sku: formSku,
        barcode: formBarcode.trim() || undefined,
        category: formCategory,
        sellingPrice: sellPrice,
        costPrice: formCostPrice !== '' ? Number(formCostPrice) : undefined,
        stockQuantity: stockQty,
        unit: formUnit,
        description: formDescription.trim() || undefined,
      });

      if (res.success) {
        showToast(`Product "${formName}" added successfully!`, 'success');
        setIsAddModalOpen(false);
      } else {
        showToast(res.error || 'Failed to add product.', 'error');
      }
    }
  };

  const handleSoftDelete = (id: string) => {
    softDeleteProduct(id);
    showToast('Product moved to archive. It will not appear in the POS counter.', 'info');
  };

  const handleRestore = (id: string) => {
    restoreProduct(id);
    showToast('Product restored to active catalog.', 'success');
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Product & Inventory Management
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Maintain item catalog, units, prices, barcode lookups, and inventory thresholds
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Active vs Archived switch */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'active'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Active ({products.filter((p) => !p.isDeleted).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('archived')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'archived'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Archived ({products.filter((p) => p.isDeleted).length})
            </button>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Product Name, SKU, or Barcode..."
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

        {/* Category & Stock filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>

          {/* Stock Level Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Stock Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock (≤ {settings.lowStockThreshold})</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-zinc-400">
            <Package className="w-12 h-12 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              No products found
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Try adjusting your search criteria or add a new product.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Product Name</th>
                  <th className="py-3.5 px-3">SKU</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3">Selling Price</th>
                  <th className="py-3.5 px-3">Cost Price</th>
                  <th className="py-3.5 px-3">Stock Level</th>
                  <th className="py-3.5 px-3">Unit</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-300">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.stockQuantity <= 0;
                  const isLowStock =
                    p.stockQuantity > 0 && p.stockQuantity <= settings.lowStockThreshold;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition"
                    >
                      {/* Name & Barcode */}
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        {p.name}
                        {p.barcode && (
                          <span className="block text-[10px] text-zinc-400 font-normal font-mono">
                            BC: {p.barcode}
                          </span>
                        )}
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-3 font-mono text-zinc-600 dark:text-zinc-400 text-[11px]">
                        {p.sku}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-[11px]">
                          {p.category}
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                        {formatCurrency(p.sellingPrice, settings.currencySymbol)}
                      </td>

                      {/* Cost Price */}
                      <td className="py-3 px-3 text-zinc-500">
                        {p.costPrice !== undefined
                          ? formatCurrency(p.costPrice, settings.currencySymbol)
                          : '-'}
                      </td>

                      {/* Stock Level */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOutOfStock
                                ? 'bg-rose-500'
                                : isLowStock
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          {p.stockQuantity}
                          {isOutOfStock ? ' (Out)' : isLowStock ? ' (Low)' : ''}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-3 text-zinc-500 capitalize">{p.unit}</td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingProduct(p)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {activeTab === 'active' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(p)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                                title="Edit Product"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(p.id)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title="Archive Product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRestoreConfirmId(p.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                              title="Restore to Active Catalog"
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

      {/* Add / Edit Product Modal */}
      {(isAddModalOpen || editingProduct) && (
        <Modal
          isOpen={isAddModalOpen || !!editingProduct}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingProduct(null);
          }}
          title={editingProduct ? 'Edit Product' : 'Add New Product'}
          subtitle={
            editingProduct
              ? `SKU: ${editingProduct.sku}`
              : 'Add an inventory item to your billing catalog'
          }
          maxWidth="lg"
        >
          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Basmati Rice (1kg)"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* SKU */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  SKU / Code *
                </label>
                <input
                  type="text"
                  required
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  placeholder="e.g. RIC-BAS-001"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Barcode (Optional)
                </label>
                <input
                  type="text"
                  value={formBarcode}
                  onChange={(e) => setFormBarcode(e.target.value)}
                  placeholder="e.g. 890103000101"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 font-mono focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  required
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Groceries, Dairy, Beverages..."
                  list="category-suggestions"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
                <datalist id="category-suggestions">
                  <option value="Groceries" />
                  <option value="Dairy" />
                  <option value="Beverages" />
                  <option value="Snacks" />
                  <option value="Personal Care" />
                  <option value="Household" />
                  <option value="Spices" />
                </datalist>
              </div>

              {/* Unit */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Unit of Measure *
                </label>
                <select
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value as UnitType)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 capitalize"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Selling Price ({settings.currencySymbol}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={formSellingPrice}
                  onChange={(e) =>
                    setFormSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Cost Price */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Cost Price ({settings.currencySymbol}) (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formCostPrice}
                  onChange={(e) =>
                    setFormCostPrice(e.target.value === '' ? '' : parseFloat(e.target.value))
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Current Stock Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formStock}
                  onChange={(e) =>
                    setFormStock(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Notes, brand information, or product specifications"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                }}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-medium hover:bg-zinc-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition"
              >
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Product Details Modal */}
      {viewingProduct && (
        <Modal
          isOpen={!!viewingProduct}
          onClose={() => setViewingProduct(null)}
          title={viewingProduct.name}
          subtitle={`SKU: ${viewingProduct.sku}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Selling Price</span>
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(viewingProduct.sellingPrice, settings.currencySymbol)}
                  <span className="text-xs text-zinc-500 font-normal"> / {viewingProduct.unit}</span>
                </p>
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Cost Price</span>
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {viewingProduct.costPrice !== undefined
                    ? formatCurrency(viewingProduct.costPrice, settings.currencySymbol)
                    : 'N/A'}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Current Stock</span>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {viewingProduct.stockQuantity} {viewingProduct.unit}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Category</span>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {viewingProduct.category}
                </p>
              </div>
            </div>

            {viewingProduct.barcode && (
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Barcode</span>
                <p className="font-mono text-zinc-800 dark:text-zinc-200 mt-0.5">
                  {viewingProduct.barcode}
                </p>
              </div>
            )}

            {viewingProduct.description && (
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase">Description</span>
                <p className="text-zinc-600 dark:text-zinc-300 mt-0.5 leading-relaxed">
                  {viewingProduct.description}
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between text-[11px] text-zinc-400">
              <span>Created: {formatDateTime(viewingProduct.createdAt)}</span>
              <span>Updated: {formatDateTime(viewingProduct.updatedAt)}</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Archive Product Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) handleSoftDelete(deleteConfirmId);
        }}
        title="Archive Product"
        message="Are you sure you want to archive this product? It will be hidden from the active POS sales counter but can be restored at any time."
        confirmLabel="Archive Product"
        variant="warning"
      />

      {/* Restore Product Confirmation */}
      <ConfirmDialog
        isOpen={!!restoreConfirmId}
        onClose={() => setRestoreConfirmId(null)}
        onConfirm={() => {
          if (restoreConfirmId) handleRestore(restoreConfirmId);
        }}
        title="Restore Product"
        message="Are you sure you want to restore this product to active inventory?"
        confirmLabel="Restore Product"
        variant="info"
      />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-zinc-400">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading products...</p>
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
