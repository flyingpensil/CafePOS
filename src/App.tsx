// ============================================================================
// UAE POS MAIN APPLICATION COMPONENT
// Full-Stack Touchscreen POS & Retail/F&B ERP Architecture
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  OperationalMode,
  Product,
  CartItem,
  SalesInvoice,
  ShiftSession,
  HeldOrder,
  OrderType,
  SelectedModifier,
  User
} from './types/pos';
import {
  INITIAL_TENANT,
  INITIAL_BRANCH,
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS
} from './data/mock-data';
import { Header } from './components/Header';
import { CafeteriaGrid } from './components/CafeteriaGrid';
import { StationeryView } from './components/StationeryView';
import { Cart } from './components/Cart';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { ShiftModal } from './components/ShiftModal';
import { HoldOrdersModal } from './components/HoldOrdersModal';
import { localDb } from './core/offline/storage';
import { syncEngine } from './core/offline/sync-engine';
import { shiftManager, ShiftSummaryReport } from './core/shift/shift-manager';
import { UaeTaxEngine } from './core/compliance/uae-tax';
import { FtaQrEngine } from './core/compliance/fta-qr';

export const App: React.FC = () => {
  // Application State
  const [tenant] = useState(INITIAL_TENANT);
  const [branch, setBranch] = useState(INITIAL_BRANCH);
  const [currentUser] = useState<User>(INITIAL_USERS[0]); // Cashier
  const [mode, setMode] = useState<OperationalMode>(INITIAL_BRANCH.operationalMode);
  const [lang, setLang] = useState<'en' | 'ar'>('en');

  // Master Data
  const [categories] = useState(INITIAL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);

  // Cart & Order State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('WALK_IN');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [orderDiscount, setOrderDiscount] = useState<number>(0);

  // Transactions & Shifts
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [currentShift, setCurrentShift] = useState<ShiftSession | null>(null);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [invoiceSequence, setInvoiceSequence] = useState<number>(1);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [completedInvoiceForReceipt, setCompletedInvoiceForReceipt] = useState<SalesInvoice | null>(null);

  // Network & Sync
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Initialize offline storage & default shift
  useEffect(() => {
    const initStorage = async () => {
      await localDb.init();
      await localDb.saveProducts(INITIAL_PRODUCTS);

      // Load or start default demo shift
      let active = await localDb.getActiveShift();
      if (!active) {
        active = await shiftManager.openShift(branch.id, 'POS-01', currentUser, 500);
      }
      setCurrentShift(active);

      // Load past invoices & held orders
      const savedInvoices = await localDb.getInvoices(50);
      setInvoices(savedInvoices);
      if (savedInvoices.length > 0) {
        setInvoiceSequence(savedInvoices.length + 1);
      }

      const savedHeld = await localDb.getHeldOrders();
      setHeldOrders(savedHeld);
    };

    initStorage();

    // Subscribe to sync state
    const unsubscribeSync = syncEngine.subscribe(state => {
      setIsOnline(state.isOnline);
      setPendingSyncCount(state.pendingCount);
    });

    return () => unsubscribeSync();
  }, [branch.id, currentUser]);

  // Global Keyboard Shortcuts (F1 - F12)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleHoldOrder();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsHeldModalOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleQuickExactCash();
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (cartItems.length > 0) setIsPaymentModalOpen(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleClearCart();
      } else if (e.key === 'F11') {
        e.preventDefault();
        setMode(prev => (prev === 'CAFETERIA' ? 'STATIONERY' : 'CAFETERIA'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Cart Operations
  const handleAddToCart = (
    product: Product,
    selectedModifiers: SelectedModifier[] = [],
    kitchenNotes?: string,
    quantity: number = 1
  ) => {
    const modDeltas = selectedModifiers.reduce((acc, m) => acc + m.priceDelta, 0);
    const unitPrice = product.sellingPrice + modDeltas;

    const lineCalc = UaeTaxEngine.calculateLineTax({
      unitPrice,
      quantity,
      discountAmount: 0,
      vatRate: 0.05,
      isTaxInclusive: true
    });

    const newItem: CartItem = {
      cartItemId: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      product,
      quantity,
      unitPrice,
      discountAmount: 0,
      selectedModifiers,
      kitchenNotes,
      taxableAmount: lineCalc.taxableAmount,
      vatAmount: lineCalc.vatAmount,
      lineTotal: lineCalc.lineTotal
    };

    setCartItems(prev => [...prev, newItem]);
  };

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }

    setCartItems(prev =>
      prev.map(item => {
        if (item.cartItemId === cartItemId) {
          const lineCalc = UaeTaxEngine.calculateLineTax({
            unitPrice: item.unitPrice,
            quantity: newQty,
            discountAmount: item.discountAmount,
            vatRate: 0.05,
            isTaxInclusive: true
          });
          return {
            ...item,
            quantity: newQty,
            taxableAmount: lineCalc.taxableAmount,
            vatAmount: lineCalc.vatAmount,
            lineTotal: lineCalc.lineTotal
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCartItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setOrderDiscount(0);
    setSelectedTable(null);
  };

  // Hold / Recall Tabs
  const handleHoldOrder = async () => {
    if (cartItems.length === 0) return;
    const subtotal = cartItems.reduce((acc, i) => acc + i.lineTotal, 0);

    const held: HeldOrder = {
      id: `tab_${Date.now()}`,
      tableNumber: selectedTable || undefined,
      orderType,
      items: [...cartItems],
      heldAt: new Date().toISOString(),
      subtotal
    };

    await localDb.saveHeldOrder(held);
    setHeldOrders(prev => [held, ...prev]);
    handleClearCart();
  };

  const handleRecallOrder = async (order: HeldOrder) => {
    setCartItems(order.items);
    setOrderType(order.orderType);
    setSelectedTable(order.tableNumber || null);
    await localDb.deleteHeldOrder(order.id);
    setHeldOrders(prev => prev.filter(h => h.id !== order.id));
    setIsHeldModalOpen(false);
  };

  const handleDeleteHeldOrder = async (id: string) => {
    await localDb.deleteHeldOrder(id);
    setHeldOrders(prev => prev.filter(h => h.id !== id));
  };

  // Quick Exact Cash Checkout (1-Click)
  const handleQuickExactCash = async () => {
    if (cartItems.length === 0 || !currentShift) return;

    const lineCalculations = cartItems.map(item =>
      UaeTaxEngine.calculateLineTax({
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountAmount: item.discountAmount,
        vatRate: 0.05,
        isTaxInclusive: true
      })
    );
    const totals = UaeTaxEngine.calculateInvoiceTotals(lineCalculations, orderDiscount, false);
    const timestamp = new Date().toISOString();
    const invoiceNumber = syncEngine.generateSequentialInvoiceNumber(
      branch.branchCode,
      'POS-01',
      invoiceSequence
    );

    const qrTlvBase64 = FtaQrEngine.generateTlvBase64({
      sellerName: tenant.legalNameEn,
      trn: tenant.trn,
      timestamp,
      invoiceTotal: totals.grandTotal,
      vatTotal: totals.vatTotal
    });

    const newInvoice: SalesInvoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      tenantId: tenant.id,
      branchId: branch.id,
      shiftId: currentShift.id,
      terminalId: 'POS-01',
      cashierId: currentUser.id,
      cashierName: currentUser.fullName,
      invoiceNumber,
      sequenceNumber: invoiceSequence,
      orderType,
      tableNumber: selectedTable || undefined,
      items: cartItems,
      subtotalTaxable: totals.subtotalTaxable,
      discountTotal: totals.discountTotal,
      vatTotal: totals.vatTotal,
      roundingDifference: totals.roundingDifference,
      grandTotal: totals.grandTotal,
      paymentMethod: 'CASH',
      payments: [
        {
          method: 'CASH',
          amount: totals.grandTotal,
          tenderedCash: totals.grandTotal,
          changeGiven: 0
        }
      ],
      qrTlvBase64,
      aspSyncStatus: 'LOCAL',
      createdAt: timestamp
    };

    handleCompleteSale(newInvoice);
  };

  // Process Completed Sale
  const handleCompleteSale = async (invoice: SalesInvoice) => {
    await localDb.saveInvoice(invoice);
    setInvoices(prev => [invoice, ...prev]);
    setInvoiceSequence(prev => prev + 1);

    // Update inventory stock on hand
    for (const item of invoice.items) {
      if (item.product.trackStock) {
        await localDb.updateProductStock(item.product.id, item.quantity);
        setProducts(prev =>
          prev.map(p =>
            p.id === item.product.id
              ? { ...p, stockOnHand: Math.max(0, (p.stockOnHand ?? 0) - item.quantity) }
              : p
          )
        );
      }
    }

    // Update shift totals
    if (currentShift) {
      const updatedShift = await shiftManager.recordSale(currentShift, invoice);
      setCurrentShift(updatedShift);
    }

    // Refresh sync queue
    await syncEngine.refreshPendingCount();

    // Show receipt modal and clear active cart
    setCompletedInvoiceForReceipt(invoice);
    setIsPaymentModalOpen(false);
    handleClearCart();
  };

  // Shift Management Handlers
  const handleOpenNewShift = async (openingFloat: number) => {
    const newShift = await shiftManager.openShift(branch.id, 'POS-01', currentUser, openingFloat);
    setCurrentShift(newShift);
    setIsShiftModalOpen(false);
  };

  const handleCloseShift = (summary: ShiftSummaryReport) => {
    setCurrentShift(null);
    setIsShiftModalOpen(false);
    alert(
      lang === 'ar'
        ? `تم إغلاق الوردية وطباعة تقرير Z.\nالمبيعات: AED ${summary.grossSales.toFixed(2)}\nالفارق: AED ${summary.discrepancy?.toFixed(2)}`
        : `Shift closed. Z-Report generated.\nGross Sales: AED ${summary.grossSales.toFixed(2)}\nDiscrepancy: AED ${summary.discrepancy?.toFixed(2)}`
    );
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans"
    >
      {/* Top Header */}
      <Header
        tenant={tenant}
        branch={branch}
        cashier={currentUser}
        mode={mode}
        onModeChange={setMode}
        lang={lang}
        onLangChange={setLang}
        shift={currentShift}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        onOpenHeldModal={() => setIsHeldModalOpen(true)}
        heldOrdersCount={heldOrders.length}
      />

      {/* Main Split: Left Products/Services & Right Cart */}
      <main className="flex-1 flex overflow-hidden">
        {mode === 'CAFETERIA' ? (
          <CafeteriaGrid
            categories={categories}
            products={products}
            onAddToCart={handleAddToCart}
            orderType={orderType}
            onOrderTypeChange={setOrderType}
            selectedTable={selectedTable}
            onTableChange={setSelectedTable}
            lang={lang}
          />
        ) : (
          <StationeryView
            products={products}
            onAddToCart={(prod, qty) => handleAddToCart(prod, [], undefined, qty)}
            lang={lang}
          />
        )}

        {/* Right Fixed Cart Panel */}
        <Cart
          items={cartItems}
          orderType={orderType}
          tableNumber={selectedTable}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onHoldOrder={handleHoldOrder}
          onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
          onQuickExactCash={handleQuickExactCash}
          currentUser={currentUser}
          orderDiscount={orderDiscount}
          onApplyDiscount={setOrderDiscount}
          lang={lang}
        />
      </main>

      {/* MODALS */}
      {isPaymentModalOpen && currentShift && (
        <PaymentModal
          items={cartItems}
          orderType={orderType}
          tableNumber={selectedTable}
          orderDiscount={orderDiscount}
          tenant={tenant}
          branch={branch}
          cashier={currentUser}
          shiftId={currentShift.id}
          nextSequence={invoiceSequence}
          onCompleteSale={handleCompleteSale}
          onClose={() => setIsPaymentModalOpen(false)}
          lang={lang}
        />
      )}

      {completedInvoiceForReceipt && (
        <ReceiptModal
          invoice={completedInvoiceForReceipt}
          tenant={tenant}
          branch={branch}
          onClose={() => setCompletedInvoiceForReceipt(null)}
          lang={lang}
        />
      )}

      {isShiftModalOpen && (
        <ShiftModal
          shift={currentShift}
          cashier={currentUser}
          branchId={branch.id}
          invoices={invoices}
          onOpenNewShift={handleOpenNewShift}
          onCloseShift={handleCloseShift}
          onClose={() => setIsShiftModalOpen(false)}
          lang={lang}
        />
      )}

      {isHeldModalOpen && (
        <HoldOrdersModal
          heldOrders={heldOrders}
          onRecallOrder={handleRecallOrder}
          onDeleteOrder={handleDeleteHeldOrder}
          onClose={() => setIsHeldModalOpen(false)}
          lang={lang}
        />
      )}
    </div>
  );
};
export default App;
