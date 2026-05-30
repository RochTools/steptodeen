import { useState } from 'react';
import { UserCircle, LogIn } from 'lucide-react';

interface LoginChoiceViewProps {
  onImamLogin: (email: string, password: string) => void;
  onUserLogin: (name: string, phone: string) => void;
  imamError?: string;
}

export function LoginChoiceView({ onImamLogin, onUserLogin, imamError }: LoginChoiceViewProps) {
  const [mode, setMode] = useState<'choice' | 'imam' | 'user'>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [userError, setUserError] = useState('');

  // ── Choice Screen ────────────────────────────────────────────────────────────
  if (mode === 'choice') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 gap-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-2">
          <div className="w-20 h-20 rounded-3xl bg-emerald-700 flex items-center justify-center shadow-xl">
            <svg className="w-11 h-11 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" />
              <path d="M12 2v3M12 5C8.5 5 6 7.5 6 11v10h12V11c0-3.5-2.5-6-6-6z" />
              <path d="M9 14h6v7H9z" />
            </svg>
          </div>
          <h1 className="text-black font-urdu text-3xl font-black tracking-tight">StepToDeen</h1>
          <p className="text-slate-500 font-urdu text-sm text-center">اسلامی راہنمائی کا ڈیجیٹل ساتھی</p>
        </div>

        {/* Divider */}
        <div className="w-full max-w-xs">
          <div className="border-t border-slate-200 relative">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white px-3 text-slate-400 text-xs font-urdu">
              لاگ ان کریں
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full max-w-xs space-y-4">
          {/* Imam */}
          <button
            onClick={() => setMode('imam')}
            className="w-full py-4 px-6 bg-black hover:bg-slate-800 active:scale-95 text-white font-urdu font-black text-base rounded-2xl flex items-center justify-between shadow-md transition-all"
          >
            <span className="text-2xl">🕌</span>
            <span>امام لاگ ان</span>
            <span className="text-slate-400 text-sm">←</span>
          </button>

          {/* User */}
          <button
            onClick={() => setMode('user')}
            className="w-full py-4 px-6 bg-white hover:bg-slate-50 active:scale-95 text-black font-urdu font-black text-base rounded-2xl flex items-center justify-between shadow-sm border-2 border-slate-200 transition-all"
          >
            <UserCircle size={24} className="text-slate-600 shrink-0" />
            <span>یوزر لاگ ان</span>
            <span className="text-slate-400 text-sm">←</span>
          </button>
        </div>

        <p className="text-slate-400 font-urdu text-xs text-center max-w-xs">
          امام صرف مسجد انتظامیہ کے لیے ہے
        </p>
      </div>
    );
  }

  // ── Imam Login Screen ────────────────────────────────────────────────────────
  if (mode === 'imam') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 gap-6">

        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center shadow-lg">
            <span className="text-3xl">🕌</span>
          </div>
          <h2 className="text-black font-urdu text-2xl font-black">امام لاگ ان</h2>
          <p className="text-slate-500 font-urdu text-xs">مسجد انتظامیہ کے لیے</p>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <div className="space-y-1.5">
            <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">ای میل</label>
            <input
              type="email"
              placeholder="imam@mosque.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">پاسورڈ</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm"
              dir="ltr"
            />
          </div>

          {imamError && (
            <p className="text-right text-xs text-red-500 font-urdu bg-red-50 p-2 rounded-lg">{imamError}</p>
          )}

          <button
            onClick={() => onImamLogin(email, password)}
            disabled={!email || !password}
            className="w-full py-4 bg-black hover:bg-slate-800 active:scale-95 text-white font-urdu font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40"
          >
            لاگ ان کریں
          </button>

          <button onClick={() => setMode('choice')} className="w-full text-center text-slate-400 font-urdu text-sm hover:text-slate-600 transition-colors">
            ← واپس جائیں
          </button>
        </div>
      </div>
    );
  }

  // ── User Login Screen ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 gap-6">

      <div className="flex flex-col items-center gap-2 mb-2">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center shadow-sm">
          <UserCircle size={38} className="text-slate-700" />
        </div>
        <h2 className="text-black font-urdu text-2xl font-black">یوزر لاگ ان</h2>
        <p className="text-slate-500 font-urdu text-xs">عام صارفین کے لیے</p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        <div className="space-y-1.5">
          <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">
            نام <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="آپ کا نام"
            value={name}
            onChange={e => { setName(e.target.value); setUserError(''); }}
            className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 font-urdu text-right text-black placeholder:text-slate-300 outline-none transition-all text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">
            فون نمبر <span className="text-slate-400 font-normal">(اختیاری)</span>
          </label>
          <input
            type="tel"
            placeholder="03XX-XXXXXXX"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm"
            dir="ltr"
          />
        </div>

        {userError && (
          <p className="text-right text-xs text-red-500 font-urdu">{userError}</p>
        )}

        <button
          onClick={() => {
            if (!name.trim()) { setUserError('براہ کرم اپنا نام لکھیں'); return; }
            onUserLogin(name.trim(), phone.trim());
          }}
          className="w-full py-4 bg-black hover:bg-slate-800 active:scale-95 text-white font-urdu font-bold text-base rounded-xl shadow-md transition-all"
        >
          داخل ہوں ✓
        </button>

        <button onClick={() => setMode('choice')} className="w-full text-center text-slate-400 font-urdu text-sm hover:text-slate-600 transition-colors">
          ← واپس جائیں
        </button>
      </div>

      <p className="text-slate-300 font-urdu text-xs text-center max-w-xs">
        آپ کی معلومات صرف آپ کے ڈیوائس پر محفوظ رہے گی
      </p>
    </div>
  );
}
