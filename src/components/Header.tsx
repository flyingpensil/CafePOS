// ============================================================================
// POS HEADER COMPONENT
// Bilingual Switcher, Operational Mode Switch, Shift Indicator, & Sync Status
// ============================================================================

import React from 'react';
import {
  OperationalMode,
  TenantInfo,
  BranchInfo,
  User,
  ShiftSession
} from '../types/pos';
import { EscPosBuilder } from '../core/hardware/escpos';

interface HeaderProps {
  tenant: TenantInfo;
  branch: BranchInfo;
  cashier: User;
  mode: OperationalMode;
  onModeChange: (mode: OperationalMode) => void;
  lang: 'en' | 'ar';
  onLangChange: (lang: 'en' | 'ar') => void;
  shift: ShiftSession | null;
  onOpenShiftModal: () => void;
  isOnline: boolean;
  pendingSyncCount: number;
  onOpenHeldModal: () => void;
  heldOrdersCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  tenant,
  branch,
  cashier,
  mode,
  onModeChange,
  lang,
  onLangChange,
  shift,
  onOpenShiftModal,
  isOnline,
  pendingSyncCount,
  onOpenHeldModal,
  heldOrdersCount
}) => {
  const isAr = lang === 'ar';

  const handleOpenCashDrawer = () => {
    // Generates ESC/POS pulse command
    const builder = new EscPosBuilder('80mm');
    builder.pulseCashDrawer(2);
    alert(isAr ? 'تم إرسال أمر فتح درج النقود (ESC p)' : 'Cash Drawer Kick command sent (ESC p pulse)');
  };

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 px-4 py-2.5 select-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding & Branch */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xl text-white shadow-inner">
            {mode === 'CAFETERIA' ? '☕' : '✒️'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight leading-none text-slate-100">
                {isAr ? tenant.legalNameAr : tenant.legalNameEn}
              </h1>
              <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded font-mono font-medium">
                TRN: {tenant.trn}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>{isAr ? branch.nameAr : branch.nameEn} ({branch.branchCode})</span>
              <span>•</span>
              <span className="text-slate-300 font-medium">VAT 5% Standard</span>
            </div>
          </div>
        </div>

        {/* Center: Mode Switcher */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => onModeChange('CAFETERIA')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === 'CAFETERIA'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <span>🍔</span>
            <span>{isAr ? 'كافتيريا ومطعم' : 'Cafeteria / F&B'}</span>
          </button>
          <button
            onClick={() => onModeChange('STATIONERY')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === 'STATIONERY'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <span>📚</span>
            <span>{isAr ? 'قرطاسية وتجزئة' : 'Stationery / Retail'}</span>
          </button>
        </div>

        {/* Right: Actions, Shift & Connectivity */}
        <div className="flex items-center gap-2.5">
          {/* Held Orders / Tabs Button */}
          <button
            onClick={onOpenHeldModal}
            className="relative px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5"
            title="Open Tabs / Held Tickets (F2)"
          >
            <span>📋</span>
            <span>{isAr ? 'الطلبات المعلقة' : 'Tabs / Hold'}</span>
            {heldOrdersCount > 0 && (
              <span className="ml-1 bg-amber-500 text-slate-900 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                {heldOrdersCount}
              </span>
            )}
          </button>

          {/* Cash Drawer Pulse */}
          <button
            onClick={handleOpenCashDrawer}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium"
            title="Open Cash Drawer (F10)"
          >
            💵 {isAr ? 'درج' : 'Drawer'}
          </button>

          {/* Shift Session */}
          <button
            onClick={onOpenShiftModal}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all ${
              shift && shift.status === 'OPEN'
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-rose-950/80 border-rose-700 text-rose-300 hover:bg-rose-900/60'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${shift && shift.status === 'OPEN' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span>
              {shift && shift.status === 'OPEN'
                ? `${isAr ? 'الوردية نشطة' : 'Shift Active'}: ${cashier.fullName}`
                : isAr ? 'فتح وردية' : 'Open Shift'}
            </span>
          </button>

          {/* Sync Status Badge */}
          <div
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 border ${
              isOnline
                ? pendingSyncCount === 0
                  ? 'bg-slate-800/80 text-emerald-400 border-slate-700'
                  : 'bg-amber-950/70 text-amber-300 border-amber-800'
                : 'bg-rose-950/80 text-rose-300 border-rose-800'
            }`}
            title={isOnline ? 'Online - Background sync active' : 'Offline - Storing orders locally'}
          >
            <span>{isOnline ? '🟢' : '🔴'}</span>
            <span>
              {!isOnline
                ? isAr ? 'أوفلاين (محلي)' : 'Offline (Local)'
                : pendingSyncCount > 0
                ? `${pendingSyncCount} ${isAr ? 'في الانتظار' : 'Pending'}`
                : isAr ? 'متصل' : 'Online'}
            </span>
          </div>

          {/* Bilingual Switcher */}
          <button
            onClick={() => onLangChange(isAr ? 'en' : 'ar')}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-bold font-mono transition-colors"
          >
            {isAr ? 'EN' : 'عربي'}
          </button>
        </div>
      </div>
    </header>
  );
};
