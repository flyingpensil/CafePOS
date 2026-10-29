// ============================================================================
// OFFLINE SYNC ENGINE & COLLISION-FREE INVOICE NUMBER GENERATOR
// Implements deterministic distributed sequence IDs & chained ledger hashes.
// ============================================================================

import { localDb } from './storage';
import { SalesInvoice } from '../../types/pos';

export type SyncStateListener = (state: {
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
}) => void;

export class OfflineSyncEngine {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private pendingCount: number = 0;
  private lastSyncedAt: Date | null = null;
  private listeners: Set<SyncStateListener> = new Set();
  private syncTimer: any = null;

  constructor() {
    this.setupNetworkListeners();
    this.refreshPendingCount();
  }

  /**
   * Generates a deterministic, globally unique invoice number that prevents
   * collisions across multiple offline terminals without requiring central DB locks.
   * Format: INV-[BRANCH_CODE]-[TERMINAL_ID]-[YYYYMMDD]-[SEQUENCE_0001]
   */
  public generateSequentialInvoiceNumber(
    branchCode: string,
    terminalId: string,
    sequence: number
  ): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    const seqPadded = String(sequence).padStart(4, '0');
    const cleanBranch = branchCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanTerminal = terminalId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    return `INV-${cleanBranch}-${cleanTerminal}-${dateStr}-${seqPadded}`;
  }

  /**
   * Generates a chained SHA-256 hash for invoice tamper-proofing (Peppol / FTA audit ready).
   */
  public async computeInvoiceHash(
    previousHash: string,
    invoiceNumber: string,
    grandTotal: number,
    vatTotal: number,
    timestamp: string,
    trn: string
  ): Promise<string> {
    const rawPayload = `${previousHash}|${invoiceNumber}|${grandTotal.toFixed(2)}|${vatTotal.toFixed(2)}|${timestamp}|${trn}`;

    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(rawPayload);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback pseudo-hash for offline testing if WebCrypto unavailable
    return 'H_' + Math.abs(this.simpleHash(rawPayload)).toString(16).padStart(16, '0');
  }

  /**
   * Triggers an immediate sync pass of pending local invoices to the backend server.
   */
  public async syncPendingInvoices(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline) {
      return { synced: 0, failed: 0 };
    }

    const pending = await localDb.getPendingSyncInvoices();
    if (pending.length === 0) {
      this.pendingCount = 0;
      this.notifyListeners();
      return { synced: 0, failed: 0 };
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const invoice of pending) {
      try {
        await localDb.updateInvoiceSyncStatus(invoice.id, 'QUEUED');
        
        // Simulating central API POST to /api/v1/pos/invoices
        const success = await this.dispatchToServer(invoice);

        if (success) {
          await localDb.updateInvoiceSyncStatus(invoice.id, 'SUBMITTED');
          syncedCount++;
        } else {
          await localDb.updateInvoiceSyncStatus(invoice.id, 'LOCAL');
          failedCount++;
        }
      } catch (err) {
        console.error(`Failed to sync invoice ${invoice.invoiceNumber}:`, err);
        await localDb.updateInvoiceSyncStatus(invoice.id, 'LOCAL');
        failedCount++;
      }
    }

    this.lastSyncedAt = new Date();
    await this.refreshPendingCount();
    return { synced: syncedCount, failed: failedCount };
  }

  /**
   * Mock / HTTP dispatch to central ERP / Supabase / ASP endpoint.
   */
  private async dispatchToServer(invoice: SalesInvoice): Promise<boolean> {
    // In production, this performs fetch('/api/pos/invoices', { method: 'POST', body: JSON.stringify(invoice) })
    // For local resilience simulation, we resolve with a mock server latency:
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(true);
      }, 150);
    });
  }

  public async refreshPendingCount(): Promise<number> {
    const pending = await localDb.getPendingSyncInvoices();
    this.pendingCount = pending.length;
    this.notifyListeners();
    return this.pendingCount;
  }

  public subscribe(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    listener({
      isOnline: this.isOnline,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt
    });
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener({
        isOnline: this.isOnline,
        pendingCount: this.pendingCount,
        lastSyncedAt: this.lastSyncedAt
      });
    }
  }

  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.syncPendingInvoices();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });

    // Background interval check every 30 seconds
    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingInvoices();
      }
    }, 30000);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

export const syncEngine = new OfflineSyncEngine();
