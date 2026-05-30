import { useState, useRef } from 'react';
import { LogOut, Camera, User, Heart, RefreshCw } from 'lucide-react';
import { Mosque } from '../types';

interface UserDashboardProps {
  userName: string;
  userPhone: string;
  onLogout: () => void;
  onClose: () => void;
}

export function UserDashboard({ userName, onLogout, onClose }: UserDashboardProps) {
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    return localStorage.getItem('user_profile_image') || null;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── تسبیح ڈیٹا ─────────────────────────────────────────────
  const tasbihToday = (() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const history = JSON.parse(localStorage.getItem('tasbih_history_v4') || '{}');
      return history[today] || 0;
    } catch { return 0; }
  })();

  const tasbihTotal = (() => {
    try {
      const history = JSON.parse(localStorage.getItem('tasbih_history_v4') || '{}');
      return Object.values(history).reduce((s: number, v) => s + Number(v), 0);
    } catch { return 0; }
  })();

  // ── محفوظ مساجد ─────────────────────────────────────────────
  const [savedMosques, setSavedMosques] = useState<Mosque[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('user_saved_mosques') || '[]');
    } catch { return []; }
  });

  const handleRemoveMosque = (id: string) => {
    const updated = savedMosques.filter(m => m.id !== id);
    setSavedMosques(updated);
    localStorage.setItem('user_saved_mosques', JSON.stringify(updated));
    // sync with MosqueFinderView map
    const mosqueMap = JSON.parse(localStorage.getItem('user_saved_mosques_map') || '{}');
    delete mosqueMap[id];
    localStorage.setItem('user_saved_mosques_map', JSON.stringify(mosqueMap));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setProfileImage(result);
      localStorage.setItem('user_profile_image', result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 pt-10 gap-5 pb-8">

      {/* Top Row: profile + logout */}
      <div className="w-full flex items-start justify-center relative">

        {/* Logout - top right */}
        <button
          onClick={onLogout}
          className="absolute right-0 top-0 flex items-center gap-1 px-2.5 py-1.5 bg-red-50 border border-red-200 text-red-500 font-urdu text-xs rounded-lg active:scale-95 transition-all"
        >
          <LogOut size={12} />
          لاگ آؤٹ
        </button>

        {/* Profile Picture */}
        <div className="relative">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
          >
            {profileImage ? (
              <img src={profileImage} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <User size={44} className="text-slate-400" />
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-700 rounded-full flex items-center justify-center border-2 border-white shadow"
          >
            <Camera size={13} className="text-white" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </div>
      </div>

      {/* Name */}
      <div className="text-center -mt-1">
        <h2 className="text-black font-urdu text-2xl font-black">{userName}</h2>
        <p className="text-slate-400 font-urdu text-xs mt-0.5">عام صارف</p>
      </div>

      <div className="w-full border-t border-slate-100"></div>

      {/* ── تسبیح ڈیٹا ── */}
      <div className="w-full">
        <h3 className="text-right text-slate-700 font-urdu font-bold text-sm mb-3">📿 تسبیح کاؤنٹر</h3>
        <div className="flex gap-3">
          <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-700">{tasbihToday.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-600 font-urdu mt-1">آج کی گنتی</p>
          </div>
          <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-slate-700">{tasbihTotal.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 font-urdu mt-1">کل گنتی</p>
          </div>
        </div>
      </div>

      <div className="w-full border-t border-slate-100"></div>

      {/* ── محفوظ مساجد ── */}
      <div className="w-full">
        <h3 className="text-right text-slate-700 font-urdu font-bold text-sm mb-3">
          ❤️ محفوظ مساجد
          <span className="text-slate-400 font-normal text-xs mr-1">({savedMosques.length})</span>
        </h3>

        {savedMosques.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100">
            <Heart size={24} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 font-urdu text-xs">ابھی کوئی مسجد محفوظ نہیں</p>
            <p className="text-slate-300 font-urdu text-[10px] mt-1">مساجد کے پاس ❤️ دبائیں</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedMosques.map(mosque => (
              <div key={mosque.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                <button
                  onClick={() => handleRemoveMosque(mosque.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                >
                  <Heart size={14} className="fill-red-400" />
                </button>
                <div className="text-right flex-1 pr-2">
                  <p className="text-slate-800 font-urdu text-sm font-bold">{mosque.name}</p>
                  {mosque.address && (
                    <p className="text-slate-400 font-urdu text-[10px] mt-0.5">{mosque.address}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full border-t border-slate-100"></div>

      {/* Future placeholders */}
      <div className="w-full space-y-2 opacity-40">
        <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
          <span className="text-[10px] text-slate-400 font-urdu">جلد آ رہا ہے</span>
          <span className="text-slate-500 font-urdu text-sm">📖 آخری پڑھی سورت</span>
        </div>
      </div>

      {/* Back */}
      <button
        onClick={onClose}
        className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-urdu font-bold text-sm rounded-xl transition-all"
      >
        ← ایپ پر واپس جائیں
      </button>

    </div>
  );
}
