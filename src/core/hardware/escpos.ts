// ============================================================================
// ESC/POS THERMAL PRINTER & PERIPHERAL HARDWARE ABSTRACTION
// Supports 80mm (48-column) and 58mm (32-column) standard thermal receipt printers
// Includes Cash Drawer Pulse (ESC p), Kitchen Tickets (KOT), & Bilingual Receipts
// ============================================================================

import { SalesInvoice, TenantInfo, BranchInfo } from '../../types/pos';

export class EscPosBuilder {
  private buffer: number[] = [];
  private readonly columns: number; // 48 for 80mm, 32 for 58mm

  constructor(paperWidth: '80mm' | '58mm' = '80mm') {
    this.columns = paperWidth === '80mm' ? 48 : 32;
    this.init();
  }

  /**
   * ESC @ - Initialize printer
   */
  public init(): this {
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  /**
   * ESC a n - Justification (0: Left, 1: Center, 2: Right)
   */
  public align(alignment: 'left' | 'center' | 'right'): this {
    const code = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0;
    this.buffer.push(0x1b, 0x61, code);
    return this;
  }

  /**
   * ESC E n - Bold text
   */
  public bold(enable: boolean = true): this {
    this.buffer.push(0x1b, 0x45, enable ? 1 : 0);
    return this;
  }

  /**
   * GS ! n - Font sizing
   * size: 0 (Normal), 1 (Double Height), 2 (Double Width), 3 (Quad / Both)
   */
  public setFontSize(size: 'normal' | 'double-h' | 'double-w' | 'large'): this {
    let n = 0;
    if (size === 'double-h') n = 0x01;
    if (size === 'double-w') n = 0x10;
    if (size === 'large') n = 0x11;
    this.buffer.push(0x1d, 0x21, n);
    return this;
  }

  /**
   * Appends text as raw bytes (ASCII/Latin/UTF-8 fallback).
   */
  public text(str: string): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    for (const b of bytes) {
      this.buffer.push(b);
    }
    return this;
  }

  /**
   * Appends a text line followed by newline.
   */
  public line(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0a);
    return this;
  }

  /**
   * Draws a continuous horizontal separator line across printer width.
   */
  public divider(char: string = '-'): this {
    this.line(char.repeat(this.columns));
    return this;
  }

  /**
   * Formats a 2-column key-value row with dots or space padding.
   * e.g., "Karak Chai x 2 ................... 3.00"
   */
  public row(left: string, right: string, padChar: string = ' '): this {
    const available = this.columns - left.length - right.length;
    if (available > 0) {
      this.line(left + padChar.repeat(available) + right);
    } else {
      this.line(left);
      this.line(' '.repeat(Math.max(0, this.columns - right.length)) + right);
    }
    return this;
  }

  /**
   * ESC p m t1 t2 - Pulse cash drawer to pop open
   * Pin 2 (m=0) or Pin 5 (m=1), t1=25 (50ms pulse), t2=250 (500ms delay)
   */
  public pulseCashDrawer(pin: 2 | 5 = 2): this {
    const m = pin === 2 ? 0 : 1;
    this.buffer.push(0x1b, 0x70, m, 25, 250);
    return this;
  }

  /**
   * GS ( k ... - Thermal QR Code Command standard
   */
  public printQrCode(data: string): this {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const len = dataBytes.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);

    // 1. Set model (Model 2)
    this.buffer.push(0x1d, 0x28, 0x6b, 4, 0, 49, 65, 50, 0);
    // 2. Set module size (3-5 dots per module)
    this.buffer.push(0x1d, 0x28, 0x6b, 3, 0, 49, 67, 4);
    // 3. Set error correction level (Level M: 49)
    this.buffer.push(0x1d, 0x28, 0x6b, 3, 0, 49, 69, 49);
    // 4. Store data in symbol storage
    this.buffer.push(0x1d, 0x28, 0x6b, pL, pH, 49, 80, 48);
    for (const b of dataBytes) {
      this.buffer.push(b);
    }
    // 5. Print the QR symbol
    this.buffer.push(0x1d, 0x28, 0x6b, 3, 0, 49, 81, 48);
    return this;
  }

  /**
   * GS V m - Cut paper with feed
   */
  public cut(partial: boolean = true): this {
    this.buffer.push(0x0a, 0x0a, 0x0a); // Feed 3 lines
    this.buffer.push(0x1d, 0x56, partial ? 1 : 0);
    return this;
  }

  /**
   * Returns the final Uint8Array ESC/POS byte sequence.
   */
  public toUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  // ==========================================================================
  // HIGH-LEVEL RECEIPT GENERATOR TEMPLATES
  // ==========================================================================

  /**
   * Generates a UAE FTA Compliant Bilingual Simplified Tax Invoice.
   */
  public static buildTaxInvoice(
    invoice: SalesInvoice,
    tenant: TenantInfo,
    branch: BranchInfo
  ): Uint8Array {
    const p = new EscPosBuilder(branch.thermalPrinterWidth);

    // Header
    p.align('center')
      .setFontSize('large')
      .bold(true)
      .line('TAX INVOICE')
      .line('فاتورة ضريبية')
      .setFontSize('normal')
      .bold(false)
      .line(tenant.legalNameEn)
      .line(tenant.legalNameAr)
      .line(`${branch.nameEn} - ${branch.nameAr}`)
      .line(branch.addressEn)
      .line(`Tel: ${branch.phone}`)
      .bold(true)
      .line(`TRN / الرقم الضريبي: ${tenant.trn}`)
      .bold(false)
      .divider('=');

    // Invoice Meta
    p.align('left')
      .row('Invoice No / رقم الفاتورة:', invoice.invoiceNumber)
      .row('Date & Time / التاريخ والوقت:', new Date(invoice.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dubai' }))
      .row('Order Type / نوع الطلب:', invoice.orderType)
      .row('Cashier / الكاشير:', invoice.cashierName);

    if (invoice.tableNumber) {
      p.bold(true).row('Table / الطاولة:', invoice.tableNumber).bold(false);
    }
    p.divider('-');

    // Line Items Header
    p.bold(true);
    if (branch.thermalPrinterWidth === '80mm') {
      p.row('Item / الوصف', 'Qty x Price     Total');
    } else {
      p.row('Item / الوصف', 'Qty  Total');
    }
    p.bold(false).divider('-');

    // Items
    for (const item of invoice.items) {
      p.bold(true).line(`${item.product.nameEn} / ${item.product.nameAr}`).bold(false);
      
      const qtyPrice = `${item.quantity} x ${item.unitPrice.toFixed(2)}`;
      const totalStr = `${item.lineTotal.toFixed(2)} AED`;
      p.row(`  ${qtyPrice}`, totalStr);

      // Print modifiers if present
      if (item.selectedModifiers && item.selectedModifiers.length > 0) {
        for (const mod of item.selectedModifiers) {
          const modPrice = mod.priceDelta > 0 ? ` (+${mod.priceDelta.toFixed(2)})` : '';
          p.line(`   * ${mod.nameEn}${modPrice}`);
        }
      }
      if (item.kitchenNotes) {
        p.line(`   [Note: ${item.kitchenNotes}]`);
      }
    }

    p.divider('=');

    // Totals Breakdown
    p.align('left')
      .row('Taxable Subtotal (Net) / المبلغ الخاضع:', `${invoice.subtotalTaxable.toFixed(2)} AED`)
      .row('VAT (5%) / ضريبة القيمة المضافة:', `${invoice.vatTotal.toFixed(2)} AED`);

    if (invoice.discountTotal > 0) {
      p.row('Discount / الخصم:', `-${invoice.discountTotal.toFixed(2)} AED`);
    }

    p.divider('-')
      .setFontSize('double-h')
      .bold(true)
      .row('TOTAL / الإجمالي:', `${invoice.grandTotal.toFixed(2)} AED`)
      .setFontSize('normal')
      .bold(false)
      .divider('-');

    // Payment details
    for (const payment of invoice.payments) {
      p.row(`Paid (${payment.method}) / الدفع:`, `${payment.amount.toFixed(2)} AED`);
      if (payment.tenderedCash && payment.changeGiven !== undefined) {
        p.row('Cash Tendered / المستلم:', `${payment.tenderedCash.toFixed(2)} AED`);
        p.row('Change / الباقي:', `${payment.changeGiven.toFixed(2)} AED`);
      }
    }

    p.divider('-');

    // UAE FTA Compliant QR Code
    p.align('center')
      .line('Scan for FTA Verification')
      .line('امسح للتحقق من الفاتورة الضريبية')
      .printQrCode(invoice.qrTlvBase64)
      .line('')
      .line('Prices are inclusive of 5% UAE VAT')
      .line('الأسعار شاملة 5% ضريبة القيمة المضافة')
      .line('Thank you for your visit / شكراً لزيارتكم')
      .cut();

    return p.toUint8Array();
  }

  /**
   * Generates a Kitchen Order Ticket (KOT) for cafeteria cook display/thermal printer.
   */
  public static buildKitchenTicket(
    invoiceNumber: string,
    orderType: string,
    tableNumber: string | undefined,
    items: SalesInvoice['items']
  ): Uint8Array {
    const p = new EscPosBuilder('80mm');

    p.align('center')
      .setFontSize('double-w')
      .bold(true)
      .line('KITCHEN ORDER TICKET')
      .line('أمر تحضير للمطبخ')
      .setFontSize('normal')
      .line(`Order: ${invoiceNumber.slice(-8)}`)
      .line(`Type: ${orderType} ${tableNumber ? `| TABLE #${tableNumber}` : ''}`)
      .line(`Time: ${new Date().toLocaleTimeString('en-US', { hour12: true })}`)
      .divider('=');

    p.align('left');
    for (const item of items) {
      p.setFontSize('double-h')
        .bold(true)
        .line(`[ ${item.quantity}x ] ${item.product.nameEn}`)
        .setFontSize('normal')
        .line(`       ${item.product.nameAr}`)
        .bold(false);

      if (item.selectedModifiers && item.selectedModifiers.length > 0) {
        for (const mod of item.selectedModifiers) {
          p.bold(true).line(`   >> ${mod.nameEn} / ${mod.nameAr}`).bold(false);
        }
      }

      if (item.kitchenNotes) {
        p.bold(true).line(`   !! SPECIAL: ${item.kitchenNotes}`).bold(false);
      }
      p.divider('.');
    }

    p.cut();
    return p.toUint8Array();
  }
}
