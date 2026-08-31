import { useState, useRef, useEffect } from 'react';
import { Camera, User, Heart, MapPin, LogIn, LayoutDashboard, LogOut, Bookmark } from 'lucide-react';
import { Mosque } from '../types';

interface UserDashboardProps {
  userName: string;
  onClose: () => void;
  onOpenMosque: (mosque: Mosque) => void;
  onGoToSavedHadith?: (bookKey: string, chapterKey: string, chapterName: string, from: number, to: number, hadithNum: number) => void;
  onImamLogin: () => void;
  onImamDashboard: () => void;
  isImamLoggedIn: boolean;
  onImamLogout: () => void;
}

// Last seen hadith interface
interface LastSeenHadith {
  bookKey: string;
  bookName: string;
  chapterKey: string;
  chapterName: string;
  hadithNum: number;
  from: number;
  to: number;
  savedAt: number;
}

export function UserDashboard({ userName, onClose, onOpenMosque, onGoToSavedHadith, onImamLogin, onImamDashboard, isImamLoggedIn, onImamLogout }: UserDashboardProps) {
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    return localStorage.getItem('user_profile_image') || null;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAllDhikr, setShowAllDhikr] = useState(false);

  // ── Last Seen Hadith ─────────────────────────────────────────────
  const [lastSeenHadith, setLastSeenHadith] = useState<LastSeenHadith | null>(() => {
    try { 
      const data = localStorage.getItem('user_last_seen_hadith');
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  });

  // Listen for changes to last seen hadith from other components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_last_seen_hadith') {
        try {
          const data = e.newValue ? JSON.parse(e.newValue) : null;
          setLastSeenHadith(data);
        } catch {
          setLastSeenHadith(null);
        }
      }
    };

    // Also listen for custom events from the hadith viewer
    const handleCustomEvent = (e: CustomEvent) => {
      if (e.detail?.type === 'lastSeenHadithUpdated') {
        try {
          const data = localStorage.getItem('user_last_seen_hadith');
          setLastSeenHadith(data ? JSON.parse(data) : null);
        } catch {
          setLastSeenHadith(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('lastSeenHadithUpdated', handleCustomEvent as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('lastSeenHadithUpdated', handleCustomEvent as EventListener);
    };
  }, []);

  // ── Tasbih Data ─────────────────────────────────────────────
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

  // ── Saved Hadiths ─────────────────────────────────────────────
  const [savedHadiths, setSavedHadiths] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('user_saved_hadiths') || '[]'); } catch { return []; }
  });

  // Listen for saved hadith updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_saved_hadiths') {
        try {
          const data = e.newValue ? JSON.parse(e.newValue) : [];
          setSavedHadiths(data);
        } catch {
          setSavedHadiths([]);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleRemoveHadith = (num: any, book: string) => {
    const updated = savedHadiths.filter(h => !(h.num === num && h.book === book));
    setSavedHadiths(updated);
    localStorage.setItem('user_saved_hadiths', JSON.stringify(updated));
  };

  // ── Saved Mosques ─────────────────────────────────────────────
  const [savedMosques, setSavedMosques] = useState<any[]>(() => {
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

  // Format time ago
  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 pt-10 gap-6 pb-8">

      {/* Top Row: profile + imam button */}
      <div className="w-full flex items-start justify-center relative">

        {/* Imam Login / Dashboard - top right */}
        {isImamLoggedIn ? (
          <div className="absolute right-0 top-0 flex flex-col items-end gap-1">
            <button
              onClick={onImamDashboard}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg active:scale-95 hover:bg-emerald-100 transition-all"
            >
              <LayoutDashboard size={12} />
              Imam Panel
            </button>
            <button
              onClick={onImamLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 border border-red-200 text-red-500 text-xs font-bold rounded-lg active:scale-95 hover:bg-red-100 transition-all"
            >
              <LogOut size={12} />
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={onImamLogin}
            className="absolute right-0 top-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-lg active:scale-95 hover:bg-blue-100 transition-all"
          >
            <LogIn size={12} />
            Imam Login
          </button>
        )}

        {/* Profile Picture */}
        <div className="relative">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
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
        <h2 className="text-black text-2xl font-bold">{userName}</h2>
      </div>

      <div className="w-full border-t border-slate-200"></div>

      {/* ── Tasbih Counter ── */}
      <div className="w-full">
        <h3 className="text-right text-slate-700 font-bold text-sm mb-3">📿 Tasbih Counter</h3>

        {/* Today / Yesterday / Total */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-emerald-700">{tasbihToday.toLocaleString()}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Today</p>
          </div>
          <div className="flex-1 bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-amber-700">{tasbihYesterday.toLocaleString()}</p>
            <p className="text-[10px] text-amber-600 mt-0.5">Yesterday</p>
          </div>
          <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
            <p className="text-xl font-black text-slate-700">{Number(tasbihTotal).toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Total</p>
          </div>
        </div>

        {/* Each Dhikr Count */}
        {dhikrList.length > 0 && (
          <div className="space-y-2">
            {(showAllDhikr ? dhikrList : dhikrList.slice(0, 3)).map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                <span className="text-emerald-700 font-black text-sm">{d.savedProgress || 0} <span className="text-slate-400 font-normal text-[10px]">times</span></span>
                <div className="text-right">
                  <p className="text-slate-800 text-xs font-bold">{d.ur}</p>
                  <p className="text-slate-400 text-[10px]">{d.en}</p>
                </div>
              </div>
            ))}
            {dhikrList.length > 3 && (
              <button
                onClick={() => setShowAllDhikr(!showAllDhikr)}
                className="w-full py-2 text-emerald-700 text-xs font-bold border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-all"
              >
                {showAllDhikr ? '← Show less' : `Show more (${dhikrList.length - 3}+)`}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="w-full border-t border-slate-200"></div>

      {/* ── Last Seen Hadith ── */}
      <div className="w-full">
        <h3 className="text-right text-slate-700 font-bold text-sm mb-3">
          📖 Last Viewed Hadith
        </h3>

        {lastSeenHadith && onGoToSavedHadith ? (
          <div
            onClick={() => {
              onGoToSavedHadith(
                lastSeenHadith.bookKey,
                lastSeenHadith.chapterKey,
                lastSeenHadith.chapterName,
                lastSeenHadith.from || 0,
                lastSeenHadith.to || 0,
                lastSeenHadith.hadithNum
              );
            }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-3 cursor-pointer active:scale-95 hover:bg-amber-100 transition-all"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] text-amber-600 border border-amber-200 bg-amber-100 px-1.5 py-0.5 rounded-lg">← Open</span>
              <div className="text-right">
                <span className="text-[10px] text-amber-700 font-bold">{lastSeenHadith.bookName}</span>
                <span className="text-[10px] text-amber-500 font-mono ml-1"> #{lastSeenHadith.hadithNum}</span>
              </div>
            </div>
            <p className="text-[10px] text-amber-600 text-right">⭐ Last viewed hadith</p>
            <p className="text-[10px] text-amber-500 text-right mt-0.5">{lastSeenHadith.chapterName}</p>
            <p className="text-[9px] text-amber-400 text-right mt-1">
              {getTimeAgo(lastSeenHadith.savedAt)}
            </p>
          </div>
        ) : (
          <div className="text-center py-5 bg-slate-50 rounded-2xl border border-slate-100">
            <Bookmark size={24} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-xs">No hadith viewed yet</p>
            <p className="text-slate-300 text-[10px] mt-1">Your last viewed hadith will appear here</p>
          </div>
        )}
      </div>

      <div className="w-full border-t border-slate-200"></div>

      {/* ── Saved Hadiths ── */}
      <div className="w-full">
        <h3 className="text-right text-slate-700 font-bold text-sm mb-3">
          📚 Saved Hadiths
          <span className="text-slate-400 font-normal text-xs ml-1">({savedHadiths.length})</span>
        </h3>

        {savedHadiths.length === 0 ? (
          <div className="text-center py-5 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-slate-400 text-xs">No hadiths saved yet</p>
            <p className="text-slate-300 text-[10px] mt-1">Tap the Save button on any hadith</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedHadiths.map((h, i) => (
              <div
                key={i}
                onClick={() => {
                  if (onGoToSavedHadith && h.chapterKey) {
                    onGoToSavedHadith(h.book, h.chapterKey, h.chapterName || '', h.from || 0, h.to || 0, h.num);
                  }
                }}
                className={`bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 ${onGoToSavedHadith && h.chapterKey ? 'cursor-pointer active:scale-95 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all' : 'cursor-default'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveHadith(h.num, h.book); }}
                      className="text-[10px] text-red-400 font-bold border border-red-200 bg-red-50 px-2 py-0.5 rounded-lg"
                    >✕</button>
                    {onGoToSavedHadith && h.chapterKey && (
                      <span className="text-[9px] text-emerald-600 border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 rounded-lg">← Open</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-700 font-bold">{h.bookName}</span>
                    <span className="text-[10px] text-slate-400 font-mono ml-1"> #{h.num}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-700 text-right leading-relaxed line-clamp-2" dir="rtl">{h.ar}</p>
                {h.ur && <p className="text-[10px] text-slate-500 text-right leading-relaxed line-clamp-2 border-t border-slate-100 pt-1" dir="rtl">{h.ur}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full border-t border-slate-200"></div>

      {/* ── Saved Mosques ── */}
      <div className="w-full">
        <h3 className="text-right text-slate-700 font-bold text-sm mb-3">
          ❤️ Saved Mosques
          <span className="text-slate-400 font-normal text-xs ml-1">({savedMosques.length})</span>
        </h3>

        {savedMosques.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100">
            <Heart size={24} className="text-slate-300 mx-auto mb-2" />
            <p className="text-slate-400 text-xs">No mosques saved yet</p>
            <p className="text-slate-300 text-[10px] mt-1">Tap the ❤️ next to any mosque</p>
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
                    <p className="text-slate-800 text-sm font-bold">{mosque.name}</p>
                    {mosque.address && (
                      <p className="text-slate-400 text-[10px] mt-0.5">{mosque.address}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { onOpenMosque(mosque); onClose(); }}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all"
                >
                  <MapPin size={12} />
                  View Prayer Times
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full border-t border-slate-200"></div>

      {/* Future placeholders */}
      <div className="w-full space-y-2 opacity-40">
        <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
          <span className="text-[10px] text-slate-400">Coming soon</span>
          <span className="text-slate-500 text-sm">📖 Last read Surah</span>
        </div>
      </div>

      {/* Back */}
      <button
        onClick={onClose}
        className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-sm rounded-xl transition-all"
      >
        ← Back to App
      </button>

    </div>
  );
}
