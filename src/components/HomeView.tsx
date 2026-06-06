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
  onNavigate,
  prayerTimes,
  currentPrayer,
  todayDate,
  nearbyMosques,
  onOpenMosque,
  userCoords,
  requestLocation,
  isRealFirebase,
  isAuthenticated,
  isUserAuthenticated,
  userAuthName,
  authName
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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hrs = now.getHours();
      const mins = now.getMinutes();
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12;
      hrs = hrs ? hrs : 12;
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
    
    const hijriMonths = [
      'محرم', 'صفر', 'ربیع الاول', 'ربیع الثانی', 'جمادی الاول', 'جمادی الثانی',
      'رجب', 'شعبان', 'رمضان', 'شوال', 'ذی القعدہ', 'ذی الحجہ'
    ];
    setHijriDate(`${d} ${hijriMonths[m - 1]} ${y}ھ`);
  }, []);

  const getNextPrayerCountdown = () => {
    const now = new Date();
    const currentInMins = now.getHours() * 60 + now.getMinutes();
    
    const parseToMins = (timeStr: string) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

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
    
    if (!next) {
      next = prayers[0];
      isNextDay = true;
    }

    let diff = 0;
    if (isNextDay) {
      diff = (1440 - currentInMins) + next.mins;
    } else {
      diff = next.mins - currentInMins;
    }

    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    
    if (hrs > 0) {
      return `اگلی نماز ${next.label} ہے — ${hrs} گھنٹے ${mins} منٹ بعد`;
    } else {
      return `اگلی نماز ${next.label} ہے — ${mins} منٹ بعد`;
    }
  };

  useEffect(() => {
    // Dynamic daily Ayah selection
    const d = new Date();
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);

    const FAMOUS_AYAHS = [
      { s: 2, a: 255 },  // Ayat-ul-Kursi
      { s: 2, a: 286 },  
      { s: 3, a: 185 },  
      { s: 2, a: 152 },  
      { s: 13, a: 28 },  
      { s: 2, a: 153 },  
      { s: 65, a: 3 },   
      { s: 94, a: 5 },   
      { s: 2, a: 201 },  
      { s: 3, a: 8 },    
      { s: 39, a: 53 },  
      { s: 55, a: 13 },  
      { s: 50, a: 16 }
    ];

    const idx = dayOfYear % FAMOUS_AYAHS.length;
    const chosen = FAMOUS_AYAHS[idx];

    fetch(`https://api.alquran.cloud/v1/ayah/${chosen.s}:${chosen.a}/editions/quran-uthmani,ur.jalandhry`)
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 200 && json.data && json.data.length >= 2) {
          setDailyAyah({
            ar: json.data[0].text,
            ur: json.data[1].text,
            ref: `سورۃ ${SURAH_NAMES_UR[chosen.s - 1]} : آیت ${chosen.a}`
          });
        } else {
          setDailyAyah({
            ar: "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ ۚ عَلَيْهِ تَوَكَّلْتُ وَإِلَيْهِ أُنِيبُ",
            ur: "اور میری توفیق صرف اللہ کی طرف سے ہے، اسی پر میں نے بھروسہ کیا اور اسی کی طرف رجوع کرتا ہوں۔",
            ref: "سورۃ ہود : آیت ۸۸"
          });
        }
        setLoadingAyah(false);
      })
      .catch(() => {
        setDailyAyah({
          ar: "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ ۚ عَلَيْهِ تَوَكَّلْتُ وَإِلَيْهِ أُنِيبُ",
          ur: "اور میری توفیق صرف اللہ کی طرف سے ہے، اسی پر میں نے بھروسہ کیا اور اسی کی طرف رجوع کرتا ہوں۔",
          ref: "سورۃ ہود : آیت ۸۸"
        });
        setLoadingAyah(false);
      });

    // Dynamic daily Hadith
    const sectionNum = (Math.floor(dayOfYear / 10) % 97) + 1;
    const arSecUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari/sections/${sectionNum}.min.json`;
    const urSecUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-bukhari/sections/${sectionNum}.min.json`;

    Promise.all([
      fetch(arSecUrl).then((r) => r.json()),
      fetch(urSecUrl).then((r) => r.json())
    ])
      .then(([resAr, resUr]) => {
        const arHadiths = resAr.hadiths || [];
        const urHadiths = resUr.hadiths || [];
        if (arHadiths.length > 0) {
          const hadithIdx = dayOfYear % arHadiths.length;
          const chosenAr = arHadiths[hadithIdx];
          const chosenUr = urHadiths.find((h: any) => h.hadithnumber === chosenAr.hadithnumber) || {};
          setDailyHadith({
            ar: chosenAr.text || '',
            ur: chosenUr.text || '',
            ref: `صحیح بخاری - حدیث نمبر ${chosenAr.hadithnumber}`
          });
        } else {
          setDailyHadith({
            ar: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
            ur: "اعمال کا دارومدار نیتوں پر ہے اور ہر شخص کو وہی ملے گا جو اس نے نیت کی۔",
            ref: "صحیح بخاری - حدیث نمبر ۱"
          });
        }
        setLoadingHadith(false);
      })
      .catch(() => {
        setDailyHadith({
          ar: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
          ur: "اعمال کا دارومدار نیتوں پر ہے اور ہر شخص کو وہی ملے گا جو اس نے نیت کی۔",
          ref: "صحیح بخاری - حدیث نمبر ۱"
        });
        setLoadingHadith(false);
      });
  }, []);

  // Proximity finder distance helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  return (
    <div className="space-y-4 pb-16 animate-fadeIn">
      {/* ═══════════ TOP BANNER ═══════════ */}
      <div className="relative bg-gradient-to-b from-[#0a2618] via-[#0f3522] to-[#0a2618] text-white px-4 pt-4 pb-5 shadow-2xl overflow-hidden">

        {/* subtle radial glow in centre */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(52,211,153,0.08),transparent_70%)] pointer-events-none" />

        {/* decorative top gold line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

        {/* mosque silhouette */}
        <div className="absolute bottom-0 left-0 w-full h-16 text-emerald-400/5 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 360 64" preserveAspectRatio="none" fill="currentColor">
            <path d="M0,64 L360,64 L360,24 L345,24 C340,24 338,20 338,17 L338,6 C338,3 335,0 331,0 C327,0 324,3 324,6 L324,17 C324,20 322,24 317,24 L300,24 C292,24 286,17 286,11 C286,5 274,0 260,0 C246,0 234,5 234,11 C234,17 228,24 220,24 L180,24 C172,24 166,15 166,9 C166,3 154,0 140,0 C126,0 114,3 114,9 C114,15 108,24 100,24 L40,24 C35,24 33,20 33,17 L33,6 C33,3 30,0 26,0 C22,0 19,3 19,6 L19,17 C19,20 17,24 12,24 L0,24 Z" />
          </svg>
        </div>

        {/* ── ROW 1: login badge  +  dates ── */}
        <div className="relative z-10 flex items-center justify-between mb-3">

          {/* left: auth button */}
          <div>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => onNavigate('imam-login')}
                className="flex items-center gap-1.5 py-1 px-3 bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 border border-amber-400/40 text-amber-200 font-urdu font-bold text-[11px] rounded-full transition-all shadow-sm cursor-pointer select-none"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                {authName || 'امام'}
              </button>
            ) : isUserAuthenticated ? (
              <button
                type="button"
                onClick={() => onNavigate('user-dashboard')}
                className="flex items-center gap-1.5 py-1 px-3 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-white font-urdu font-bold text-[11px] rounded-full transition-all cursor-pointer select-none"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                {userAuthName}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('login-splash')}
                className="flex items-center gap-1.5 py-1 px-3 bg-white/8 hover:bg-white/15 active:scale-95 border border-white/15 text-emerald-200 font-urdu font-bold text-[11px] rounded-full transition-all cursor-pointer select-none"
              >
                <LogIn size={10} className="text-amber-400 shrink-0" />
                لاگ ان
              </button>
            )}
          </div>

          {/* right: hijri + gregorian date */}
          <div className="text-right space-y-0.5">
            <div className="text-[11px] font-urdu font-bold text-amber-300 leading-none">
              {hijriDate || '—'}
            </div>
            <div className="text-[10px] text-emerald-300/80 font-urdu">
              {todayDate}
            </div>
          </div>
        </div>

        {/* ── ROW 2: next prayer countdown ── */}
        <div className="relative z-10 flex items-center gap-2 mb-3">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-70" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
          </span>
          <span className="text-[11px] text-amber-100/90 font-urdu font-medium">
            {getNextPrayerCountdown()}
          </span>
        </div>

        {/* ── ROW 3: prayer times card ── */}
        <div className="relative z-10">
          {(() => {
            const p = currentPrayer;
            const label = {
              fajr: 'فجر', zuhr: 'ظہر', asr: 'عصر', maghrib: 'مغرب', isha: 'عشاء'
            }[p] || 'نماز';
            const rawTime = prayerTimes[p] || '--:--';

            const parseToMins = (timeStr: string) => {
              if (!timeStr) return 0;
              const [h, m] = timeStr.split(':').map(Number);
              return h * 60 + m;
            };
            const formatMinsTo12Hour = (mins: number) => {
              const h24 = Math.floor((mins % 1440) / 60);
              const m = Math.floor(mins % 60);
              const ampm = h24 >= 12 ? 'PM' : 'AM';
              let h12 = h24 % 12;
              h12 = h12 ? h12 : 12;
              return `${h12 < 10 ? '0' : ''}${h12}:${m < 10 ? '0' : ''}${m} ${ampm}`;
            };

            const startMins = parseToMins(rawTime);
            let jOffset = 15;
            if (p === 'maghrib') jOffset = 10;
            if (p === 'fajr') jOffset = 30;
            const jamaatTime = formatMinsTo12Hour(startMins + jOffset);

            let endTimeStr = '';
            if (p === 'fajr') endTimeStr = formatMinsTo12Hour(startMins + 85);
            else if (p === 'zuhr') endTimeStr = formatTo12Hour(prayerTimes['asr']);
            else if (p === 'asr') endTimeStr = formatTo12Hour(prayerTimes['maghrib']);
            else if (p === 'maghrib') endTimeStr = formatTo12Hour(prayerTimes['isha']);
            else if (p === 'isha') endTimeStr = formatTo12Hour(prayerTimes['fajr']);

            const formattedTime = formatTo12Hour(rawTime);

            return (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                {/* نماز کا نام — thin header strip */}
                <div className="flex items-center justify-center gap-2 bg-amber-400/10 border-b border-white/10 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <span className="text-[11px] font-urdu font-bold text-amber-200 tracking-wide">
                    جاری نماز — {label}
                  </span>
                </div>

                {/* 3 time columns */}
                <div className="grid grid-cols-3 divide-x divide-white/10 py-2.5 px-1">
                  <div className="text-center space-y-1">
                    <div className="text-[9px] text-emerald-300/80 font-urdu">آغازِ وقت</div>
                    <div className="text-[13px] font-mono font-bold text-white">{formattedTime}</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-[9px] text-amber-300/90 font-urdu font-bold">جماعت</div>
                    <div className="text-[13px] font-mono font-bold text-amber-200">{jamaatTime}</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-[9px] text-emerald-300/80 font-urdu">انتہائی وقت</div>
                    <div className="text-[13px] font-mono font-bold text-white">{endTimeStr}</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Cloud connection status banner */}
      {isDeviceOffline && (
        <div className="mx-4 p-2.5 bg-amber-50/70 shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] flex items-center gap-2.5 text-amber-900 animate-fadeIn">
          <AlertTriangle size={15} className="shrink-0 text-amber-600" />
          <div className="text-[11px] font-urdu leading-relaxed text-right flex-1">
            آف لائن موڈ: آپ کا انٹرنیٹ کنکشن منقطع ہے، ایپ ابھی آف لائن موڈ میں کام کر رہی ہے۔
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          مسجد کارڈ — بغیر border، 1px ring، سفید اندر، چکور کونے
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="mx-4 bg-white rounded-none shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-emerald-700 font-bold cursor-pointer font-urdu hover:underline" onClick={() => onNavigate('mosques')}>
            تمام دیکھئے ←
          </span>
          <h3 className="text-xs font-bold text-slate-800 font-urdu flex items-center gap-1.5 uppercase tracking-tight">
            <Compass size={15} className="text-emerald-600" />
            قریبی مساجد کے اوقاتِ جمعہ
          </h3>
        </div>

        {!userCoords ? (
          <div className="p-4.5 bg-slate-50 rounded-none text-center space-y-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
            <p className="text-[11px] text-slate-600 font-urdu leading-relaxed">
              اپنا جی پی ایس لوکیشن آن کریں تاکہ آپ کو بالکل قریبی مساجد اور ان کی جماعت کے اوقات ریئل ٹائم نظر آئیں۔
            </p>
            <button
              onClick={requestLocation}
              className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-urdu font-bold shadow-sm flex items-center gap-1 mx-auto transition-colors"
            >
              <MapPin size={11} />
              لوکیشن آن کریں
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {nearbyMosques.length === 0 ? (
              <p className="text-xs text-center text-gray-500 font-urdu py-2">قریبی علاقے میں کوئی مسجد رجسٹرڈ نہیں ہے۔</p>
            ) : (
              (() => {
                const mosquesWithDistance = nearbyMosques.map((mosque) => {
                  const distance = calculateDistance(
                    userCoords.latitude,
                    userCoords.longitude,
                    mosque.latitude,
                    mosque.longitude
                  );
                  return { mosque, distance };
                });

                const sortedMosques = mosquesWithDistance.sort((a, b) => a.distance - b.distance);

                return sortedMosques.slice(0, 3).map(({ mosque, distance }) => {
                  return (
                    <div
                      key={mosque.id}
                      onClick={() => onOpenMosque(mosque)}
                      className="p-3 bg-slate-50/50 hover:bg-emerald-50/35 transition-all cursor-pointer shadow-[0_1px_5px_rgba(0,0,0,0.05)] flex items-center justify-between group"
                    >
                      <div className="text-center bg-emerald-600 text-white py-1 px-2.5 rounded-lg text-[9px] font-bold border border-emerald-700 group-hover:bg-emerald-700 transition-colors">
                        <div className="opacity-95 text-[8px]">جمعہ وقت</div>
                        <div className="font-mono mt-0.5">{mosque.jumah}</div>
                      </div>
                      <div className="text-right flex-1 pr-3">
                        <div className="text-xs font-bold text-slate-800 font-urdu">{mosque.name}</div>
                        <div className="text-[9px] text-slate-400 font-urdu flex items-center justify-end gap-1 mt-0.5 font-mono">
                          <span>{distance} km away</span>
                          <MapPin size={10} className="text-emerald-500" />
                        </div>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          مین گرڈ کارڈز — چکور کونے، ring-1، سفید
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="mx-4 grid grid-cols-2 gap-3 pb-1">
        {/* Quran */}
        <div
          onClick={() => onNavigate('quran')}
          className="relative bg-white p-4 rounded-none shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
        >
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-2">
            <BookOpen size={20} />
          </div>
          <span className="text-xs font-bold text-slate-800 font-urdu">قرآن مجید</span>
          <span className="text-[10px] text-slate-400 font-urdu mt-0.5">۱۱۴ سورتیں مکی و مدنی</span>
        </div>

        {/* Hadith */}
        <div
          onClick={() => onNavigate('hadith')}
          className="relative bg-white p-4 rounded-none shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
            <Scroll size={20} />
          </div>
          <span className="text-xs font-bold text-slate-800 font-urdu">احادیث شریفہ</span>
          <span className="text-[10px] text-slate-400 font-urdu mt-0.5">صحیح بخاری و مسلم مجموعہ</span>
        </div>

        {/* Namaz Method */}
        <div
          onClick={() => onNavigate('namaz')}
          className="relative bg-white p-4 rounded-none shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
            <CheckCircle size={20} />
          </div>
          <span className="text-xs font-bold text-slate-800 font-urdu">نماز کا طریقہ</span>
          <span className="text-[10px] text-slate-400 font-urdu mt-0.5">ترجمہ اور طریقہ کار</span>
        </div>

        {/* Duas */}
        <div
          onClick={() => onNavigate('duas')}
          className="relative bg-white p-4 rounded-none shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
        >
          <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center mb-2">
            <Heart size={20} />
          </div>
          <span className="text-xs font-bold text-slate-800 font-urdu">مسنون دعائیں</span>
          <span className="text-[10px] text-slate-400 font-urdu mt-0.5">روزمرہ کلمات و اذکار</span>
        </div>

        {/* Tasbih Counter */}
        <div
          onClick={() => onNavigate('tasbih')}
          className="relative bg-white p-4 rounded-none shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
        >
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-2">
            <RotateCcw size={20} className="group-hover:rotate-45 transition-transform" />
          </div>
          <span className="text-xs font-bold text-slate-800 font-urdu">تسبیح کاؤنٹر</span>
          <span className="text-[10px] text-slate-400 font-urdu mt-0.5">کلک کر کے تسبیح پڑھیں</span>
        </div>

        {/* Qibla Direction */}
        <div
          onClick={() => onNavigate('qibla')}
          className="relative bg-white p-4 rounded-none shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
            <Compass size={20} className="group-hover:animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <span className="text-xs font-bold text-slate-800 font-urdu">قبلہ رخ سمت</span>
          <span className="text-[10px] text-slate-400 font-urdu mt-0.5">صحیح قبلہ سمت معلوم کریں</span>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          آیتِ روز — چکور کونے، ring-1، سفید
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="mx-4">
        <div className="text-center font-urdu text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1.5">✦ Verse of the Day ✦</div>
        <div className="bg-white rounded-none shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] p-4 text-center space-y-2.5">
          {loadingAyah ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
            </div>
          ) : (
            <>
              <p className="text-base leading-loose font-amiri text-slate-800" dir="rtl">
                {dailyAyah?.ar}
              </p>
              <p className="text-xs text-emerald-800 font-urdu leading-relaxed border-t border-slate-100 pt-2" dir="rtl">
                {dailyAyah?.ur}
              </p>
              <div className="text-[9px] text-slate-400 font-mono text-left tracking-tight">{dailyAyah?.ref}</div>
            </>
          )}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          حدیثِ روز — چکور کونے، ring-1، سفید، دائیں سبز border
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="mx-4">
        <div className="text-center font-urdu text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1.5">✦ Hadith of the Day ✦</div>
        <div className="bg-white rounded-none shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] border-r-4 border-r-emerald-600 p-4 text-center space-y-2.5">
          {loadingHadith ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed font-amiri text-slate-800 text-right font-medium" dir="rtl">
                {dailyHadith?.ar}
              </p>
              <p className="text-xs text-slate-600 font-urdu leading-relaxed border-t border-slate-100 pt-2 text-right" dir="rtl">
                {dailyHadith?.ur}
              </p>
              <div className="text-[9px] text-slate-400 font-mono text-left tracking-tight">{dailyHadith?.ref}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
