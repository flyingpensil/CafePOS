// ============================================================================
// SHIFT & CASH DRAWER RECONCILIATION ENGINE (X-REPORT & Z-REPORT)
// Manages Opening Floats, Cash Drops, Expected Cash vs Physical Count, & Over/Short.
// ============================================================================

import { ShiftSession, User, SalesInvoice } from '../../types/pos';
import { localDb } from '../offline/storage';

export interface ShiftSummaryReport {
  shiftId: string;
  terminalId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  totalInvoicesCount: number;
  cashSales: number;
  cardSales: number;
  creditSales: number;
  grossSales: number;
  totalVatCollected: number;
  cashIn: number;
  cashOut: number;
  expectedCashInDrawer: number;
  countedCash?: number;
  discrepancy?: number;
  status: 'OPEN' | 'CLOSED';
}

export class ShiftManager {
  /**
   * Opens a new shift session with an initial cash float in AED.
   */
  public async openShift(
    branchId: string,
    terminalId: string,
    cashier: User,
    openingFloat: number
  ): Promise<ShiftSession> {
    const shift: ShiftSession = {
      id: `SHIFT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      branchId,
      terminalId,
      cashierId: cashier.id,
      cashierName: cashier.fullName,
      openedAt: new Date().toISOString(),
      openingFloat: Math.max(0, openingFloat),
      cashSales: 0,
      cardSales: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: openingFloat,
      status: 'OPEN'
    };

    await localDb.saveShift(shift);
    return shift;
  }

  /**
   * Updates shift sales accumulators upon successful invoice completion.
   */
  public async recordSale(shift: ShiftSession, invoice: SalesInvoice): Promise<ShiftSession> {
    const updated = { ...shift };

    for (const p of invoice.payments) {
      if (p.method === 'CASH') {
        updated.cashSales = Math.round((updated.cashSales + p.amount) * 100) / 100;
      } else if (p.method === 'CARD') {
        updated.cardSales = Math.round((updated.cardSales + p.amount) * 100) / 100;
      }
    }

    updated.expectedCash = Math.round(
      (updated.openingFloat + updated.cashSales + updated.cashIn - updated.cashOut) * 100
    ) / 100;

    await localDb.saveShift(updated);
    return updated;
  }

  /**
   * Records cash drop (drawer payout for expenses) or cash in (change replenishment).
   */
  public async recordCashMovement(
    shift: ShiftSession,
    type: 'IN' | 'OUT',
    amount: number,
    notes?: string
  ): Promise<ShiftSession> {
    const updated = { ...shift };

    if (type === 'IN') {
      updated.cashIn = Math.round((updated.cashIn + amount) * 100) / 100;
    } else {
      updated.cashOut = Math.round((updated.cashOut + amount) * 100) / 100;
    }

    updated.expectedCash = Math.round(
      (updated.openingFloat + updated.cashSales + updated.cashIn - updated.cashOut) * 100
    ) / 100;

    if (notes) {
      updated.notes = (updated.notes ? updated.notes + ' | ' : '') + `${type}: AED ${amount} (${notes})`;
    }

    await localDb.saveShift(updated);
    return updated;
  }

  /**
   * Generates an X-Report (Non-closing real-time reading of drawer status).
   */
  public generateXReport(shift: ShiftSession, invoices: SalesInvoice[]): ShiftSummaryReport {
    const shiftInvoices = invoices.filter(inv => inv.shiftId === shift.id);
    const totalVat = shiftInvoices.reduce((acc, inv) => acc + inv.vatTotal, 0);

    return {
      shiftId: shift.id,
      terminalId: shift.terminalId,
      cashierName: shift.cashierName,
      openedAt: shift.openedAt,
      openingFloat: shift.openingFloat,
      totalInvoicesCount: shiftInvoices.length,
      cashSales: shift.cashSales,
      cardSales: shift.cardSales,
      creditSales: 0,
      grossSales: Math.round((shift.cashSales + shift.cardSales) * 100) / 100,
      totalVatCollected: Math.round(totalVat * 100) / 100,
      cashIn: shift.cashIn,
      cashOut: shift.cashOut,
      expectedCashInDrawer: shift.expectedCash,
      status: 'OPEN'
    };
  }

  /**
   * Closes the shift session and produces the Z-Report (End of Day).
   */
  public async closeShift(
    shift: ShiftSession,
    countedCash: number,
    invoices: SalesInvoice[],
    closingNotes?: string
  ): Promise<ShiftSummaryReport> {
    const discrepancy = Math.round((countedCash - shift.expectedCash) * 100) / 100;

    const closed: ShiftSession = {
      ...shift,
      closedAt: new Date().toISOString(),
      countedCash,
      discrepancy,
      status: 'CLOSED',
      notes: closingNotes ?? shift.notes
    };

    await localDb.saveShift(closed);

    const report = this.generateXReport(closed, invoices);
    report.status = 'CLOSED';
    report.closedAt = closed.closedAt;
    report.countedCash = countedCash;
    report.discrepancy = discrepancy;

    return report;
  }
}

export const shiftManager = new ShiftManager();
