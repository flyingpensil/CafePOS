// ============================================================================
// SHIFT RECONCILIATION MODAL (X-REPORT & Z-REPORT)
// ============================================================================

import React, { useState } from 'react';
import { ShiftSession, User, SalesInvoice } from '../types/pos';
import { shiftManager, ShiftSummaryReport } from '../core/shift/shift-manager';

interface ShiftModalProps {
  shift: ShiftSession | null;
  cashier: User;
  branchId: string;
  invoices: SalesInvoice[];
  onOpenNewShift: (openingFloat: number) => void;
  onCloseShift: (summary: ShiftSummaryReport) => void;
  onClose: () => void;
  lang: 'en' | 'ar';
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  shift,
  cashier,
  invoices,
  onOpenNewShift,
  onCloseShift,
  onClose,
  lang
}) => {
  const isAr = lang === 'ar';
  const [openingFloatInput, setOpeningFloatInput] = useState('500.00');
  const [countedCashInput, setCountedCashInput] = useState('');
  const [cashDropInput, setCashDropInput] = useState('');
  const [cashDropNotes, setCashDropNotes] = useState('');
  const [isClosingShift, setIsClosingShift] = useState(false);
  const [activeTab, setActiveTab] = useState<'VIEW' | 'CASH_DROP'>('VIEW');

  // Compute current shift report
  const xReport = shift ? shiftManager.generateXReport(shift, invoices) : null;
  const countedCash = parseFloat(countedCashInput) || 0;
  const expectedCash = shift ? shift.expectedCash : 0;
  const discrepancy = Math.round((countedCash - expectedCash) * 100) / 100;

  const handleOpenShiftSubmit = () => {
    const floatVal = parseFloat(openingFloatInput) || 0;
    onOpenNewShift(floatVal);
  };

  const handleCashMovementSubmit = async (type: 'IN' | 'OUT') => {
    if (!shift) return;
    const amount = parseFloat(cashDropInput) || 0;
    if (amount <= 0) return;
    await shiftManager.recordCashMovement(shift, type, amount, cashDropNotes);
    setCashDropInput('');
    setCashDropNotes('');
    setActiveTab('VIEW');
  };

  const handleConfirmCloseShift = async () => {
    if (!shift) return;
    const finalReport = await shiftManager.closeShift(
      shift,
      countedCash,
      invoices,
      'End of shift physical drawer audit'
    );
    onCloseShift(finalReport);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💼</span>
            <h2 className="text-sm font-bold text-slate-100">
              {shift && shift.status === 'OPEN'
                ? isAr ? 'إدارة الوردية وتقرير الصندوق (X & Z Report)' : 'Shift Management & Cash Reconciliation'
                : isAr ? 'فتح وردية جديدة' : 'Open New Cashier Shift'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-base">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* CASE 1: NO ACTIVE SHIFT -> OPEN SHIFT */}
          {(!shift || shift.status === 'CLOSED') && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">
                  {isAr ? 'الكاشير المسؤول:' : 'Active Cashier:'}
                </span>
                <span className="text-sm font-bold text-slate-200">
                  {cashier.fullName} ({cashier.username})
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {isAr ? 'عهدة بداية الوردية النقدية بالدرهم (Opening Float AED):' : 'Opening Cash Float (AED):'}
                </label>
                <input
                  type="number"
                  step="50"
                  value={openingFloatInput}
                  onChange={e => setOpeningFloatInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-xl font-bold font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {isAr ? 'المبلغ النقدي الأولي المتوفر في درج النقود' : 'Cash currently loaded in the drawer before starting sales'}
                </span>
              </div>

              <button
                onClick={handleOpenShiftSubmit}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50"
              >
                {isAr ? 'تأكيد وفتح الوردية' : 'Start & Open Shift'}
              </button>
            </div>
          )}

          {/* CASE 2: ACTIVE SHIFT SESSION */}
          {shift && shift.status === 'OPEN' && (
            <div className="space-y-3">
              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-800 pb-2 gap-2 text-xs">
                <button
                  onClick={() => { setActiveTab('VIEW'); setIsClosingShift(false); }}
                  className={`px-3 py-1.5 rounded-lg font-semibold ${
                    activeTab === 'VIEW' && !isClosingShift
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📊 {isAr ? 'تقرير X الفوري' : 'X-Report (Live)'}
                </button>
                <button
                  onClick={() => { setActiveTab('CASH_DROP'); setIsClosingShift(false); }}
                  className={`px-3 py-1.5 rounded-lg font-semibold ${
                    activeTab === 'CASH_DROP'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  💵 {isAr ? 'إيداع / سحب نقد' : 'Cash In / Payout'}
                </button>
                <button
                  onClick={() => setIsClosingShift(true)}
                  className={`px-3 py-1.5 rounded-lg font-semibold ml-auto ${
                    isClosingShift
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-400 hover:text-white'
                  }`}
                >
                  🛑 {isAr ? 'إغلاق الوردية (Z-Report)' : 'Close Shift (Z-Report)'}
                </button>
              </div>

              {/* TAB: X-REPORT VIEW */}
              {activeTab === 'VIEW' && !isClosingShift && xReport && (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">{isAr ? 'العهدة الابتدائية:' : 'Opening Float:'}</span>
                      <span className="text-sm font-bold font-mono text-slate-200">
                        AED {xReport.openingFloat.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">{isAr ? 'إجمالي المبيعات:' : 'Gross Sales:'}</span>
                      <span className="text-sm font-bold font-mono text-amber-400">
                        AED {xReport.grossSales.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isAr ? 'مبيعات الكاش النقدي:' : 'Cash Sales:'}</span>
                      <span className="text-emerald-400 font-bold">AED {xReport.cashSales.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isAr ? 'مبيعات البطاقات البنكية:' : 'Card Sales:'}</span>
                      <span className="text-blue-400 font-bold">AED {xReport.cardSales.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isAr ? 'ضريبة القيمة المضافة المحصلة (5%):' : 'Total 5% VAT Collected:'}</span>
                      <span className="text-slate-300">AED {xReport.totalVatCollected.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isAr ? 'إيداعات نقدية أثناء الوردية:' : 'Cash In:'}</span>
                      <span className="text-slate-300">AED {xReport.cashIn.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{isAr ? 'مصروفات / سحب نقد:' : 'Cash Out / Payouts:'}</span>
                      <span className="text-rose-400">-AED {xReport.cashOut.toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between text-sm">
                      <span className="text-slate-200 font-bold">{isAr ? 'المفترض وجوده في الدرج:' : 'Expected Cash in Drawer:'}</span>
                      <span className="text-emerald-400 font-black">
                        AED {xReport.expectedCashInDrawer.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: CASH IN / OUT */}
              {activeTab === 'CASH_DROP' && !isClosingShift && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">
                    {isAr ? 'تسجيل حركة نقدية في الدرج (مصروفات أو تزويد فكة):' : 'Record Drawer Movement (Expense Payout or Change In):'}
                  </span>
                  <input
                    type="number"
                    step="5"
                    placeholder="Amount in AED"
                    value={cashDropInput}
                    onChange={e => setCashDropInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono"
                  />
                  <input
                    type="text"
                    placeholder={isAr ? 'سبب الحركة (مثال: شراء حليب، تزويد فكة...)' : 'Reason (e.g. Milk purchase, coin replenish)'}
                    value={cashDropNotes}
                    onChange={e => setCashDropNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => handleCashMovementSubmit('IN')}
                      className="py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold"
                    >
                      + {isAr ? 'إيداع نقد (Cash In)' : 'Cash In'}
                    </button>
                    <button
                      onClick={() => handleCashMovementSubmit('OUT')}
                      className="py-2.5 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-bold"
                    >
                      - {isAr ? 'سحب مصروفات (Payout)' : 'Payout'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: CLOSE SHIFT (Z-REPORT) */}
              {isClosingShift && (
                <div className="bg-slate-950 p-4 rounded-xl border border-rose-900/60 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                    <span>⚠️</span>
                    <span>{isAr ? 'إغلاق الوردية النهائي - جرد الصندوق' : 'End of Day Final Closure - Drawer Count'}</span>
                  </div>

                  <div className="flex justify-between text-xs text-slate-300 font-mono">
                    <span>{isAr ? 'المبلغ النقدي المتوقع بالدرهم:' : 'Expected Cash:'}</span>
                    <span className="font-bold">AED {expectedCash.toFixed(2)}</span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {isAr ? 'المبلغ الفعلي المعدود في الدرج (Counted Cash):' : 'Physical Cash Counted (AED):'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="e.g. 1920.00"
                      value={countedCashInput}
                      onChange={e => setCountedCashInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-lg font-bold font-mono text-white focus:outline-none focus:border-rose-500"
                      autoFocus
                    />
                  </div>

                  {countedCashInput && (
                    <div
                      className={`p-3 rounded-lg border text-xs font-mono font-bold flex justify-between ${
                        discrepancy === 0
                          ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                          : discrepancy > 0
                          ? 'bg-blue-950/50 border-blue-800 text-blue-300'
                          : 'bg-rose-950/50 border-rose-800 text-rose-300'
                      }`}
                    >
                      <span>
                        {discrepancy === 0
                          ? isAr ? 'المطابقة: دقيقة تماماً' : 'Variance: Balanced (Exact)'
                          : discrepancy > 0
                          ? isAr ? 'فائض نقد (Over):' : 'Cash Surplus (Over):'
                          : isAr ? 'عجز نقد (Short):' : 'Cash Shortage (Short):'}
                      </span>
                      <span>{discrepancy > 0 ? `+AED ${discrepancy.toFixed(2)}` : `AED ${discrepancy.toFixed(2)}`}</span>
                    </div>
                  )}

                  <button
                    onClick={handleConfirmCloseShift}
                    disabled={!countedCashInput}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs uppercase tracking-wider"
                  >
                    {isAr ? 'إغلاق الوردية وطباعة تقرير Z' : 'Close Shift & Print Z-Report'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
