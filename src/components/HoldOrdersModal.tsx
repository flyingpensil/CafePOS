// ============================================================================
// HELD ORDERS & TABLE TABS MODAL (WITH BILL SPLIT ASSISTANT)
// ============================================================================

import React, { useState } from 'react';
import { HeldOrder } from '../types/pos';

interface HoldOrdersModalProps {
  heldOrders: HeldOrder[];
  onRecallOrder: (order: HeldOrder) => void;
  onDeleteOrder: (id: string) => void;
  onClose: () => void;
  lang: 'en' | 'ar';
}

export const HoldOrdersModal: React.FC<HoldOrdersModalProps> = ({
  heldOrders,
  onRecallOrder,
  onDeleteOrder,
  onClose,
  lang
}) => {
  const isAr = lang === 'ar';
  const [selectedSplitOrder, setSelectedSplitOrder] = useState<HeldOrder | null>(null);
  const [splitWays, setSplitWays] = useState<number>(2);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h2 className="text-sm font-bold text-slate-100">
              {isAr ? 'الطلبات المعلقة وحسابات الطاولات' : 'Parked Orders & Open Table Tabs'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-base">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {heldOrders.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              <span className="text-3xl block mb-2">🍽️</span>
              {isAr ? 'لا توجد طلبات معلقة حالياً' : 'No open table tabs or held tickets'}
            </div>
          ) : (
            heldOrders.map(order => (
              <div
                key={order.id}
                className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-400 font-mono">
                      {order.tableNumber ? `Table #${order.tableNumber}` : 'Walk-In Parked Ticket'}
                    </span>
                    <div className="text-[11px] text-slate-400">
                      {order.orderType} • {new Date(order.heldAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <span className="text-sm font-bold text-slate-100 font-mono">
                    AED {order.subtotal.toFixed(2)}
                  </span>
                </div>

                {/* Items Summary */}
                <div className="text-[11px] text-slate-400 line-clamp-2 bg-slate-900 p-2 rounded">
                  {order.items.map(i => `${i.quantity}x ${i.product.nameEn}`).join(', ')}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => onDeleteOrder(order.id)}
                    className="text-[11px] text-rose-400 hover:text-rose-300 px-2 py-1"
                  >
                    🗑️ {isAr ? 'إلغاء التذكرة' : 'Cancel Tab'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSplitOrder(order)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 font-medium"
                    >
                      ⚖️ {isAr ? 'تقسيم الحساب' : 'Split Bill'}
                    </button>
                    <button
                      onClick={() => onRecallOrder(order)}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                    >
                      ▶ {isAr ? 'استرجاع للسلة' : 'Recall to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* BILL SPLIT POPUP */}
          {selectedSplitOrder && (
            <div className="mt-3 bg-slate-850 p-4 rounded-xl border border-amber-600/60 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-amber-300">
                  {isAr ? 'حاسبة تقسيم الفاتورة' : 'Bill Split Calculator'}
                </span>
                <button
                  onClick={() => setSelectedSplitOrder(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{isAr ? 'إجمالي الحساب:' : 'Total Amount:'}</span>
                <span className="font-bold font-mono text-white">
                  AED {selectedSplitOrder.subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  {isAr ? 'عدد الأفراد المشتركين:' : 'Split equally between:'}
                </span>
                <div className="flex items-center gap-1.5">
                  {[2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setSplitWays(n)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold font-mono ${
                        splitWays === n
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-amber-400 font-bold">
                  {isAr ? 'حصة كل فرد:' : 'Per Person Share:'}
                </span>
                <span className="text-base font-black text-amber-400 font-mono">
                  AED {(selectedSplitOrder.subtotal / splitWays).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
