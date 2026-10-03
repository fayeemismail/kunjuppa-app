import { create } from 'zustand';
import { Customer } from '@/types';
import { storage } from '@/lib/storage';

interface CustomerState {
  customers: Customer[];
  isLoaded: boolean;
  loadCustomers: () => void;
  addCustomer: (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => { success: boolean; error?: string; customer?: Customer };
  updateCustomer: (id: string, updates: Partial<Customer>) => { success: boolean; error?: string };
  softDeleteCustomer: (id: string) => { success: boolean };
  restoreCustomer: (id: string) => { success: boolean };
  getActiveCustomers: () => Customer[];
  getArchivedCustomers: () => Customer[];
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  isLoaded: false,

  loadCustomers: () => {
    storage.initializeSeedData();
    const stored = storage.getCustomers();
    set({ customers: stored, isLoaded: true });
  },

  addCustomer: (data) => {
    if (!data.name.trim()) {
      return { success: false, error: 'Customer name is required.' };
    }
    if (!data.phone.trim()) {
      return { success: false, error: 'Phone number is required.' };
    }

    const { customers } = get();
    // Check phone duplicate among active customers
    const phoneExists = customers.some(
      (c) => !c.isDeleted && c.phone.trim() === data.phone.trim()
    );
    if (phoneExists) {
      return { success: false, error: `A customer with phone number ${data.phone} already exists.` };
    }

    const newCustomer: Customer = {
      ...data,
      name: data.name.trim(),
      phone: data.phone.trim(),
      id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    };

    const updated = [newCustomer, ...customers];
    storage.setCustomers(updated);
    set({ customers: updated });
    return { success: true, customer: newCustomer };
  },

  updateCustomer: (id, updates) => {
    const { customers } = get();
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) {
      return { success: false, error: 'Customer not found.' };
    }

    if (updates.phone) {
      const phoneConflict = customers.some(
        (c) => c.id !== id && !c.isDeleted && c.phone.trim() === updates.phone?.trim()
      );
      if (phoneConflict) {
        return { success: false, error: `Phone number ${updates.phone} is already registered.` };
      }
    }

    const updatedList = [...customers];
    updatedList[index] = {
      ...updatedList[index],
      ...updates,
      name: updates.name !== undefined ? updates.name.trim() : updatedList[index].name,
      phone: updates.phone !== undefined ? updates.phone.trim() : updatedList[index].phone,
      updatedAt: new Date().toISOString(),
    };

    storage.setCustomers(updatedList);
    set({ customers: updatedList });
    return { success: true };
  },

  softDeleteCustomer: (id) => {
    const { customers } = get();
    const updated = customers.map((c) =>
      c.id === id ? { ...c, isDeleted: true, deletedAt: new Date().toISOString() } : c
    );
    storage.setCustomers(updated);
    set({ customers: updated });
    return { success: true };
  },

  restoreCustomer: (id) => {
    const { customers } = get();
    const updated = customers.map((c) =>
      c.id === id ? { ...c, isDeleted: false, deletedAt: undefined, updatedAt: new Date().toISOString() } : c
    );
    storage.setCustomers(updated);
    set({ customers: updated });
    return { success: true };
  },

  getActiveCustomers: () => {
    return get().customers.filter((c) => !c.isDeleted);
  },

  getArchivedCustomers: () => {
    return get().customers.filter((c) => c.isDeleted);
  },
}));
