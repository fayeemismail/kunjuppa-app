import { Order, BusinessSettings, PrinterConnectionStatus } from '@/types';
import { generateEscPosBytes, PrintableReceiptData } from './receiptFormatter';
import { EscPosEncoder } from './escpos';

// Known Bluetooth thermal printer service and characteristic UUIDs
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard thermal printer service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Common Chinese POS printer
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC / Microchip transparent UART
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic custom BLE service
];

export interface PrinterConnectionResult {
  success: boolean;
  message: string;
  deviceName?: string;
}

export interface IPrinterService {
  isSupported(): boolean;
  getStatus(): PrinterConnectionStatus;
  getDeviceName(): string | null;
  connect(): Promise<PrinterConnectionResult>;
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

  public async connect(): Promise<PrinterConnectionResult> {
    if (!this.isSupported()) {
      this.status = 'unsupported';
      this.notify();
      return {
        success: false,
        message: 'Web Bluetooth is not supported by your browser. Use Google Chrome / Edge on desktop/Android or use the Browser Print fallback.',
      };
    }

    try {
      this.status = 'connecting';
      this.notify();

      // Request device with optional printer services or acceptAllDevices
      const navBluetooth = (navigator as any).bluetooth;
      const device = await navBluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES,
      });

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

      // Try discovering known services first
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
          // Continue to next service
        }
      }

      // If not found in known list, inspect all available primary services
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
            'Connected to Bluetooth device, but no writable ESC/POS printer characteristic was found. Note: Many thermal printers use Bluetooth Classic (SPP) which Web Bluetooth cannot interface with. Please use Browser Print fallback.',
          deviceName: device.name || 'Bluetooth Device',
        };
      }

      this.device = device;
      this.characteristic = writeChar;
      this.status = 'connected';
      this.notify();

      return {
        success: true,
        message: `Successfully connected to ${device.name || 'Bluetooth Printer'}.`,
        deviceName: device.name || 'Bluetooth Printer',
      };
    } catch (err: any) {
      this.status = 'disconnected';
      this.notify();
      if (err.name === 'NotFoundError') {
        return { success: false, message: 'Printer pairing was cancelled by user.' };
      }
      return {
        success: false,
        message: err.message || 'Failed to establish Bluetooth printer connection.',
      };
    }
  }

  public async disconnect(): Promise<void> {
    if (this.device && this.device.gatt.connected) {
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
      // Send data in chunks of 100 bytes to avoid BLE MTU overflow
      const chunkSize = 100;
      for (let offset = 0; offset < data.length; offset += chunkSize) {
        const slice = data.slice(offset, offset + chunkSize);
        if (this.characteristic.properties.writeWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(slice);
        } else {
          await this.characteristic.writeValue(slice);
        }
        // Small delay to let printer buffer process
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
      .line(`Date: ${new Date().toLocaleString('en-IN')}`)
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
