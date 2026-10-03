import { create } from 'zustand';
import { Order } from '@/types';
import { storage } from '@/lib/storage';

interface OrderState {
  orders: Order[];
  isLoaded: boolean;
  loadOrders: () => void;
  addOrder: (order: Order) => void;
  softDeleteOrder: (id: string) => { success: boolean };
  restoreOrder: (id: string) => { success: boolean };
  bulkSoftDeleteOrders: (ids: string[]) => { success: boolean; count: number };
  bulkRestoreOrders: (ids: string[]) => { success: boolean; count: number };
  getActiveOrders: () => Order[];
  getArchivedOrders: () => Order[];
  generateNextOrderNumber: () => string;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  isLoaded: false,

  loadOrders: () => {
    storage.initializeSeedData();
    const stored = storage.getOrders();
    set({ orders: stored, isLoaded: true });
  },

  generateNextOrderNumber: () => {
    const { orders } = get();
    const currentYear = new Date().getFullYear();
    // Count all orders created this year
    const yearPrefix = `ORD-${currentYear}-`;
    const yearOrders = orders.filter((o) => o.orderNumber.startsWith(yearPrefix));
    let maxSeq = 0;
    yearOrders.forEach((o) => {
      const parts = o.orderNumber.split('-');
      if (parts.length >= 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });
    const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
    return `ORD-${currentYear}-${nextSeq}`;
  },

  addOrder: (order) => {
    const { orders } = get();
    const updated = [order, ...orders];
    storage.setOrders(updated);
    set({ orders: updated });
  },

  softDeleteOrder: (id) => {
    const { orders } = get();
    const updated = orders.map((o) =>
      o.id === id ? { ...o, isDeleted: true, deletedAt: new Date().toISOString() } : o
    );
    storage.setOrders(updated);
    set({ orders: updated });
    return { success: true };
  },

  restoreOrder: (id) => {
    const { orders } = get();
    const updated = orders.map((o) =>
      o.id === id ? { ...o, isDeleted: false, deletedAt: undefined } : o
    );
    storage.setOrders(updated);
    set({ orders: updated });
    return { success: true };
  },

  bulkSoftDeleteOrders: (ids) => {
    const { orders } = get();
    const targetSet = new Set(ids);
    let count = 0;
    const updated = orders.map((o) => {
      if (targetSet.has(o.id) && !o.isDeleted) {
        count++;
        return { ...o, isDeleted: true, deletedAt: new Date().toISOString() };
      }
      return o;
    });
    storage.setOrders(updated);
    set({ orders: updated });
    return { success: true, count };
  },

  bulkRestoreOrders: (ids) => {
    const { orders } = get();
    const targetSet = new Set(ids);
    let count = 0;
    const updated = orders.map((o) => {
      if (targetSet.has(o.id) && o.isDeleted) {
        count++;
        return { ...o, isDeleted: false, deletedAt: undefined };
      }
      return o;
    });
    storage.setOrders(updated);
    set({ orders: updated });
    return { success: true, count };
  },

  getActiveOrders: () => {
    return get().orders.filter((o) => !o.isDeleted);
  },

  getArchivedOrders: () => {
    return get().orders.filter((o) => o.isDeleted);
  },
}));
