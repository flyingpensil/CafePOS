// ============================================================================
// UAE FEDERAL TAX AUTHORITY (FTA) COMPLIANCE ENGINE
// VAT Law: Federal Decree-Law No. (8) of 2017 on Value Added Tax
// Cabinet Decision No. (52) of 2017 on the Executive Regulation
// ============================================================================

export interface TaxCalculationLineInput {
  unitPrice: number;       // Base price per unit
  quantity: number;        // Quantity sold
  discountAmount?: number; // Line-level discount in AED
  vatRate?: number;        // Default 0.05 (5%)
  isTaxInclusive?: boolean;// Default true for UAE F&B and Retail
}

export interface TaxCalculationLineResult {
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  grossAmount: number;     // Total including VAT
  taxableAmount: number;   // Net amount before VAT
  vatRate: number;         // 0.05
  vatAmount: number;       // Exact VAT in AED
  lineTotal: number;       // Final payable for this line
}

export interface InvoiceTaxSummary {
  subtotalTaxable: number; // Sum of taxable bases (AED)
  discountTotal: number;   // Total discounts applied (AED)
  vatTotal: number;        // Total 5% VAT (AED)
  grossTotal: number;      // subtotalTaxable + vatTotal
  roundingDifference: number; // e.g. for cash tender rounding
  grandTotal: number;      // Final payable in AED
}

export class UaeTaxEngine {
  public static readonly STANDARD_VAT_RATE = 0.05; // 5% UAE standard rate

  /**
   * Validates a 15-digit UAE Tax Registration Number (TRN).
   * Valid format: Exactly 15 digits, starts with '100', numeric.
   */
  public static validateTrn(trn: string): { isValid: boolean; error?: string } {
    const cleanTrn = trn.replace(/\s+/g, '');
    if (!/^\d{15}$/.test(cleanTrn)) {
      return {
        isValid: false,
        error: 'UAE TRN must be exactly 15 numeric digits (الرقم الضريبي يتكون من 15 رقماً)'
      };
    }
    if (!cleanTrn.startsWith('100')) {
      return {
        isValid: false,
        error: 'Standard UAE FTA TRN typically starts with 100'
      };
    }
    return { isValid: true };
  }

  /**
   * Calculates taxable amount and 5% VAT for a single invoice line.
   * Handles tax-inclusive (standard UAE retail/cafeteria) and tax-exclusive items.
   */
  public static calculateLineTax(input: TaxCalculationLineInput): TaxCalculationLineResult {
    const {
      unitPrice,
      quantity,
      discountAmount = 0,
      vatRate = UaeTaxEngine.STANDARD_VAT_RATE,
      isTaxInclusive = true
    } = input;

    const rawTotal = (unitPrice * quantity) - discountAmount;
    const finalRaw = Math.max(0, rawTotal);

    let taxableAmount: number;
    let vatAmount: number;
    let lineTotal: number;

    if (isTaxInclusive) {
      // UAE B2C standard: selling price already includes 5% VAT
      // Taxable = Price / (1 + 0.05)
      // VAT = Price - Taxable
      lineTotal = UaeTaxEngine.roundAed(finalRaw);
      taxableAmount = UaeTaxEngine.roundAed(lineTotal / (1 + vatRate));
      vatAmount = UaeTaxEngine.roundAed(lineTotal - taxableAmount);
    } else {
      // B2B standard: VAT is added on top
      taxableAmount = UaeTaxEngine.roundAed(finalRaw);
      vatAmount = UaeTaxEngine.roundAed(taxableAmount * vatRate);
      lineTotal = UaeTaxEngine.roundAed(taxableAmount + vatAmount);
    }

    return {
      unitPrice: UaeTaxEngine.roundAed(unitPrice),
      quantity,
      discountAmount: UaeTaxEngine.roundAed(discountAmount),
      grossAmount: lineTotal,
      taxableAmount,
      vatRate,
      vatAmount,
      lineTotal
    };
  }

  /**
   * Computes invoice-level totals from an array of calculated line items.
   */
  public static calculateInvoiceTotals(
    lines: TaxCalculationLineResult[],
    orderDiscount: number = 0,
    isCashRounding: boolean = false
  ): InvoiceTaxSummary {
    let subtotalTaxable = 0;
    let lineDiscounts = 0;
    let vatTotal = 0;

    for (const line of lines) {
      subtotalTaxable += line.taxableAmount;
      lineDiscounts += line.discountAmount;
      vatTotal += line.vatAmount;
    }

    subtotalTaxable = UaeTaxEngine.roundAed(subtotalTaxable);
    vatTotal = UaeTaxEngine.roundAed(vatTotal);
    const totalDiscount = UaeTaxEngine.roundAed(lineDiscounts + orderDiscount);

    const grossTotal = UaeTaxEngine.roundAed(subtotalTaxable + vatTotal - orderDiscount);

    let grandTotal = grossTotal;
    let roundingDifference = 0;

    if (isCashRounding) {
      // Optional: UAE cash rounding to nearest 25 fils (0.25 AED)
      grandTotal = Math.round(grossTotal * 4) / 4;
      roundingDifference = UaeTaxEngine.roundAed(grandTotal - grossTotal);
    }

    return {
      subtotalTaxable,
      discountTotal: totalDiscount,
      vatTotal,
      grossTotal,
      roundingDifference,
      grandTotal: UaeTaxEngine.roundAed(grandTotal)
    };
  }

  /**
   * Formats an amount in AED with 2 decimal places and AED / د.إ symbol.
   */
  public static formatAed(amount: number, locale: 'en' | 'ar' = 'en'): string {
    const formatted = amount.toFixed(2);
    return locale === 'ar' ? `${formatted} د.إ` : `AED ${formatted}`;
  }

  /**
   * Half-up financial rounding to 2 decimal places.
   */
  public static roundAed(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
