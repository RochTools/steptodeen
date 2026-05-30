import { UserCircle, LogOut } from 'lucide-react';

interface UserDashboardProps {
  userName: string;
  userPhone: string;
  onLogout: () => void;
}

export function UserDashboard({ userName, userPhone, onLogout }: UserDashboardProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[500px] bg-gradient-to-b from-slate-50 to-emerald-50/30 p-8 gap-6">

      {/* Profile Card */}
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-md border border-emerald-100 overflow-hidden">
        
        {/* Card Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-800 p-6 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center">
            <UserCircle size={40} className="text-white" />
          </div>
          <div className="text-center">
            <h2 className="text-white font-urdu font-bold text-xl">{userName}</h2>
            {userPhone && (
              <p className="text-emerald-200 text-xs font-mono mt-1">{userPhone}</p>
            )}
          </div>
          <span className="bg-emerald-600/60 border border-emerald-400/40 text-emerald-100 text-[10px] font-urdu px-3 py-1 rounded-full">
            ✓ لاگ ان ہیں
          </span>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-slate-500 text-xs font-urdu">نام</span>
            <span className="text-slate-800 font-urdu font-semibold text-sm">{userName}</span>
          </div>
          {userPhone && (
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 text-xs font-urdu">فون</span>
              <span className="text-slate-800 font-mono text-sm">{userPhone}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2">
            <span className="text-slate-500 text-xs font-urdu">نوعیت</span>
            <span className="text-emerald-700 font-urdu font-semibold text-sm">عام صارف</span>
          </div>
        </div>
      </div>

      {/* Logout Button */}
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
