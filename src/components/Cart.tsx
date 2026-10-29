// ============================================================================
// POS CART & STATUTORY VAT BREAKDOWN COMPONENT
// Per-line & Invoice-level VAT (5%) Calculation, Supervisor PIN Override, & Fast Tender
// ============================================================================

import React, { useState } from 'react';
import { CartItem, User, OrderType } from '../types/pos';
import { UaeTaxEngine } from '../core/compliance/uae-tax';

interface CartProps {
  items: CartItem[];
  orderType: OrderType;
  tableNumber: string | null;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onHoldOrder: () => void;
  onOpenPaymentModal: () => void;
  onQuickExactCash: () => void;
  currentUser: User;
  orderDiscount: number;
  onApplyDiscount: (discount: number) => void;
  lang: 'en' | 'ar';
}

export const Cart: React.FC<CartProps> = ({
  items,
  orderType,
  tableNumber,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onHoldOrder,
  onOpenPaymentModal,
  onQuickExactCash,
  currentUser,
  orderDiscount,
  onApplyDiscount,
  lang
}) => {
  const isAr = lang === 'ar';
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Calculate invoice level tax breakdown
  const lineCalculations = items.map(item =>
    UaeTaxEngine.calculateLineTax({
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      discountAmount: item.discountAmount,
      vatRate: 0.05,
      isTaxInclusive: true
    })
  );

  const taxSummary = UaeTaxEngine.calculateInvoiceTotals(lineCalculations, orderDiscount, false);

  const handleApplyDiscountSubmit = () => {
    setPinError('');
    const discountVal = parseFloat(discountInput);
    if (isNaN(discountVal) || discountVal < 0) {
      setPinError(isAr ? 'الرجاء إدخال قيمة خصم صحيحة' : 'Enter valid discount amount');
      return;
    }

    if (!currentUser.canApplyDiscount) {
      // Requires supervisor PIN (demo supervisor pin: 9999)
      if (supervisorPin !== '9999') {
        setPinError(isAr ? 'رمز المشرف غير صحيح!' : 'Invalid Supervisor PIN!');
        return;
      }
    }

    onApplyDiscount(discountVal);
    setShowDiscountModal(false);
    setDiscountInput('');
    setSupervisorPin('');
  };

  return (
    <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full select-none">
      {/* Cart Header */}
      <div className="p-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🛒</span>
          <div>
            <h2 className="text-xs font-bold text-slate-100">
              {isAr ? 'سلة المبيعات' : 'Current Order'}
            </h2>
            <div className="text-[11px] text-amber-400 font-medium">
              {orderType} {tableNumber && `• Table #${tableNumber}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onHoldOrder}
            disabled={items.length === 0}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded text-xs font-medium border border-slate-700"
            title="Park / Hold Tab (F2)"
          >
            ⏸️ {isAr ? 'تعليق' : 'Hold'}
          </button>
          <button
            onClick={onClearCart}
            disabled={items.length === 0}
            className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 disabled:opacity-40 text-rose-300 rounded text-xs border border-rose-800"
            title="Void / Clear Bill (F9)"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <span className="text-3xl mb-2">🧾</span>
            <p>{isAr ? 'السلة فارغة' : 'Cart is empty'}</p>
            <p className="text-[10px] text-slate-600 mt-1">
              {isAr ? 'امسح باركود أو اضغط على صنف' : 'Scan barcode or tap an item to add'}
            </p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.cartItemId} className="py-2 px-1 flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-200">
                    {item.product.nameEn}
                  </div>
                  <div className="text-[10px] text-slate-400 font-arabic">
                    {item.product.nameAr}
                  </div>
                  {item.selectedModifiers.length > 0 && (
                    <div className="text-[10px] text-amber-400 mt-0.5 space-y-0.5">
                      {item.selectedModifiers.map(mod => (
                        <div key={mod.modifierId} className="flex items-center gap-1">
                          <span>↳ {mod.nameEn}</span>
                          {mod.priceDelta > 0 && <span>(+AED {mod.priceDelta.toFixed(2)})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {item.kitchenNotes && (
                    <div className="text-[10px] text-slate-400 italic mt-0.5">
                      Note: {item.kitchenNotes}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-slate-100 font-mono">
                    AED {item.lineTotal.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    @{item.unitPrice.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Quantity Controls & Remove */}
              <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-800/40">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-slate-200 font-mono">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => onRemoveItem(item.cartItemId)}
                  className="text-[11px] text-rose-400 hover:text-rose-300 px-2 py-0.5"
                >
                  ✕ {isAr ? 'حذف' : 'Remove'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Statutory UAE Tax Breakdown & Order Totals */}
      <div className="p-3.5 bg-slate-850 border-t border-slate-800 space-y-2">
        <div className="space-y-1.5 text-xs text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">
              {isAr ? 'المبلغ الخاضع للضريبة (الصافي):' : 'Taxable Subtotal (Net):'}
            </span>
            <span className="font-mono">AED {taxSummary.subtotalTaxable.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-emerald-400">
            <span>{isAr ? 'ضريبة القيمة المضافة (5%):' : 'VAT Standard (5%):'}</span>
            <span className="font-mono font-bold">AED {taxSummary.vatTotal.toFixed(2)}</span>
          </div>

          {taxSummary.discountTotal > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>{isAr ? 'إجمالي الخصم المطبق:' : 'Order Discount:'}</span>
              <span className="font-mono">-AED {taxSummary.discountTotal.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Grand Total */}
        <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
          <div>
            <span className="text-xs font-bold text-slate-300 block">
              {isAr ? 'المبلغ الإجمالي المستحق' : 'GRAND TOTAL PAYABLE'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Prices inclusive of 5% UAE VAT
            </span>
          </div>
          <span className="text-2xl font-black text-amber-400 font-mono tracking-tight">
            AED {taxSummary.grandTotal.toFixed(2)}
          </span>
        </div>

        {/* Quick Actions Bar */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => setShowDiscountModal(true)}
            className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700"
          >
            🏷️ {isAr ? 'خصم (F8)' : 'Discount (F8)'}
          </button>
          <button
            onClick={onQuickExactCash}
            disabled={items.length === 0}
            className="py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-sm"
          >
            ⚡ {isAr ? 'كاش مطابق (F4)' : 'Exact Cash (F4)'}
          </button>
        </div>

        {/* Primary Checkout Button */}
        <button
          onClick={onOpenPaymentModal}
          disabled={items.length === 0}
          className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <span>💳</span>
          <span>{isAr ? 'سداد ودفع الحساب (F5)' : 'PAY / SETTLE BILL (F5)'}</span>
        </button>
      </div>

      {/* SUPERVISOR DISCOUNT OVERRIDE MODAL */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-4 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-100 mb-1">
              {isAr ? 'تطبيق خصم على الفاتورة' : 'Apply Order Discount'}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {currentUser.canApplyDiscount
                ? isAr ? 'مصرح لك بإدخال الخصم مباشرة' : 'Authorized for direct discount'
                : isAr ? 'يتطلب إذن المشرف (رمز PIN: 9999)' : 'Requires Supervisor PIN (PIN: 9999)'}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  {isAr ? 'قيمة الخصم بالدرهم (AED):' : 'Discount in AED:'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="e.g. 5.00"
                  value={discountInput}
                  onChange={e => setDiscountInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono"
                  autoFocus
                />
              </div>

              {!currentUser.canApplyDiscount && (
                <div>
                  <label className="text-xs text-slate-300 block mb-1">
                    {isAr ? 'رمز المشرف السري (PIN):' : 'Supervisor PIN:'}
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Enter PIN (Demo: 9999)"
                    value={supervisorPin}
                    onChange={e => setSupervisorPin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono"
                  />
                </div>
              )}

              {pinError && (
                <div className="text-xs text-rose-400 bg-rose-950/60 p-2 rounded border border-rose-800">
                  {pinError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowDiscountModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleApplyDiscountSubmit}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg"
              >
                {isAr ? 'تأكيد الخصم' : 'Apply Discount'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
