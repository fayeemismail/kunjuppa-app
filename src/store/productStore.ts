import { create } from 'zustand';
import { Product } from '@/types';
import { storage } from '@/lib/storage';

interface ProductState {
  products: Product[];
  isLoaded: boolean;
  loadProducts: () => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => { success: boolean; error?: string; product?: Product };
  updateProduct: (id: string, updates: Partial<Product>) => { success: boolean; error?: string };
  softDeleteProduct: (id: string) => { success: boolean };
  restoreProduct: (id: string) => { success: boolean };
  reduceStock: (items: { productId: string; quantity: number }[]) => boolean;
  getActiveProducts: () => Product[];
  getArchivedProducts: () => Product[];
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoaded: false,

  loadProducts: () => {
    storage.initializeSeedData();
    const stored = storage.getProducts();
    set({ products: stored, isLoaded: true });
  },

  addProduct: (data) => {
    // Validation
    if (!data.name.trim()) {
      return { success: false, error: 'Product name is required.' };
    }
    if (!data.sku.trim()) {
      return { success: false, error: 'SKU is required.' };
    }
    if (data.sellingPrice < 0) {
      return { success: false, error: 'Selling price cannot be negative.' };
    }
    if (data.stockQuantity < 0) {
      return { success: false, error: 'Stock quantity cannot be negative.' };
    }

    const { products } = get();
    // Check SKU duplicate among active
    const skuExists = products.some(
      (p) => !p.isDeleted && p.sku.toLowerCase() === data.sku.trim().toLowerCase()
    );
    if (skuExists) {
      return { success: false, error: `SKU '${data.sku}' already exists.` };
    }

    const newProduct: Product = {
      ...data,
      name: data.name.trim(),
      sku: data.sku.trim().toUpperCase(),
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    };

    const updated = [newProduct, ...products];
    storage.setProducts(updated);
    set({ products: updated });
    return { success: true, product: newProduct };
  },

  updateProduct: (id, updates) => {
    const { products } = get();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) {
      return { success: false, error: 'Product not found.' };
    }

    if (updates.sellingPrice !== undefined && updates.sellingPrice < 0) {
      return { success: false, error: 'Selling price cannot be negative.' };
    }
    if (updates.stockQuantity !== undefined && updates.stockQuantity < 0) {
      return { success: false, error: 'Stock quantity cannot be negative.' };
    }

    if (updates.sku) {
      const skuConflict = products.some(
        (p) => p.id !== id && !p.isDeleted && p.sku.toLowerCase() === updates.sku?.trim().toLowerCase()
      );
      if (skuConflict) {
        return { success: false, error: `SKU '${updates.sku}' is already in use by another product.` };
      }
    }

    const updatedList = [...products];
    updatedList[index] = {
      ...updatedList[index],
      ...updates,
      sku: updates.sku ? updates.sku.trim().toUpperCase() : updatedList[index].sku,
      updatedAt: new Date().toISOString(),
    };

    storage.setProducts(updatedList);
    set({ products: updatedList });
    return { success: true };
  },

  softDeleteProduct: (id) => {
    const { products } = get();
    const updated = products.map((p) =>
      p.id === id ? { ...p, isDeleted: true, deletedAt: new Date().toISOString() } : p
    );
    storage.setProducts(updated);
    set({ products: updated });
    return { success: true };
  },

  restoreProduct: (id) => {
    const { products } = get();
    const updated = products.map((p) =>
      p.id === id ? { ...p, isDeleted: false, deletedAt: undefined, updatedAt: new Date().toISOString() } : p
    );
    storage.setProducts(updated);
    set({ products: updated });
    return { success: true };
  },

  reduceStock: (items) => {
    const { products } = get();
    const updated = products.map((p) => {
      const matched = items.find((item) => item.productId === p.id);
      if (matched) {
        const newQty = Math.max(0, p.stockQuantity - matched.quantity);
        return { ...p, stockQuantity: newQty, updatedAt: new Date().toISOString() };
      }
      return p;
    });

    storage.setProducts(updated);
    set({ products: updated });
    return true;
  },

  getActiveProducts: () => {
    return get().products.filter((p) => !p.isDeleted);
  },

  getArchivedProducts: () => {
    return get().products.filter((p) => p.isDeleted);
  },
}));
