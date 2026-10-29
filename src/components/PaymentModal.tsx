// ============================================================================
// PAYMENT MODAL & CASH ASSISTANT
// Multi-Tender: Cash, Card, Split. UAE Banknote Buttons (5-500 AED) & Change Assistant.
// ============================================================================

import React, { useState } from 'react';
import {
  CartItem,
  PaymentMethod,
  PaymentBreakdown,
  SalesInvoice,
  TenantInfo,
  BranchInfo,
  User,
  OrderType
} from '../types/pos';
import { UaeTaxEngine } from '../core/compliance/uae-tax';
import { FtaQrEngine } from '../core/compliance/fta-qr';
import { syncEngine } from '../core/offline/sync-engine';
import { EscPosBuilder } from '../core/hardware/escpos';

interface PaymentModalProps {
  items: CartItem[];
  orderType: OrderType;
  tableNumber: string | null;
  orderDiscount: number;
  tenant: TenantInfo;
  branch: BranchInfo;
  cashier: User;
  shiftId: string;
  nextSequence: number;
  onCompleteSale: (invoice: SalesInvoice) => void;
  onClose: () => void;
  lang: 'en' | 'ar';
}

const UAE_BANKNOTES = [5, 10, 20, 50, 100, 200, 500];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  items,
  orderType,
  tableNumber,
  orderDiscount,
  tenant,
  branch,
  cashier,
  shiftId,
  nextSequence,
  onCompleteSale,
  onClose,
  lang
}) => {
  const isAr = lang === 'ar';

  // Compute final financial totals
  const lineCalculations = items.map(item =>
    UaeTaxEngine.calculateLineTax({
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      discountAmount: item.discountAmount,
      vatRate: 0.05,
      isTaxInclusive: true
    })
  );
  const totals = UaeTaxEngine.calculateInvoiceTotals(lineCalculations, orderDiscount, false);
  const grandTotal = totals.grandTotal;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [tenderedCashStr, setTenderedCashStr] = useState<string>(grandTotal.toFixed(2));
  const [cardAmountStr, setCardAmountStr] = useState<string>('0.00');
  const [cardAuthCode, setCardAuthCode] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerTrn, setCustomerTrn] = useState<string>('');

  const tenderedCash = parseFloat(tenderedCashStr) || 0;
  const changeDue = Math.max(0, Math.round((tenderedCash - grandTotal) * 100) / 100);

  // Quick Banknote Click Handler
  const handleBanknoteClick = (denomination: number) => {
    // If current tendered is less than denomination, set to denomination, else add
    setTenderedCashStr(denomination.toFixed(2));
  };

  const handleBanknoteAdd = (denomination: number) => {
    setTenderedCashStr(prev => {
      const cur = parseFloat(prev) || 0;
      return (cur + denomination).toFixed(2);
    });
  };

  const handleProcessPayment = async () => {
    if (paymentMethod === 'CASH' && tenderedCash < grandTotal) {
      alert(isAr ? 'المبلغ المستلم أقل من الإجمالي المطلوب!' : 'Tendered amount is less than grand total!');
      return;
    }

    const timestamp = new Date().toISOString();
    const invoiceNumber = syncEngine.generateSequentialInvoiceNumber(
      branch.branchCode,
      'POS-01',
      nextSequence
    );

    // Build UAE FTA TLV QR Code
    const qrTlvBase64 = FtaQrEngine.generateTlvBase64({
      sellerName: tenant.legalNameEn,
      trn: tenant.trn,
      timestamp,
      invoiceTotal: totals.grandTotal,
      vatTotal: totals.vatTotal
    });

    // Compute chained hash
    const invoiceHash = await syncEngine.computeInvoiceHash(
      '0000000000000000',
      invoiceNumber,
      totals.grandTotal,
      totals.vatTotal,
      timestamp,
      tenant.trn
    );

    // Payments breakdown
    const payments: PaymentBreakdown[] = [];
    if (paymentMethod === 'CASH') {
      payments.push({
        method: 'CASH',
        amount: grandTotal,
        tenderedCash,
        changeGiven: changeDue
      });
      // Pop cash drawer
      const esc = new EscPosBuilder('80mm');
      esc.pulseCashDrawer(2);
    } else if (paymentMethod === 'CARD') {
      payments.push({
        method: 'CARD',
        amount: grandTotal,
        cardType: 'VISA/MASTERCARD',
        authCode: cardAuthCode || 'AUTH_' + Math.floor(100000 + Math.random() * 900000)
      });
    } else if (paymentMethod === 'SPLIT') {
      const cardPart = parseFloat(cardAmountStr) || 0;
      const cashPart = Math.max(0, grandTotal - cardPart);
      payments.push({
        method: 'CASH',
        amount: cashPart,
        tenderedCash: cashPart,
        changeGiven: 0
      });
      payments.push({
        method: 'CARD',
        amount: cardPart,
        authCode: cardAuthCode || 'AUTH_SPLIT'
      });
    }

    const newInvoice: SalesInvoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      tenantId: tenant.id,
      branchId: branch.id,
      shiftId,
      terminalId: 'POS-01',
      cashierId: cashier.id,
      cashierName: cashier.fullName,
      invoiceNumber,
      sequenceNumber: nextSequence,
      orderType,
      tableNumber: tableNumber || undefined,
      customerName: customerName || undefined,
      customerTrn: customerTrn || undefined,
      items,
      subtotalTaxable: totals.subtotalTaxable,
      discountTotal: totals.discountTotal,
      vatTotal: totals.vatTotal,
      roundingDifference: totals.roundingDifference,
      grandTotal: totals.grandTotal,
      paymentMethod,
      payments,
      qrTlvBase64,
      invoiceHash,
      aspSyncStatus: 'LOCAL',
      createdAt: timestamp
    };

    onCompleteSale(newInvoice);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💳</span>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                {isAr ? 'تسوية ودفع الحساب' : 'Tender & Settle Payment'}
              </h2>
              <span className="text-xs text-amber-400 font-mono">
                {tenant.legalNameEn} • TRN: {tenant.trn}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 text-lg">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Amount Due Banner */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">
                {isAr ? 'المبلغ المطلوب سداده (شامل الضريبة)' : 'Total Payable (Incl. 5% VAT)'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Net: AED {totals.subtotalTaxable.toFixed(2)} | VAT: AED {totals.vatTotal.toFixed(2)}
              </span>
            </div>
            <span className="text-3xl font-black text-amber-400 font-mono">
              AED {grandTotal.toFixed(2)}
            </span>
          </div>

          {/* Payment Tender Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 font-semibold text-xs transition-all ${
                paymentMethod === 'CASH'
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xl">💵</span>
              <span>{isAr ? 'نقدي (كاش)' : 'Cash'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('CARD')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 font-semibold text-xs transition-all ${
                paymentMethod === 'CARD'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 ring-2 ring-blue-500/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xl">💳</span>
              <span>{isAr ? 'بطاقة بنكية' : 'Card / POS'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('SPLIT');
                setCardAmountStr((grandTotal / 2).toFixed(2));
              }}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1 font-semibold text-xs transition-all ${
                paymentMethod === 'SPLIT'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300 ring-2 ring-purple-500/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xl">⚖️</span>
              <span>{isAr ? 'دفع مقسم' : 'Split Tender'}</span>
            </button>
          </div>

          {/* CASH TENDER VIEW */}
          {paymentMethod === 'CASH' && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  {isAr ? 'المبلغ المستلم من العميل (AED):' : 'Cash Tendered (AED):'}
                </label>
                <button
                  type="button"
                  onClick={() => setTenderedCashStr(grandTotal.toFixed(2))}
                  className="text-[11px] text-amber-400 hover:underline font-mono"
                >
                  {isAr ? 'مبلغ مطابق تماماً' : 'Exact Amount'}
                </button>
              </div>

              <input
                type="number"
                step="0.5"
                value={tenderedCashStr}
                onChange={e => setTenderedCashStr(e.target.value)}
                className="w-full text-center bg-slate-900 border border-slate-700 rounded-xl py-3 text-2xl font-black text-white font-mono focus:outline-none focus:border-emerald-500"
                autoFocus
              />

              {/* UAE Banknote Quick Preset Buttons */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                  {isAr ? 'فئات العملات النقدية الإماراتية (درهم):' : 'UAE Banknote Presets (AED):'}
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {UAE_BANKNOTES.map(note => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => handleBanknoteClick(note)}
                      onContextMenu={e => {
                        e.preventDefault();
                        handleBanknoteAdd(note);
                      }}
                      className="py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold font-mono text-emerald-400 active:scale-95 transition-all shadow-sm"
                      title="Left-click: Set exact note | Right-click: Add to amount"
                    >
                      {note}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Change Assistant */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-300 font-bold block">
                    {isAr ? 'المبلغ المتبقي للعميل (الباقي):' : 'Change to Return:'}
                  </span>
                  <span className="text-[10px] text-emerald-400/80">
                    {tenderedCash >= grandTotal ? 'Exact or Return change' : 'Awaiting sufficient cash'}
                  </span>
                </div>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  AED {changeDue.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* CARD TENDER VIEW */}
          {paymentMethod === 'CARD' && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="text-2xl">📡</span>
                <div>
                  <div className="font-bold">
                    {isAr ? 'مرر البطاقة على جهاز الدفع' : 'Tap or Insert Card on POS Terminal'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Supports Apple Pay, Samsung Pay, Visa, Mastercard, Jaywan
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  {isAr ? 'رمز التفويض / المرجع (اختياري):' : 'Terminal Auth / Ref Code (Optional):'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 784912"
                  value={cardAuthCode}
                  onChange={e => setCardAuthCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          )}

          {/* SPLIT TENDER VIEW */}
          {paymentMethod === 'SPLIT' && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {isAr ? 'مبلغ البطاقة البنكية:' : 'Card Portion (AED):'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={cardAmountStr}
                    onChange={e => setCardAmountStr(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-blue-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {isAr ? 'مبلغ الكاش المتبقي:' : 'Cash Portion (AED):'}
                  </label>
                  <div className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-emerald-400 font-mono font-bold">
                    AED {Math.max(0, grandTotal - (parseFloat(cardAmountStr) || 0)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Optional B2B Tax Customer Details */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block">
              {isAr ? 'بيانات العميل الضريبية (اختياري للشركات / B2B):' : 'Customer Tax Details (Optional B2B):'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder={isAr ? 'اسم الشركة / العميل' : 'Customer / Company Name'}
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500"
              />
              <input
                type="text"
                maxLength={15}
                placeholder={isAr ? 'الرقم الضريبي (15 رقم)' : 'Customer TRN (15 digits)'}
                value={customerTrn}
                onChange={e => setCustomerTrn(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            {isAr ? 'رجوع' : 'Cancel'}
          </button>
          <button
            onClick={handleProcessPayment}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/60 flex items-center gap-2 transition-all active:scale-95"
          >
            <span>🖨️</span>
            <span>{isAr ? 'إتمام وطباعة الفاتورة' : 'Complete & Print Invoice'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
