import { useState } from 'react';
import { UserCircle } from 'lucide-react';

interface UserLoginViewProps {
  onLoginSuccess: (name: string, phone: string) => void;
}

export function UserLoginView({ onLoginSuccess }: UserLoginViewProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!name.trim()) {
      setError('براہ کرم اپنا نام لکھیں');
      return;
    }
    setError('');
    onLoginSuccess(name.trim(), phone.trim());
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[500px] bg-gradient-to-b from-slate-50 to-emerald-50/30 p-8 gap-5">
      
      {/* Header Icon */}
      <div className="flex flex-col items-center gap-3 mb-2">
        <div className="w-16 h-16 rounded-2xl bg-emerald-700 flex items-center justify-center shadow-lg">
          <UserCircle size={36} className="text-white" />
        </div>
        <h2 className="text-emerald-900 font-urdu text-2xl font-bold">یوزر لاگ ان</h2>
        <p className="text-slate-500 font-urdu text-sm text-center">
          اپنی معلومات درج کریں
        </p>
      </div>

      {/* Form */}
      <div className="w-full max-w-xs space-y-4">
        
        {/* Name Input */}
        <div className="space-y-1.5">
          <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">
            نام <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="آپ کا نام لکھیں"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            className="w-full border border-emerald-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl px-4 py-3.5 font-urdu text-right bg-white text-slate-800 placeholder:text-slate-300 outline-none transition-all text-sm"
          />
        </div>

        {/* Phone Input */}
        <div className="space-y-1.5">
          <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">
            فون نمبر <span className="text-slate-400 font-normal">(اختیاری)</span>
          </label>
          <input
            type="tel"
            placeholder="03XX-XXXXXXX"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full border border-emerald-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-xl px-4 py-3.5 font-urdu text-right bg-white text-slate-800 placeholder:text-slate-300 outline-none transition-all text-sm"
            dir="ltr"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-right text-xs text-red-500 font-urdu">{error}</p>
        )}

        {/* Login Button */}
        <button
          onClick={handleLogin}
          className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-urdu font-bold text-base rounded-xl shadow-md transition-all mt-2"
        >
          داخل ہوں ✓
        </button>
      </div>

      {/* Privacy note */}
      <p className="text-slate-400 font-urdu text-xs text-center max-w-xs leading-relaxed mt-2">
        آپ کی معلومات صرف آپ کے ڈیوائس پر محفوظ رہے گی
      </p>
    </div>
  );
}
