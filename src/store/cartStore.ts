import { create } from 'zustand';
import { CartItem, Customer, DiscountType, PendingOrder, Product } from '@/types';
import { storage } from '@/lib/storage';

interface CartTotals {
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
}

interface CartState {
  items: CartItem[];
  selectedCustomer: Customer | null;
  isWalkIn: boolean;
  discountType: DiscountType;
  discountValue: number;
  paymentMethod: 'cash' | 'upi' | 'card';
  pendingOrders: PendingOrder[];
  isPendingLoaded: boolean;

  // Actions
  loadPendingOrders: () => void;
  addItem: (product: Product, quantity?: number) => { success: boolean; message?: string };
  updateQuantity: (productId: string, quantity: number) => { success: boolean; message?: string };
  updateItemPrice: (productId: string, newPrice: number) => { success: boolean; message?: string };
  resetItemPrice: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  setWalkIn: (isWalkIn: boolean) => void;
  setDiscount: (type: DiscountType, value: number) => void;
  setPaymentMethod: (method: 'cash' | 'upi' | 'card') => void;
  getTotals: () => CartTotals;

  // Pending / Unprinted Cart Queue operations
  parkCurrentBill: (customLabel?: string) => { success: boolean; message?: string; pendingOrder?: PendingOrder };
  removePendingOrder: (id: string) => void;
  markPendingOrderPrinted: (id: string) => void;
  loadPendingOrderIntoCart: (id: string) => void;
  clearAllPendingOrders: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  selectedCustomer: null,
  isWalkIn: true,
  discountType: 'fixed',
  discountValue: 0,
  paymentMethod: 'cash',
  pendingOrders: [],
  isPendingLoaded: false,

  loadPendingOrders: () => {
    storage.initializeSeedData();
    const stored = storage.getPendingOrders();
    set({ pendingOrders: stored, isPendingLoaded: true });
  },

  addItem: (product, quantity = 1) => {
    if (product.isDeleted) {
      return { success: false, message: 'Cannot add an archived product.' };
    }
    if (product.stockQuantity <= 0) {
      return { success: false, message: `"${product.name}" is currently out of stock.` };
    }

    const { items } = get();
    const existingIndex = items.findIndex((i) => i.productId === product.id);

    if (existingIndex > -1) {
      const currentItem = items[existingIndex];
      const newQty = currentItem.quantity + quantity;
      if (newQty > product.stockQuantity) {
        return {
          success: false,
          message: `Only ${product.stockQuantity} ${product.unit}(s) available in stock.`,
        };
      }
      const updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...currentItem,
        quantity: newQty,
        lineTotal: Math.round(newQty * currentItem.unitPrice * 100) / 100,
      };
      set({ items: updatedItems });
      return { success: true };
    } else {
      if (quantity > product.stockQuantity) {
        return {
          success: false,
          message: `Only ${product.stockQuantity} ${product.unit}(s) available in stock.`,
        };
      }
      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        originalPrice: product.sellingPrice,
        unitPrice: product.sellingPrice,
        isCustomPrice: false,
        quantity: quantity,
        maxStock: product.stockQuantity,
        unit: product.unit,
        lineTotal: Math.round(quantity * product.sellingPrice * 100) / 100,
      };
      set({ items: [...items, newItem] });
      return { success: true };
    }
  },

  updateQuantity: (productId, quantity) => {
    const { items } = get();
    const itemIndex = items.findIndex((i) => i.productId === productId);
    if (itemIndex === -1) return { success: false, message: 'Item not in cart.' };

    const item = items[itemIndex];
    if (quantity <= 0) {
      // Remove if reduced to 0
      const filtered = items.filter((i) => i.productId !== productId);
      set({ items: filtered });
      return { success: true };
    }

    if (quantity > item.maxStock) {
      return {
        success: false,
        message: `Maximum available stock is ${item.maxStock} ${item.unit}(s).`,
      };
    }

    const updated = [...items];
    updated[itemIndex] = {
      ...item,
      quantity,
      lineTotal: Math.round(quantity * item.unitPrice * 100) / 100,
    };
    set({ items: updated });
    return { success: true };
  },

  updateItemPrice: (productId, newPrice) => {
    const { items } = get();
    const itemIndex = items.findIndex((i) => i.productId === productId);
    if (itemIndex === -1) return { success: false, message: 'Item not found in cart.' };

    const sanitizedPrice = Math.max(0, isNaN(newPrice) ? 0 : newPrice);
    const item = items[itemIndex];
    const updated = [...items];
    const isCustom = sanitizedPrice !== item.originalPrice;

    updated[itemIndex] = {
      ...item,
      unitPrice: sanitizedPrice,
      isCustomPrice: isCustom,
      lineTotal: Math.round(item.quantity * sanitizedPrice * 100) / 100,
    };

    set({ items: updated });
    return { success: true };
  },

  resetItemPrice: (productId) => {
    const { items } = get();
    const itemIndex = items.findIndex((i) => i.productId === productId);
    if (itemIndex === -1) return;

    const item = items[itemIndex];
    const updated = [...items];
    updated[itemIndex] = {
      ...item,
      unitPrice: item.originalPrice,
      isCustomPrice: false,
      lineTotal: Math.round(item.quantity * item.originalPrice * 100) / 100,
    };

    set({ items: updated });
  },

  removeItem: (productId) => {
    const { items } = get();
    set({ items: items.filter((i) => i.productId !== productId) });
  },

  clearCart: () => {
    set({
      items: [],
      discountValue: 0,
      selectedCustomer: null,
      isWalkIn: true,
      paymentMethod: 'cash',
    });
  },

  setSelectedCustomer: (customer) => {
    set({
      selectedCustomer: customer,
      isWalkIn: customer === null,
    });
  },

  setWalkIn: (isWalkIn) => {
    set({
      isWalkIn,
      selectedCustomer: isWalkIn ? null : get().selectedCustomer,
    });
  },

  setDiscount: (type, value) => {
    const cleanVal = Math.max(0, isNaN(value) ? 0 : value);
    set({
      discountType: type,
      discountValue: cleanVal,
    });
  },

  setPaymentMethod: (method) => {
    set({ paymentMethod: method });
  },

  getTotals: () => {
    const { items, discountType, discountValue } = get();
    const itemCount = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;

    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = Math.round((subtotal * Math.min(100, discountValue)) / 100 * 100) / 100;
    } else {
      discountAmount = Math.min(subtotal, discountValue);
    }

    const grandTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    return {
      itemCount,
      totalQuantity,
      subtotal,
      discountAmount,
      grandTotal,
    };
  },

  // Save current unprinted composition bill to pending orders queue in cart
  parkCurrentBill: (customLabel) => {
    const { items, selectedCustomer, isWalkIn, discountType, discountValue, paymentMethod, pendingOrders } = get();

    if (items.length === 0) {
      return { success: false, message: 'Cannot save an empty bill.' };
    }

    const totals = get().getTotals();
    const nextQueueNum = pendingOrders.length + 1;
    const custName = isWalkIn || !selectedCustomer ? 'Walk-in Customer' : selectedCustomer.name;
    const defaultLabel = `Bill #${nextQueueNum} (${custName})`;

    const pendingOrder: PendingOrder = {
      id: `pending-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      queueNumber: nextQueueNum,
      label: customLabel?.trim() || defaultLabel,
      createdAt: new Date().toISOString(),
      customerId: selectedCustomer?.id,
      customerName: custName,
      customerPhone: selectedCustomer?.phone,
      customerSnapshot: selectedCustomer
        ? {
            id: selectedCustomer.id,
            name: selectedCustomer.name,
            phone: selectedCustomer.phone,
            address: selectedCustomer.address,
          }
        : { name: 'Walk-in Customer' },
      items: [...items],
      itemCount: totals.itemCount,
      totalQuantity: totals.totalQuantity,
      subtotal: totals.subtotal,
      discountType,
      discountValue,
      discountAmount: totals.discountAmount,
      grandTotal: totals.grandTotal,
      paymentMethod,
      isPrinted: false,
    };

    const updated = [pendingOrder, ...pendingOrders];
    storage.setPendingOrders(updated);

    // Clear current composition cart so user can take another order immediately
    set({
      pendingOrders: updated,
      items: [],
      discountValue: 0,
      selectedCustomer: null,
      isWalkIn: true,
      paymentMethod: 'cash',
    });

    return { success: true, pendingOrder };
  },

  removePendingOrder: (id) => {
    const { pendingOrders } = get();
    const updated = pendingOrders.filter((p) => p.id !== id);
    storage.setPendingOrders(updated);
    set({ pendingOrders: updated });
  },

  markPendingOrderPrinted: (id) => {
    const { pendingOrders } = get();
    const updated = pendingOrders.map((p) =>
      p.id === id ? { ...p, isPrinted: true, printedAt: new Date().toISOString() } : p
    );
    storage.setPendingOrders(updated);
    set({ pendingOrders: updated });
  },

  loadPendingOrderIntoCart: (id) => {
    const { pendingOrders } = get();
    const found = pendingOrders.find((p) => p.id === id);
    if (!found) return;

    // Load found items into current bill
    set({
      items: [...found.items],
      selectedCustomer: found.customerSnapshot
        ? {
            id: found.customerId || `cust-${Date.now()}`,
            name: found.customerName,
            phone: found.customerPhone || '',
            createdAt: found.createdAt,
            updatedAt: found.createdAt,
            isDeleted: false,
          }
        : null,
      isWalkIn: !found.customerId,
      discountType: found.discountType,
      discountValue: found.discountValue,
      paymentMethod: found.paymentMethod,
      // Remove from pending queue since it's now back in active cart
      pendingOrders: pendingOrders.filter((p) => p.id !== id),
    });

    storage.setPendingOrders(pendingOrders.filter((p) => p.id !== id));
  },

  clearAllPendingOrders: () => {
    storage.setPendingOrders([]);
    set({ pendingOrders: [] });
  },
}));
