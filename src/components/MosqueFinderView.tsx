import React, { useState, useEffect } from 'react';
import { Search, MapPin, Compass, Bell, Clock, RefreshCw, AlertCircle, Info, Heart } from 'lucide-react';
import { Mosque } from '../types';

// ── وقت کو منٹ میں بدلو ──
const timeToMinutes = (timeStr: string): number => {
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
};

// ── منٹ کو HH:MM میں بدلو ──
const minutesToTime = (minutes: number): string => {
  const total = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// ── API سے وقت لو + offset لگاؤ ──
const applyOffset = (timeStr: string, offsetMins: number): string => {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const mins = timeToMinutes(timeStr);
  return minutesToTime(mins + offsetMins);
};

// ── 12 گھنٹے فارمیٹ ──
const formatTo12Hour = (timeStr?: string, defaultVal = '') => {
  const target = timeStr || defaultVal;
  if (!target) return '';
  if (target.toLowerCase().includes('am') || target.toLowerCase().includes('pm')) return target;
  const parts = target.split(':');
  if (parts.length < 2) return target;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return target;
  const suffix = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
};

// ── مسجد کے coordinates سے API وقت لو ──
const fetchPrayerTimesFromAPI = async (
  latitude: number,
  longitude: number,
  method = 1  // 1 = University of Islamic Sciences Karachi (حنفی)
): Promise<Record<string, string> | null> => {
  try {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;

    const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.code === 200) {
      const t = data.data.timings;
      return {
        fajr:    t.Fajr.split(' ')[0],
        zuhr:    t.Dhuhr.split(' ')[0],
        asr:     t.Asr.split(' ')[0],
        maghrib: t.Maghrib.split(' ')[0],
        isha:    t.Isha.split(' ')[0],
      };
    }
    return null;
  } catch {
    return null;
  }
};

interface MosqueFinderViewProps {
  nearbyMosques: Mosque[];
  userCoords: { latitude: number; longitude: number } | null;
  requestLocation: () => void;
  onOpenMosque: (mosque: Mosque) => void;
  isLoading?: boolean;
}

// ── ہر مسجد کے لیے API وقت cache ──
const apiTimesCache: Record<string, { times: Record<string, string>; date: string }> = {};

export const MosqueFinderView: React.FC<MosqueFinderViewProps> = ({
  nearbyMosques,
  userCoords,
  requestLocation,
  onOpenMosque,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [notifPreferences, setNotifPreferences] = useState<{ [key: string]: boolean }>({});
  const [savedMosques, setSavedMosques] = useState<{ [key: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem('user_saved_mosques');
      if (!saved) return {};
      const list: Mosque[] = JSON.parse(saved);
      return list.reduce((acc, m) => ({ ...acc, [m.id]: true }), {});
    } catch { return {}; }
  });

  // ── API سے آئے اذان اوقات (مسجد id → times) ──
  const [mosqueApiTimes, setMosqueApiTimes] = useState<Record<string, Record<string, string>>>({});
  const [apiLoadingIds, setApiLoadingIds] = useState<Set<string>>(new Set());

  // ── ہر مسجد کے لیے API سے وقت لو ──
  useEffect(() => {
    const today = new Date().toDateString();

    nearbyMosques.forEach(async (mosque) => {
      // offset موجود ہے تو API call کرو، ورنہ Firebase کا وقت کافی ہے
      const hasOffset =
        (mosque.fajrOffset ?? 0) !== 0 ||
        (mosque.zuhrOffset ?? 0) !== 0 ||
        (mosque.asrOffset ?? 0) !== 0 ||
        (mosque.maghribOffset ?? 0) !== 0 ||
        (mosque.ishaOffset ?? 0) !== 0;

      if (!hasOffset) return; // offset نہیں تو API کی ضرورت نہیں

      // Cache چیک کرو — آج کا data پہلے سے ہے؟
      const cacheKey = `${mosque.id}`;
      if (apiTimesCache[cacheKey]?.date === today) {
        setMosqueApiTimes(prev => ({ ...prev, [mosque.id]: apiTimesCache[cacheKey].times }));
        return;
      }

      // API call کرو
      setApiLoadingIds(prev => new Set(prev).add(mosque.id));
      const times = await fetchPrayerTimesFromAPI(mosque.latitude, mosque.longitude);
      if (times) {
        apiTimesCache[cacheKey] = { times, date: today };
        setMosqueApiTimes(prev => ({ ...prev, [mosque.id]: times }));
      }
      setApiLoadingIds(prev => { const s = new Set(prev); s.delete(mosque.id); return s; });
    });
  }, [nearbyMosques]);

  // ── مسجد کا فائنل اذان وقت حاصل کرو ──
  // اگر offset ہے → API وقت + offset
  // ورنہ → امام کا سیٹ کیا وقت
  const getAzanTime = (mosque: Mosque, prayer: 'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha'): string => {
    const offsetKey = `${prayer}Offset` as keyof Mosque;
    const offset = (mosque[offsetKey] as number) ?? 0;
    const apiTimes = mosqueApiTimes[mosque.id];

    if (offset !== 0 && apiTimes?.[prayer]) {
      return applyOffset(apiTimes[prayer], offset);
    }
    // offset نہیں یا API نہیں آئی → امام کا براہ راست وقت
    return mosque[prayer] as string;
  };

  const handleToggleSave = (mosque: Mosque, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSaved = !!savedMosques[mosque.id];
    const updatedMap = { ...savedMosques, [mosque.id]: !isSaved };
    setSavedMosques(updatedMap);
    try {
      const allSaved: Mosque[] = JSON.parse(localStorage.getItem('user_saved_mosques') || '[]');
      let newList: Mosque[];
      if (isSaved) {
        newList = allSaved.filter(m => m.id !== mosque.id);
      } else {
        newList = [...allSaved.filter(m => m.id !== mosque.id), mosque];
      }
      localStorage.setItem('user_saved_mosques', JSON.stringify(newList));
    } catch {}
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  const handleToggleNotification = (mosque: Mosque, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSubscribed = !!notifPreferences[mosque.id];
    if (!isSubscribed) {
      if ('Notification' in window) {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            setNotifPreferences((prev) => ({ ...prev, [mosque.id]: true }));
            new Notification("StepToDeen الرٹ", {
              body: `${mosque.name} کے اوقات کی تبدیلی کی لائیو الرٹس آن کر دی گئی ہیں۔`,
              dir: 'rtl'
            });
          } else {
            setNotifPreferences((prev) => ({ ...prev, [mosque.id]: true }));
          }
        });
      } else {
        setNotifPreferences((prev) => ({ ...prev, [mosque.id]: true }));
      }
    } else {
      setNotifPreferences((prev) => ({ ...prev, [mosque.id]: false }));
    }
  };

  const processedMosques = nearbyMosques
    .map((m) => ({
      ...m,
      distance: userCoords
        ? calculateDistance(userCoords.latitude, userCoords.longitude, m.latitude, m.longitude)
        : null,
    }))
    .sort((a, b) => {
      if (a.distance === null || b.distance === null) return 0;
      return a.distance - b.distance;
    });

  const filteredMosques = processedMosques.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 p-4 pb-20 animate-fadeIn">

      {/* Header */}
      <div className="bg-emerald-50 text-emerald-950 p-3.5 rounded-2xl border border-emerald-100 text-right space-y-1.5 shadow-sm">
        <h3 className="text-xs font-bold text-emerald-800 font-urdu flex items-center gap-1.5 justify-end uppercase tracking-tight">
          <Compass size={16} className="text-emerald-750" />
          قریبی مساجد کے اوقاتِ جمعہ و جماعت
        </h3>
        <p className="text-[11px] text-slate-700 leading-relaxed font-urdu">
          مسجد کے امام حضرات کی طرف سے ریئل ٹائم اپڈیٹ کیے گئے نماز اور جمعہ کے درست اوقات لائیو حاصل کریں۔
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 px-3 flex items-center gap-3.5">
        <input
          type="text"
          placeholder="مسجد کا نام یا پتہ تلاش کریں..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 border-0 bg-transparent text-xs text-right focus:outline-none font-urdu py-1"
          dir="rtl"
        />
        <Search size={15} className="text-slate-400" />
      </div>

      {/* Location request */}
      {!userCoords && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2.5">
          <p className="text-[11px] text-slate-600 font-urdu leading-relaxed">
            اپنے مقام کے مطابق قریبی ترین مساجد اور ان کا فاصلہ دیکھنے کے لیے موبائل لوکیشن (GPS) تلاش کریں۔
          </p>
          <button
            onClick={requestLocation}
            className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-urdu font-bold shadow-sm flex items-center gap-1.5 mx-auto transition-colors"
          >
            <MapPin size={11} />
            لوکیشن آن کریں
          </button>
        </div>
      )}

      {/* Mosques list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-urdu">مساجد لوڈ ہو رہی ہیں...</p>
          </div>
        ) : filteredMosques.length === 0 ? (
          <div className="text-center text-slate-400 font-urdu py-8 text-xs">
            کوئی مسجد نہیں ملی۔ امام پینل سے نئی مسجد رجسٹر کریں۔
          </div>
        ) : (
          filteredMosques.map((mosque) => {
            const hasSubscribed = !!notifPreferences[mosque.id];
            const isApiLoading = apiLoadingIds.has(mosque.id);

            // ── پانچوں نمازوں کے فائنل اوقات ──
            const prayers = [
              { label: 'فجر',  val: getAzanTime(mosque, 'fajr') },
              { label: 'ظہر',  val: getAzanTime(mosque, 'zuhr') },
              { label: 'عصر',  val: getAzanTime(mosque, 'asr') },
              { label: 'مغرب', val: getAzanTime(mosque, 'maghrib') },
              { label: 'عشاء', val: getAzanTime(mosque, 'isha') },
              { label: 'جمعہ', val: mosque.jumah },
            ];

            return (
              <div
                key={mosque.id}
                onClick={() => onOpenMosque(mosque)}
                className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm hover:border-emerald-300 transition-all cursor-pointer space-y-3"
              >
                {/* Mosque header */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={(e) => handleToggleNotification(mosque, e)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        hasSubscribed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-emerald-700'
                      }`}
                    >
                      <Bell size={13} className={hasSubscribed ? 'animate-bounce' : ''} />
                    </button>
                    <button
                      onClick={(e) => handleToggleSave(mosque, e)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                        savedMosques[mosque.id]
                          ? 'bg-red-50 border-red-200 text-red-500'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-400'
                      }`}
                    >
                      {savedMosques[mosque.id] ? '✓ Saved' : 'Save'}
                    </button>
                  </div>

                  <div className="text-right flex-1 pr-3">
                    <h4 className="text-xs font-bold text-slate-800 font-urdu">{mosque.name}</h4>
                    <p className="text-[9px] text-slate-400 font-urdu mt-0.5">{mosque.address}</p>
                    {userCoords && mosque.distance !== null && (
                      <div className="flex items-center justify-end gap-0.5 mt-1 text-[9px] text-emerald-700 font-bold">
                        <span>{mosque.distance} کلومیٹر دور</span>
                        <MapPin size={10} className="text-rose-500 shrink-0" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Announcement */}
                {mosque.announcement && (
                  <div className="p-2.5 bg-amber-50/75 border border-amber-200 rounded-xl text-right text-[10px] text-amber-900 font-urdu flex items-start gap-2 justify-end">
                    <span className="flex-1 leading-relaxed">{mosque.announcement}</span>
                    <Info size={11} className="text-amber-600 shrink-0 mt-0.5" />
                  </div>
                )}

                {/* Prayer times grid */}
                <div className="grid grid-cols-6 gap-1 bg-slate-50 p-1.5 rounded-xl text-center border border-slate-150 relative">
                  {/* API loading indicator */}
                  {isApiLoading && (
                    <div className="absolute top-1 left-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" title="اوقات اپڈیٹ ہو رہے ہیں" />
                    </div>
                  )}
                  {prayers.map((item, idx) => (
                    <div key={idx} className="space-y-0.5 border-r border-slate-200/50 last:border-0">
                      <div className="text-[8px] text-slate-500 font-urdu font-medium">{item.label}</div>
                      <div className="text-[11px] font-mono font-bold text-slate-800">
                        {formatTo12Hour(item.val)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Eid timings */}
                <div className="flex justify-between items-center text-[9px] px-2.5 text-purple-800 font-bold font-urdu bg-purple-50/50 p-1.5 rounded-xl border border-purple-100">
                  <span className="text-[8px] px-1 bg-purple-200 text-purple-900 rounded select-none scale-90">عیدین اوقات</span>
                  <div className="flex gap-3">
                    <div>عید الفطر: <span className="font-mono text-[10px]">{formatTo12Hour(mosque.eidFitr, '07:00')}</span></div>
                    <div className="border-r border-purple-200 h-3"></div>
                    <div>عید الاضحی: <span className="font-mono text-[10px]">{formatTo12Hour(mosque.eidAdha, '07:15')}</span></div>
                  </div>
                </div>

                {/* Ramadan timings */}
                {(mosque.sehri || mosque.iftar) && (
                  <div className="flex justify-between items-center text-[9px] px-2.5 text-teal-800 font-bold font-urdu bg-teal-50/50 p-1.5 rounded-xl border border-teal-100">
                    <span className="text-[8px] px-1 bg-teal-200 text-teal-900 rounded select-none scale-90">رمضان اوقات</span>
                    <div className="flex gap-3">
                      {mosque.sehri && <div>سحری: <span className="font-mono text-[10px]">{formatTo12Hour(mosque.sehri, '04:30')}</span></div>}
                      {mosque.sehri && mosque.iftar && <div className="border-r border-teal-200 h-3"></div>}
                      {mosque.iftar && <div>افطاری: <span className="font-mono text-[10px]">{formatTo12Hour(mosque.iftar, '18:30')}</span></div>}
                    </div>
                  </div>
                )}

                {/* Last updated */}
                <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-100 pt-2 pb-0.5">
                  <div className="font-mono text-slate-500 font-semibold">
                    {new Date(mosque.updatedAt).toLocaleDateString()}{' '}
                    {new Date(mosque.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </div>
                  <div className="font-urdu flex items-center gap-1 text-slate-500 font-bold">
                    <span>آخری اپڈیٹ (کلاؤڈ سنک)</span>
                    <RefreshCw size={8} className="text-emerald-600 animate-spin" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
