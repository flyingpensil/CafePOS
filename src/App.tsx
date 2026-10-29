// ============================================================================
// UAE POS & ERP MAIN APPLICATION COMPONENT
// Dual View: POS Terminal (/POS) & Management Backend (/Backend)
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
  User,
  TenantInfo,
  BranchInfo,
  ModifierGroup,
  QuickServiceItem
} from './types/pos';
import {
  INITIAL_TENANT,
  INITIAL_BRANCH,
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  QUICK_SERVICE_RATES
} from './data/mock-data';
import { Header } from './components/Header';
import { CafeteriaGrid } from './components/CafeteriaGrid';
import { StationeryView } from './components/StationeryView';
import { Cart } from './components/Cart';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { ShiftModal } from './components/ShiftModal';
import { HoldOrdersModal } from './components/HoldOrdersModal';
import { BackendLayout } from './components/backend/BackendLayout';
import { localDb } from './core/offline/storage';
import { syncEngine } from './core/offline/sync-engine';
import { shiftManager, ShiftSummaryReport } from './core/shift/shift-manager';
import { UaeTaxEngine } from './core/compliance/uae-tax';
import { FtaQrEngine } from './core/compliance/fta-qr';

export const App: React.FC = () => {
  // Routing / View State: POS Terminal vs Admin Backend
  const detectInitialView = (): 'POS' | 'BACKEND' => {
    if (typeof window === 'undefined') return 'POS';
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (
      path.includes('/backend') ||
      path.includes('/bsckend') ||
      hash.includes('/backend') ||
      hash.includes('/bsckend') ||
      hash.includes('backend')
    ) {
      return 'BACKEND';
    }
    return 'POS';
  };

  const [currentView, setCurrentView] = useState<'POS' | 'BACKEND'>(detectInitialView);

  // Tenant & Store Settings
  const [tenant, setTenant] = useState<TenantInfo>(() => {
    const saved = localStorage.getItem('pos_tenant_config');
    return saved ? JSON.parse(saved) : INITIAL_TENANT;
  });

  const [branch, setBranch] = useState<BranchInfo>(() => {
    const saved = localStorage.getItem('pos_branch_config');
    return saved ? JSON.parse(saved) : INITIAL_BRANCH;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('pos_users_config');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser] = useState<User>(users[0] || INITIAL_USERS[0]);
  const [mode, setMode] = useState<OperationalMode>(branch.operationalMode);
  const [lang, setLang] = useState<'en' | 'ar'>('en');

  // Master Catalog Data
  const [categories] = useState(INITIAL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [services, setServices] = useState<QuickServiceItem[]>(() => {
    const saved = localStorage.getItem('pos_services_config');
    return saved ? JSON.parse(saved) : QUICK_SERVICE_RATES;
  });

  // Extract initial cafeteria modifier groups from mock data
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>(() => {
    const saved = localStorage.getItem('pos_modifiers_config');
    if (saved) return JSON.parse(saved);
    const groups: ModifierGroup[] = [];
    for (const p of INITIAL_PRODUCTS) {
      if (p.modifierGroups) {
        for (const g of p.modifierGroups) {
          if (!groups.some(existing => existing.id === g.id)) {
            groups.push(g);
          }
        }
      }
    }
    return groups;
  });

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

  // Handle URL change & Browser Navigation (Back/Forward)
  useEffect(() => {
    const handleUrlChange = () => {
      setCurrentView(detectInitialView());
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const navigateTo = (view: 'POS' | 'BACKEND') => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      const hash = view === 'BACKEND' ? '#/Backend' : '#/POS';
      window.history.pushState(null, '', hash);
    }
  };

  // Initialize offline storage & default shift
  useEffect(() => {
    const initStorage = async () => {
      await localDb.init();

      // Load products from IndexedDB if previously saved, else initialize
      const storedProducts = await localDb.getProducts();
      if (storedProducts && storedProducts.length > 0) {
        setProducts(storedProducts);
      } else {
        await localDb.saveProducts(INITIAL_PRODUCTS);
        setProducts(INITIAL_PRODUCTS);
      }

      // Load or start default demo shift
      let active = await localDb.getActiveShift();
      if (!active) {
        active = await shiftManager.openShift(branch.id, 'POS-01', currentUser, 500);
      }
      setCurrentShift(active);

      // Load past invoices & held orders
      const savedInvoices = await localDb.getInvoices(100);
      setInvoices(savedInvoices);
      if (savedInvoices.length > 0) {
        setInvoiceSequence(savedInvoices.length + 1);
      }

      const savedHeld = await localDb.getHeldOrders();
      setHeldOrders(savedHeld);
    };

    initStorage();

    // Subscribe to sync engine
    const unsubscribeSync = syncEngine.subscribe(state => {
      setIsOnline(state.isOnline);
      setPendingSyncCount(state.pendingCount);
    });

    return () => unsubscribeSync();
  }, [branch.id, currentUser]);

  // Global Keyboard Shortcuts (F1 - F12)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        navigateTo('POS');
      } else if (e.key === 'F2' && currentView === 'POS') {
        e.preventDefault();
        handleHoldOrder();
      } else if (e.key === 'F3' && currentView === 'POS') {
        e.preventDefault();
        setIsHeldModalOpen(true);
      } else if (e.key === 'F4' && currentView === 'POS') {
        e.preventDefault();
        handleQuickExactCash();
      } else if (e.key === 'F5' && currentView === 'POS') {
        e.preventDefault();
        if (cartItems.length > 0) setIsPaymentModalOpen(true);
      } else if (e.key === 'F9' && currentView === 'POS') {
        e.preventDefault();
        handleClearCart();
      } else if (e.key === 'F11') {
        e.preventDefault();
        setMode(prev => (prev === 'CAFETERIA' ? 'STATIONERY' : 'CAFETERIA'));
      } else if (e.key === 'F12') {
        e.preventDefault();
        navigateTo(currentView === 'POS' ? 'BACKEND' : 'POS');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // ==========================================================================
  // BACKEND UPDATE HANDLERS (PERSIST TO INDEXEDDB & LOCALSTORAGE)
  // ==========================================================================

  const handleSaveProduct = async (product: Product) => {
    const exists = products.some(p => p.id === product.id);
    const updated = exists
      ? products.map(p => (p.id === product.id ? product : p))
      : [product, ...products];

    setProducts(updated);
    await localDb.saveProducts(updated);
  };

  const handleDeleteProduct = async (productId: string) => {
    const updated = products.filter(p => p.id !== productId);
    setProducts(updated);
    await localDb.saveProducts(updated);
  };

  const handleBulkImportProducts = async (newProducts: Product[]) => {
    // Upsert products by SKU
    const productMap = new Map<string, Product>();
    for (const p of products) {
      productMap.set(p.sku.toUpperCase(), p);
    }
    for (const np of newProducts) {
      productMap.set(np.sku.toUpperCase(), np);
    }

    const merged = Array.from(productMap.values());
    setProducts(merged);
    await localDb.saveProducts(merged);
    alert(lang === 'ar' ? `تم استيراد وتحديث ${newProducts.length} منتج بنجاح!` : `Successfully imported & updated ${newProducts.length} products!`);
  };

  const handleSaveModifierGroup = (group: ModifierGroup) => {
    const exists = modifierGroups.some(g => g.id === group.id);
    const updated = exists
      ? modifierGroups.map(g => (g.id === group.id ? group : g))
      : [...modifierGroups, group];
    setModifierGroups(updated);
    localStorage.setItem('pos_modifiers_config', JSON.stringify(updated));
  };

  const handleDeleteModifierGroup = (groupId: string) => {
    const updated = modifierGroups.filter(g => g.id !== groupId);
    setModifierGroups(updated);
    localStorage.setItem('pos_modifiers_config', JSON.stringify(updated));
  };

  const handleSaveService = (service: QuickServiceItem) => {
    const exists = services.some(s => s.id === service.id);
    const updated = exists
      ? services.map(s => (s.id === service.id ? service : s))
      : [...services, service];
    setServices(updated);
    localStorage.setItem('pos_services_config', JSON.stringify(updated));
  };

  const handleDeleteService = (serviceId: string) => {
    const updated = services.filter(s => s.id !== serviceId);
    setServices(updated);
    localStorage.setItem('pos_services_config', JSON.stringify(updated));
  };

  const handleSaveSettings = (updatedTenant: TenantInfo, updatedBranch: BranchInfo) => {
    setTenant(updatedTenant);
    setBranch(updatedBranch);
    setMode(updatedBranch.operationalMode);
    localStorage.setItem('pos_tenant_config', JSON.stringify(updatedTenant));
    localStorage.setItem('pos_branch_config', JSON.stringify(updatedBranch));
  };

  const handleSaveUser = (updatedUser: User) => {
    const updated = users.map(u => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(updated);
    localStorage.setItem('pos_users_config', JSON.stringify(updated));
  };

  // ==========================================================================
  // POS CART OPERATIONS
  // ==========================================================================

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
      vatRate: product.vatRate || 0.05,
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
            vatRate: item.product.vatRate || 0.05,
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

  // Fast Exact Cash Checkout
  const handleQuickExactCash = async () => {
    if (cartItems.length === 0 || !currentShift) return;

    const lineCalculations = cartItems.map(item =>
      UaeTaxEngine.calculateLineTax({
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountAmount: item.discountAmount,
        vatRate: item.product.vatRate || 0.05,
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

    await syncEngine.refreshPendingCount();

    // Show receipt preview and clear cart
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

  // ==========================================================================
  // VIEW RENDERER (POS FRONTEND VS MANAGEMENT BACKEND)
  // ==========================================================================

  if (currentView === 'BACKEND') {
    return (
      <BackendLayout
        tenant={tenant}
        branch={branch}
        products={products}
        categories={categories}
        modifierGroups={modifierGroups}
        services={services}
        users={users}
        invoices={invoices}
        onSaveProduct={handleSaveProduct}
        onDeleteProduct={handleDeleteProduct}
        onBulkImportProducts={handleBulkImportProducts}
        onSaveModifierGroup={handleSaveModifierGroup}
        onDeleteModifierGroup={handleDeleteModifierGroup}
        onSaveService={handleSaveService}
        onDeleteService={handleDeleteService}
        onSaveSettings={handleSaveSettings}
        onSaveUser={handleSaveUser}
        onSwitchToPos={() => navigateTo('POS')}
        lang={lang}
        onLangChange={setLang}
      />
    );
  }

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
        onOpenBackend={() => navigateTo('BACKEND')}
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
