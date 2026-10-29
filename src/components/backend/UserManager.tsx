// ============================================================================
// STAFF USERS & CASHIER PIN MANAGEMENT COMPONENT
// ============================================================================

import React, { useState } from 'react';
import { User, UserRole } from '../../types/pos';

interface UserManagerProps {
  users: User[];
  onSaveUser: (user: User) => void;
  lang: 'en' | 'ar';
}

export const UserManager: React.FC<UserManagerProps> = ({
  users,
  onSaveUser,
  lang
}) => {
  const isAr = lang === 'ar';
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [canApplyDiscount, setCanApplyDiscount] = useState(false);
  const [canVoidItem, setCanVoidItem] = useState(false);
  const [canOpenDrawerManual, setCanOpenDrawerManual] = useState(false);

  const handleEditClick = (u: User) => {
    setEditingUser(u);
    setPin(u.pin);
    setCanApplyDiscount(u.canApplyDiscount);
    setCanVoidItem(u.canVoidItem);
    setCanOpenDrawerManual(u.canOpenDrawerManual);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!/^\d{4,6}$/.test(pin)) {
      alert(isAr ? 'رمز PIN يجب أن يتكون من 4 إلى 6 أرقام' : 'PIN must be 4 to 6 numeric digits.');
      return;
    }

    const updated: User = {
      ...editingUser,
      pin,
      canApplyDiscount,
      canVoidItem,
      canOpenDrawerManual
    };

    onSaveUser(updated);
    setEditingUser(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full p-4 space-y-4 overflow-hidden text-xs">
      <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
        <h2 className="font-bold text-sm text-slate-100">
          {isAr ? 'إدارة طاقم الكاشير وصلاحيات المشرفين' : 'Cashiers & Staff User Roles & Permissions'}
        </h2>
        <span className="text-[11px] text-slate-400">
          {isAr ? 'إعداد رموز الدخول السري (PIN) وتحديد صلاحيات الخصم وإلغاء الطلبات' : 'Configure fast 4-digit login PINs and supervisor discount override authorizations'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl">
        <table className="w-full text-left">
          <thead className="bg-slate-850 text-slate-400 font-mono text-[11px] border-b border-slate-800">
            <tr>
              <th className="p-3">Username</th>
              <th className="p-3">Full Name</th>
              <th className="p-3">Role</th>
              <th className="p-3 text-center">Fast Login PIN</th>
              <th className="p-3 text-center">Discount Override</th>
              <th className="p-3 text-center">Void Item</th>
              <th className="p-3 text-center">Manual Drawer</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-800/40">
                <td className="p-3 font-mono font-bold text-amber-400">{u.username}</td>
                <td className="p-3 font-bold text-slate-100">{u.fullName}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    u.role === 'ADMIN'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800'
                      : u.role === 'SUPERVISOR'
                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-3 text-center font-mono font-bold tracking-widest text-emerald-400">
                  ••••
                </td>
                <td className="p-3 text-center">
                  {u.canApplyDiscount ? <span className="text-emerald-400 font-bold">✓ Yes</span> : <span className="text-slate-600">—</span>}
                </td>
                <td className="p-3 text-center">
                  {u.canVoidItem ? <span className="text-emerald-400 font-bold">✓ Yes</span> : <span className="text-slate-600">—</span>}
                </td>
                <td className="p-3 text-center">
                  {u.canOpenDrawerManual ? <span className="text-emerald-400 font-bold">✓ Yes</span> : <span className="text-slate-600">—</span>}
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => handleEditClick(u)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-medium"
                  >
                    ✏️ {isAr ? 'تعديل PIN' : 'Edit PIN / Perms'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-4 shadow-2xl">
            <h3 className="font-bold text-sm text-slate-100 mb-3">
              {isAr ? `تعديل المستخدم: ${editingUser.fullName}` : `Edit User: ${editingUser.fullName}`}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">4-6 Digit Fast Login PIN*:</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-center text-xl font-mono tracking-widest text-emerald-400 font-bold"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">Supervisor Authorization Flags:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-disc"
                    checked={canApplyDiscount}
                    onChange={e => setCanApplyDiscount(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <label htmlFor="chk-disc" className="text-slate-200">Can Apply Discounts / Price Override</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-void"
                    checked={canVoidItem}
                    onChange={e => setCanVoidItem(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <label htmlFor="chk-void" className="text-slate-200">Can Void / Cancel Bill Items</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk-drawer"
                    checked={canOpenDrawerManual}
                    onChange={e => setCanOpenDrawerManual(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <label htmlFor="chk-drawer" className="text-slate-200">Can Manually Pop Cash Drawer (No Sale)</label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg"
                >
                  {isAr ? 'حفظ الصلاحيات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
