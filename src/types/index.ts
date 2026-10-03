export type UnitType = 'piece' | 'kg' | 'litre' | 'packet' | 'box' | 'meter' | 'dozen';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier';
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  sellingPrice: number;
  costPrice?: number;
  stockQuantity: number;
  unit: UnitType;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  barcode?: string;
  originalPrice: number;
  unitPrice: number;
  isCustomPrice?: boolean;
  quantity: number;
  maxStock: number;
  unit: UnitType;
  lineTotal: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  originalPrice?: number;
  isCustomPrice?: boolean;
  quantity: number;
  unit: UnitType;
  lineTotal: number;
}

export type DiscountType = 'percentage' | 'fixed';

export interface Order {
  id: string;
  orderNumber: string; // e.g. ORD-2026-0001
  createdAt: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerSnapshot?: Partial<Customer>;
  items: OrderItem[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'upi' | 'card';
  paymentStatus: 'paid' | 'pending';
  orderStatus: 'completed' | 'cancelled';
  isDeleted: boolean;
  deletedAt?: string;
}

export interface PendingOrder {
  id: string;
  queueNumber: number;
  label: string; // e.g. "Bill #1"
  createdAt: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerSnapshot?: Partial<Customer>;
  items: CartItem[];
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'upi' | 'card';
  isPrinted: boolean;
  printedAt?: string;
}

export type ReceiptWidth = '58mm' | '80mm';

export interface BusinessSettings {
  businessName: string;
  phone: string;
  address: string;
  email: string;
  gstin?: string;
  currencySymbol: string;
  currencyCode: string;
  receiptWidth: ReceiptWidth;
  receiptFooter: string;
  lowStockThreshold: number;
  defaultPaymentMethod: 'cash' | 'upi' | 'card';
}

export type PrinterConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'unsupported';
