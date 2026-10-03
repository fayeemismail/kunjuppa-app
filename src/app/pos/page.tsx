'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  UserCheck,
  UserPlus,
  Percent,
  IndianRupee,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  PackageX,
  X,
  Printer,
  RotateCcw,
  Sparkles,
  Edit3,
  Clock,
  Layers,
  ChevronRight,
  ArrowRight,
  Save,
  FileText,
  Tag,
} from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useProductStore } from '@/store/productStore';
import { useCustomerStore } from '@/store/customerStore';
import { useOrderStore } from '@/store/orderStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Product, Customer, Order, OrderItem, PendingOrder, CartItem } from '@/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { ReceiptModal } from '@/components/receipt/ReceiptModal';

export default function PosPage() {
  const { showToast } = useToast();
  const { getActiveProducts, reduceStock } = useProductStore();
  const { getActiveCustomers, addCustomer } = useCustomerStore();
  const { addOrder, generateNextOrderNumber } = useOrderStore();
  const { settings } = useSettingsStore();

  const {
    items: cartItems,
    selectedCustomer,
    isWalkIn,
    discountType,
    discountValue,
    paymentMethod,
    pendingOrders,
    addItem,
    updateQuantity,
    updateItemPrice,
    resetItemPrice,
    removeItem,
    clearCart,
    setSelectedCustomer,
    setWalkIn,
    setDiscount,
    setPaymentMethod,
    getTotals,
    parkCurrentBill,
    removePendingOrder,
    markPendingOrderPrinted,
    loadPendingOrderIntoCart,
  } = useCartStore();

  // Active view tab for mobile / medium screen: 'catalog' | 'cart' | 'pending'
  const [activeView, setActiveView] = useState<'catalog' | 'cart' | 'pending'>('catalog');

  // Search & Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock'>('all');

  // Price Edit Modal
  const [editingPriceItem, setEditingPriceItem] = useState<CartItem | null>(null);
  const [newCustomPriceInput, setNewCustomPriceInput] = useState<string>('');

  // Customer picker modal / search
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // Quick New Customer state
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Confirm dialogs
  const [isClearCartConfirmOpen, setIsClearCartConfirmOpen] = useState(false);
  const [discardPendingId, setDiscardPendingId] = useState<string | null>(null);

  // Printing & Checkout modals
  const [receiptTarget, setReceiptTarget] = useState<Order | PendingOrder | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const activeProducts = getActiveProducts();
  const activeCustomers = getActiveCustomers();

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    activeProducts.forEach((p) => set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [activeProducts]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return activeProducts.filter((product) => {
      if (selectedCategory !== 'All' && product.category !== selectedCategory) {
        return false;
      }
      if (stockFilter === 'in_stock' && product.stockQuantity <= 0) {
        return false;
      }
      if (
        stockFilter === 'low_stock' &&
        (product.stockQuantity > settings.lowStockThreshold || product.stockQuantity === 0)
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesSku = product.sku.toLowerCase().includes(query);
        const matchesBarcode = product.barcode?.toLowerCase().includes(query);
        return matchesName || matchesSku || matchesBarcode;
      }
      return true;
    });
  }, [activeProducts, selectedCategory, stockFilter, searchQuery, settings.lowStockThreshold]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return activeCustomers;
    const q = customerSearch.trim().toLowerCase();
    return activeCustomers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [activeCustomers, customerSearch]);

  const totals = getTotals();

  // Add to cart (No toast notification on tap as requested)
  const handleAddToCart = (product: Product) => {
    const res = addItem(product, 1);
    if (!res.success && res.message) {
      showToast(res.message, 'error');
    }
  };

  // Open custom price editor modal
  const openPriceEditor = (item: CartItem) => {
    setEditingPriceItem(item);
    setNewCustomPriceInput(item.unitPrice.toString());
  };

  // Save customized unit price
  const handleSaveCustomPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPriceItem) return;

    const val = parseFloat(newCustomPriceInput);
    if (isNaN(val) || val < 0) {
      showToast('Please enter a valid price.', 'error');
      return;
    }

    updateItemPrice(editingPriceItem.productId, val);
    showToast(`Price updated to ${formatCurrency(val, settings.currencySymbol)}`, 'success');
    setEditingPriceItem(null);
  };

  // Reset custom price back to default catalog price
  const handleResetPrice = () => {
    if (!editingPriceItem) return;
    resetItemPrice(editingPriceItem.productId);
    showToast('Reset to original catalog price.', 'info');
    setEditingPriceItem(null);
  };

  // Handle Quick Create Customer
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addCustomer({
      name: newCustName,
      phone: newCustPhone,
      email: newCustEmail || undefined,
      address: newCustAddress || undefined,
    });

    if (res.success && res.customer) {
      showToast(`Customer "${res.customer.name}" created!`, 'success');
      setSelectedCustomer(res.customer);
      setIsNewCustomerModalOpen(false);
      setIsCustomerModalOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setNewCustAddress('');
    } else {
      showToast(res.error || 'Failed to create customer.', 'error');
    }
  };

  // 1. PARK / SAVE CURRENT UNPRINTED BILL INTO CART QUEUE
  const handleParkBill = () => {
    if (cartItems.length === 0) {
      showToast('Cannot hold an empty bill. Add items first.', 'error');
      return;
    }
    const res = parkCurrentBill();
    if (res.success && res.pendingOrder) {
      showToast(`${res.pendingOrder.label} saved in Cart Queue! Ready for next customer.`, 'success');
      setActiveView('catalog'); // return to catalog so user can take next customer's order
    } else {
      showToast(res.message || 'Failed to save bill.', 'error');
    }
  };

  // 2. SAVE A PENDING ORDER INTO PERMANENT ORDERS DATABASE
  const handleSavePendingToOrders = (pending: PendingOrder) => {
    // Verify stock availability
    for (const item of pending.items) {
      const liveProduct = activeProducts.find((p) => p.id === item.productId);
      if (!liveProduct || item.quantity > liveProduct.stockQuantity) {
        showToast(
          `Insufficient stock for "${item.name}". Only ${liveProduct?.stockQuantity || 0} in stock.`,
          'error'
        );
        return;
      }
    }

    const orderNumber = generateNextOrderNumber();
    const orderItems: OrderItem[] = pending.items.map((item) => ({
      productId: item.productId,
      productName: item.name,
      sku: item.sku,
      unitPrice: item.unitPrice,
      originalPrice: item.originalPrice,
      isCustomPrice: item.isCustomPrice,
      quantity: item.quantity,
      unit: item.unit,
      lineTotal: item.lineTotal,
    }));

    const finalOrder: Order = {
      id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderNumber,
      createdAt: new Date().toISOString(),
      customerId: pending.customerId,
      customerName: pending.customerName,
      customerPhone: pending.customerPhone,
      customerSnapshot: pending.customerSnapshot,
      items: orderItems,
      itemCount: pending.itemCount,
      totalQuantity: pending.totalQuantity,
      subtotal: pending.subtotal,
      discountType: pending.discountType,
      discountValue: pending.discountValue,
      discountAmount: pending.discountAmount,
      grandTotal: pending.grandTotal,
      paymentMethod: pending.paymentMethod,
      paymentStatus: 'paid',
      orderStatus: 'completed',
      isDeleted: false,
    };

    // Deduct stock
    reduceStock(pending.items.map((item) => ({ productId: item.productId, quantity: item.quantity })));

    // Save to permanent orders
    addOrder(finalOrder);

    // Remove from pending queue
    removePendingOrder(pending.id);

    showToast(`Order ${orderNumber} finalized and saved!`, 'success');
  };

  // 3. IMMEDIATE CHECKOUT & SAVE FOR CURRENT BILL
  const handleDirectCheckout = () => {
    if (cartItems.length === 0) {
      showToast('Cannot checkout an empty cart.', 'error');
      return;
    }

    for (const item of cartItems) {
      const liveProduct = activeProducts.find((p) => p.id === item.productId);
      if (!liveProduct || item.quantity > liveProduct.stockQuantity) {
        showToast(
          `Insufficient stock for "${item.name}". Only ${liveProduct?.stockQuantity || 0} available.`,
          'error'
        );
        return;
      }
    }

    const orderNumber = generateNextOrderNumber();
    const orderItems: OrderItem[] = cartItems.map((item) => ({
      productId: item.productId,
      productName: item.name,
      sku: item.sku,
      unitPrice: item.unitPrice,
      originalPrice: item.originalPrice,
      isCustomPrice: item.isCustomPrice,
      quantity: item.quantity,
      unit: item.unit,
      lineTotal: item.lineTotal,
    }));

    const newOrder: Order = {
      id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderNumber,
      createdAt: new Date().toISOString(),
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      customerPhone: selectedCustomer?.phone,
      customerSnapshot: selectedCustomer
        ? {
            id: selectedCustomer.id,
            name: selectedCustomer.name,
            phone: selectedCustomer.phone,
            address: selectedCustomer.address,
          }
        : { name: 'Walk-in Customer' },
      items: orderItems,
      itemCount: totals.itemCount,
      totalQuantity: totals.totalQuantity,
      subtotal: totals.subtotal,
      discountType,
      discountValue,
      discountAmount: totals.discountAmount,
      grandTotal: totals.grandTotal,
      paymentMethod,
      paymentStatus: 'paid',
      orderStatus: 'completed',
      isDeleted: false,
    };

    reduceStock(cartItems.map((item) => ({ productId: item.productId, quantity: item.quantity })));
    addOrder(newOrder);
    clearCart();
    setCompletedOrder(newOrder);
    showToast(`Order ${orderNumber} completed!`, 'success');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] md:h-[calc(100vh-6.5rem)] max-w-[1700px] mx-auto select-none">
      {/* MOBILE SEGMENTED TABS (Visible on Mobile & Medium screens < lg) */}
      <div className="lg:hidden flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 mb-3 shrink-0 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveView('catalog')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeView === 'catalog'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60'
          }`}
        >
          <span>Catalog</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('cart')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 relative ${
            activeView === 'cart'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60'
          }`}
        >
          <span>Current Bill</span>
          {cartItems.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeView === 'cart' ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white'
              }`}
            >
              {cartItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveView('pending')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 relative ${
            activeView === 'pending'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Queue ({pendingOrders.length})</span>
          {pendingOrders.length > 0 && (
            <span
              className={`w-2 h-2 rounded-full animate-ping ${
                activeView === 'pending' ? 'bg-white' : 'bg-amber-500'
              }`}
            />
          )}
        </button>
      </div>

      {/* MAIN LAYOUT: Responsive Grid */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* ======================================================== */}
        {/* 1. PRODUCT CATALOG PANEL (Shown when activeView is 'catalog' OR on Desktop) */}
        {/* ======================================================== */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden ${
            activeView !== 'catalog' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Search, Categories, & Filters */}
          <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-2.5 bg-zinc-50/50 dark:bg-zinc-900/60">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item, SKU, barcode..."
                  className="w-full pl-9 pr-8 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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

              {/* Stock status filter chips */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setStockFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    stockFilter === 'all'
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('in_stock')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    stockFilter === 'in_stock'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  In Stock
                </button>
              </div>
            </div>

            {/* Category Pills horizontal scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid with safe mobile bottom padding */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto pb-32 lg:pb-4">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-400">
                <PackageX className="w-10 h-10 mb-2 text-zinc-300 dark:text-zinc-600" />
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  No matching products
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stockQuantity <= 0;
                  const isLowStock =
                    product.stockQuantity > 0 &&
                    product.stockQuantity <= settings.lowStockThreshold;

                  const inCart = cartItems.find((ci) => ci.productId === product.id);
                  const cartQty = inCart ? inCart.quantity : 0;
                  const remainingStock = Math.max(0, product.stockQuantity - cartQty);

                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        if (!isOutOfStock) handleAddToCart(product);
                      }}
                      className={`group relative flex flex-col justify-between p-2.5 sm:p-3 rounded-xl border transition-all text-left select-none touch-manipulation ${
                        isOutOfStock
                          ? 'opacity-50 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 cursor-not-allowed'
                          : 'bg-white dark:bg-zinc-800/90 border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 hover:shadow-md cursor-pointer active:scale-95'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                        <span className="uppercase font-semibold tracking-wider truncate max-w-[80px]">
                          {product.category}
                        </span>
                        {cartQty > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                            {cartQty} in cart
                          </span>
                        )}
                      </div>

                      <div className="my-1">
                        <h4 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-tight">
                          {product.name}
                        </h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                          {product.sku}
                        </p>
                      </div>

                      <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-700/60 flex items-center justify-between">
                        <div>
                          <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(product.sellingPrice, settings.currencySymbol)}
                          </span>
                          <span className="text-[10px] text-zinc-400 ml-0.5">/{product.unit}</span>
                        </div>

                        <span
                          className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {isOutOfStock ? 'Out' : `${remainingStock} left`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ======================================================== */}
        {/* 2. CART & ORDER PANEL (Shown when activeView is 'cart' OR on Desktop) */}
        {/* ======================================================== */}
        <div
          className={`w-full lg:w-[420px] xl:w-[460px] flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden ${
            activeView !== 'cart' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Desktop Tab Switcher: "Current Bill" vs "Pending Queue (X)" */}
          <div className="hidden lg:flex items-center border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-1">
            <button
              type="button"
              onClick={() => setActiveView('cart')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                activeView === 'cart' || activeView === 'catalog'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60'
              }`}
            >
              Current Bill ({cartItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveView('pending')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeView === 'pending'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Queue ({pendingOrders.length})</span>
            </button>
          </div>

          {/* Customer Selector Bar */}
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {isWalkIn ? 'Walk-in Customer' : selectedCustomer?.name}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  {isWalkIn ? 'Regular Counter Sale' : selectedCustomer?.phone}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(true)}
                className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg transition"
                title="Add New Customer"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                <ShoppingCart className="w-10 h-10 mb-2 text-zinc-300 dark:text-zinc-700" />
                <p className="text-xs font-semibold text-zinc-500">No items in current bill</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Tap products in Catalog to add to bill.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveView('catalog')}
                  className="lg:hidden mt-3 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                >
                  Open Catalog
                </button>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.productId}
                  className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 space-y-2"
                >
                  {/* Top: Item Title, Custom Price Trigger, Remove */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-0.5">
                        <span className="font-mono text-zinc-400">{item.sku}</span>
                        <span>•</span>
                        {/* Price change badge button */}
                        <button
                          type="button"
                          onClick={() => openPriceEditor(item)}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold transition ${
                            item.isCustomPrice
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                              : 'bg-zinc-200/80 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300'
                          }`}
                          title="Click to give customer a special lower price"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          <span>
                            {formatCurrency(item.unitPrice, settings.currencySymbol)}/{item.unit}
                          </span>
                          {item.isCustomPrice && (
                            <span className="line-through text-zinc-400 text-[9px] ml-0.5">
                              {formatCurrency(item.originalPrice, settings.currencySymbol)}
                            </span>
                          )}
                          <Edit3 className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="p-1 text-zinc-400 hover:text-rose-500 transition"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom: Quantity Stepper & Line Total */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 flex items-center justify-center text-zinc-800 dark:text-zinc-200 transition active:scale-95"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min="1"
                        max={item.maxStock}
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) updateQuantity(item.productId, val);
                        }}
                        className="w-12 h-7 text-center text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const res = updateQuantity(item.productId, item.quantity + 1);
                          if (!res.success && res.message) {
                            showToast(res.message, 'error');
                          }
                        }}
                        className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 flex items-center justify-center text-zinc-800 dark:text-zinc-200 transition active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(item.lineTotal, settings.currencySymbol)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Calculations & Double Action: Hold Bill vs Checkout */}
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900 space-y-2.5">
            {/* Discount Bar */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Order Discount:</span>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center bg-zinc-200 dark:bg-zinc-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setDiscount('fixed', discountValue)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                      discountType === 'fixed'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'text-zinc-500'
                    }`}
                  >
                    {settings.currencySymbol} Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscount('percentage', discountValue)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                      discountType === 'percentage'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'text-zinc-500'
                    }`}
                  >
                    % Off
                  </button>
                </div>

                <input
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? 100 : totals.subtotal}
                  value={discountValue === 0 ? '' : discountValue}
                  placeholder="0"
                  onChange={(e) => setDiscount(discountType, parseFloat(e.target.value) || 0)}
                  className="w-14 px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-semibold text-right focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex items-center justify-center gap-1 py-1 px-2 rounded-xl text-xs font-medium border transition ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`flex items-center justify-center gap-1 py-1 px-2 rounded-xl text-xs font-medium border transition ${
                  paymentMethod === 'upi'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>UPI</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center justify-center gap-1 py-1 px-2 rounded-xl text-xs font-medium border transition ${
                  paymentMethod === 'card'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card</span>
              </button>
            </div>

            {/* Grand Total Bar */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-baseline">
              <div className="text-xs text-zinc-500">
                <span>{totals.itemCount} items ({totals.totalQuantity} units)</span>
                {totals.discountAmount > 0 && (
                  <span className="block text-emerald-600 text-[11px]">
                    Disc: -{formatCurrency(totals.discountAmount, settings.currencySymbol)}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 block uppercase font-bold">Total Payable</span>
                <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totals.grandTotal, settings.currencySymbol)}
                </span>
              </div>
            </div>

            {/* ACTION BUTTONS: HOLD IN QUEUE vs DIRECT CHECKOUT */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Option A: Hold / Add to Cart Queue without printing yet */}
              <button
                type="button"
                onClick={handleParkBill}
                disabled={cartItems.length === 0}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-40 active:scale-95 shadow-xs"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Hold / Add to Queue</span>
              </button>

              {/* Option B: Direct Charge / Save Now */}
              <button
                type="button"
                onClick={handleDirectCheckout}
                disabled={cartItems.length === 0}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-40 active:scale-95 shadow-md shadow-emerald-950/20"
              >
                <span>Charge & Pay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Clear Cart link */}
            {cartItems.length > 0 && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsClearCartConfirmOpen(true)}
                  className="text-[11px] text-zinc-400 hover:text-rose-600 transition"
                >
                  Clear Current Bill
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. PENDING ORDERS / UNPRINTED CART QUEUE PANEL */}
        {/* ======================================================== */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden ${
            activeView !== 'pending' ? 'hidden' : 'flex'
          }`}
        >
          {/* Header of Pending Queue */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2 truncate">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Pending Unprinted Bills Queue ({pendingOrders.length})</span>
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                Orders held in cart. Print receipts individually, then save to permanent orders.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('catalog')}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Take Another Order</span>
            </button>
          </div>

          {/* Pending Bills List */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3">
            {pendingOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-400">
                <Clock className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700" />
                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                  No pending bills in queue
                </p>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                  When taking an order, click <b>"Hold / Add to Queue"</b> to save unprinted orders here
                  while taking the next customer's order.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveView('catalog')}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Start New Order
                </button>
              </div>
            ) : (
              pendingOrders.map((pending) => (
                <div
                  key={pending.id}
                  className="bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-4 space-y-3 transition hover:border-zinc-400"
                >
                  {/* Top: Bill Title, Customer, Time, Status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                          {pending.label}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1.5 shrink-0 ${
                            pending.isPrinted
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60'
                              : 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              pending.isPrinted ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                            }`}
                          />
                          {pending.isPrinted ? 'Printed' : 'Not Printed Yet'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        Customer: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{pending.customerName}</span>
                        {pending.customerPhone && ` • ${pending.customerPhone}`}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(pending.grandTotal, settings.currencySymbol)}
                      </span>
                      <span className="block text-[10px] text-zinc-400">
                        {formatDateTime(pending.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs">
                    <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 divide-y divide-zinc-200 dark:divide-zinc-800">
                      {pending.items.map((it, idx) => (
                        <div key={idx} className="py-1 flex justify-between">
                          <span>
                            {it.name} <span className="text-zinc-400">× {it.quantity}</span>
                            {it.isCustomPrice && (
                              <span className="text-emerald-600 font-normal ml-1">
                                (Special {formatCurrency(it.unitPrice, settings.currencySymbol)})
                              </span>
                            )}
                          </span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {formatCurrency(it.lineTotal, settings.currencySymbol)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions for this pending bill */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-700">
                    <div className="flex items-center gap-1.5">
                      {/* Load back into cart for edits */}
                      <button
                        type="button"
                        onClick={() => {
                          loadPendingOrderIntoCart(pending.id);
                          setActiveView('cart');
                          showToast('Loaded back into cart for editing.', 'info');
                        }}
                        className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {/* Discard */}
                      <button
                        type="button"
                        onClick={() => setDiscardPendingId(pending.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg transition"
                        title="Discard this unprinted bill"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* 1. Print Receipt individually */}
                      <button
                        type="button"
                        onClick={() => setReceiptTarget(pending)}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Receipt</span>
                      </button>

                      {/* 2. Save to Orders */}
                      <button
                        type="button"
                        onClick={() => handleSavePendingToOrders(pending)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/20 transition active:scale-95"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save to Orders</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* FLOATING MOBILE BOTTOM ACTION BAR (Always visible above bottom navigation) */}
      {/* ======================================================== */}
      {cartItems.length > 0 && activeView === 'catalog' && (
        <div className="lg:hidden fixed bottom-[64px] left-3 right-3 z-30 animate-in slide-in-from-bottom-3 duration-200">
          <div className="bg-zinc-900/95 dark:bg-zinc-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-zinc-700/80 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {totals.itemCount}
              </div>
              <div className="truncate">
                <div className="text-sm font-extrabold text-white flex items-center gap-1">
                  <span>{formatCurrency(totals.grandTotal, settings.currencySymbol)}</span>
                </div>
                <div className="text-[11px] text-zinc-300 truncate">
                  {totals.totalQuantity} items • {isWalkIn ? 'Walk-in' : selectedCustomer?.name}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleParkBill}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1 border border-zinc-700 active:scale-95 transition"
                title="Hold bill and start next customer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Hold</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('cart')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 active:scale-95 transition"
              >
                <span>View Bill ({cartItems.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODALS */}
      {/* ======================================================== */}

      {/* Modal: Custom Price Editor */}
      {editingPriceItem && (
        <Modal
          isOpen={!!editingPriceItem}
          onClose={() => setEditingPriceItem(null)}
          title="Adjust Unit Price"
          subtitle={`Set a special price for "${editingPriceItem.name}"`}
          maxWidth="sm"
        >
          <form onSubmit={handleSaveCustomPrice} className="space-y-4">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
              <div className="flex justify-between text-zinc-500">
                <span>Default Catalog Price:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {formatCurrency(editingPriceItem.originalPrice, settings.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Current Quantity:</span>
                <span>{editingPriceItem.quantity} {editingPriceItem.unit}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Custom Selling Price ({settings.currencySymbol})
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                autoFocus
                value={newCustomPriceInput}
                onChange={(e) => setNewCustomPriceInput(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-base font-bold text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Quick Discount Presets in AED */}
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1.5">
                Quick Reductions:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setNewCustomPriceInput(
                      Math.max(0, editingPriceItem.originalPrice - 1).toString()
                    )
                  }
                  className="py-1 px-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  -1 AED
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewCustomPriceInput(
                      Math.max(0, editingPriceItem.originalPrice - 2).toString()
                    )
                  }
                  className="py-1 px-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  -2 AED
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewCustomPriceInput(
                      Math.max(0, editingPriceItem.originalPrice - 5).toString()
                    )
                  }
                  className="py-1 px-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  -5 AED
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNewCustomPriceInput(
                      Math.round(editingPriceItem.originalPrice * 0.9).toString()
                    )
                  }
                  className="py-1 px-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  -10%
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              {editingPriceItem.isCustomPrice ? (
                <button
                  type="button"
                  onClick={handleResetPrice}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Reset to Catalog Price
                </button>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPriceItem(null)}
                  className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                >
                  Apply Price
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Customer Picker Modal */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Select Customer"
        subtitle="Attach a registered customer to this order"
        maxWidth="md"
      >
        <div className="space-y-3">
          <div
            onClick={() => {
              setWalkIn(true);
              setIsCustomerModalOpen(false);
            }}
            className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
              isWalkIn
                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
            }`}
          >
            <div>
              <p className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                Walk-in Customer (General Counter)
              </p>
              <p className="text-[11px] text-zinc-500">Quick counter sale without profile</p>
            </div>
            {isWalkIn && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search name or phone..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-400">
                No matching customer found.
              </div>
            ) : (
              filteredCustomers.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => {
                    setSelectedCustomer(cust);
                    setIsCustomerModalOpen(false);
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    selectedCustomer?.id === cust.id
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                      : 'border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                      {cust.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">{cust.phone}</div>
                  </div>
                  {selectedCustomer?.id === cust.id && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
            <button
              type="button"
              onClick={() => {
                setIsCustomerModalOpen(false);
                setIsNewCustomerModalOpen(true);
              }}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add New Customer</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(false)}
              className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        title="Add New Customer"
        subtitle="Quick customer registration from sales counter"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              required
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              placeholder="e.g. Ramesh Nair"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Address (Optional)
            </label>
            <textarea
              rows={2}
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
              placeholder="Locality or delivery address"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewCustomerModalOpen(false)}
              className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
            >
              Save & Attach
            </button>
          </div>
        </form>
      </Modal>

      {/* Clear Cart Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isClearCartConfirmOpen}
        onClose={() => setIsClearCartConfirmOpen(false)}
        onConfirm={() => {
          clearCart();
          showToast('Cart cleared.', 'info');
        }}
        title="Clear Current Bill"
        message="Are you sure you want to discard all items in the current bill?"
        confirmLabel="Clear Bill"
        variant="warning"
      />

      {/* Discard Pending Order Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!discardPendingId}
        onClose={() => setDiscardPendingId(null)}
        onConfirm={() => {
          if (discardPendingId) {
            removePendingOrder(discardPendingId);
            showToast('Pending bill discarded.', 'info');
          }
        }}
        title="Discard Pending Bill"
        message="Are you sure you want to remove this unprinted draft bill from the queue?"
        confirmLabel="Discard Bill"
        variant="danger"
      />

      {/* Checkout Direct Completion Modal */}
      {completedOrder && (
        <Modal
          isOpen={!!completedOrder}
          onClose={() => setCompletedOrder(null)}
          title="Order Completed!"
          subtitle={`Bill No: ${completedOrder.orderNumber}`}
          maxWidth="sm"
        >
          <div className="text-center py-2 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(completedOrder.grandTotal, settings.currencySymbol)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Customer: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{completedOrder.customerName}</span>
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReceiptTarget(completedOrder);
                  setCompletedOrder(null);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCompletedOrder(null);
                  setActiveView('catalog');
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
              >
                Start Next Sale
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Thermal Receipt Modal (used for both completed orders and individual pending bills) */}
      {receiptTarget && (
        <ReceiptModal
          isOpen={!!receiptTarget}
          onClose={() => setReceiptTarget(null)}
          order={receiptTarget}
          settings={settings}
          onMarkPrinted={(id) => markPendingOrderPrinted(id)}
          onSavePendingOrder={(pending) => handleSavePendingToOrders(pending)}
        />
      )}
    </div>
  );
}
