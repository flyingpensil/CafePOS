// ============================================================================
// SALES REPORTS & UAE FTA TAX AUDIT LOG COMPONENT
// ============================================================================

import React, { useState } from 'react';
import { SalesInvoice } from '../../types/pos';
import { CsvHelper } from '../../core/utils/csv-helper';

interface ReportsManagerProps {
  invoices: SalesInvoice[];
  lang: 'en' | 'ar';
}

export const ReportsManager: React.FC<ReportsManagerProps> = ({
  invoices,
  lang
}) => {
  const isAr = lang === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('ALL');

  // Compute Metrics
  const totalGross = invoices.reduce((acc, i) => acc + i.grandTotal, 0);
  const totalTaxable = invoices.reduce((acc, i) => acc + i.subtotalTaxable, 0);
  const totalVat = invoices.reduce((acc, i) => acc + i.vatTotal, 0);
  const totalDiscounts = invoices.reduce((acc, i) => acc + i.discountTotal, 0);

  const filteredInvoices = invoices.filter(inv => {
    const matchesMethod = filterMethod === 'ALL' || inv.paymentMethod === filterMethod;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.cashierName.toLowerCase().includes(q) ||
      (inv.tableNumber && inv.tableNumber.toLowerCase().includes(q));
    return matchesMethod && matchesSearch;
  });

  const handleExportCsv = () => {
    const csv = CsvHelper.exportInvoicesToCsv(invoices);
    const dateStr = new Date().toISOString().slice(0, 10);
    CsvHelper.downloadFile(`uae_fta_sales_invoices_audit_${dateStr}.csv`, csv);
  };

  return (
    <div className="flex-1 flex flex-col h-full p-4 space-y-4 overflow-hidden text-xs">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-400 block text-[11px] mb-1">
            {isAr ? 'إجمالي المبيعات (شامل الضريبة):' : 'Total Gross Sales (AED):'}
          </span>
          <span className="text-xl font-black text-amber-400 font-mono">
            AED {totalGross.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-400 block text-[11px] mb-1">
            {isAr ? 'المبلغ الخاضع للضريبة (الصافي):' : 'Taxable Net Base (AED):'}
          </span>
          <span className="text-xl font-bold text-slate-100 font-mono">
            AED {totalTaxable.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-400 block text-[11px] mb-1">
            {isAr ? 'ضريبة القيمة المضافة المحصلة (5%):' : 'Total 5% VAT Collected (AED):'}
          </span>
          <span className="text-xl font-bold text-emerald-400 font-mono">
            AED {totalVat.toFixed(2)}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-400 block text-[11px] mb-1">
            {isAr ? 'إجمالي عدد الفواتير الصادرة:' : 'Total Certified Invoices:'}
          </span>
          <span className="text-xl font-bold text-blue-400 font-mono">
            {invoices.length} inv
          </span>
        </div>
      </div>

      {/* Filters and CSV Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            placeholder={isAr ? 'بحث برقم الفاتورة، الكاشير، أو الطاولة...' : 'Search by Invoice No, Cashier, Table...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
          />
          <select
            value={filterMethod}
            onChange={e => setFilterMethod(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-300"
          >
            <option value="ALL">{isAr ? 'جميع طرق الدفع' : 'All Tenders'}</option>
            <option value="CASH">CASH (نقدي)</option>
            <option value="CARD">CARD (بطاقة)</option>
            <option value="SPLIT">SPLIT (مقسم)</option>
          </select>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg shadow flex items-center gap-1.5 transition-all"
        >
          <span>📥</span>
          <span>{isAr ? 'تصدير سجل المبيعات والضريبة CSV' : 'Export Tax Audit CSV'}</span>
        </button>
      </div>

      {/* Invoices Audit Table */}
      <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl">
        <table className="w-full text-left">
          <thead className="bg-slate-850 text-slate-400 font-mono text-[11px] border-b border-slate-800 sticky top-0">
            <tr>
              <th className="p-3">Invoice Number</th>
              <th className="p-3">Date & Time</th>
              <th className="p-3">Order Type</th>
              <th className="p-3">Cashier</th>
              <th className="p-3 text-right">Net Base (AED)</th>
              <th className="p-3 text-right">5% VAT</th>
              <th className="p-3 text-right">Total Payable</th>
              <th className="p-3 text-center">Tender</th>
              <th className="p-3 text-center">Sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center p-8 text-slate-500 font-sans">
                  {isAr ? 'لا توجد فواتير مسجلة مطابقة للبحث' : 'No invoices found matching criteria'}
                </td>
              </tr>
            ) : (
              filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-bold text-amber-300">{inv.invoiceNumber}</td>
                  <td className="p-3 text-slate-400">
                    {new Date(inv.createdAt).toLocaleString('en-GB')}
                  </td>
                  <td className="p-3 font-sans">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      {inv.orderType} {inv.tableNumber ? `#${inv.tableNumber}` : ''}
                    </span>
                  </td>
                  <td className="p-3 font-sans text-slate-200">{inv.cashierName}</td>
                  <td className="p-3 text-right text-slate-300">{inv.subtotalTaxable.toFixed(2)}</td>
                  <td className="p-3 text-right text-emerald-400 font-bold">{inv.vatTotal.toFixed(2)}</td>
                  <td className="p-3 text-right font-black text-white">{inv.grandTotal.toFixed(2)}</td>
                  <td className="p-3 text-center font-sans">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inv.paymentMethod === 'CASH' ? 'text-emerald-400 bg-emerald-950' : 'text-blue-400 bg-blue-950'
                    }`}>
                      {inv.paymentMethod}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {inv.aspSyncStatus}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
