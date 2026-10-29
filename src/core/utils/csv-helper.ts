// ============================================================================
// CSV IMPORT & EXPORT UTILITIES (BILINGUAL & EXCEL SAFE)
// Includes UTF-8 BOM (\uFEFF) to prevent Arabic text corruption in Microsoft Excel.
// ============================================================================

import { Product, SalesInvoice, Category } from '../../types/pos';

export interface CsvImportResult {
  products: Product[];
  errors: string[];
  totalRows: number;
}

export class CsvHelper {
  private static readonly UTF8_BOM = '\uFEFF';

  /**
   * Generates a sample CSV template with realistic demo items for user download.
   */
  public static getSampleProductCsv(): string {
    const headers = [
      'sku',
      'barcode',
      'name_en',
      'name_ar',
      'category_id',
      'selling_price',
      'cost_price',
      'vat_rate',
      'unit',
      'track_stock',
      'stock_on_hand',
      'min_reorder_level',
      'is_quick_order'
    ].join(',');

    const rows = [
      'BEV-KARAK,6291001001,Special Karak Chai,شاي كرك مميز,cat_hot,1.50,0.40,0.05,PORTION,FALSE,0,0,TRUE',
      'FNB-OMAN-PARATHA,6291001003,Oman Chips & Cheese Paratha,براتا بطاطس عمان وجبن,cat_sand,5.00,1.80,0.05,PORTION,FALSE,0,0,TRUE',
      'FNB-SHAW-ARABIC,6291001005,Chicken Shawarma Arabic Plate,صحن شاورما دجاج عربي,cat_shaw,18.00,6.00,0.05,PORTION,FALSE,0,0,TRUE',
      'PAP-DBLA-A4,8851907001015,Double A Copy Paper A4 80gsm (500 Sheets),ورق تصوير دبل ايه A4 80 جرام,cat_paper,18.50,13.50,0.05,PACK,TRUE,45,10,FALSE',
      'PEN-FC-07B,4005401423512,Faber-Castell 0.7mm Blue Pen (Box of 10),أقلام حبر فايبر كاستل أزرق,cat_pens,12.00,7.50,0.05,BOX,TRUE,32,8,FALSE',
      'CALC-CAS-991,4549526600747,Casio FX-991EX Scientific Calculator,آلة حاسبة علمية كاسيو 991,cat_paper,75.00,58.00,0.05,PCS,TRUE,6,8,FALSE'
    ];

    return this.UTF8_BOM + [headers, ...rows].join('\r\n');
  }

  /**
   * Exports an array of products into a CSV string formatted for Excel.
   */
  public static exportProductsToCsv(products: Product[]): string {
    const headers = [
      'sku',
      'barcode',
      'name_en',
      'name_ar',
      'category_id',
      'selling_price',
      'cost_price',
      'vat_rate',
      'unit',
      'track_stock',
      'stock_on_hand',
      'min_reorder_level',
      'is_quick_order'
    ];

    const rows = products.map(p => [
      this.escapeCsv(p.sku),
      this.escapeCsv(p.barcode || ''),
      this.escapeCsv(p.nameEn),
      this.escapeCsv(p.nameAr),
      this.escapeCsv(p.categoryId),
      p.sellingPrice.toFixed(2),
      p.costPrice.toFixed(2),
      p.vatRate.toString(),
      p.unit,
      p.trackStock ? 'TRUE' : 'FALSE',
      p.stockOnHand !== undefined ? p.stockOnHand.toString() : '0',
      p.minReorderLevel !== undefined ? p.minReorderLevel.toString() : '0',
      p.isQuickOrder ? 'TRUE' : 'FALSE'
    ].join(','));

    return this.UTF8_BOM + [headers.join(','), ...rows].join('\r\n');
  }

  /**
   * Parses an uploaded CSV string into validated Product objects.
   */
  public static parseProductsFromCsv(
    csvText: string,
    existingCategories: Category[]
  ): CsvImportResult {
    const errors: string[] = [];
    const products: Product[] = [];

    // Strip BOM if present
    const cleanText = csvText.replace(/^\uFEFF/, '').trim();
    if (!cleanText) {
      return { products: [], errors: ['CSV file is empty.'], totalRows: 0 };
    }

    const lines = this.splitCsvLines(cleanText);
    if (lines.length <= 1) {
      return { products: [], errors: ['CSV file has no data rows.'], totalRows: 0 };
    }

    const header = lines[0].map(h => h.trim().toLowerCase());
    const skuIdx = header.indexOf('sku');
    const nameEnIdx = header.indexOf('name_en');
    const nameArIdx = header.indexOf('name_ar');
    const priceIdx = header.indexOf('selling_price');
    const barcodeIdx = header.indexOf('barcode');
    const catIdx = header.indexOf('category_id');
    const costIdx = header.indexOf('cost_price');
    const vatIdx = header.indexOf('vat_rate');
    const unitIdx = header.indexOf('unit');
    const trackStockIdx = header.indexOf('track_stock');
    const stockIdx = header.indexOf('stock_on_hand');
    const minReorderIdx = header.indexOf('min_reorder_level');
    const quickOrderIdx = header.indexOf('is_quick_order');

    if (skuIdx === -1 || nameEnIdx === -1 || priceIdx === -1) {
      return {
        products: [],
        errors: ['Missing mandatory columns. CSV must contain at least: sku, name_en, selling_price'],
        totalRows: lines.length - 1
      };
    }

    const defaultCategory = existingCategories[0]?.id || 'cat_hot';

    for (let r = 1; r < lines.length; r++) {
      const row = lines[r];
      if (row.length === 0 || (row.length === 1 && !row[0].trim())) {
        continue; // skip empty lines
      }

      const rowNum = r + 1;
      const sku = row[skuIdx]?.trim();
      const nameEn = row[nameEnIdx]?.trim();
      const nameAr = nameArIdx !== -1 ? row[nameArIdx]?.trim() : nameEn;
      const priceStr = row[priceIdx]?.trim();
      const price = parseFloat(priceStr);

      if (!sku) {
        errors.push(`Row ${rowNum}: SKU cannot be empty.`);
        continue;
      }
      if (!nameEn) {
        errors.push(`Row ${rowNum}: English Name cannot be empty.`);
        continue;
      }
      if (isNaN(price) || price < 0) {
        errors.push(`Row ${rowNum}: Invalid selling price "${priceStr}". Must be a positive number.`);
        continue;
      }

      const costPrice = costIdx !== -1 ? (parseFloat(row[costIdx]) || 0) : 0;
      const vatRate = vatIdx !== -1 ? (parseFloat(row[vatIdx]) || 0.05) : 0.05;
      const barcode = barcodeIdx !== -1 ? row[barcodeIdx]?.trim() : undefined;
      const categoryId = catIdx !== -1 && row[catIdx]?.trim() ? row[catIdx].trim() : defaultCategory;
      const unit = (unitIdx !== -1 && row[unitIdx]?.trim()) ? (row[unitIdx].trim().toUpperCase() as any) : 'PCS';
      const trackStock = trackStockIdx !== -1 ? row[trackStockIdx]?.trim().toUpperCase() === 'TRUE' : false;
      const stockOnHand = stockIdx !== -1 ? (parseFloat(row[stockIdx]) || 0) : 0;
      const minReorderLevel = minReorderIdx !== -1 ? (parseFloat(row[minReorderIdx]) || 5) : 5;
      const isQuickOrder = quickOrderIdx !== -1 ? row[quickOrderIdx]?.trim().toUpperCase() === 'TRUE' : true;

      products.push({
        id: `p_imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sku,
        barcode: barcode || undefined,
        nameEn,
        nameAr: nameAr || nameEn,
        categoryId,
        costPrice,
        sellingPrice: price,
        vatRate,
        isTaxInclusive: true,
        unit: ['PCS', 'BOX', 'PACK', 'PORTION', 'PAGE', 'SERVICE'].includes(unit) ? unit : 'PCS',
        trackStock,
        stockOnHand,
        minReorderLevel,
        isQuickOrder
      });
    }

    return {
      products,
      errors,
      totalRows: lines.length - 1
    };
  }

  /**
   * Exports historical sales invoices into a UAE FTA Tax Audit CSV.
   */
  public static exportInvoicesToCsv(invoices: SalesInvoice[]): string {
    const headers = [
      'Invoice Number',
      'Date & Time (GST)',
      'Order Type',
      'Table #',
      'Cashier Name',
      'Payment Method',
      'Taxable Subtotal (Net AED)',
      'VAT 5% Total (AED)',
      'Order Discount (AED)',
      'Grand Total (Gross AED)',
      'Sync Status',
      'Items Count'
    ];

    const rows = invoices.map(inv => [
      this.escapeCsv(inv.invoiceNumber),
      this.escapeCsv(new Date(inv.createdAt).toLocaleString('en-GB')),
      this.escapeCsv(inv.orderType),
      this.escapeCsv(inv.tableNumber || '-'),
      this.escapeCsv(inv.cashierName),
      this.escapeCsv(inv.paymentMethod),
      inv.subtotalTaxable.toFixed(2),
      inv.vatTotal.toFixed(2),
      inv.discountTotal.toFixed(2),
      inv.grandTotal.toFixed(2),
      inv.aspSyncStatus,
      inv.items.length.toString()
    ].join(','));

    return this.UTF8_BOM + [headers.join(','), ...rows].join('\r\n');
  }

  /**
   * Triggers browser download of a text/csv file.
   */
  public static downloadFile(filename: string, content: string, mimeType: string = 'text/csv;charset=utf-8;'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private static escapeCsv(value: string): string {
    if (value === null || value === undefined) return '""';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private static splitCsvLines(text: string): string[][] {
    const lines: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(field);
        field = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(field);
        lines.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }

    if (field || row.length > 0) {
      row.push(field);
      lines.push(row);
    }

    return lines;
  }
}
