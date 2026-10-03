import { Product, Customer, Order, PendingOrder, BusinessSettings, User } from '@/types';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_ORDERS, DEFAULT_SETTINGS } from './seedData';

const KEYS = {
  AUTH_USER: 'pos_auth_user',
  PRODUCTS: 'pos_products',
  CUSTOMERS: 'pos_customers',
  ORDERS: 'pos_orders',
  PENDING_ORDERS: 'pos_pending_orders',
  SETTINGS: 'pos_settings',
  SEEDED: 'pos_has_seeded_v1',
};

const isBrowser = typeof window !== 'undefined';

export const storage = {
  // Check and seed initial data if first visit
  initializeSeedData: (): void => {
    if (!isBrowser) return;
    try {
      const currentSettings = localStorage.getItem(KEYS.SETTINGS);
      const hasAed = currentSettings && currentSettings.includes('AED');
      const existingProducts = localStorage.getItem(KEYS.PRODUCTS);
      const hasMarlboro = existingProducts && existingProducts.includes('Marlboro Red');

      // Auto-migrate if first visit, or not yet migrated to true_aed_v5
      const migrationKey = localStorage.getItem(KEYS.SEEDED);
      if (migrationKey !== 'true_aed_v5' || !hasAed || !hasMarlboro) {
        localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
        localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
        localStorage.setItem(KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        if (!localStorage.getItem(KEYS.PENDING_ORDERS)) {
          localStorage.setItem(KEYS.PENDING_ORDERS, JSON.stringify([]));
        }
        localStorage.setItem(KEYS.SEEDED, 'true_aed_v5');
      }
    } catch (e) {
      console.error('Error initializing localStorage seed data:', e);
    }
  },

  // Auth User
  getAuthUser: (): User | null => {
    if (!isBrowser) return null;
    try {
      const data = localStorage.getItem(KEYS.AUTH_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setAuthUser: (user: User | null): void => {
    if (!isBrowser) return;
    if (user) {
      localStorage.setItem(KEYS.AUTH_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.AUTH_USER);
    }
  },

  // Products
  getProducts: (): Product[] => {
    if (!isBrowser) return INITIAL_PRODUCTS;
    try {
      const data = localStorage.getItem(KEYS.PRODUCTS);
      return data ? JSON.parse(data) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  },

  setProducts: (products: Product[]): void => {
    if (!isBrowser) return;
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  },

  // Customers
  getCustomers: (): Customer[] => {
    if (!isBrowser) return INITIAL_CUSTOMERS;
    try {
      const data = localStorage.getItem(KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  },

  setCustomers: (customers: Customer[]): void => {
    if (!isBrowser) return;
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
  },

  // Orders
  getOrders: (): Order[] => {
    if (!isBrowser) return INITIAL_ORDERS;
    try {
      const data = localStorage.getItem(KEYS.ORDERS);
      return data ? JSON.parse(data) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  },

  setOrders: (orders: Order[]): void => {
    if (!isBrowser) return;
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  },

  // Pending / Unprinted Orders Queue
  getPendingOrders: (): PendingOrder[] => {
    if (!isBrowser) return [];
    try {
      const data = localStorage.getItem(KEYS.PENDING_ORDERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setPendingOrders: (pendingOrders: PendingOrder[]): void => {
    if (!isBrowser) return;
    localStorage.setItem(KEYS.PENDING_ORDERS, JSON.stringify(pendingOrders));
  },

  // Settings
  getSettings: (): BusinessSettings => {
    if (!isBrowser) return DEFAULT_SETTINGS;
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      return data ? JSON.parse(data) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  setSettings: (settings: BusinessSettings): void => {
    if (!isBrowser) return;
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  // Reset to default seed
  resetAllData: (): void => {
    if (!isBrowser) return;
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    localStorage.setItem(KEYS.PENDING_ORDERS, JSON.stringify([]));
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(KEYS.SEEDED, 'true');
  },

  // Export full database as JSON
  exportDataJson: (): string => {
    return JSON.stringify(
      {
        products: storage.getProducts(),
        customers: storage.getCustomers(),
        orders: storage.getOrders(),
        pendingOrders: storage.getPendingOrders(),
        settings: storage.getSettings(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  },

  // Import JSON backup
  importDataJson: (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.products && Array.isArray(parsed.products)) {
        storage.setProducts(parsed.products);
      }
      if (parsed.customers && Array.isArray(parsed.customers)) {
        storage.setCustomers(parsed.customers);
      }
      if (parsed.orders && Array.isArray(parsed.orders)) {
        storage.setOrders(parsed.orders);
      }
      if (parsed.pendingOrders && Array.isArray(parsed.pendingOrders)) {
        storage.setPendingOrders(parsed.pendingOrders);
      }
      if (parsed.settings && typeof parsed.settings === 'object') {
        storage.setSettings(parsed.settings);
      }
      return true;
    } catch (e) {
      console.error('Failed to import data:', e);
      return false;
    }
  },
};
