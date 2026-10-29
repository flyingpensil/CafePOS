// ============================================================================
// CAFETERIA RECIPE MODIFIER GROUPS & ADD-ONS MANAGER
// ============================================================================

import React, { useState } from 'react';
import { ModifierGroup, Modifier } from '../../types/pos';

interface ModifierManagerProps {
  modifierGroups: ModifierGroup[];
  onSaveGroup: (group: ModifierGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  lang: 'en' | 'ar';
}

export const ModifierManager: React.FC<ModifierManagerProps> = ({
  modifierGroups,
  onSaveGroup,
  onDeleteGroup,
  lang
}) => {
  const isAr = lang === 'ar';
  const [selectedGroup, setSelectedGroup] = useState<ModifierGroup | null>(modifierGroups[0] || null);
  const [isEditingOption, setIsEditingOption] = useState(false);
  const [optionNameEn, setOptionNameEn] = useState('');
  const [optionNameAr, setOptionNameAr] = useState('');
  const [optionPriceDelta, setOptionPriceDelta] = useState('0.00');
  const [optionIsDefault, setOptionIsDefault] = useState(false);

  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !optionNameEn.trim()) return;

    const newMod: Modifier = {
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nameEn: optionNameEn.trim(),
      nameAr: optionNameAr.trim() || optionNameEn.trim(),
      priceDelta: parseFloat(optionPriceDelta) || 0,
      isDefault: optionIsDefault
    };

    const updatedGroup: ModifierGroup = {
      ...selectedGroup,
      modifiers: [...selectedGroup.modifiers, newMod]
    };

    onSaveGroup(updatedGroup);
    setSelectedGroup(updatedGroup);
    setIsEditingOption(false);
    setOptionNameEn('');
    setOptionNameAr('');
    setOptionPriceDelta('0.00');
    setOptionIsDefault(false);
  };

  const handleDeleteOption = (modId: string) => {
    if (!selectedGroup) return;
    const updatedGroup: ModifierGroup = {
      ...selectedGroup,
      modifiers: selectedGroup.modifiers.filter(m => m.id !== modId)
    };
    onSaveGroup(updatedGroup);
    setSelectedGroup(updatedGroup);
  };

  return (
    <div className="flex-1 flex gap-4 h-full p-4 overflow-hidden text-xs">
      {/* Left Groups List */}
      <div className="w-72 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
        <div className="p-3 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
          <span className="font-bold text-slate-200">{isAr ? 'مجموعات الإضافات والخيارات' : 'Modifier Groups'}</span>
          <span className="text-[10px] text-slate-400 font-mono">{modifierGroups.length} groups</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-1">
          {modifierGroups.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g)}
              className={`w-full p-3 text-left flex justify-between items-center rounded-lg transition-all ${
                selectedGroup?.id === g.id
                  ? 'bg-amber-600/20 border border-amber-500/80 text-amber-300'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div>
                <div className="font-bold text-xs">{g.nameEn}</div>
                <div className="text-[10px] text-slate-500 font-arabic">{g.nameAr}</div>
              </div>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-400">
                {g.modifiers.length} opt
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Right Options Details */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
        {selectedGroup ? (
          <>
            <div className="p-3 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-slate-100">{selectedGroup.nameEn}</h3>
                <span className="text-xs text-slate-400 font-arabic">{selectedGroup.nameAr}</span>
              </div>
              <button
                onClick={() => setIsEditingOption(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow"
              >
                <span>➕</span>
                <span>{isAr ? 'إضافة خيار جديد' : 'Add Modifier Option'}</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Option Name (EN)</th>
                    <th className="p-2.5">الاسم بالعربية</th>
                    <th className="p-2.5 text-right">Price Delta (AED)</th>
                    <th className="p-2.5 text-center">Default</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {selectedGroup.modifiers.map(m => (
                    <tr key={m.id} className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold text-slate-200">{m.nameEn}</td>
                      <td className="p-2.5 font-arabic text-slate-400">{m.nameAr}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-amber-400">
                        {m.priceDelta > 0 ? `+AED ${m.priceDelta.toFixed(2)}` : 'AED 0.00 (Free)'}
                      </td>
                      <td className="p-2.5 text-center">
                        {m.isDefault ? <span className="text-emerald-400 font-bold">✓</span> : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => handleDeleteOption(m.id)}
                          className="text-rose-400 hover:text-rose-300 px-2 py-1"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            {isAr ? 'اختر مجموعة إضافات من القائمة الجانبية' : 'Select a modifier group from the list'}
          </div>
        )}
      </div>

      {/* ADD OPTION MODAL */}
      {isEditingOption && selectedGroup && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-4 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-100 mb-3">
              {isAr ? `إضافة خيار إلى ${selectedGroup.nameEn}` : `Add Option to ${selectedGroup.nameEn}`}
            </h3>
            <form onSubmit={handleAddOption} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Option Name (English)*:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Extra Kraft Cheese"
                  value={optionNameEn}
                  onChange={e => setOptionNameEn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-300 block mb-1 font-arabic">الاسم بالعربية:</label>
                <input
                  type="text"
                  placeholder="مثال: جبن كرافت إضافي"
                  value={optionNameAr}
                  onChange={e => setOptionNameAr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-arabic"
                />
              </div>
              <div>
                <label className="text-[11px] text-amber-400 block mb-1 font-bold">Extra Price in AED (e.g. 1.50):</label>
                <input
                  type="number"
                  step="0.25"
                  value={optionPriceDelta}
                  onChange={e => setOptionPriceDelta(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-amber-400"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-def-mod"
                  checked={optionIsDefault}
                  onChange={e => setOptionIsDefault(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <label htmlFor="chk-def-mod" className="text-xs text-slate-300 cursor-pointer">
                  {isAr ? 'خيار افتراضي محدد مسبقاً' : 'Selected by default'}
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingOption(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg"
                >
                  {isAr ? 'حفظ الخيار' : 'Add Option'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
