// ============================================================================
// OFFLINE-FIRST LOCAL STORAGE & INDEXEDDB PERSISTENCE LAYER
// Fully autonomous: operates without internet, caches master data & pending orders.
// ============================================================================

import {
  Product,
  Category,
  SalesInvoice,
  ShiftSession,
  HeldOrder,
  TenantInfo,
  BranchInfo,
  User
} from '../../types/pos';

const DB_NAME = 'UAE_POS_LOCAL_DB';
const DB_VERSION = 1;

export class LocalStorageEngine {
  private db: IDBDatabase | null = null;
  private isInitialized: boolean = false;

  /**
   * Initializes IndexedDB database stores and indexes.
   */
  public async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        console.warn('IndexedDB unavailable. Using memory/localStorage fallback.');
        this.isInitialized = true;
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Invoices store
        if (!db.objectStoreNames.contains('invoices')) {
          const invStore = db.createObjectStore('invoices', { keyPath: 'id' });
          invStore.createIndex('invoiceNumber', 'invoiceNumber', { unique: true });
          invStore.createIndex('aspSyncStatus', 'aspSyncStatus', { unique: false });
          invStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Master Products store
        if (!db.objectStoreNames.contains('products')) {
          const prodStore = db.createObjectStore('products', { keyPath: 'id' });
          prodStore.createIndex('barcode', 'barcode', { unique: false });
          prodStore.createIndex('sku', 'sku', { unique: false });
          prodStore.createIndex('categoryId', 'categoryId', { unique: false });
        }

        // Categories store
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        // Shifts store
        if (!db.objectStoreNames.contains('shifts')) {
          const shiftStore = db.createObjectStore('shifts', { keyPath: 'id' });
          shiftStore.createIndex('status', 'status', { unique: false });
        }

        // Held / Parked Orders store
        if (!db.objectStoreNames.contains('held_orders')) {
          db.createObjectStore('held_orders', { keyPath: 'id' });
        }

        // Key-Value App Settings store
        if (!db.objectStoreNames.contains('keyval')) {
          db.createObjectStore('keyval', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event: Event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isInitialized = true;
        resolve();
      };

      request.onerror = (event: Event) => {
        console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  // ==========================================================================
  // INVOICE OPERATIONS
  // ==========================================================================

  public async saveInvoice(invoice: SalesInvoice): Promise<void> {
    await this.init();
    if (!this.db) {
      localStorage.setItem(`pos_inv_${invoice.id}`, JSON.stringify(invoice));
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('invoices', 'readwrite');
      const store = tx.objectStore('invoices');
      const req = store.put(invoice);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getInvoices(limit: number = 50): Promise<SalesInvoice[]> {
    await this.init();
    if (!this.db) {
      return Object.keys(localStorage)
        .filter(k => k.startsWith('pos_inv_'))
        .map(k => JSON.parse(localStorage.getItem(k)!));
    }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('invoices', 'readonly');
      const store = tx.objectStore('invoices');
      const req = store.getAll();
      req.onsuccess = () => {
        const sorted = (req.result as SalesInvoice[]).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        resolve(sorted.slice(0, limit));
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async getPendingSyncInvoices(): Promise<SalesInvoice[]> {
    await this.init();
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('invoices', 'readonly');
      const store = tx.objectStore('invoices');
      const index = store.index('aspSyncStatus');
      const req = index.getAll('LOCAL');
      req.onsuccess = () => resolve(req.result as SalesInvoice[]);
      req.onerror = () => reject(req.error);
    });
  }

  public async updateInvoiceSyncStatus(
    invoiceId: string,
    status: 'LOCAL' | 'QUEUED' | 'SUBMITTED' | 'REJECTED'
  ): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('invoices', 'readwrite');
      const store = tx.objectStore('invoices');
      const getReq = store.get(invoiceId);
      getReq.onsuccess = () => {
        const inv = getReq.result as SalesInvoice;
        if (inv) {
          inv.aspSyncStatus = status;
          store.put(inv);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  // ==========================================================================
  // MASTER PRODUCTS & CATEGORIES
  // ==========================================================================

  public async saveProducts(products: Product[]): Promise<void> {
    await this.init();
    if (!this.db) {
      localStorage.setItem('pos_products', JSON.stringify(products));
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('products', 'readwrite');
      const store = tx.objectStore('products');
      for (const p of products) {
        store.put(p);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getProducts(): Promise<Product[]> {
    await this.init();
    if (!this.db) {
      const cached = localStorage.getItem('pos_products');
      return cached ? JSON.parse(cached) : [];
    }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('products', 'readonly');
      const store = tx.objectStore('products');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as Product[]);
      req.onerror = () => reject(req.error);
    });
  }

  public async updateProductStock(productId: string, quantitySold: number): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('products', 'readwrite');
      const store = tx.objectStore('products');
      const req = store.get(productId);
      req.onsuccess = () => {
        const prod = req.result as Product;
        if (prod && prod.trackStock && prod.stockOnHand !== undefined) {
          prod.stockOnHand = Math.max(0, prod.stockOnHand - quantitySold);
          store.put(prod);
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  // ==========================================================================
  // HELD ORDERS & TABLE TABS
  // ==========================================================================

  public async saveHeldOrder(heldOrder: HeldOrder): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('held_orders', 'readwrite');
      const store = tx.objectStore('held_orders');
      store.put(heldOrder);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getHeldOrders(): Promise<HeldOrder[]> {
    await this.init();
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('held_orders', 'readonly');
      const store = tx.objectStore('held_orders');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as HeldOrder[]);
      req.onerror = () => reject(req.error);
    });
  }

  public async deleteHeldOrder(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('held_orders', 'readwrite');
      const store = tx.objectStore('held_orders');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ==========================================================================
  // SHIFTS
  // ==========================================================================

  public async saveShift(shift: ShiftSession): Promise<void> {
    await this.init();
    if (!this.db) {
      localStorage.setItem('pos_current_shift', JSON.stringify(shift));
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('shifts', 'readwrite');
      const store = tx.objectStore('shifts');
      store.put(shift);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getActiveShift(): Promise<ShiftSession | null> {
    await this.init();
    if (!this.db) {
      const cached = localStorage.getItem('pos_current_shift');
      return cached ? JSON.parse(cached) : null;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction('shifts', 'readonly');
      const store = tx.objectStore('shifts');
      const index = store.index('status');
      const req = index.get('OPEN');
      req.onsuccess = () => resolve((req.result as ShiftSession) || null);
      req.onerror = () => reject(req.error);
    });
  }
}

export const localDb = new LocalStorageEngine();
