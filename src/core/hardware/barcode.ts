// ============================================================================
// HIGH-SPEED HARDWARE BARCODE SCANNER GLOBAL LISTENER
// Supports 1D/2D USB & Bluetooth HID Keyboard Wedge Scanners (Honeywell, Zebra, etc.)
// Filters human typing vs scanner bursts via inter-keystroke timing thresholds.
// ============================================================================

export type BarcodeScanHandler = (barcode: string) => void;

export interface BarcodeListenerOptions {
  maxInterKeyDelayMs?: number; // Max ms between characters to consider as scanner input (default: 50ms)
  minBarcodeLength?: number;   // Minimum length of valid barcode (default: 3)
  stopPropagation?: boolean;   // Stop event bubbling on successful scan
}

export class HardwareBarcodeScanner {
  private buffer: string = '';
  private lastKeyTimestamp: number = 0;
  private handlers: Set<BarcodeScanHandler> = new Set();
  private isListening: boolean = false;
  private readonly maxInterKeyDelayMs: number;
  private readonly minBarcodeLength: number;
  private readonly stopPropagation: boolean;

  constructor(options: BarcodeListenerOptions = {}) {
    this.maxInterKeyDelayMs = options.maxInterKeyDelayMs ?? 50;
    this.minBarcodeLength = options.minBarcodeLength ?? 3;
    this.stopPropagation = options.stopPropagation ?? true;
  }

  /**
   * Starts listening to global window keydown events.
   */
  public start(): void {
    if (this.isListening || typeof window === 'undefined') return;
    window.addEventListener('keydown', this.handleKeyDown, true);
    this.isListening = true;
  }

  /**
   * Stops listening to global window keydown events.
   */
  public stop(): void {
    if (!this.isListening || typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.handleKeyDown, true);
    this.isListening = false;
    this.buffer = '';
  }

  /**
   * Registers a callback for detected barcode scans.
   */
  public onScan(handler: BarcodeScanHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    // Ignore function keys (F1-F12), control, alt, meta
    if (
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.key.startsWith('F')
    ) {
      return;
    }

    const now = performance.now();
    const timeDelta = now - this.lastKeyTimestamp;
    this.lastKeyTimestamp = now;

    // If delay between keys was too long, reset buffer (user was likely typing manually)
    if (timeDelta > this.maxInterKeyDelayMs) {
      this.buffer = '';
    }

    // Enter key signals end of barcode packet in standard HID scanners
    if (event.key === 'Enter') {
      if (this.buffer.length >= this.minBarcodeLength) {
        const scannedCode = this.buffer.trim();
        if (this.stopPropagation) {
          event.preventDefault();
          event.stopPropagation();
        }
        this.notifyHandlers(scannedCode);
      }
      this.buffer = '';
      return;
    }

    // Collect standard printable characters
    if (event.key.length === 1) {
      this.buffer += event.key;
    }
  };

  private notifyHandlers(barcode: string): void {
    for (const handler of this.handlers) {
      try {
        handler(barcode);
      } catch (err) {
        console.error('Error executing barcode scan handler:', err);
      }
    }
  }
}

// Singleton global instance for immediate import
export const globalScanner = new HardwareBarcodeScanner();
