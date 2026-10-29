// ============================================================================
// UAE POS & RETAIL/F&B ERP DATA TYPES
// Compliant with UAE FTA Tax Specifications and Bilingual Requirements
// ============================================================================

export type OperationalMode = 'CAFETERIA' | 'STATIONERY';

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'CASHIER';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  pin: string; // 4-6 digit quick PIN
  canApplyDiscount: boolean;
  canVoidItem: boolean;
  canOpenDrawerManual: boolean;
}

export interface TenantInfo {
  id: string;
  legalNameEn: string;
  legalNameAr: string;
  tradeLicenseNo: string;
  trn: string; // 15-digit FTA Tax Registration Number
  countryCode: string;
  currencyCode: 'AED';
  vatRate: number; // 0.05 (5%)
  isTaxInclusive: boolean;
}

export interface BranchInfo {
  id: string;
  tenantId: string;
  branchCode: string; // e.g. "DXB-01"
  nameEn: string;
  nameAr: string;
  emirate: 'Dubai' | 'Abu Dhabi' | 'Sharjah' | 'Ajman' | 'RAK' | 'Fujairah' | 'UAQ';
  addressEn: string;
  addressAr: string;
  phone: string;
  email?: string;
  operationalMode: OperationalMode;
  thermalPrinterWidth: '80mm' | '58mm';
  cashDrawerEnabled: boolean;
}

export interface Category {
  id: string;
  nameEn: string;
  nameAr: string;
  colorCode: string;
  iconName?: string;
  sortOrder: number;
}

export interface Modifier {
  id: string;
  nameEn: string;
  nameAr: string;
  priceDelta: number; // in AED (e.g. +1.50)
  isDefault?: boolean;
}

export interface ModifierGroup {
  id: string;
  nameEn: string;
  nameAr: string;
  minSelection: number; // 0 for optional, 1 for mandatory
  maxSelection: number; // 1 for radio, >1 for multi-select
  modifiers: Modifier[];
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  nameEn: string;
  nameAr: string;
  categoryId: string;
  costPrice: number;
  sellingPrice: number; // in AED
  vatRate: number; // 0.05
  isTaxInclusive: boolean;
  unit: 'PCS' | 'BOX' | 'PACK' | 'PORTION' | 'PAGE' | 'SERVICE';
  trackStock: boolean;
  stockOnHand?: number;
  minReorderLevel?: number;
  image?: string;
  isQuickOrder?: boolean;
  modifierGroups?: ModifierGroup[];
}

export interface SelectedModifier {
  groupId: string;
  groupNameEn: string;
  modifierId: string;
  nameEn: string;
  nameAr: string;
  priceDelta: number;
}

export interface CartItem {
  cartItemId: string; // unique for this line item instance
  product: Product;
  quantity: number;
  unitPrice: number; // base price + selected modifiers
  discountAmount: number;
  selectedModifiers: SelectedModifier[];
  kitchenNotes?: string;
  taxableAmount: number; // (quantity * unitPrice) - discount
  vatAmount: number;     // 5% standard VAT
  lineTotal: number;     // taxableAmount + vatAmount
}

export type OrderType = 'WALK_IN' | 'TAKEAWAY' | 'DINE_IN' | 'RETAIL';

export type PaymentMethod = 'CASH' | 'CARD' | 'SPLIT' | 'CUSTOMER_TAB';

export interface PaymentBreakdown {
  method: PaymentMethod;
  amount: number;
  tenderedCash?: number;
  changeGiven?: number;
  cardType?: string; // 'VISA', 'MASTERCARD', 'AMEX', 'JCB', 'APPLE_PAY'
  authCode?: string;
}

export interface SalesInvoice {
  id: string; // UUID v4
  tenantId: string;
  branchId: string;
  shiftId: string;
  terminalId: string;
  cashierId: string;
  cashierName: string;
  invoiceNumber: string; // e.g. "INV-DXB01-20261029-0042"
  sequenceNumber: number;
  orderType: OrderType;
  tableNumber?: string;
  customerName?: string;
  customerTrn?: string;
  items: CartItem[];
  subtotalTaxable: number;
  discountTotal: number;
  vatTotal: number;
  roundingDifference: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  payments: PaymentBreakdown[];
  qrTlvBase64: string; // UAE FTA TLV encoded Base64 QR
  invoiceHash?: string; // SHA-256 for cryptographic tamper protection
  previousInvoiceHash?: string;
  peppolPintUuid?: string; // For UAE PINT-AE E-Invoicing
  aspSyncStatus: 'LOCAL' | 'QUEUED' | 'SUBMITTED' | 'REJECTED';
  createdAt: string; // ISO 8601 string
}

export interface ShiftSession {
  id: string;
  branchId: string;
  terminalId: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: number; // initial cash in drawer (AED)
  cashSales: number;
  cardSales: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  countedCash?: number;
  discrepancy?: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

export interface HeldOrder {
  id: string;
  tableNumber?: string;
  orderType: OrderType;
  guestCount?: number;
  items: CartItem[];
  heldAt: string;
  subtotal: number;
}

export interface QuickServiceItem {
  id: string;
  nameEn: string;
  nameAr: string;
  unitRate: number; // Rate per unit (e.g. 0.25 AED per B&W page)
  unitLabel: string;
  category: 'PHOTOCOPY' | 'PRINT' | 'LAMINATION' | 'BINDING' | 'CUSTOM';
}
