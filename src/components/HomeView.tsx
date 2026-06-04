import React, { useState, useEffect } from 'react';
import { BookOpen, Scroll, CheckCircle, Heart, MapPin, LogIn, Compass, Bell, AlertTriangle, Clock, RotateCcw } from 'lucide-react';
import { Surah, Mosque } from '../types';

interface HomeViewProps {
  onNavigate: (view: string) => void;
  prayerTimes: { [key: string]: string };
  currentPrayer: string;
  todayDate: string;
  nearbyMosques: Mosque[];
  onOpenMosque: (mosque: Mosque) => void;
  userCoords: { latitude: number; longitude: number } | null;
  requestLocation: () => void;
  isRealFirebase: boolean;
  isAuthenticated: boolean;
  isUserAuthenticated: boolean;
  userAuthName: string;
  authName: string;
}

const SURAH_NAMES_UR = [
  'الفاتحہ','البقرہ','آل عمران','النساء','المائدہ','الانعام','الاعراف','الانفال',
  'التوبہ','یونس','ہود','یوسف','الرعد','ابراہیم','الحجر','النحل','الاسراء',
  'الکہف','مریم','طہ','الانبیاء','الحج','المومنون','النور','الفرقان','الشعراء',
  'النمل','القصص','العنکبوت','الروم','لقمان','السجدہ','الاحزاب','سبا','فاطر',
  'یسین','الصافات','ص','الزمر','غافر','فصلت','الشوریٰ','الزخرف','الدخان',
  'الجاثیہ','الاحقاف','محمد','الفتح','الحجرات','ق','الذاریات','الطور','النجم',
  'القمر','الرحمٰن','الواقعہ','الحدید','المجادلہ','الحشر','الممتحنہ','الصف',
  'الجمعہ','المنافقون','التغابن','الطلاق','التحریم','الملک','القلم','الحاقہ',
  'المعارج','نوح','الجن','المزمل','المدثر','القیامہ','الانسان','المرسلات',
  'النبا','النازعات','عبس','التکویر','الانفطار','المطففین','الانشقاق','البروج',
  'الطارق','الاعلیٰ','الغاشیہ','الفجر','البلد','الشمس','اللیل','الضحیٰ',
  'الشرح','التین','العلق','القدر','البینہ','الزلزلہ','العادیات','القارعہ',
  'التکاثر','العصر','الہمزہ','الفیل','قریش','الماعون','الکوثر','الکافرون',
  'النصر','المسد','الاخلاص','الفلق','الناس'
];

const formatTo12Hour = (time24: string) => {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  const strHrs = h < 10 ? '0' + h : h;
  const strMins = m < 10 ? '0' + m : m;
  return `${strHrs}:${strMins} ${ampm}`;
};

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate, prayerTimes, currentPrayer, todayDate, nearbyMosques,
  onOpenMosque, userCoords, requestLocation, isRealFirebase,
  isAuthenticated, isUserAuthenticated, userAuthName, authName
}) => {
  const [dailyAyah, setDailyAyah] = useState<{ ar: string; ur: string; ref: string } | null>(null);
  const [dailyHadith, setDailyHadith] = useState<{ ar: string; ur: string; ref: string } | null>(null);
  const [loadingAyah, setLoadingAyah] = useState(true);
  const [loadingHadith, setLoadingHadith] = useState(true);
  const [liveTime, setLiveTime] = useState<string>('');
  const [hijriDate, setHijriDate] = useState<string>('');
  const [isDeviceOffline, setIsDeviceOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsDeviceOffline(false);
    const handleOffline = () => setIsDeviceOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hrs = now.getHours();
      const mins = now.getMinutes();
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12; hrs = hrs ? hrs : 12;
      const strMins = mins < 10 ? '0' + mins : mins;
      const strHrs = hrs < 10 ? '0' + hrs : hrs;
      setLiveTime(`${strHrs}:${strMins} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const today = new Date();
    const jd = Math.floor(today.getTime() / 86400000) + 2440588;
    const l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j = (Math.floor((10985 - l2) / 5316)) * (Math.floor((50 * l2) / 17719)) + (Math.floor(l2 / 5670)) * (Math.floor((43 * l2) / 15238));
    const l3 = l2 - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
    const m = Math.floor((24 * l3) / 709);
    const d = l3 - Math.floor((709 * m) / 24);
    const y = 30 * n + j - 30;
    const hijriMonths = ['محرم','صفر','ربیع الاول','ربیع الثانی','جمادی الاول','جمادی الثانی','رجب','شعبان','رمضان','شوال','ذی القعدہ','ذی الحجہ'];
    setHijriDate(`${d} ${hijriMonths[m - 1]} ${y}ھ`);
  }, []);

  const getNextPrayerCountdown = () => {
    const now = new Date();
    const currentInMins = now.getHours() * 60 + now.getMinutes();
    const parseToMins = (timeStr: string) => { if (!timeStr) return 0; const [h, m] = timeStr.split(':').map(Number); return h * 60 + m; };
    const prayers = [
      { name: 'fajr', label: 'فجر', mins: parseToMins(prayerTimes.fajr) },
      { name: 'zuhr', label: 'ظہر', mins: parseToMins(prayerTimes.zuhr) },
      { name: 'asr', label: 'عصر', mins: parseToMins(prayerTimes.asr) },
      { name: 'maghrib', label: 'مغرب', mins: parseToMins(prayerTimes.maghrib) },
      { name: 'isha', label: 'عشاء', mins: parseToMins(prayerTimes.isha) },
    ];
    prayers.sort((a, b) => a.mins - b.mins);
    let next = prayers.find(p => p.mins > currentInMins);
    let isNextDay = false;
    if (!next) { next = prayers[0]; isNextDay = true; }
    let diff = isNextDay ? (1440 - currentInMins) + next.mins : next.mins - currentInMins;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    return hrs > 0 ? `اگلی نماز ${next.label} ہے — ${hrs} گھنٹے ${mins} منٹ بعد` : `اگلی نماز ${next.label} ہے — ${mins} منٹ بعد`;
  };

  useEffect(() => {
    const d = new Date();
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
    const FAMOUS_AYAHS = [
      { s: 2, a: 255 }, { s: 2, a: 286 }, { s: 3, a: 185 }, { s: 2, a: 152 },
      { s: 13, a: 28 }, { s: 2, a: 153 }, { s: 65, a: 3 }, { s: 94, a: 5 },
      { s: 2, a: 201 }, { s: 3, a: 8 }, { s: 39, a: 53 }, { s: 55, a: 13 }, { s: 50, a: 16 }
    ];
    const idx = dayOfYear % FAMOUS_AYAHS.length;
    const chosen = FAMOUS_AYAHS[idx];
    fetch(`https://api.alquran.cloud/v1/ayah/${chosen.s}:${chosen.a}/editions/quran-uthmani,ur.jalandhry`)
      .then(r => r.json())
      .then(json => {
        if (json.code === 200 && json.data && json.data.length >= 2) {
          setDailyAyah({ ar: json.data[0].text, ur: json.data[1].text, ref: `سورۃ ${SURAH_NAMES_UR[chosen.s - 1]} : آیت ${chosen.a}` });
        } else {
          setDailyAyah({ ar: "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ", ur: "اور میری توفیق صرف اللہ کی طرف سے ہے", ref: "سورۃ ہود : آیت ۸۸" });
        }
        setLoadingAyah(false);
      })
      .catch(() => { setDailyAyah({ ar: "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ", ur: "اور میری توفیق صرف اللہ کی طرف سے ہے", ref: "سورۃ ہود : آیت ۸۸" }); setLoadingAyah(false); });

    const sectionNum = (Math.floor(dayOfYear / 10) % 97) + 1;
    Promise.all([
      fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/sections/${sectionNum}.min.json`).then(r => r.json()),
      fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-bukhari/sections/${sectionNum}.min.json`).then(r => r.json())
    ]).then(([resAr, resUr]) => {
      const arHadiths = resAr.hadiths || [];
      const urHadiths = resUr.hadiths || [];
      if (arHadiths.length > 0) {
        const hadithIdx = dayOfYear % arHadiths.length;
        const chosenAr = arHadiths[hadithIdx];
        const chosenUr = urHadiths.find((h: any) => h.hadithnumber === chosenAr.hadithnumber) || {};
        setDailyHadith({ ar: chosenAr.text || '', ur: chosenUr.text || '', ref: `صحیح بخاری - حدیث نمبر ${chosenAr.hadithnumber}` });
      } else {
        setDailyHadith({ ar: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ", ur: "اعمال کا دارومدار نیتوں پر ہے", ref: "صحیح بخاری - حدیث نمبر ۱" });
      }
      setLoadingHadith(false);
    }).catch(() => { setDailyHadith({ ar: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ", ur: "اعمال کا دارومدار نیتوں پر ہے", ref: "صحیح بخاری - حدیث نمبر ۱" }); setLoadingHadith(false); });
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1));
  };

  return (
    <div className="space-y-4 pb-16 animate-fadeIn">

      {/* Top Prayer Banner */}
      <div className="relative bg-gradient-to-br from-[#0c2f21] via-[#10402b] to-[#082317] text-white px-4 pt-6 pb-6 rounded-b-[2rem] shadow-lg border-b border-[#05170f] overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-20 text-emerald-500/10 pointer-events-none z-0">
          <svg className="w-full h-full" viewBox="0 0 360 80" preserveAspectRatio="none" fill="currentColor">
            <path d="M0,80 L360,80 L360,30 L345,30 C340,30 338,26 338,22 L338,8 C338,5 335,2 331,2 C327,2 324,5 324,8 L324,22 C324,26 322,30 317,30 L300,30 C292,30 286,22 286,15 C286,8 274,0 260,0 C246,0 234,8 234,15 C234,22 228,30 220,30 L180,30 C172,30 166,20 166,13 C166,5 154,0 140,0 C126,0 114,5 114,13 C114,20 108,30 100,30 L60,30 L40,30 C35,30 33,26 33,22 L33,8 C33,5 30,2 26,2 C22,2 19,5 19,8 L19,22 C19,26 17,30 12,30 L0,30 Z" />
          </svg>
        </div>

        <div className="relative z-10 flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-1.5">
              {isAuthenticated ? (
                <button type="button" onClick={() => onNavigate('imam-login')} className="py-1 px-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-zinc-950 font-urdu font-black text-[10px] rounded-lg border border-amber-300 transition-all flex items-center gap-1 shadow-md cursor-pointer select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-900 inline-block animate-pulse"></span>
                  🕌 {authName || 'امام'}
                </button>
              ) : isUserAuthenticated ? (
                <button type="button" onClick={() => onNavigate('user-dashboard')} className="py-1 px-2.5 bg-white/20 hover:bg-white/30 active:scale-95 border border-white/30 text-[10px] text-white font-urdu font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
                  👤 {userAuthName}
                </button>
              ) : (
                <button type="button" onClick={() => onNavigate('login-splash')} className="py-1 px-2.5 bg-emerald-950/70 hover:bg-emerald-900 active:scale-95 border border-emerald-800/40 text-[10px] text-emerald-100 font-urdu font-bold rounded-lg transition-all flex items-center gap-1 shadow-inner cursor-pointer select-none">
                  <LogIn size={10} className="text-amber-400 shrink-0" />لاگ ان
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-lg w-fit max-w-[250px] shadow-sm">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
              <span className="text-[10px] text-amber-200 font-urdu leading-normal font-medium whitespace-nowrap pt-0.5">{getNextPrayerCountdown()}</span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <span className="inline-block text-[10px] bg-amber-500/10 text-amber-200 font-bold border border-amber-500/20 px-2.5 py-0.5 rounded-full font-urdu">{hijriDate || '1 شعبانھ'}</span>
            <div className="text-[11px] text-emerald-250 font-urdu font-medium">{todayDate}</div>
            <button onClick={requestLocation} className="text-[9px] inline-flex items-center gap-1 text-emerald-300 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors py-0.5 px-2 rounded-md font-urdu select-none cursor-pointer">
              <MapPin size={9} className="text-amber-400 shrink-0" />
              <span>{userCoords ? 'مقام: کلاؤڈ سنکڈ' : 'مقام آٹو حاصل کریں'}</span>
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-5 max-w-sm mx-auto">
          {(() => {
            const p = currentPrayer;
            const label = { fajr:'نمازِ فجر', zuhr:'نمازِ ظہر', asr:'نمازِ عصر', maghrib:'نمازِ مغرب', isha:'نمازِ عشاء' }[p] || 'نماز';
            const rawTime = prayerTimes[p] || '--:--';
            const parseToMins = (t: string) => { if (!t) return 0; const [h,m] = t.split(':').map(Number); return h*60+m; };
            const formatMinsTo12Hour = (mins: number) => {
              const h24 = Math.floor((mins%1440)/60); const m = Math.floor(mins%60);
              const ampm = h24>=12?'PM':'AM'; let h12=h24%12; h12=h12?h12:12;
              return `${h12<10?'0':''}${h12}:${m<10?'0':''}${m} ${ampm}`;
            };
            const startMins = parseToMins(rawTime);
            let jOffset = 15; if(p==='maghrib') jOffset=10; if(p==='fajr') jOffset=30;
            const jamaatTime = formatMinsTo12Hour(startMins+jOffset);
            let endTimeStr = '';
            if(p==='fajr') endTimeStr=formatMinsTo12Hour(startMins+85);
            else if(p==='zuhr') endTimeStr=formatTo12Hour(prayerTimes['asr']);
            else if(p==='asr') endTimeStr=formatTo12Hour(prayerTimes['maghrib']);
            else if(p==='maghrib') endTimeStr=formatTo12Hour(prayerTimes['isha']);
            else if(p==='isha') endTimeStr=formatTo12Hour(prayerTimes['fajr']);
            return (
              <div className="bg-gradient-to-b from-emerald-950/80 via-emerald-900/50 to-emerald-950/80 backdrop-blur-md border border-amber-400/30 rounded-2xl p-4 shadow-xl text-white">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md border border-amber-300/40 shrink-0">
                      <Clock size={16} className="text-zinc-950 animate-pulse" />
                    </div>
                    <div className="text-left font-sans">
                      <span className="text-[9px] text-amber-300 font-mono font-bold tracking-wider uppercase block">LIVE CLOCK</span>
                      <span className="text-xs text-white font-mono font-bold">{liveTime || '00:00'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-emerald-300 font-urdu leading-none">جاری نماز</div>
                    <div className="text-lg font-bold font-urdu text-white mt-0.5 flex items-center gap-1.5 justify-end">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 inline-block animate-ping"></span>{label}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center bg-emerald-950/50 rounded-xl py-2.5 border border-white/5">
                  <div className="space-y-1"><div className="text-[9px] text-emerald-300 font-urdu">آغازِ وقت</div><div className="text-[11px] font-mono font-bold text-white tracking-tight">{formatTo12Hour(rawTime)}</div></div>
                  <div className="space-y-1 border-x border-white/10"><div className="text-[9px] text-amber-300 font-urdu font-bold">جماعت کا وقت</div><div className="text-[11px] font-mono font-bold text-amber-200 tracking-tight">{jamaatTime}</div></div>
                  <div className="space-y-1"><div className="text-[9px] text-emerald-300 font-urdu">انتہائی وقت</div><div className="text-[11px] font-mono font-bold text-white tracking-tight">{endTimeStr}</div></div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* آف لائن بینر */}
      {isDeviceOffline && (
        <div className="mx-4 p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center gap-2.5 text-amber-900 animate-fadeIn">
          <AlertTriangle size={15} className="shrink-0 text-amber-600" />
          <div className="text-[11px] font-urdu leading-relaxed text-right flex-1">آف لائن موڈ: آپ کا انٹرنیٹ کنکشن منقطع ہے۔</div>
        </div>
      )}

      {/* مساجد */}
      <div className="mx-4 bg-[#ffffff] rounded-md shadow-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-emerald-700 font-bold cursor-pointer font-urdu hover:underline" onClick={() => onNavigate('mosques')}>تمام دیکھئے ←</span>
          <h3 className="text-xs font-bold text-slate-800 font-urdu flex items-center gap-1.5 uppercase tracking-tight">
            <Compass size={15} className="text-emerald-600" />قریبی مساجد کے اوقاتِ جمعہ
          </h3>
        </div>
        {!userCoords ? (
          <div className="p-4 bg-slate-50 rounded-xl text-center space-y-2.5">
            <p className="text-[11px] text-slate-600 font-urdu leading-relaxed">اپنا جی پی ایس لوکیشن آن کریں تاکہ قریبی مساجد نظر آئیں۔</p>
            <button onClick={requestLocation} className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-urdu font-bold shadow-sm flex items-center gap-1 mx-auto transition-colors">
              <MapPin size={11} />لوکیشن آن کریں
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {nearbyMosques.length === 0 ? (
              <p className="text-xs text-center text-gray-500 font-urdu py-2">قریبی علاقے میں کوئی مسجد رجسٹرڈ نہیں ہے۔</p>
            ) : (
              (() => {
                const mosquesWithDistance = nearbyMosques.map(mosque => ({ mosque, distance: calculateDistance(userCoords.latitude, userCoords.longitude, mosque.latitude, mosque.longitude) }));
                return mosquesWithDistance.sort((a,b)=>a.distance-b.distance).slice(0,3).map(({mosque,distance}) => (
                  <div key={mosque.id} onClick={() => onOpenMosque(mosque)} className="p-3 bg-slate-50/50 hover:bg-emerald-50/35 rounded-xl transition-all cursor-pointer border border-slate-150 flex items-center justify-between group">
                    <div className="text-center bg-emerald-600 text-white py-1 px-2.5 rounded-lg text-[9px] font-bold border border-emerald-700">
                      <div className="opacity-95 text-[8px]">جمعہ وقت</div>
                      <div className="font-mono mt-0.5">{mosque.jumah}</div>
                    </div>
                    <div className="text-right flex-1 pr-3">
                      <div className="text-xs font-bold text-slate-800 font-urdu">{mosque.name}</div>
                      <div className="text-[9px] text-slate-400 font-urdu flex items-center justify-end gap-1 mt-0.5 font-mono">
                        <span>{distance} km away</span><MapPin size={10} className="text-emerald-500" />
                      </div>
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        )}
      </div>

      {/* Main Grid Cards */}
      <div className="mx-4 grid grid-cols-2 gap-3 pb-1">
        <div onClick={() => onNavigate('quran')} className="bg-[#ffffff] rounded-md shadow-md p-4 flex flex-col items-center justify-center text-center cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-2"><BookOpen size={20} /></div>
          <span className="text-xs font-bold text-slate-800 font-urdu">قرآن مجید</span>
          <span className="text-[10px] text-slate-400 font-urdu mt-0.5">۱۱۴ سورتیں مکی و مدنی</span>
        </div>
        <div onClick={() => onNavigate('hadith')} className="bg-[#ffffff] rounded-md shadow-md p-4 flex flex-col items-center justify-center text-center cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2"><Scroll size={20} /></div>
          <span className="text-xs font-bold text-slate-800 font-urdu">احادیث شریفہ</span>
          <span className="text-[10px] text-slate-400 font-urdu mt-0.5">صحیح بخاری و مسلم مجموعہ</span>
        </div>
        <div onClick={() => onNavigate('namaz')} className="bg-[#ffffff] rounded-md shadow-md p-4 flex flex-col items-center justify-center text-center cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2"><CheckCircle size={20} /></div>
          <span className="text-xs font-bold text-slate-800 font-urdu">نماز کا طریقہ</span>
          <span className="text-[10px] text-slate-400 font-urdu mt-0.5">ترجمہ اور طریقہ کار</span>
        </div>
        <div onClick={() => onNavigate('duas')} className="bg-[#ffffff] rounded-md shadow-md p-4 flex flex-col items-center justify-center text-center cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center mb-2"><Heart size={20} /></div>
          <span className="text-xs font-bold text-slate-800 font-urdu">مسنون دعائیں</span>
          <span className="text-[10px] text-slate-400 font-urdu mt-0.5">روزمرہ کلمات و اذکار</span>
        </div>
        <div onClick={() => onNavigate('tasbih')} className="bg-[#ffffff] rounded-md shadow-md p-4 flex flex-col items-center justify-center text-center cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-2"><RotateCcw size={20} /></div>
          <span className="text-xs font-bold text-slate-800 font-urdu">تسبیح کاؤنٹر</span>
          <span className="text-[10px] text-slate-400 font-urdu mt-0.5">کلک کر کے تسبیح پڑھیں</span>
        </div>
        <div onClick={() => onNavigate('qibla')} className="bg-[#ffffff] rounded-md shadow-md p-4 flex flex-col items-center justify-center text-center cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2"><Compass size={20} /></div>
          <span className="text-xs font-bold text-slate-800 font-urdu">قبلہ رخ سمت</span>
          <span className="text-[10px] text-slate-400 font-urdu mt-0.5">صحیح قبلہ سمت معلوم کریں</span>
        </div>
      </div>

      {/* Verse of the Day */}
      <div className="mx-4">
        <div className="text-center font-urdu text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1.5">✦ Verse of the Day ✦</div>
        <div className="bg-[#ffffff] rounded-md shadow-md p-4 text-center space-y-2.5">
          {loadingAyah ? (
            <div className="flex items-center justify-center py-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div></div>
          ) : (
            <>
              <p className="text-base leading-loose font-amiri text-slate-800" dir="rtl">{dailyAyah?.ar}</p>
              <p className="text-xs text-emerald-700 font-semibold font-urdu leading-relaxed border-t border-slate-100 pt-2" dir="rtl">{dailyAyah?.ur}</p>
              <div className="text-[9px] text-slate-400 font-mono text-left tracking-tight">{dailyAyah?.ref}</div>
            </>
          )}
        </div>
      </div>

      {/* Hadith of the Day */}
      <div className="mx-4">
        <div className="text-center font-urdu text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1.5">✦ Hadith of the Day ✦</div>
        <div className="bg-[#ffffff] rounded-md shadow-md p-4 text-center space-y-2.5">
          {loadingHadith ? (
            <div className="flex items-center justify-center py-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div></div>
          ) : (
            <>
              <p className="text-sm leading-relaxed font-amiri text-slate-800 text-right font-medium" dir="rtl">{dailyHadith?.ar}</p>
              <p className="text-xs text-emerald-700 font-semibold font-urdu leading-relaxed border-t border-slate-100 pt-2 text-right" dir="rtl">{dailyHadith?.ur}</p>
              <div className="text-[9px] text-slate-400 font-mono text-left tracking-tight">{dailyHadith?.ref}</div>
            </>
          )}
        </div>
      </div>

    </div>
  );
};
