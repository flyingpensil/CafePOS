// ============================================================================
// STATIONERY & RETAIL SHOP VIEW
// High-Speed Barcode Listener, Custom Printing/Photocopy Calculator, & Stock Control
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Product, QuickServiceItem } from '../types/pos';
import { QUICK_SERVICE_RATES } from '../data/mock-data';
import { globalScanner } from '../core/hardware/barcode';

interface StationeryViewProps {
  products: Product[];
  onAddToCart: (product: Product, quantity?: number) => void;
  lang: 'en' | 'ar';
}

export const StationeryView: React.FC<StationeryViewProps> = ({
  products,
  onAddToCart,
  lang
}) => {
  const isAr = lang === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<QuickServiceItem>(QUICK_SERVICE_RATES[0]);
  const [serviceQuantity, setServiceQuantity] = useState<number>(10);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Hook global hardware barcode scanner
  useEffect(() => {
    globalScanner.start();
    const unsubscribe = globalScanner.onScan((barcode: string) => {
      // Find matching product
      const match = products.find(
        p => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase()
      );
      if (match) {
        onAddToCart(match, 1);
      } else {
        alert(isAr ? `الباركود غير موجود: ${barcode}` : `Unknown Barcode: ${barcode}`);
      }
    });

    return () => {
      unsubscribe();
      globalScanner.stop();
    };
  }, [products, onAddToCart, isAr]);

  const filteredProducts = products.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.nameEn.toLowerCase().includes(q) ||
      p.nameAr.includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q))
    );
  });

  const handleAddCustomService = () => {
    if (serviceQuantity <= 0) return;
    const totalAmount = Math.round(selectedService.unitRate * serviceQuantity * 100) / 100;

    const serviceProduct: Product = {
      id: `srv_${Date.now()}`,
      sku: `SRV-${selectedService.category}`,
      nameEn: `${selectedService.nameEn} (${serviceQuantity} ${selectedService.unitLabel})`,
      nameAr: `${selectedService.nameAr} (${serviceQuantity})`,
      categoryId: 'cat_srv',
      costPrice: 0.05 * serviceQuantity,
      sellingPrice: totalAmount,
      vatRate: 0.05,
      isTaxInclusive: true,
      unit: 'SERVICE',
      trackStock: false
    };

    onAddToCart(serviceProduct, 1);
  };

  const handleKeyDownBarcode = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const match = products.find(
        p =>
          p.barcode === searchQuery.trim() ||
          p.sku.toLowerCase() === searchQuery.trim().toLowerCase()
      );
      if (match) {
        onAddToCart(match, 1);
        setSearchQuery('');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-3 select-none overflow-hidden gap-3">
      {/* Top Bar: Barcode Scanner Focus & Search */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="text"
            placeholder={
              isAr
                ? 'امسح الباركود أو ابحث بالاسم / رمز SKU (F1 للتحديد السريع)...'
                : 'Scan Barcode or Search by SKU / Name (Press F1)...'
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDownBarcode}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            autoFocus
          />
          <span className="absolute left-3 top-3 text-slate-400 text-xs">🔍</span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-blue-950/60 border border-blue-800/80 px-3 py-2 rounded-lg text-xs text-blue-300">
          <span className="animate-pulse">📶</span>
          <span className="font-mono text-[11px]">
            {isAr ? 'قارئ الباركود نشط' : 'Scanner Ready (USB/BT)'}
          </span>
        </div>
      </div>

      {/* Main Split: Left Catalog & Right Custom Services */}
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* Product Catalog List */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
          <div className="p-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>{isAr ? 'المنتج والمخزون' : 'Item & Stock Level'}</span>
            <span>{isAr ? 'السعر (شامل 5% ضريبة)' : 'Price (Incl. 5% VAT)'}</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1">
            {filteredProducts.map(product => {
              const isLowStock =
                product.trackStock &&
                product.stockOnHand !== undefined &&
                product.minReorderLevel !== undefined &&
                product.stockOnHand <= product.minReorderLevel;

              return (
                <button
                  key={product.id}
                  onClick={() => onAddToCart(product, 1)}
                  className="w-full p-3 flex items-center justify-between hover:bg-slate-800/70 text-left transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-400 group-hover:text-blue-400 transition-colors">
                      📦
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-blue-300 transition-colors">
                        {product.nameEn}
                      </div>
                      <div className="text-[11px] text-slate-400 font-arabic">
                        {product.nameAr}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700">
                          {product.sku}
                        </span>
                        {product.barcode && (
                          <span className="text-[10px] font-mono text-slate-500">
                            {product.barcode}
                          </span>
                        )}
                        {product.trackStock && (
                          <span
                            className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded ${
                              isLowStock
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-slate-800 text-emerald-400'
                            }`}
                          >
                            {isAr ? 'المخزون' : 'Stock'}: {product.stockOnHand ?? 0} {product.unit}
                            {isLowStock && (isAr ? ' (منخفض!)' : ' (LOW!)')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-400 font-mono">
                      AED {product.sellingPrice.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      per {product.unit}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Service Calculator (Photocopy, Printing, Binding) */}
        <div className="w-80 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-800">
              <span className="text-base">🖨️</span>
              <div>
                <h3 className="text-xs font-bold text-slate-200">
                  {isAr ? 'حاسبة خدمات التصوير والطباعة' : 'Copy & Print Service Calculator'}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {isAr ? 'تسعير فوري بالكمية' : 'Loose service unit billing'}
                </p>
              </div>
            </div>

            {/* Service Type Selection */}
            <div className="space-y-1.5 mb-3">
              <label className="text-[11px] font-semibold text-slate-400 block">
                {isAr ? 'نوع الخدمة المطلوبة:' : 'Select Service Type:'}
              </label>
              {QUICK_SERVICE_RATES.map(srv => (
                <button
                  key={srv.id}
                  onClick={() => setSelectedService(srv)}
                  className={`w-full p-2 rounded-lg text-xs font-medium border flex items-center justify-between transition-all ${
                    selectedService.id === srv.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="line-clamp-1">{srv.nameEn}</span>
                  <span className="font-mono text-blue-400 ml-1 font-bold whitespace-nowrap">
                    {srv.unitRate.toFixed(2)} AED
                  </span>
                </button>
              ))}
            </div>

            {/* Quantity Controls */}
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 mb-3">
              <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                {isAr ? 'الكمية / عدد الصفحات:' : 'Quantity / Pages Count:'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setServiceQuantity(prev => Math.max(1, prev - 10))}
                  className="px-2.5 py-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded font-bold text-xs"
                >
                  -10
                </button>
                <button
                  onClick={() => setServiceQuantity(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded font-bold text-xs"
                >
                  -1
                </button>
                <input
                  type="number"
                  min="1"
                  value={serviceQuantity}
                  onChange={e => setServiceQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-center bg-slate-900 border border-slate-700 rounded py-1.5 text-xs text-white font-mono font-bold"
                />
                <button
                  onClick={() => setServiceQuantity(prev => prev + 1)}
                  className="px-2.5 py-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded font-bold text-xs"
                >
                  +1
                </button>
                <button
                  onClick={() => setServiceQuantity(prev => prev + 10)}
                  className="px-2.5 py-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded font-bold text-xs"
                >
                  +10
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-4 gap-1 mt-2">
                {[1, 5, 20, 50].map(qty => (
                  <button
                    key={qty}
                    onClick={() => setServiceQuantity(qty)}
                    className="py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded text-[10px] font-mono border border-slate-800"
                  >
                    {qty}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Service Rate Total & Add Button */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs text-slate-400">{isAr ? 'الإجمالي المحسوب:' : 'Calculated Total:'}</span>
              <span className="text-base font-extrabold text-blue-400 font-mono">
                AED {(selectedService.unitRate * serviceQuantity).toFixed(2)}
              </span>
            </div>
            <button
              onClick={handleAddCustomService}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-900/40 flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>➕</span>
              <span>{isAr ? 'إدراج في الفاتورة' : 'Add Service Line'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
