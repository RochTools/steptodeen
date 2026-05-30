import { useState, useRef } from 'react';
import { LogOut, Camera, User, Heart, MapPin } from 'lucide-react';
import { Mosque } from '../types';

interface UserDashboardProps {
  userName: string;
  userPhone: string;
  onLogout: () => void;
  onClose: () => void;
  onOpenMosque: (mosque: Mosque) => void;
}

export function UserDashboard({ userName, onLogout, onClose, onOpenMosque }: UserDashboardProps) {
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    return localStorage.getItem('user_profile_image') || null;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── تسبیح ڈیٹا ─────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const tasbihHistory = (() => {
    try { return JSON.parse(localStorage.getItem('tasbih_history_v4') || '{}'); } catch { return {}; }
  })();

  const tasbihToday = tasbihHistory[today] || 0;
  const tasbihYesterday = tasbihHistory[yesterday] || 0;
  const tasbihTotal = Object.values(tasbihHistory).reduce((s: number, v) => s + Number(v), 0);

  const dhikrList = (() => {
    try {
      const saved = localStorage.getItem('tasbih_dhikr_list_v4');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  })();

  const [showAllDhikr, setShowAllDhikr] = useState(false);

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
      </div>

      <div className="w-full border-t border-slate-100"></div>

      {/* ── تسبیح ڈیٹا ── */}
      <div className="w-full">
        <h3 className="text-right text-slate-700 font-urdu font-bold text-sm mb-3">📿 تسبیح کاؤنٹر</h3>

        {/* آج / کل / کل */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-emerald-700">{tasbihToday.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-600 font-urdu mt-0.5">آج</p>
          </div>
          <div className="flex-1 bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-amber-700">{tasbihYesterday.toLocaleString()}</p>
            <p className="text-[10px] text-amber-600 font-urdu mt-0.5">کل</p>
          </div>
          <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-slate-700">{Number(tasbihTotal).toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 font-urdu mt-0.5">مجموعی</p>
          </div>
        </div>

        {/* ہر ذکر کی گنتی */}
        {dhikrList.length > 0 && (
          <div className="space-y-2">
            {(showAllDhikr ? dhikrList : dhikrList.slice(0, 3)).map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                <span className="text-emerald-700 font-black text-sm">{d.savedProgress || 0} <span className="text-slate-400 font-normal text-[10px]">بار</span></span>
                <div className="text-right">
                  <p className="text-slate-800 font-urdu text-xs font-bold">{d.ur}</p>
                  <p className="text-slate-400 text-[10px]">{d.en}</p>
                </div>
              </div>
            ))}
            {dhikrList.length > 3 && (
              <button
                onClick={() => setShowAllDhikr(!showAllDhikr)}
                className="w-full py-2 text-emerald-700 font-urdu text-xs font-bold border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-all"
              >
                {showAllDhikr ? '← کم دکھائیں' : `مزید دیکھیں (${dhikrList.length - 3}+)`}
              </button>
            )}
          </div>
        )}
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
              <div key={mosque.id} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
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
                <button
                  onClick={() => { onOpenMosque(mosque); onClose(); }}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-urdu text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all"
                >
                  <MapPin size={12} />
                  اوقات دیکھیں
                </button>
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
