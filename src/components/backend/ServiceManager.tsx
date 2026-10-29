// ============================================================================
// STATIONERY LOOSE PRINTING & SERVICES RATES MANAGER
// ============================================================================

import React, { useState } from 'react';
import { QuickServiceItem } from '../../types/pos';

interface ServiceManagerProps {
  services: QuickServiceItem[];
  onSaveService: (service: QuickServiceItem) => void;
  onDeleteService: (serviceId: string) => void;
  lang: 'en' | 'ar';
}

export const ServiceManager: React.FC<ServiceManagerProps> = ({
  services,
  onSaveService,
  onDeleteService,
  lang
}) => {
  const isAr = lang === 'ar';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<QuickServiceItem | null>(null);

  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [unitRate, setUnitRate] = useState('0.25');
  const [unitLabel, setUnitLabel] = useState('pages');
  const [category, setCategory] = useState<QuickServiceItem['category']>('PHOTOCOPY');

  const handleOpenAdd = () => {
    setEditingService(null);
    setNameEn('');
    setNameAr('');
    setUnitRate('0.25');
    setUnitLabel('pages');
    setCategory('PHOTOCOPY');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: QuickServiceItem) => {
    setEditingService(s);
    setNameEn(s.nameEn);
    setNameAr(s.nameAr);
    setUnitRate(s.unitRate.toFixed(2));
    setUnitLabel(s.unitLabel);
    setCategory(s.category);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) return;

    const updated: QuickServiceItem = {
      id: editingService ? editingService.id : `srv_${Date.now()}`,
      nameEn: nameEn.trim(),
      nameAr: nameAr.trim() || nameEn.trim(),
      unitRate: parseFloat(unitRate) || 0.25,
      unitLabel: unitLabel.trim() || 'units',
      category
    };

    onSaveService(updated);
    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full p-4 space-y-4 overflow-hidden text-xs">
      <div className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800">
        <div>
          <h2 className="font-bold text-sm text-slate-100">
            {isAr ? 'أسعار خدمات الطباعة والتصوير والتغليف' : 'Printing, Copying & Lamination Service Rates'}
          </h2>
          <span className="text-[11px] text-slate-400">
            {isAr ? 'تسعير الخدمات المباشرة بالكمية في واجهة القرطاسية' : 'Configure loose service rates (per page/sheet/book) for stationery checkout'}
          </span>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow flex items-center gap-1.5"
        >
          <span>➕</span>
          <span>{isAr ? 'إضافة خدمة جديدة' : 'Add New Service Rate'}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl">
        <table className="w-full text-left">
          <thead className="bg-slate-850 text-slate-400 font-mono text-[11px] border-b border-slate-800">
            <tr>
              <th className="p-3">Service Name (EN)</th>
              <th className="p-3">الاسم بالعربية</th>
              <th className="p-3">Category</th>
              <th className="p-3 text-right">Unit Rate (AED)</th>
              <th className="p-3 text-center">Unit Label</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {services.map(s => (
              <tr key={s.id} className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-slate-200">{s.nameEn}</td>
                <td className="p-3 font-arabic text-slate-400">{s.nameAr}</td>
                <td className="p-3">
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-blue-300 font-mono">
                    {s.category}
                  </span>
                </td>
                <td className="p-3 text-right font-mono font-bold text-blue-400 text-sm">
                  AED {s.unitRate.toFixed(2)}
                </td>
                <td className="p-3 text-center font-mono text-slate-400">
                  per {s.unitLabel}
                </td>
                <td className="p-3 text-right space-x-1.5">
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded"
                  >
                    ✏️ {isAr ? 'تعديل' : 'Edit'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete service "${s.nameEn}"?`)) onDeleteService(s.id);
                    }}
                    className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 rounded"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-4 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-100 mb-3">
              {editingService ? (isAr ? 'تعديل الخدمة' : 'Edit Service Rate') : (isAr ? 'إضافة خدمة جديدة' : 'Add New Service')}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Service Name (English)*:</label>
                <input
                  type="text"
                  required
                  value={nameEn}
                  onChange={e => setNameEn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1 font-arabic">الاسم بالعربية:</label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={e => setNameAr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-arabic"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-blue-400 block mb-1 font-bold">Rate in AED*:</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={unitRate}
                    onChange={e => setUnitRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-blue-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">Unit Label:</label>
                  <input
                    type="text"
                    placeholder="e.g. pages, sheets"
                    value={unitLabel}
                    onChange={e => setUnitLabel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Category:</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="PHOTOCOPY">Photocopy (تصوير مستندات)</option>
                  <option value="PRINT">Laser Print (طباعة ليزر)</option>
                  <option value="LAMINATION">Thermal Lamination (تغليف حراري)</option>
                  <option value="BINDING">Spiral Binding (تجليد حلزوني)</option>
                  <option value="CUSTOM">Custom Service (خدمات مخصصة)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg"
                >
                  {isAr ? 'حفظ الخدمة' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
