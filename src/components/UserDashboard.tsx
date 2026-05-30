import { UserCircle, LogOut, ChevronRight } from 'lucide-react';

interface UserDashboardProps {
  userName: string;
  userPhone: string;
  onLogout: () => void;
  onClose: () => void;
}

export function UserDashboard({ userName, userPhone, onLogout, onClose }: UserDashboardProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 gap-6">

      {/* Profile Card */}
      <div className="w-full max-w-xs bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="bg-black p-6 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center">
            <UserCircle size={40} className="text-white" />
          </div>
          <div className="text-center">
            <h2 className="text-white font-urdu font-black text-xl">{userName}</h2>
            {userPhone && <p className="text-slate-400 text-xs font-mono mt-1">{userPhone}</p>}
          </div>
          <span className="bg-white/10 border border-white/20 text-white text-[10px] font-urdu px-3 py-1 rounded-full">
            ✓ لاگ ان ہیں
          </span>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-800 font-urdu font-semibold text-sm">{userName}</span>
            <span className="text-slate-400 text-xs font-urdu">نام</span>
          </div>
          {userPhone && (
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-800 font-mono text-sm">{userPhone}</span>
              <span className="text-slate-400 text-xs font-urdu">فون</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2">
            <span className="text-emerald-700 font-urdu font-semibold text-sm">عام صارف</span>
            <span className="text-slate-400 text-xs font-urdu">نوعیت</span>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <button
        onClick={onClose}
        className="w-full max-w-xs py-3.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-urdu font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
      >
        ← ایپ پر واپس جائیں
      </button>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full max-w-xs py-3.5 bg-red-50 hover:bg-red-100 active:scale-95 border border-red-200 text-red-600 font-urdu font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
      >
        <LogOut size={16} />
        لاگ آؤٹ
      </button>
    </div>
  );
}
