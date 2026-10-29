// ============================================================================
// PRODUCT & INVENTORY MANAGEMENT COMPONENT (WITH CSV IMPORT & EXPORT)
// ============================================================================

import React, { useState } from 'react';
import { Product, Category } from '../../types/pos';
import { CsvHelper } from '../../core/utils/csv-helper';
import { CsvImportModal } from './CsvImportModal';

interface ProductManagerProps {
  products: Product[];
  categories: Category[];
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onBulkImportProducts: (newProducts: Product[]) => void;
  lang: 'en' | 'ar';
}

export const ProductManager: React.FC<ProductManagerProps> = ({
  products,
  categories,
  onSaveProduct,
  onDeleteProduct,
  onBulkImportProducts,
  lang
}) => {
  const isAr = lang === 'ar';
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat_hot');
  const [sellingPrice, setSellingPrice] = useState('0.00');
  const [costPrice, setCostPrice] = useState('0.00');
  const [vatRate, setVatRate] = useState('0.05');
  const [unit, setUnit] = useState<Product['unit']>('PCS');
  const [trackStock, setTrackStock] = useState(false);
  const [stockOnHand, setStockOnHand] = useState('0');
  const [minReorderLevel, setMinReorderLevel] = useState('5');
  const [isQuickOrder, setIsQuickOrder] = useState(true);

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.nameEn.toLowerCase().includes(q) ||
      p.nameAr.includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.includes(q));
    return matchesCategory && matchesSearch;
  });

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setSku(`ITEM-${Date.now().toString().slice(-4)}`);
    setBarcode('');
    setNameEn('');
    setNameAr('');
    setCategoryId(categories[0]?.id || 'cat_hot');
    setSellingPrice('10.00');
    setCostPrice('5.00');
    setVatRate('0.05');
    setUnit('PCS');
    setTrackStock(false);
    setStockOnHand('0');
    setMinReorderLevel('5');
    setIsQuickOrder(true);
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku);
    setBarcode(p.barcode || '');
    setNameEn(p.nameEn);
    setNameAr(p.nameAr);
    setCategoryId(p.categoryId);
    setSellingPrice(p.sellingPrice.toFixed(2));
    setCostPrice(p.costPrice.toFixed(2));
    setVatRate(p.vatRate.toString());
    setUnit(p.unit);
    setTrackStock(p.trackStock);
    setStockOnHand(p.stockOnHand !== undefined ? p.stockOnHand.toString() : '0');
    setMinReorderLevel(p.minReorderLevel !== undefined ? p.minReorderLevel.toString() : '5');
    setIsQuickOrder(p.isQuickOrder ?? true);
    setIsEditModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !nameEn.trim()) {
      alert(isAr ? 'الرجاء إدخال رمز SKU واسم المنتج بالإنجليزية' : 'SKU and English Name are required.');
      return;
    }

    const priceNum = parseFloat(sellingPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      alert(isAr ? 'الرجاء إدخال سعر بيع صحيح' : 'Please enter a valid selling price.');
      return;
    }

    const updatedProduct: Product = {
      id: editingProduct ? editingProduct.id : `prod_${Date.now()}`,
      sku: sku.trim().toUpperCase(),
      barcode: barcode.trim() || undefined,
      nameEn: nameEn.trim(),
      nameAr: nameAr.trim() || nameEn.trim(),
      categoryId,
      costPrice: parseFloat(costPrice) || 0,
      sellingPrice: priceNum,
      vatRate: parseFloat(vatRate) || 0.05,
      isTaxInclusive: true,
      unit,
      trackStock,
      stockOnHand: trackStock ? parseFloat(stockOnHand) || 0 : undefined,
      minReorderLevel: trackStock ? parseFloat(minReorderLevel) || 5 : undefined,
      isQuickOrder,
      modifierGroups: editingProduct?.modifierGroups
    };

    onSaveProduct(updatedProduct);
    setIsEditModalOpen(false);
  };

  const handleExportCsv = () => {
    const csvContent = CsvHelper.exportProductsToCsv(products);
    const dateStr = new Date().toISOString().slice(0, 10);
    CsvHelper.downloadFile(`uae_pos_products_catalog_${dateStr}.csv`, csvContent);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-4 text-xs">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            placeholder={isAr ? 'ابحث بالاسم، SKU، أو الباركود...' : 'Search items by SKU, name, or barcode...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
          />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-300"
          >
            <option value="ALL">{isAr ? 'جميع الأقسام' : 'All Categories'}</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{isAr ? c.nameAr : c.nameEn}</option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
            title="Export all products to Excel CSV with UTF-8 BOM"
          >
            <span>📥</span>
            <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
            title="Import products from Excel CSV with validation"
          >
            <span>📤</span>
            <span>{isAr ? 'استيراد CSV' : 'Import CSV'}</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg shadow flex items-center gap-1.5 transition-all"
          >
            <span>➕</span>
            <span>{isAr ? 'إضافة منتج جديد' : 'Add New Product'}</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl">
        <table className="w-full text-left">
          <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 sticky top-0 font-mono text-[11px]">
            <tr>
              <th className="p-3">SKU / Barcode</th>
              <th className="p-3">Name (EN / AR)</th>
              <th className="p-3">Category</th>
              <th className="p-3 text-right">Selling Price (AED)</th>
              <th className="p-3 text-center">Unit</th>
              <th className="p-3 text-center">Stock</th>
              <th className="p-3 text-center">Touch Grid</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredProducts.map(p => {
              const isLowStock = p.trackStock && (p.stockOnHand ?? 0) <= (p.minReorderLevel ?? 5);
              return (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-mono">
                    <div className="font-bold text-amber-400">{p.sku}</div>
                    {p.barcode && <div className="text-[10px] text-slate-500">{p.barcode}</div>}
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-slate-100">{p.nameEn}</div>
                    <div className="text-[10px] text-slate-400 font-arabic">{p.nameAr}</div>
                  </td>
                  <td className="p-3">
                    <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {categories.find(c => c.id === p.categoryId)?.nameEn || p.categoryId}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-100">
                    AED {p.sellingPrice.toFixed(2)}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-400">
                    {p.unit}
                  </td>
                  <td className="p-3 text-center font-mono">
                    {p.trackStock ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isLowStock ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300'
                      }`}>
                        {p.stockOnHand ?? 0} {isLowStock ? '(LOW)' : ''}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">N/A (Recipe/Loose)</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {p.isQuickOrder ? (
                      <span className="text-emerald-400 font-bold">✓</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded font-medium transition-colors"
                    >
                      ✏️ {isAr ? 'تعديل' : 'Edit'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(isAr ? `هل أنت متأكد من حذف ${p.nameEn}؟` : `Delete product "${p.nameEn}"?`)) {
                          onDeleteProduct(p.id);
                        }
                      }}
                      className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded transition-colors"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-sm text-slate-100">
                {editingProduct
                  ? isAr ? `تعديل صنف: ${editingProduct.nameEn}` : `Edit Product: ${editingProduct.nameEn}`
                  : isAr ? 'إضافة منتج جديد' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">SKU (Unique Code)*:</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-amber-300 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Barcode (EAN-13 / Code 128):</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    placeholder="Scan barcode with USB reader..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Name (English)*:</label>
                  <input
                    type="text"
                    required
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1 font-arabic">الاسم بالعربية:</label>
                  <input
                    type="text"
                    value={nameAr}
                    onChange={e => setNameAr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-arabic text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Category:</label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.nameEn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Unit:</label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs"
                  >
                    <option value="PCS">PCS (قطعة)</option>
                    <option value="PORTION">PORTION (وجبة / كوب)</option>
                    <option value="PACK">PACK (حزمة)</option>
                    <option value="BOX">BOX (صندوق / كرتون)</option>
                    <option value="PAGE">PAGE (صفحة)</option>
                    <option value="SERVICE">SERVICE (خدمة)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">VAT Rate:</label>
                  <select
                    value={vatRate}
                    onChange={e => setVatRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs font-mono"
                  >
                    <option value="0.05">5.0% Standard VAT</option>
                    <option value="0.00">0.0% Zero-Rated</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-emerald-400 block mb-1">Selling Price (AED incl. 5% VAT)*:</label>
                  <input
                    type="number"
                    step="0.25"
                    required
                    value={sellingPrice}
                    onChange={e => setSellingPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-emerald-400 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Cost Price (AED):</label>
                  <input
                    type="number"
                    step="0.25"
                    value={costPrice}
                    onChange={e => setCostPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* Stock Controls */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-track-stock"
                    checked={trackStock}
                    onChange={e => setTrackStock(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <label htmlFor="chk-track-stock" className="text-xs font-bold text-slate-200 cursor-pointer">
                    {isAr ? 'تفعيل تتبع المخزون والكميات المتوفرة' : 'Track Inventory Stock Levels'}
                  </label>
                </div>

                {trackStock && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Current Stock on Hand:</label>
                      <input
                        type="number"
                        value={stockOnHand}
                        onChange={e => setStockOnHand(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-100 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Min Reorder Level:</label>
                      <input
                        type="number"
                        value={minReorderLevel}
                        onChange={e => setMinReorderLevel(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-slate-100 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Touch Grid Quick Order */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-quick-order"
                  checked={isQuickOrder}
                  onChange={e => setIsQuickOrder(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <label htmlFor="chk-quick-order" className="text-xs text-slate-300 cursor-pointer">
                  {isAr ? 'عرض هذا الصنف في شاشة اللمس السريعة للكافتيريا' : 'Display on Cafeteria Touchscreen Quick-Order Grid'}
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg"
                >
                  {isAr ? 'حفظ الصنف' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {isCsvModalOpen && (
        <CsvImportModal
          categories={categories}
          onImportComplete={onBulkImportProducts}
          onClose={() => setIsCsvModalOpen(false)}
          lang={lang}
        />
      )}
    </div>
  );
};
