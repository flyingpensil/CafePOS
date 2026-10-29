// ============================================================================
// CSV IMPORT MODAL COMPONENT (WITH STEP-BY-STEP INSTRUCTIONS & LIVE PREVIEW)
// ============================================================================

import React, { useState } from 'react';
import { Product, Category } from '../../types/pos';
import { CsvHelper, CsvImportResult } from '../../core/utils/csv-helper';

interface CsvImportModalProps {
  categories: Category[];
  onImportComplete: (newProducts: Product[]) => void;
  onClose: () => void;
  lang: 'en' | 'ar';
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  categories,
  onImportComplete,
  onClose,
  lang
}) => {
  const isAr = lang === 'ar';
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);

  const handleDownloadTemplate = () => {
    const template = CsvHelper.getSampleProductCsv();
    CsvHelper.downloadFile('uae_pos_products_template.csv', template);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      setFileContent(text);
      const parsed = CsvHelper.parseProductsFromCsv(text, categories);
      setImportResult(parsed);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!importResult || importResult.products.length === 0) return;
    onImportComplete(importResult.products);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📤</span>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                {isAr ? 'استيراد كتالوج المنتجات عبر ملف CSV' : 'Bulk Product CSV Import'}
              </h2>
              <span className="text-[11px] text-slate-400">
                {isAr ? 'قم برفع ملف المنتجات وتحديث قاعدة بيانات الكاشير فورياً' : 'Upload CSV to add or update items in your POS catalog'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-base">✕</button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Instructions Box */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <span>📋</span>
                <span>{isAr ? 'تعليمات الاستيراد ومتطلبات الملف:' : 'CSV Guidelines & Specifications:'}</span>
              </span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <span>📥</span>
                <span>{isAr ? 'تحميل نموذج جاهز (Template)' : 'Download Sample CSV Template'}</span>
              </button>
            </div>
            <ul className="text-slate-300 space-y-1 list-disc list-inside text-[11px] leading-relaxed">
              <li>{isAr ? 'الأعمدة الإلزامية:' : 'Mandatory columns:'} <code className="text-amber-300 font-mono">sku</code>, <code className="text-amber-300 font-mono">name_en</code>, <code className="text-amber-300 font-mono">selling_price</code>.</li>
              <li>{isAr ? 'الأعمدة الإضافية المدعومة:' : 'Optional columns:'} <code className="text-slate-400 font-mono">barcode, name_ar, category_id, cost_price, vat_rate, unit, track_stock, stock_on_hand, min_reorder_level, is_quick_order</code>.</li>
              <li>{isAr ? 'الأسعار بالدرهم الإماراتي (AED)، شاملة ضريبة القيمة المضافة 5%.' : 'Prices in AED (e.g. 1.50, 18.00). Standard VAT rate is 0.05 (5%).'}</li>
              <li>{isAr ? 'يتم حفظ الملف بترميز UTF-8 لدعم الحروف العربية في الإكسل.' : 'Save as UTF-8 CSV to preserve English and Arabic character typography.'}</li>
            </ul>
          </div>

          {/* File Picker Zone */}
          <div className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-xl p-5 text-center bg-slate-950/60 transition-colors">
            <input
              type="file"
              id="csv-file-input"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center gap-2">
              <span className="text-3xl">📁</span>
              <span className="text-xs font-bold text-slate-200">
                {fileName ? fileName : isAr ? 'اضغط لاختيار ملف CSV من جهازك' : 'Click to Browse & Select your CSV file'}
              </span>
              <span className="text-[10px] text-slate-500">
                {isAr ? 'يدعم ملفات .csv المنسقة من إكسل أو جداول بيانات جوجل' : 'Supports standard .csv exported from Microsoft Excel or Google Sheets'}
              </span>
            </label>
          </div>

          {/* Errors / Warnings */}
          {importResult && importResult.errors.length > 0 && (
            <div className="bg-rose-950/50 border border-rose-800 rounded-xl p-3 text-rose-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <span>⚠️</span>
                <span>{isAr ? 'تنبيهات وأخطاء في بعض الأسطر:' : 'Parsing Warnings / Errors:'}</span>
              </span>
              <div className="max-h-24 overflow-y-auto space-y-0.5 text-[11px] font-mono">
                {importResult.errors.map((err, i) => (
                  <div key={i}>• {err}</div>
                ))}
              </div>
            </div>
          )}

          {/* Live Preview of Valid Parsed Products */}
          {importResult && importResult.products.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span className="font-bold text-emerald-400">
                  ✓ {importResult.products.length} {isAr ? 'منتج جاهز للاستيراد' : 'valid items ready for import'}
                </span>
                <span>{isAr ? 'معاينة أولية لأول 5 أصناف' : 'Showing first 5 items preview'}</span>
              </div>
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 font-mono">
                    <tr>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Name (EN / AR)</th>
                      <th className="p-2">Price (AED)</th>
                      <th className="p-2">Unit</th>
                      <th className="p-2">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {importResult.products.slice(0, 5).map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="p-2 font-mono text-amber-300">{p.sku}</td>
                        <td className="p-2">
                          <div className="font-bold text-slate-200">{p.nameEn}</div>
                          <div className="text-[10px] text-slate-500 font-arabic">{p.nameAr}</div>
                        </td>
                        <td className="p-2 font-mono font-bold text-emerald-400">AED {p.sellingPrice.toFixed(2)}</td>
                        <td className="p-2 font-mono text-slate-400">{p.unit}</td>
                        <td className="p-2 font-mono text-slate-300">{p.stockOnHand ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-850 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!importResult || importResult.products.length === 0}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
          >
            <span>📥</span>
            <span>
              {isAr ? `تأكيد استيراد (${importResult?.products.length || 0}) منتج` : `Confirm Import (${importResult?.products.length || 0} Items)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
