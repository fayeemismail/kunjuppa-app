/**
 * Standard ESC/POS binary command encoder for thermal receipt printers.
 */
export class EscPosEncoder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  public init(): this {
    // ESC @: Initialize printer
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  public align(alignment: 'left' | 'center' | 'right'): this {
    // ESC a n: 0=Left, 1=Center, 2=Right
    const n = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0;
    this.buffer.push(0x1b, 0x61, n);
    return this;
  }

  public bold(enable: boolean = true): this {
    // ESC E n: 1=Bold on, 0=Bold off
    this.buffer.push(0x1b, 0x45, enable ? 1 : 0);
    return this;
  }

  public underline(enable: boolean = true): this {
    // ESC - n: 1=Underline on, 0=Underline off
    this.buffer.push(0x1b, 0x2d, enable ? 1 : 0);
    return this;
  }

  public text(text: string): this {
    const encoder = new TextEncoder();
    // Replace non-ascii chars like ₹ with Rs. for standard thermal codepages
    const sanitized = text.replace(/₹/g, 'Rs. ');
    const bytes = encoder.encode(sanitized);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  public line(text: string = ''): this {
    this.text(text);
    this.buffer.push(0x0a); // LF
    return this;
  }

  public feed(lines: number = 1): this {
    // ESC d n: Print and feed n lines
    this.buffer.push(0x1b, 0x64, lines);
    return this;
  }

  public cut(partial: boolean = false): this {
    // GS V m: Cut paper (partial or full)
    this.feed(3);
    this.buffer.push(0x1d, 0x56, partial ? 1 : 0);
    return this;
  }

  public getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}
