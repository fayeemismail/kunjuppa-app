import { Order, BusinessSettings, PrinterConnectionStatus } from '@/types';
import { generateEscPosBytes, PrintableReceiptData } from './receiptFormatter';
import { EscPosEncoder } from './escpos';

// Known Bluetooth thermal printer service UUIDs (ESC/POS SPP & custom BLE profiles)
export const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard thermal printer service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Common Chinese POS / Xprinter BLE
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC / Microchip transparent UART
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic custom BLE service
  '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent / standard BLE
];

// Common thermal printer name prefixes for clean named scan (filters out Unknown Device clutter on Android)
export const COMMON_PRINTER_PREFIXES = [
  'POS',
  'pos',
  'MTP',
  'mtp',
  'MPT',
  'mpt',
  'Printer',
  'PRINTER',
  'printer',
  'RPP',
  'rpp',
  'XP',
  'xp',
  'BT',
  'bt',
  'Thermal',
  'thermal',
  'QS',
  'qs',
  '58',
  '80',
  'ZJ',
  'zj',
  'Gprinter',
  'gprinter',
  'SPP',
  'spp',
  'InnerPrinter',
  'Bluetooth',
  'BlueTooth',
  'bluetooth',
  'Epson',
  'epson',
  'Star',
  'star',
  'Sunmi',
  'sunmi',
  'Netum',
  'netum',
  'Munbyn',
  'munbyn',
  'Goojprt',
  'goojprt',
  'Milestone',
  'milestone',
  'Bixolon',
  'bixolon',
  'Deli',
  'deli',
  'Zywell',
  'zywell',
  'Hoin',
  'hoin',
  'RP',
  'CT',
  'PT',
];

export interface PrinterConnectionResult {
  success: boolean;
  message: string;
  deviceName?: string;
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export interface IPrinterService {
  isSupported(): boolean;
  isIOSDevice(): boolean;
  getStatus(): PrinterConnectionStatus;
  getDeviceName(): string | null;
  connect(options?: { filterPrintersOnly?: boolean }): Promise<PrinterConnectionResult>;
  disconnect(): Promise<void>;
  printRaw(data: Uint8Array): Promise<{ success: boolean; message: string }>;
  printReceipt(order: PrintableReceiptData, settings: BusinessSettings): Promise<{ success: boolean; message: string }>;
  printTest(settings: BusinessSettings): Promise<{ success: boolean; message: string }>;
  subscribeStatus(listener: (status: PrinterConnectionStatus, deviceName: string | null) => void): () => void;
}

class WebBluetoothPrinterService implements IPrinterService {
  private device: any = null;
  private characteristic: any = null;
  private status: PrinterConnectionStatus = 'disconnected';
  private listeners: ((status: PrinterConnectionStatus, deviceName: string | null) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && !('bluetooth' in navigator)) {
      this.status = 'unsupported';
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'bluetooth' in navigator;
  }

  public isIOSDevice(): boolean {
    return isIOS();
  }

  public getStatus(): PrinterConnectionStatus {
    if (!this.isSupported()) return 'unsupported';
    return this.status;
  }

  public getDeviceName(): string | null {
    return this.device?.name || null;
  }

  public subscribeStatus(listener: (status: PrinterConnectionStatus, deviceName: string | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus(), this.getDeviceName());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const curStatus = this.getStatus();
    const devName = this.getDeviceName();
    this.listeners.forEach((fn) => fn(curStatus, devName));
  }

  public async connect(options?: { filterPrintersOnly?: boolean }): Promise<PrinterConnectionResult> {
    if (!this.isSupported()) {
      this.status = 'unsupported';
      this.notify();

      if (this.isIOSDevice()) {
        return {
          success: false,
          message:
            'iOS / iPhone Safari does not support Web Bluetooth natively. Please use AirPrint / Browser Print, or open this app in the free "Bluefy - Web BLE Browser" from the App Store.',
        };
      }

      return {
        success: false,
        message:
          'Web Bluetooth is not supported by your current browser. Use Google Chrome or Microsoft Edge on Android/desktop, or use the Browser Print fallback.',
      };
    }

    try {
      this.status = 'connecting';
      this.notify();

      const navBluetooth = (navigator as any).bluetooth;
      const filterOnly = options?.filterPrintersOnly ?? true;

      let requestOptions: any;

      if (filterOnly) {
        // Filter by printer names: eliminates all "Unknown or Unsupported Device" clutter on Android
        requestOptions = {
          filters: COMMON_PRINTER_PREFIXES.map((prefix) => ({ namePrefix: prefix })),
          optionalServices: PRINTER_SERVICES,
        };
      } else {
        // Show all devices
        requestOptions = {
          acceptAllDevices: true,
          optionalServices: PRINTER_SERVICES,
        };
      }

      let device: any;
      try {
        device = await navBluetooth.requestDevice(requestOptions);
      } catch (firstErr: any) {
        // If filtered scan returned NotFoundError or user cancelled, try acceptAllDevices if filtered failed unexpectedly
        if (filterOnly && firstErr.name !== 'NotFoundError') {
          device = await navBluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: PRINTER_SERVICES,
          });
        } else {
          throw firstErr;
        }
      }

      if (!device) {
        this.status = 'disconnected';
        this.notify();
        return { success: false, message: 'No Bluetooth printer was selected.' };
      }

      device.addEventListener('gattserverdisconnected', () => {
        this.status = 'disconnected';
        this.characteristic = null;
        this.notify();
      });

      const server = await device.gatt.connect();
      let writeChar: any = null;

      // Discover known thermal printer services
      for (const serviceUuid of PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const chars = await service.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              writeChar = c;
              break;
            }
          }
          if (writeChar) break;
        } catch {
          // Continue scanning
        }
      }

      // If not found in known list, inspect all primary services
      if (!writeChar) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            const chars = await service.getCharacteristics();
            for (const c of chars) {
              if (c.properties.write || c.properties.writeWithoutResponse) {
                writeChar = c;
                break;
              }
            }
            if (writeChar) break;
          }
        } catch (e) {
          console.warn('Could not inspect all services:', e);
        }
      }

      if (!writeChar) {
        await server.disconnect();
        this.status = 'disconnected';
        this.notify();
        return {
          success: false,
          message:
            `Connected to "${device.name || 'Bluetooth Device'}", but no writable ESC/POS printer characteristic was found. Note: If this printer uses Bluetooth Classic (SPP), pair it in Android Bluetooth Settings and use Browser Print.`,
          deviceName: device.name || 'Bluetooth Device',
        };
      }

      this.device = device;
      this.characteristic = writeChar;
      this.status = 'connected';
      this.notify();

      return {
        success: true,
        message: `Successfully connected to ${device.name || 'Thermal Printer'}. Ready to print!`,
        deviceName: device.name || 'Thermal Printer',
      };
    } catch (err: any) {
      this.status = 'disconnected';
      this.notify();
      if (err.name === 'NotFoundError') {
        return { success: false, message: 'Printer selection was cancelled.' };
      }
      return {
        success: false,
        message: err.message || 'Failed to establish Bluetooth printer connection.',
      };
    }
  }

  public async disconnect(): Promise<void> {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
    this.status = 'disconnected';
    this.notify();
  }

  public async printRaw(data: Uint8Array): Promise<{ success: boolean; message: string }> {
    if (this.status !== 'connected' || !this.characteristic) {
      return {
        success: false,
        message: 'Printer is not connected. Connect via Bluetooth first or use Browser Print.',
      };
    }

    try {
      const chunkSize = 100;
      for (let offset = 0; offset < data.length; offset += chunkSize) {
        const slice = data.slice(offset, offset + chunkSize);
        if (this.characteristic.properties.writeWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(slice);
        } else {
          await this.characteristic.writeValue(slice);
        }
        await new Promise((r) => setTimeout(r, 25));
      }
      return { success: true, message: 'Printed successfully via Bluetooth!' };
    } catch (err: any) {
      console.error('BLE write error:', err);
      return {
        success: false,
        message: `Failed to transmit print data: ${err.message || 'Write error'}`,
      };
    }
  }

  public async printReceipt(order: PrintableReceiptData, settings: BusinessSettings): Promise<{ success: boolean; message: string }> {
    const bytes = generateEscPosBytes(order, settings);
    return this.printRaw(bytes);
  }

  public async printTest(settings: BusinessSettings): Promise<{ success: boolean; message: string }> {
    const encoder = new EscPosEncoder();
    const width = settings.receiptWidth === '58mm' ? 32 : 48;
    const divider = '='.repeat(width);

    encoder
      .align('center')
      .bold(true)
      .line(settings.businessName.toUpperCase())
      .bold(false)
      .line('THERMAL PRINTER TEST RECEIPT')
      .line(divider)
      .align('left')
      .line(`Date: ${new Date().toLocaleString('en-GB')}`)
      .line(`Currency: ${settings.currencyCode} (${settings.currencySymbol})`)
      .line(`Width Profile: ${settings.receiptWidth}`)
      .line(`ESC/POS Commands: OK`)
      .line(`Character Set: ASCII / CP437`)
      .line(divider)
      .align('center')
      .bold(true)
      .line('*** PRINTER TEST PASSED ***')
      .bold(false)
      .feed(2)
      .cut(true);

    return this.printRaw(encoder.getBytes());
  }
}

export const printerService = new WebBluetoothPrinterService();
