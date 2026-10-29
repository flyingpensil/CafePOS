// ============================================================================
// TENANT, BRANCH & UAE STATUTORY TAX SETTINGS MANAGER
// ============================================================================

import React, { useState } from 'react';
import { TenantInfo, BranchInfo } from '../../types/pos';
import { UaeTaxEngine } from '../../core/compliance/uae-tax';

interface SettingsManagerProps {
  tenant: TenantInfo;
  branch: BranchInfo;
  onSaveSettings: (tenant: TenantInfo, branch: BranchInfo) => void;
  lang: 'en' | 'ar';
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  tenant,
  branch,
  onSaveSettings,
  lang
}) => {
  const isAr = lang === 'ar';

  const [legalNameEn, setLegalNameEn] = useState(tenant.legalNameEn);
  const [legalNameAr, setLegalNameAr] = useState(tenant.legalNameAr);
  const [tradeLicenseNo, setTradeLicenseNo] = useState(tenant.tradeLicenseNo);
  const [trn, setTrn] = useState(tenant.trn);

  const [branchCode, setBranchCode] = useState(branch.branchCode);
  const [branchNameEn, setBranchNameEn] = useState(branch.nameEn);
  const [branchNameAr, setBranchNameAr] = useState(branch.nameAr);
  const [emirate, setEmirate] = useState(branch.emirate);
  const [addressEn, setAddressEn] = useState(branch.addressEn);
  const [phone, setPhone] = useState(branch.phone);
  const [operationalMode, setOperationalMode] = useState(branch.operationalMode);
  const [thermalPrinterWidth, setThermalPrinterWidth] = useState(branch.thermalPrinterWidth);

  const [saveSuccess, setSaveSuccess] = useState(false);

  const trnValidation = UaeTaxEngine.validateTrn(trn);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trnValidation.isValid) {
      alert(trnValidation.error || 'Invalid UAE TRN');
      return;
    }

    const updatedTenant: TenantInfo = {
      ...tenant,
      legalNameEn: legalNameEn.trim(),
      legalNameAr: legalNameAr.trim() || legalNameEn.trim(),
      tradeLicenseNo: tradeLicenseNo.trim(),
      trn: trn.trim()
    };

    const updatedBranch: BranchInfo = {
      ...branch,
      branchCode: branchCode.trim().toUpperCase(),
      nameEn: branchNameEn.trim(),
      nameAr: branchNameAr.trim() || branchNameEn.trim(),
      emirate,
      addressEn: addressEn.trim(),
      addressAr: addressEn.trim(),
      phone: phone.trim(),
      operationalMode,
      thermalPrinterWidth
    };

    onSaveSettings(updatedTenant, updatedBranch);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto space-y-5 text-xs">
      <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="font-bold text-sm text-slate-100">
            {isAr ? 'إعدادات المنشأة والضريبة والفرع' : 'Legal Business & UAE Tax Compliance Settings'}
          </h2>
          <span className="text-[11px] text-slate-400">
            {isAr ? 'تنعكس هذه البيانات فورياً على الفواتير الضريبية ورمز الاستجابة السريع TLV' : 'Updates legal name, TRN, and printer formatting on all simplified tax invoices'}
          </span>
        </div>
        {saveSuccess && (
          <div className="px-3 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-lg font-bold flex items-center gap-1.5 animate-bounce">
            <span>✓</span>
            <span>{isAr ? 'تم حفظ التعديلات بنجاح' : 'Settings Saved & Live in POS!'}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* UAE FTA Tax & Entity Information */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <span className="text-base">🏛️</span>
            <h3 className="font-bold text-xs text-amber-400 uppercase tracking-wider">
              {isAr ? 'بيانات التسجيل الضريبي لدى الهيئة الاتحادية للضرائب (FTA)' : 'UAE Federal Tax Authority (FTA) Registration'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Tax Registration Number (TRN / الرقم الضريبي)*:
              </label>
              <input
                type="text"
                required
                maxLength={15}
                value={trn}
                onChange={e => setTrn(e.target.value)}
                className={`w-full bg-slate-950 border rounded-lg p-2 font-mono text-sm font-bold ${
                  trnValidation.isValid ? 'border-emerald-600 text-emerald-400' : 'border-rose-600 text-rose-300'
                }`}
              />
              <span className={`text-[10px] mt-1 block ${trnValidation.isValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trnValidation.isValid ? '✓ Valid 15-digit FTA TRN' : trnValidation.error}
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Trade License Number (رقم الرخصة التجارية):
              </label>
              <input
                type="text"
                value={tradeLicenseNo}
                onChange={e => setTradeLicenseNo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Legal Registered Name (English)*:
              </label>
              <input
                type="text"
                required
                value={legalNameEn}
                onChange={e => setLegalNameEn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1 font-arabic">
                الاسم القانوني المسجل (بالعربية)*:
              </label>
              <input
                type="text"
                required
                value={legalNameAr}
                onChange={e => setLegalNameAr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-arabic text-slate-100 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Branch & Hardware Configuration */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <span className="text-base">📍</span>
            <h3 className="font-bold text-xs text-blue-400 uppercase tracking-wider">
              {isAr ? 'بيانات الفرع والطابعات الحرارية' : 'Branch Details & Hardware Setup'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Branch Code:</label>
              <input
                type="text"
                required
                value={branchCode}
                onChange={e => setBranchCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 font-mono text-xs uppercase"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Branch Name (EN):</label>
              <input
                type="text"
                required
                value={branchNameEn}
                onChange={e => setBranchNameEn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1 font-arabic">اسم الفرع (بالعربية):</label>
              <input
                type="text"
                value={branchNameAr}
                onChange={e => setBranchNameAr(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-arabic"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Emirate:</label>
              <select
                value={emirate}
                onChange={e => setEmirate(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs"
              >
                <option value="Dubai">Dubai (دبي)</option>
                <option value="Abu Dhabi">Abu Dhabi (أبوظبي)</option>
                <option value="Sharjah">Sharjah (الشارقة)</option>
                <option value="Ajman">Ajman (عجمان)</option>
                <option value="RAK">Ras Al Khaimah (رأس الخيمة)</option>
                <option value="Fujairah">Fujairah (الفجيرة)</option>
                <option value="UAQ">Umm Al Quwain (أم القيوين)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Contact Telephone:</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Full Physical Address:</label>
            <input
              type="text"
              value={addressEn}
              onChange={e => setAddressEn(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Default Operational Mode:</label>
              <select
                value={operationalMode}
                onChange={e => setOperationalMode(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-bold text-amber-400"
              >
                <option value="CAFETERIA">🍔 Cafeteria / F&B Restaurant</option>
                <option value="STATIONERY">📚 Stationery / Retail Shop</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Thermal Receipt Printer Width:</label>
              <select
                value={thermalPrinterWidth}
                onChange={e => setThermalPrinterWidth(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold"
              >
                <option value="80mm">80mm Standard (48 columns ESC/POS)</option>
                <option value="58mm">58mm Compact (32 columns ESC/POS)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
          >
            <span>💾</span>
            <span>{isAr ? 'حفظ وتطبيق الإعدادات فورياً' : 'Save & Apply Live Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
