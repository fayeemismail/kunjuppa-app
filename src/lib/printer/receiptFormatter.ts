import { Order, PendingOrder, BusinessSettings, ReceiptWidth } from '@/types';
import { EscPosEncoder } from './escpos';

export type PrintableReceiptData = Order | PendingOrder;

export interface FormattedReceiptLines {
  header: string[];
  meta: string[];
  tableHeaders: string;
  divider: string;
  items: string[];
  totals: string[];
  footer: string[];
  rawFullText: string;
}

export function padBetween(left: string, right: string, width: number): string {
  const leftTrim = left.trim();
  const rightTrim = right.trim();
  const totalLength = leftTrim.length + rightTrim.length;
  if (totalLength >= width) {
    const spaceAvailable = width - rightTrim.length - 1;
    return leftTrim.substring(0, Math.max(0, spaceAvailable)) + ' ' + rightTrim;
  }
  const spaces = ' '.repeat(width - totalLength);
  return leftTrim + spaces + rightTrim;
}

export function formatReceiptText(order: PrintableReceiptData, settings: BusinessSettings): FormattedReceiptLines {
  const width = settings.receiptWidth === '58mm' ? 32 : 48;
  const divider = '-'.repeat(width);
  const doubleDivider = '='.repeat(width);

  const header = [
    settings.businessName.toUpperCase(),
    settings.address,
    `Tel: ${settings.phone}`,
    settings.gstin ? `GSTIN: ${settings.gstin}` : '',
  ].filter(Boolean);

  const formattedDate = new Date(order.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const billId = 'orderNumber' in order ? order.orderNumber : order.label;

  const meta = [
    padBetween(`Bill: ${billId}`, `Date: ${formattedDate}`, width),
    padBetween(`Customer: ${order.customerName}`, `Payment: ${order.paymentMethod.toUpperCase()}`, width),
    order.customerPhone ? `Contact: ${order.customerPhone}` : '',
  ].filter(Boolean);

  // Table header
  let tableHeaders = '';
  if (width === 32) {
    // 58mm compact: Item (16) Qty (4) Total (10)
    tableHeaders = 'ITEM              QTY      TOTAL';
  } else {
    // 80mm wide: Item (22) Qty (6) Price (9) Total (9)
    tableHeaders = 'ITEM                   QTY      PRICE      TOTAL';
  }

  // Items
  const items: string[] = [];
  order.items.forEach((item: any) => {
    const itemName = item.productName || item.name || 'Product';
    const priceStr = `${settings.currencySymbol}${item.unitPrice.toFixed(2)}`;
    const totalStr = `${settings.currencySymbol}${item.lineTotal.toFixed(2)}`;
    const qtyStr = `${item.quantity} ${item.unit}`;

    if (width === 32) {
      items.push(itemName.substring(0, 32));
      const detailLeft = `  ${qtyStr} x ${item.unitPrice.toFixed(0)}`;
      items.push(padBetween(detailLeft, totalStr, width));
    } else {
      const namePart = itemName.length > 20 ? itemName.substring(0, 20) + '..' : itemName.padEnd(22);
      const qtyPart = qtyStr.padEnd(8);
      const pricePart = priceStr.padEnd(10);
      const line = `${namePart} ${qtyPart} ${pricePart} ${totalStr.padStart(6)}`;
      items.push(line);
    }
  });

  // Totals
  const totals = [
    padBetween('Subtotal:', `${settings.currencySymbol}${order.subtotal.toFixed(2)}`, width),
    order.discountAmount > 0
      ? padBetween(
          `Discount (${order.discountType === 'percentage' ? `${order.discountValue}%` : 'Flat'}):`,
          `-${settings.currencySymbol}${order.discountAmount.toFixed(2)}`,
          width
        )
      : '',
    doubleDivider,
    padBetween('TOTAL AMOUNT:', `${settings.currencySymbol}${order.grandTotal.toFixed(2)}`, width),
    doubleDivider,
    padBetween(`Total Items: ${order.itemCount}`, `Total Qty: ${order.totalQuantity}`, width),
  ].filter(Boolean);

  const footer = settings.receiptFooter
    ? settings.receiptFooter.split('\n').map((line) => line.trim())
    : ['Thank you for shopping with us!'];

  const rawFullText = [
    ...header.map((l) => centerText(l, width)),
    divider,
    ...meta,
    divider,
    tableHeaders,
    divider,
    ...items,
    divider,
    ...totals,
    divider,
    ...footer.map((l) => centerText(l, width)),
    divider,
  ].join('\n');

  return {
    header,
    meta,
    tableHeaders,
    divider,
    items,
    totals,
    footer,
    rawFullText,
  };
}

export function centerText(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width);
  const leftPadding = Math.floor((width - text.length) / 2);
  return ' '.repeat(leftPadding) + text;
}

export function generateEscPosBytes(order: PrintableReceiptData, settings: BusinessSettings): Uint8Array {
  const encoder = new EscPosEncoder();
  const width = settings.receiptWidth === '58mm' ? 32 : 48;
  const divider = '-'.repeat(width);
  const doubleDivider = '='.repeat(width);

  const billId = 'orderNumber' in order ? order.orderNumber : order.label;

  // Header
  encoder.align('center').bold(true).line(settings.businessName.toUpperCase()).bold(false);
  encoder.line(settings.address);
  encoder.line(`Tel: ${settings.phone}`);
  if (settings.gstin) {
    encoder.line(`GSTIN: ${settings.gstin}`);
  }
  encoder.line(divider);

  // Meta
  encoder.align('left');
  encoder.line(`Bill No: ${billId}`);
  const dateStr = new Date(order.createdAt).toLocaleString('en-IN');
  encoder.line(`Date: ${dateStr}`);
  encoder.line(`Customer: ${order.customerName}`);
  if (order.customerPhone) {
    encoder.line(`Contact: ${order.customerPhone}`);
  }
  encoder.line(`Payment: ${order.paymentMethod.toUpperCase()}`);
  encoder.line(divider);

  // Table header
  encoder.bold(true);
  if (width === 32) {
    encoder.line('ITEM              QTY      TOTAL');
  } else {
    encoder.line('ITEM                   QTY      PRICE      TOTAL');
  }
  encoder.bold(false);
  encoder.line(divider);

  // Items
  order.items.forEach((item: any) => {
    const itemName = item.productName || item.name || 'Product';
    const totalStr = `Rs.${item.lineTotal.toFixed(2)}`;
    const qtyStr = `${item.quantity} ${item.unit}`;

    if (width === 32) {
      encoder.line(itemName.substring(0, 32));
      const leftPart = `  ${qtyStr} x ${item.unitPrice.toFixed(0)}`;
      encoder.line(padBetween(leftPart, totalStr, width));
    } else {
      const namePart = itemName.length > 20 ? itemName.substring(0, 20) + '..' : itemName.padEnd(22);
      const qtyPart = qtyStr.padEnd(8);
      const pricePart = `Rs.${item.unitPrice.toFixed(0)}`.padEnd(9);
      encoder.line(`${namePart} ${qtyPart} ${pricePart} ${totalStr.padStart(7)}`);
    }
  });

  encoder.line(divider);

  // Totals
  encoder.line(padBetween('Subtotal:', `Rs.${order.subtotal.toFixed(2)}`, width));
  if (order.discountAmount > 0) {
    const discLabel = `Discount (${order.discountType === 'percentage' ? `${order.discountValue}%` : 'Flat'}):`;
    encoder.line(padBetween(discLabel, `-Rs.${order.discountAmount.toFixed(2)}`, width));
  }
  encoder.line(doubleDivider);
  encoder.bold(true);
  encoder.line(padBetween('TOTAL AMOUNT:', `Rs.${order.grandTotal.toFixed(2)}`, width));
  encoder.bold(false);
  encoder.line(doubleDivider);
  encoder.line(padBetween(`Items: ${order.itemCount}`, `Total Qty: ${order.totalQuantity}`, width));
  encoder.line(divider);

  // Footer
  encoder.align('center');
  if (settings.receiptFooter) {
    settings.receiptFooter.split('\n').forEach((l) => encoder.line(l.trim()));
  }
  encoder.line('*** Powered by POS ***');

  // Cut
  encoder.cut(true);

  return encoder.getBytes();
}
