import { UserCircle } from 'lucide-react';

interface LoginChoiceViewProps {
  onImamLogin: () => void;
  onUserLogin: () => void;
}

export function LoginChoiceView({ onImamLogin, onUserLogin }: LoginChoiceViewProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[500px] bg-gradient-to-b from-[#0c2f21] via-[#0e3825] to-[#10402b] p-8 gap-6">
      
      {/* Logo / Icon */}
      <div className="flex flex-col items-center gap-3 mb-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-800/60 border border-emerald-600/40 flex items-center justify-center shadow-xl">
          <svg className="w-9 h-9 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18" />
            <path d="M12 2v3M12 5C8.5 5 6 7.5 6 11v10h12V11c0-3.5-2.5-6-6-6z" />
            <path d="M9 14h6v7H9z" />
          </svg>
        </div>
        <h2 className="text-white font-urdu text-2xl font-bold text-center">لاگ ان کریں</h2>
        <p className="text-emerald-400 font-urdu text-sm text-center leading-relaxed">
          اپنی نوعیت منتخب کریں
        </p>
      </div>

      {/* Divider */}
      <div className="w-full max-w-xs border-t border-emerald-800/50"></div>

      {/* Imam Login Button */}
      <button
        onClick={onImamLogin}
        className="w-full max-w-xs py-5 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-zinc-900 font-urdu font-black text-base rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all border border-amber-400/50"
      >
        <span className="text-2xl">🕌</span>
        <span>امام لاگ ان</span>
      </button>

      {/* User Login Button */}
      <button
        onClick={onUserLogin}
        className="w-full max-w-xs py-5 px-6 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:scale-95 text-white font-urdu font-black text-base rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all border border-emerald-500/50"
      >
        <UserCircle size={24} className="shrink-0" />
        <span>یوزر لاگ ان</span>
      </button>

      {/* Info text */}
      <p className="text-emerald-600 font-urdu text-xs text-center max-w-xs leading-relaxed mt-2">
        امام صرف مسجد انتظامیہ کے لیے ہے۔ عام صارفین یوزر لاگ ان استعمال کریں۔
      </p>
    </div>
  );
}
