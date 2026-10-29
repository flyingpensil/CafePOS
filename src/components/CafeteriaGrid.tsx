// ============================================================================
// CAFETERIA QUICK-ORDER TOUCH GRID & MODIFIER ENGINE
// Optimized for fast touchscreen POS operation with instant modifier selections.
// ============================================================================

import React, { useState } from 'react';
import {
  Product,
  Category,
  OrderType,
  SelectedModifier,
  Modifier
} from '../types/pos';
import { INITIAL_TABLES } from '../data/mock-data';

interface CafeteriaGridProps {
  categories: Category[];
  products: Product[];
  onAddToCart: (
    product: Product,
    modifiers: SelectedModifier[],
    kitchenNotes?: string
  ) => void;
  orderType: OrderType;
  onOrderTypeChange: (type: OrderType) => void;
  selectedTable: string | null;
  onTableChange: (table: string | null) => void;
  lang: 'en' | 'ar';
}

export const CafeteriaGrid: React.FC<CafeteriaGridProps> = ({
  categories,
  products,
  onAddToCart,
  orderType,
  onOrderTypeChange,
  selectedTable,
  onTableChange,
  lang
}) => {
  const isAr = lang === 'ar';
  const cafeteriaCategories = categories.filter(c =>
    ['cat_hot', 'cat_sand', 'cat_shaw', 'cat_juice'].includes(c.id)
  );

  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    cafeteriaCategories[0]?.id || ''
  );
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [modalModifiers, setModalModifiers] = useState<SelectedModifier[]>([]);
  const [modalNotes, setModalNotes] = useState<string>('');

  const filteredProducts = products.filter(
    p => p.categoryId === activeCategoryId && (p.isQuickOrder ?? true)
  );

  const handleProductClick = (product: Product) => {
    if (product.modifierGroups && product.modifierGroups.length > 0) {
      // Initialize default modifiers
      const defaults: SelectedModifier[] = [];
      for (const group of product.modifierGroups) {
        const def = group.modifiers.find(m => m.isDefault);
        if (def) {
          defaults.push({
            groupId: group.id,
            groupNameEn: group.nameEn,
            modifierId: def.id,
            nameEn: def.nameEn,
            nameAr: def.nameAr,
            priceDelta: def.priceDelta
          });
        }
      }
      setModalModifiers(defaults);
      setModalNotes('');
      setSelectedProductForModal(product);
    } else {
      onAddToCart(product, []);
    }
  };

  const handleToggleModifier = (
    group: { id: string; nameEn: string; maxSelection: number },
    modifier: Modifier
  ) => {
    if (group.maxSelection === 1) {
      // Single selection (Radio behavior)
      setModalModifiers(prev => [
        ...prev.filter(m => m.groupId !== group.id),
        {
          groupId: group.id,
          groupNameEn: group.nameEn,
          modifierId: modifier.id,
          nameEn: modifier.nameEn,
          nameAr: modifier.nameAr,
          priceDelta: modifier.priceDelta
        }
      ]);
    } else {
      // Multi selection (Checkbox behavior)
      const exists = modalModifiers.some(m => m.modifierId === modifier.id);
      if (exists) {
        setModalModifiers(prev => prev.filter(m => m.modifierId !== modifier.id));
      } else {
        setModalModifiers(prev => [
          ...prev,
          {
            groupId: group.id,
            groupNameEn: group.nameEn,
            modifierId: modifier.id,
            nameEn: modifier.nameEn,
            nameAr: modifier.nameAr,
            priceDelta: modifier.priceDelta
          }
        ]);
      }
    }
  };

  const calculateModalTotalPrice = (): number => {
    if (!selectedProductForModal) return 0;
    const base = selectedProductForModal.sellingPrice;
    const deltas = modalModifiers.reduce((acc, m) => acc + m.priceDelta, 0);
    return Math.round((base + deltas) * 100) / 100;
  };

  const handleConfirmModifierModal = () => {
    if (selectedProductForModal) {
      onAddToCart(selectedProductForModal, modalModifiers, modalNotes);
      setSelectedProductForModal(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-3 select-none overflow-hidden">
      {/* Top Bar: Order Type & Table Picker */}
      <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800 mb-3 gap-2">
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg">
          <button
            onClick={() => {
              onOrderTypeChange('WALK_IN');
              onTableChange(null);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              orderType === 'WALK_IN'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            🚶 {isAr ? 'سفري / مباشر' : 'Walk-In'}
          </button>
          <button
            onClick={() => {
              onOrderTypeChange('TAKEAWAY');
              onTableChange(null);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              orderType === 'TAKEAWAY'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            🥡 {isAr ? 'طلب خارجي' : 'Takeaway'}
          </button>
          <button
            onClick={() => {
              onOrderTypeChange('DINE_IN');
              if (!selectedTable) onTableChange(INITIAL_TABLES[0]);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              orderType === 'DINE_IN'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            🍽️ {isAr ? 'محلي / صالة' : 'Dine-In'}
          </button>
        </div>

        {/* Table Selector (Active in Dine-in mode) */}
        {orderType === 'DINE_IN' && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-xs font-medium text-amber-400">
              {isAr ? 'الطاولة:' : 'Table:'}
            </span>
            {INITIAL_TABLES.map(table => (
              <button
                key={table}
                onClick={() => onTableChange(table)}
                className={`px-2.5 py-1 text-xs rounded font-bold font-mono transition-all ${
                  selectedTable === table
                    ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {table}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
        {cafeteriaCategories.map(cat => {
          const isActive = cat.id === activeCategoryId;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
                isActive
                  ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-900/30 ring-2 ring-amber-400/20'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.colorCode }} />
              <span>{isAr ? cat.nameAr : cat.nameEn}</span>
            </button>
          );
        })}
      </div>

      {/* Product Touch Grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pr-1">
        {filteredProducts.map(product => (
          <button
            key={product.id}
            onClick={() => handleProductClick(product)}
            className="group relative flex flex-col justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/60 hover:bg-slate-800/90 active:scale-[0.98] transition-all text-left shadow-sm min-h-[110px]"
          >
            <div>
              <div className="flex items-start justify-between gap-1">
                <span className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                  {product.nameEn}
                </span>
                {product.modifierGroups && product.modifierGroups.length > 0 && (
                  <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded font-mono">
                    MODS
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 font-arabic mt-0.5 line-clamp-1">
                {product.nameAr}
              </div>
            </div>

            <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-slate-800/80">
              <span className="text-xs text-slate-500 font-mono">
                {product.unit}
              </span>
              <span className="text-base font-extrabold text-amber-400 font-mono">
                AED {product.sellingPrice.toFixed(2)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* MODIFIER SELECTION MODAL */}
      {selectedProductForModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-100">
                  {selectedProductForModal.nameEn}
                </h3>
                <p className="text-xs text-slate-400 font-arabic">
                  {selectedProductForModal.nameAr}
                </p>
              </div>
              <button
                onClick={() => setSelectedProductForModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {selectedProductForModal.modifierGroups?.map(group => (
                <div key={group.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-300">
                      {isAr ? group.nameAr : group.nameEn}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {group.maxSelection === 1 ? (isAr ? 'اختيار واحد' : 'Single Choice') : (isAr ? 'اختيارات متعددة' : 'Multiple Add-ons')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {group.modifiers.map(mod => {
                      const isSelected = modalModifiers.some(m => m.modifierId === mod.id);
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => handleToggleModifier(group, mod)}
                          className={`p-2.5 rounded-lg text-xs font-medium border text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-amber-600/20 border-amber-500 text-amber-200 ring-1 ring-amber-400'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div>{mod.nameEn}</div>
                            <div className="text-[10px] text-slate-400 font-arabic">{mod.nameAr}</div>
                          </div>
                          {mod.priceDelta > 0 && (
                            <span className="text-[11px] font-mono font-bold text-amber-400 ml-1">
                              +{mod.priceDelta.toFixed(2)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Kitchen Special Instructions */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {isAr ? 'ملاحظات المطبخ الخاصة' : 'Kitchen Special Instructions'}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? 'مثال: بدون مايونيز، حار، بدون سكر...' : 'e.g., No mayo, extra spicy, well done...'}
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">{isAr ? 'السعر الإجمالي' : 'Total Price'}</span>
                <span className="text-lg font-bold text-amber-400 font-mono">
                  AED {calculateModalTotalPrice().toFixed(2)}
                </span>
              </div>
              <button
                onClick={handleConfirmModifierModal}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-900/30 flex items-center gap-2 transition-all active:scale-95"
              >
                <span>➕</span>
                <span>{isAr ? 'إضافة إلى الطلب' : 'Add to Cart'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
