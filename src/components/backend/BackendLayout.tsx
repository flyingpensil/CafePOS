// ============================================================================
// BACKEND MANAGEMENT CONSOLE LAYOUT & NAVIGATION
// Allows store owners to update all POS details, settings, and manage CSV imports.
// ============================================================================

import React, { useState } from 'react';
import {
  TenantInfo,
  BranchInfo,
  Product,
  Category,
  ModifierGroup,
  QuickServiceItem,
  User,
  SalesInvoice
} from '../../types/pos';
import { ProductManager } from './ProductManager';
import { ModifierManager } from './ModifierManager';
import { ServiceManager } from './ServiceManager';
import { SettingsManager } from './SettingsManager';
import { UserManager } from './UserManager';
import { ReportsManager } from './ReportsManager';

export type BackendTab =
  | 'PRODUCTS'
  | 'MODIFIERS'
  | 'SERVICES'
  | 'SETTINGS'
  | 'USERS'
  | 'REPORTS';

interface BackendLayoutProps {
  tenant: TenantInfo;
  branch: BranchInfo;
  products: Product[];
  categories: Category[];
  modifierGroups: ModifierGroup[];
  services: QuickServiceItem[];
  users: User[];
  invoices: SalesInvoice[];
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onBulkImportProducts: (newProducts: Product[]) => void;
  onSaveModifierGroup: (group: ModifierGroup) => void;
  onDeleteModifierGroup: (groupId: string) => void;
  onSaveService: (service: QuickServiceItem) => void;
  onDeleteService: (serviceId: string) => void;
  onSaveSettings: (tenant: TenantInfo, branch: BranchInfo) => void;
  onSaveUser: (user: User) => void;
  onSwitchToPos: () => void;
  lang: 'en' | 'ar';
  onLangChange: (lang: 'en' | 'ar') => void;
}

export const BackendLayout: React.FC<BackendLayoutProps> = ({
  tenant,
  branch,
  products,
  categories,
  modifierGroups,
  services,
  users,
  invoices,
  onSaveProduct,
  onDeleteProduct,
  onBulkImportProducts,
  onSaveModifierGroup,
  onDeleteModifierGroup,
  onSaveService,
  onDeleteService,
  onSaveSettings,
  onSaveUser,
  onSwitchToPos,
  lang,
  onLangChange
}) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<BackendTab>('PRODUCTS');

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center font-bold text-xl text-white shadow-inner">
            ⚙️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base text-slate-100">
                {isAr ? 'لوحة تحكم إدارة النظام' : 'Enterprise Admin & Management Console'}
              </h1>
              <span className="text-xs bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded font-mono font-medium">
                TRN: {tenant.trn}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              <span>{isAr ? tenant.legalNameAr : tenant.legalNameEn}</span>
              <span> • </span>
              <span className="text-emerald-400 font-medium">{isAr ? branch.nameAr : branch.nameEn}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onSwitchToPos}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-950/60 flex items-center gap-2 transition-all active:scale-95"
            title="Switch to Cashier Point of Sale Terminal"
          >
            <span>🖥️</span>
            <span>{isAr ? 'فتح شاشة الكاشير (POS)' : 'Open POS Terminal'}</span>
          </button>

          <button
            onClick={() => onLangChange(isAr ? 'en' : 'ar')}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-bold font-mono transition-colors"
          >
            {isAr ? 'EN' : 'عربي'}
          </button>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-3 select-none">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1.5">
              {isAr ? 'القائمة الرئيسية' : 'Management Modules'}
            </div>

            <button
              onClick={() => setActiveTab('PRODUCTS')}
              className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'PRODUCTS'
                  ? 'bg-amber-600 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>📦</span>
              <span>{isAr ? 'المنتجات والمخزون' : 'Products & Catalog'}</span>
              <span className="ml-auto text-[10px] bg-slate-950/60 px-1.5 py-0.2 rounded font-mono">
                {products.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('MODIFIERS')}
              className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'MODIFIERS'
                  ? 'bg-amber-600 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>🍔</span>
              <span>{isAr ? 'إضافات الكافتيريا (Modifiers)' : 'Cafeteria Modifiers'}</span>
              <span className="ml-auto text-[10px] bg-slate-950/60 px-1.5 py-0.2 rounded font-mono">
                {modifierGroups.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('SERVICES')}
              className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'SERVICES'
                  ? 'bg-amber-600 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>🖨️</span>
              <span>{isAr ? 'خدمات التصوير والطباعة' : 'Copy & Print Services'}</span>
              <span className="ml-auto text-[10px] bg-slate-950/60 px-1.5 py-0.2 rounded font-mono">
                {services.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('REPORTS')}
              className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'REPORTS'
                  ? 'bg-amber-600 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>📊</span>
              <span>{isAr ? 'تقارير المبيعات والضريبة' : 'Sales & Tax Reports'}</span>
              <span className="ml-auto text-[10px] bg-slate-950/60 px-1.5 py-0.2 rounded font-mono">
                {invoices.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('USERS')}
              className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'USERS'
                  ? 'bg-amber-600 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>👥</span>
              <span>{isAr ? 'الكاشير والمشرفين (PIN)' : 'Staff & Cashier PINs'}</span>
              <span className="ml-auto text-[10px] bg-slate-950/60 px-1.5 py-0.2 rounded font-mono">
                {users.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all text-left ${
                activeTab === 'SETTINGS'
                  ? 'bg-amber-600 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>🏛️</span>
              <span>{isAr ? 'الرقم الضريبي وإعدادات المتجر' : 'Tax & Store Setup'}</span>
            </button>
          </div>

          {/* Bottom Info */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-[11px] text-slate-400">
            <div className="font-bold text-slate-300">UAE POS Engine v2.0</div>
            <div>VAT: 5% Standard (FTA)</div>
            <div className="text-[10px] text-emerald-400">● Local IndexedDB Active</div>
          </div>
        </aside>

        {/* Main Workspace Content */}
        <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {activeTab === 'PRODUCTS' && (
            <ProductManager
              products={products}
              categories={categories}
              onSaveProduct={onSaveProduct}
              onDeleteProduct={onDeleteProduct}
              onBulkImportProducts={onBulkImportProducts}
              lang={lang}
            />
          )}

          {activeTab === 'MODIFIERS' && (
            <ModifierManager
              modifierGroups={modifierGroups}
              onSaveGroup={onSaveModifierGroup}
              onDeleteGroup={onDeleteModifierGroup}
              lang={lang}
            />
          )}

          {activeTab === 'SERVICES' && (
            <ServiceManager
              services={services}
              onSaveService={onSaveService}
              onDeleteService={onDeleteService}
              lang={lang}
            />
          )}

          {activeTab === 'SETTINGS' && (
            <SettingsManager
              tenant={tenant}
              branch={branch}
              onSaveSettings={onSaveSettings}
              lang={lang}
            />
          )}

          {activeTab === 'USERS' && (
            <UserManager
              users={users}
              onSaveUser={onSaveUser}
              lang={lang}
            />
          )}

          {activeTab === 'REPORTS' && (
            <ReportsManager
              invoices={invoices}
              lang={lang}
            />
          )}
        </main>
      </div>
    </div>
  );
};
