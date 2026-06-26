import React, { useState, useEffect } from 'react';
import { MapPin, LogIn, Compass, AlertTriangle, RotateCcw } from 'lucide-react';
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

const SECTIONS = [
  { icon: '📖', title: 'قرآن مجید', subtitle: '۱۱۴ سورتیں', type: 'سیکشن', nav: 'quran' },
  { icon: '📜', title: 'احادیث شریفہ', subtitle: 'صحیح بخاری و مسلم', type: 'سیکشن', nav: 'hadith' },
  { icon: '🤲', title: 'نماز کا طریقہ', subtitle: 'ترجمہ اور طریقہ', type: 'سیکشن', nav: 'namaz' },
  { icon: '💚', title: 'مسنون دعائیں', subtitle: 'روزمرہ اذکار', type: 'سیکشن', nav: 'duas' },
  { icon: '📿', title: 'تسبیح کاؤنٹر', subtitle: 'ذکر الٰہی', type: 'سیکشن', nav: 'tasbih' },
  { icon: '🧭', title: 'قبلہ رخ', subtitle: 'سمت معلوم کریں', type: 'سیکشن', nav: 'qibla' },
  { icon: '🕌', title: 'قریبی مساجد', subtitle: 'جمعہ کے اوقات', type: 'سیکشن', nav: 'mosques' },
];

const SURAH_MAP: { [key: string]: number } = {
  // اردو/عربی نام (بغیر اعراب)
  'فاتحہ': 1, 'بقرہ': 2, 'آل عمران': 3, 'نساء': 4, 'مائدہ': 5,
  'انعام': 6, 'اعراف': 7, 'انفال': 8, 'توبہ': 9, 'یونس': 10,
  'ہود': 11, 'یوسف': 12, 'رعد': 13, 'ابراہیم': 14, 'حجر': 15,
  'نحل': 16, 'اسراء': 17, 'کہف': 18, 'مریم': 19, 'طہ': 20,
  'انبیاء': 21, 'حج': 22, 'مومنون': 23, 'نور': 24, 'فرقان': 25,
  'شعراء': 26, 'نمل': 27, 'قصص': 28, 'عنکبوت': 29, 'روم': 30,
  'لقمان': 31, 'سجدہ': 32, 'احزاب': 33, 'سبا': 34, 'فاطر': 35,
  'یاسین': 36, 'یٰسین': 36, 'صافات': 37, 'ص': 38, 'زمر': 39,
  'غافر': 40, 'فصلت': 41, 'شوریٰ': 42, 'زخرف': 43, 'دخان': 44,
  'جاثیہ': 45, 'احقاف': 46, 'محمد': 47, 'فتح': 48, 'حجرات': 49,
  'ق': 50, 'ذاریات': 51, 'طور': 52, 'نجم': 53, 'قمر': 54,
  'رحمن': 55, 'الرحمن': 55, 'واقعہ': 56, 'حدید': 57, 'مجادلہ': 58,
  'حشر': 59, 'ممتحنہ': 60, 'صف': 61, 'جمعہ': 62, 'منافقون': 63,
  'تغابن': 64, 'طلاق': 65, 'تحریم': 66, 'ملک': 67, 'قلم': 68,
  'حاقہ': 69, 'معارج': 70, 'نوح': 71, 'جن': 72, 'مزمل': 73,
  'مدثر': 74, 'قیامہ': 75, 'انسان': 76, 'مرسلات': 77, 'نبا': 78,
  'نازعات': 79, 'عبس': 80, 'تکویر': 81, 'انفطار': 82, 'مطففین': 83,
  'انشقاق': 84, 'بروج': 85, 'طارق': 86, 'اعلیٰ': 87, 'غاشیہ': 88,
  'فجر': 89, 'بلد': 90, 'شمس': 91, 'لیل': 92, 'ضحیٰ': 93,
  'شرح': 94, 'انشراح': 94, 'تین': 95, 'علق': 96, 'قدر': 97,
  'بینہ': 98, 'زلزلہ': 99, 'عادیات': 100, 'قارعہ': 101, 'تکاثر': 102,
  'عصر': 103, 'ہمزہ': 104, 'فیل': 105, 'قریش': 106, 'ماعون': 107,
  'کوثر': 108, 'کافرون': 109, 'نصر': 110, 'مسد': 111, 'لہب': 111,
  'اخلاص': 112, 'فلق': 113, 'ناس': 114,

  // انگریزی نام
  'fatiha': 1, 'baqarah': 2, 'al-baqarah': 2, 'imran': 3, 'nisa': 4,
  'maidah': 5, 'anam': 6, 'araf': 7, 'anfal': 8, 'tawbah': 9,
  'yunus': 10, 'hud': 11, 'yusuf': 12, 'rad': 13, 'ibrahim': 14,
  'hijr': 15, 'nahl': 16, 'isra': 17, 'kahf': 18, 'maryam': 19,
  'taha': 20, 'anbiya': 21, 'hajj': 22, 'muminun': 23, 'nur': 24,
  'furqan': 25, 'shuara': 26, 'naml': 27, 'qasas': 28, 'ankabut': 29,
  'rum': 30, 'luqman': 31, 'sajdah': 32, 'ahzab': 33, 'saba': 34,
  'fatir': 35, 'yaseen': 36, 'yasin': 36, 'saffat': 37, 'zumar': 39,
  'ghafir': 40, 'fussilat': 41, 'shura': 42, 'zukhruf': 43, 'dukhan': 44,
  'jathiyah': 45, 'ahqaf': 46, 'muhammad': 47, 'fath': 48, 'hujurat': 49,
  'dhariyat': 51, 'tur': 52, 'najm': 53, 'qamar': 54,
  'rahman': 55, 'waqiah': 56, 'hadid': 57, 'mujadila': 58,
  'hashr': 59, 'mumtahina': 60, 'saff': 61, 'jumuah': 62, 'munafiqun': 63,
  'taghabun': 64, 'talaq': 65, 'tahrim': 66, 'mulk': 67, 'qalam': 68,
  'haqqah': 69, 'maarij': 70, 'nuh': 71, 'jinn': 72, 'muzzammil': 73,
  'muddaththir': 74, 'qiyamah': 75, 'insan': 76, 'mursalat': 77,
  'naba': 78, 'naziat': 79, 'abasa': 80, 'takwir': 81, 'infitar': 82,
  'mutaffifin': 83, 'inshiqaq': 84, 'buruj': 85, 'tariq': 86,
  'ala': 87, 'ghashiyah': 88, 'fajr': 89, 'balad': 90, 'shams': 91,
  'layl': 92, 'duha': 93, 'sharh': 94, 'tin': 95, 'alaq': 96,
  'qadr': 97, 'bayyinah': 98, 'zalzalah': 99, 'adiyat': 100,
  'qariah': 101, 'takathur': 102, 'asr': 103, 'humazah': 104,
  'fil': 105, 'quraysh': 106, 'maun': 107, 'kawthar': 108,
  'kafirun': 109, 'nasr': 110, 'masad': 111, 'ikhlas': 112,
  'falaq': 113, 'nas': 114,

  // عربی نام (اعراب کے ساتھ) - صرف وہ جو اوپر نہیں ہیں
  'الفاتحة': 1, 'البقرة': 2, 'النساء': 4, 'المائدة': 5, 'يس': 36,
  'الواقعة': 56, 'الملك': 67, 'الإخلاص': 112,
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
  isAuthenticated,
  isUserAuthenticated,
  userAuthName,
  authName
}) => {
  const [dailyAyah, setDailyAyah] = useState<{ ar: string; ur: string; ref: string } | null>(null);
  const [dailyHadith, setDailyHadith] = useState<{ ar: string; ur: string; ref: string } | null>(null);
  const [loadingAyah, setLoadingAyah] = useState(true);
  const [loadingHadith, setLoadingHadith] = useState(true);
  const [isDeviceOffline, setIsDeviceOffline] = useState<boolean>(!navigator.onLine);

  const [dateSlot, setDateSlot] = useState(0);
  const [dateVisible, setDateVisible] = useState(true);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setDateVisible(false);
      timeoutId = setTimeout(() => {
        setDateSlot(prev => (prev + 1) % 2);
        setDateVisible(true);
      }, 500);
    }, 3500);
    return () => { clearInterval(interval); clearTimeout(timeoutId); };
  }, []);

  const [prayerSlot, setPrayerSlot] = useState(0);
  const [slotVisible, setSlotVisible] = useState(true);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setSlotVisible(false);
      timeoutId = setTimeout(() => {
        setPrayerSlot(prev => (prev + 1) % 3);
        setSlotVisible(true);
      }, 600);
    }, 4000);
    return () => { clearInterval(interval); clearTimeout(timeoutId); };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ icon: string; title: string; subtitle?: string; type: string; action: () => void }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const parseSurahAyah = (q: string): { surah: number; ayah: number } | null => {
    const text = q.toLowerCase().trim();
    let surahNum = 0;
    let ayahNum = 0;
    const numMatch = text.match(/^(\d+)[:\s]+(\d+)$/);
    if (numMatch) return { surah: parseInt(numMatch[1]), ayah: parseInt(numMatch[2]) };
    const ayahMatch = text.match(/(?:آیت|ayat|ayah|verse|:)\s*(\d+)/i);
    if (ayahMatch) ayahNum = parseInt(ayahMatch[1]);
    for (const [key, num] of Object.entries(SURAH_MAP)) {
      if (text.includes(key.toLowerCase())) { surahNum = num; break; }
    }
    if (surahNum && ayahNum) return { surah: surahNum, ayah: ayahNum };
    return null;
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    const localResults = SECTIONS
      .filter(s => s.title.includes(q) || (s.subtitle || '').includes(q))
      .map(s => ({ icon: s.icon, title: s.title, subtitle: s.subtitle, type: s.type, action: () => onNavigate(s.nav) }));
    const mosqueResults = nearbyMosques
      .filter(m => m.name.includes(q))
      .slice(0, 2)
      .map(m => ({ icon: '🕌', title: m.name, subtitle: `جمعہ: ${m.jumah}`, type: 'مسجد', action: () => onOpenMosque(m) }));
    setSearchResults([...localResults, ...mosqueResults]);
    const parsed = parseSurahAyah(q);
    if (parsed) {
      setIsSearching(true);
      try {
        const res = await fetch(`https://api.alquran.cloud/v1/ayah/${parsed.surah}:${parsed.ayah}/editions/quran-uthmani,ur.jalandhry`);
        const json = await res.json();
        if (json.code === 200 && json.data?.length >= 2) {
          const ayahResult = {
            icon: '✨',
            title: json.data[0].text.substring(0, 50) + '...',
            subtitle: json.data[1].text.substring(0, 60) + '...',
            type: 'آیت',
            action: () => onNavigate('quran'),
          };
          setSearchResults(prev => [ayahResult, ...prev]);
        }
      } catch { }
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const local = SECTIONS
      .filter(s => s.title.includes(searchQuery) || (s.subtitle || '').includes(searchQuery))
      .map(s => ({ icon: s.icon, title: s.title, subtitle: s.subtitle, type: s.type, action: () => onNavigate(s.nav) }));
    const mosques = nearbyMosques
      .filter(m => m.name.includes(searchQuery))
      .slice(0, 2)
      .map(m => ({ icon: '🕌', title: m.name, subtitle: `جمعہ: ${m.jumah}`, type: 'مسجد', action: () => onOpenMosque(m) }));
    setSearchResults([...local, ...mosques]);
  }, [searchQuery, nearbyMosques, onNavigate, onOpenMosque]);

  useEffect(() => {
    const handleOnline = () => setIsDeviceOffline(false);
    const handleOffline = () => setIsDeviceOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
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
        if (json.code === 200 && json.data?.length >= 2) {
          setDailyAyah({ ar: json.data[0].text, ur: json.data[1].text, ref: `سورۃ ${SURAH_NAMES_UR[chosen.s - 1]} : آیت ${chosen.a}` });
        } else {
          setDailyAyah({ ar: "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ ۚ عَلَيْهِ تَوَكَّلْتُ وَإِلَيْهِ أُنِيبُ", ur: "اور میری توفیق صرف اللہ کی طرف سے ہے، اسی پر میں نے بھروسہ کیا اور اسی کی طرف رجوع کرتا ہوں۔", ref: "سورۃ ہود : آیت ۸۸" });
        }
        setLoadingAyah(false);
      })
      .catch(() => {
        setDailyAyah({ ar: "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ ۚ عَلَيْهِ تَوَكَّلْتُ وَإِلَيْهِ أُنِيبُ", ur: "اور میری توفیق صرف اللہ کی طرف سے ہے، اسی پر میں نے بھروسہ کیا اور اسی کی طرف رجوع کرتا ہوں۔", ref: "سورۃ ہود : آیت ۸۸" });
        setLoadingAyah(false);
      });

    const sectionNum = (Math.floor(dayOfYear / 10) % 97) + 1;
    Promise.all([
      fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukharisherif/sections/${sectionNum}.min.json`).then(r => r.json()),
      fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-bukharisherif/sections/${sectionNum}.min.json`).then(r => r.json())
    ])
      .then(([resAr, resUr]) => {
        const arHadiths = resAr.hadiths || [];
        const urHadiths = resUr.hadiths || [];
        if (arHadiths.length > 0) {
          const hadithIdx = dayOfYear % arHadiths.length;
          const chosenAr = arHadiths[hadithIdx];
          const chosenUr = urHadiths.find((h: any) => h.hadithnumber === chosenAr.hadithnumber) || {};
          setDailyHadith({ ar: chosenAr.text || '', ur: chosenUr.text || '', ref: `صحیح بخاری - حدیث نمبر ${chosenAr.hadithnumber}` });
        } else {
          setDailyHadith({ ar: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى", ur: "اعمال کا دارومدار نیتوں پر ہے اور ہر شخص کو وہی ملے گا جو اس نے نیت کی۔", ref: "صحیح بخاری - حدیث نمبر ۱" });
        }
        setLoadingHadith(false);
      })
      .catch(() => {
        setDailyHadith({ ar: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى", ur: "اعمال کا دارومدار نیتوں پر ہے اور ہر شخص کو وہی ملے گا جو اس نے نیت کی۔", ref: "صحیح بخاری - حدیث نمبر ۱" });
        setLoadingHadith(false);
      });
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
  };

  return (
    <div className="pb-16 animate-fadeIn bg-slate-50">

      {/* ═══════════ TOP ═══════════ */}
      <div className="relative text-white overflow-hidden" style={{ backgroundImage: "url('/mosque-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center 30%' }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/70 pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between px-4 pt-4 mb-3">
          <div className="flex flex-col gap-1.5">
            {isAuthenticated ? (
              <button type="button" onClick={() => onNavigate('imam-login')} className="flex items-center gap-1.5 py-1 px-3 bg-amber-500/25 backdrop-blur-sm border border-amber-400/40 text-amber-200 font-urdu font-bold text-[11px] rounded-full active:scale-95 cursor-pointer select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                {authName || 'امام'}
              </button>
            ) : isUserAuthenticated ? (
              <button type="button" onClick={() => onNavigate('user-dashboard')} className="flex items-center gap-1.5 py-1 px-3 bg-white/15 backdrop-blur-sm border border-white/30 text-white font-urdu font-bold text-[11px] rounded-full active:scale-95 cursor-pointer select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                {userAuthName}
              </button>
            ) : (
              <button type="button" onClick={() => onNavigate('login-splash')} className="flex items-center gap-1.5 py-1 px-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-urdu font-bold text-[11px] rounded-full active:scale-95 cursor-pointer select-none">
                <LogIn size={10} className="text-amber-300 shrink-0" />
                لاگ ان
              </button>
            )}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
              </span>
              <span className="text-[10px] text-amber-100 font-urdu font-medium drop-shadow">{getNextPrayerCountdown()}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="h-7" style={{ opacity: dateVisible ? 1 : 0, transition: 'opacity 0.5s ease' }}>
              {dateSlot === 0 ? (
                <div className="text-[12px] font-urdu font-bold text-amber-300 leading-tight">{todayDate || '—'}</div>
              ) : (
                <div className="text-[12px] font-urdu text-white/80 leading-tight">{todayDate}</div>
              )}
            </div>
            {(() => {
              const p = currentPrayer;
              const rawTime = prayerTimes[p] || '--:--';
              const parseToMins = (t: string) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
              const fmt = (mins: number) => {
                const h24 = Math.floor((mins % 1440) / 60), m = mins % 60;
                const ampm = h24 >= 12 ? 'PM' : 'AM';
                let h12 = h24 % 12; h12 = h12 || 12;
                return `${h12 < 10 ? '0' : ''}${h12}:${m < 10 ? '0' : ''}${m} ${ampm}`;
              };
              const startMins = parseToMins(rawTime);
              const jOffset = p === 'maghrib' ? 10 : p === 'fajr' ? 30 : 15;
              const slots = [
                { label: 'آغازِ وقت', time: formatTo12Hour(rawTime), color: 'text-white' },
                { label: 'جماعت کا وقت', time: fmt(startMins + jOffset), color: 'text-amber-300' },
                { label: 'انتہائی وقت', time: p === 'fajr' ? fmt(startMins + 85) : p === 'zuhr' ? formatTo12Hour(prayerTimes['asr']) : p === 'asr' ? formatTo12Hour(prayerTimes['maghrib']) : p === 'maghrib' ? formatTo12Hour(prayerTimes['isha']) : formatTo12Hour(prayerTimes['fajr']), color: 'text-white' },
              ];
              const current = slots[prayerSlot];
              return (
                <div style={{ opacity: slotVisible ? 1 : 0, transition: 'opacity 0.5s ease' }}>
                  <div className="text-[9px] text-white/50 font-urdu">{current.label}</div>
                  <div className={`text-[20px] font-mono font-bold ${current.color} leading-tight`}>{current.time}</div>
                  <div className="flex gap-1 mt-1">
                    {slots.map((_, i) => (
                      <span key={i} className={`h-0.5 rounded-full transition-all duration-300 ${i === prayerSlot ? 'bg-amber-400 w-4' : 'bg-white/25 w-1.5'}`} />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

{/* سرچ بار + مینو بٹن */}
<div className="relative z-10 px-4 mb-3 flex items-center gap-2 w-full">
  <div className="relative flex-1">
    <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      placeholder="سورہ، آیت یا سیکشن تلاش کریں..."
      className="w-full py-2.5 px-4 pr-10 bg-white/15 backdrop-blur-md border border-white/30 text-white placeholder-white/60 rounded-xl text-[12px] font-urdu outline-none focus:border-amber-400/70 transition-all"
    />
    <button
      onClick={handleSearch}
      className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-white/70 hover:text-white transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.3-4.3"/>
      </svg>
    </button>
  </div>

  <button
    onClick={() => onNavigate('menu')}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
      borderRadius: 8,
      background: "rgba(255,255,255,0.15)",
      color: "#ffffff",
      border: "1px solid rgba(255,255,255,0.3)",
      cursor: "pointer",
      flexShrink: 0,
    }}
  >
    <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
      <circle cx="10" cy="4" r="1.8" />
      <circle cx="10" cy="10" r="1.8" />
      <circle cx="10" cy="16" r="1.8" />
    </svg>
  </button>
</div>

{/* سرچ نتائج */}
{searchResults.length > 0 && (
  <div className="absolute left-4 right-4 top-12 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
    {searchResults.map((result, i) => (
      <div key={i} onClick={() => { result.action(); setSearchQuery(''); setSearchResults([]); }} className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors">
        <span className="text-lg shrink-0">{result.icon}</span>
        <div className="flex-1 text-right">
          <div className="text-[12px] font-urdu font-bold text-slate-800">{result.title}</div>
          {result.subtitle && <div className="text-[10px] text-slate-400 font-urdu">{result.subtitle}</div>}
        </div>
        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold shrink-0">{result.type}</span>
      </div>
    ))}
  </div>
)}

{isSearching && (
  <div className="absolute left-4 right-4 top-12 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 flex items-center justify-center gap-2">
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600" />
    <span className="text-[12px] text-slate-500 font-urdu">تلاش جاری ہے...</span>
  </div>
)}

<div className="relative z-10 px-4 pb-8">
  {dailyAyah ? (
    <p className="text-[11px] text-white/65 font-amiri leading-relaxed text-center drop-shadow" dir="rtl">
      {dailyAyah.ar.length > 80 ? dailyAyah.ar.substring(0, 80) + '...' : dailyAyah.ar}
    </p>
  ) : (
    <p className="text-[11px] text-white/50 font-amiri text-center" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
  )}
</div>
      </div>
      {/* ═══════════ نیچے کا مواد ═══════════ */}
<div className="relative -mt-4 bg-slate-50 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] space-y-4 pt-5">
        {isDeviceOffline && (
          <div className="mx-4 p-2.5 bg-amber-50/70 shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] flex items-center gap-2.5 text-amber-900 animate-fadeIn">
            <AlertTriangle size={15} className="shrink-0 text-amber-600" />
            <div className="text-[11px] font-urdu leading-relaxed text-right flex-1">
              آف لائن موڈ: آپ کا انٹرنیٹ کنکشن منقطع ہے، ایپ ابھی آف لائن موڈ میں کام کر رہی ہے۔
            </div>
          </div>
        )}

        {/* مسجد کارڈ */}
        <div className="mx-4 bg-white rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-700 font-bold cursor-pointer font-urdu hover:underline" onClick={() => onNavigate('mosques')}>تمام دیکھئے ←</span>
            <h3 className="text-xs font-bold text-slate-800 font-urdu flex items-center gap-1.5 uppercase tracking-tight">
              <Compass size={15} className="text-emerald-600" />
              قریبی مساجد کے اوقاتِ جمعہ
            </h3>
          </div>
          {!userCoords ? (
            <div className="p-4 bg-slate-50 rounded-lg text-center space-y-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
              <p className="text-[11px] text-slate-600 font-urdu leading-relaxed">اپنا جی پی ایس لوکیشن آن کریں تاکہ آپ کو بالکل قریبی مساجد اور ان کی جماعت کے اوقات ریئل ٹائم نظر آئیں۔</p>
              <button onClick={requestLocation} className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-urdu font-bold shadow-sm flex items-center gap-1 mx-auto transition-colors">
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
                  const mosquesWithDistance = nearbyMosques.map(mosque => ({ mosque, distance: calculateDistance(userCoords.latitude, userCoords.longitude, mosque.latitude, mosque.longitude) }));
                  return mosquesWithDistance.sort((a, b) => a.distance - b.distance).slice(0, 3).map(({ mosque, distance }) => (
                    <div key={mosque.id} onClick={() => onOpenMosque(mosque)} className="p-3 bg-slate-50/50 hover:bg-emerald-50/35 transition-all cursor-pointer shadow-[0_1px_5px_rgba(0,0,0,0.05)] flex items-center justify-between group">
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
                  ));
                })()
              )}
            </div>
          )}
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            مین گرڈ کارڈز — PNG تصاویر کے ساتھ
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="mx-4 grid grid-cols-2 gap-3 pb-1">

          {/* قرآن مجید */}
          <div onClick={() => onNavigate('quran')} className="relative bg-white p-4 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer flex flex-col items-center justify-center text-center group">
            <div className="w-12 h-12 rounded-xl overflow-hidden mb-2 shadow-sm">
              <img src="/Quran.jpeg" alt="قرآن مجید" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-bold text-slate-800 font-urdu">قرآن مجید</span>
            <span className="text-[10px] text-slate-400 font-urdu mt-0.5">۱۱۴ سورتیں مکی و مدنی</span>
          </div>

          {/* احادیث شریفہ */}
          <div onClick={() => onNavigate('hadith')} className="relative bg-white p-4 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer flex flex-col items-center justify-center text-center group">
            <div className="w-12 h-12 rounded-xl overflow-hidden mb-2 shadow-sm">
              <img src="/Hadith.jpg" alt="احادیث شریفہ" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-bold text-slate-800 font-urdu">احادیث شریفہ</span>
            <span className="text-[10px] text-slate-400 font-urdu mt-0.5">صحیح بخاری و مسلم مجموعہ</span>
          </div>

          {/* نماز کا طریقہ */}
          <div onClick={() => onNavigate('namaz')} className="relative bg-white p-4 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer flex flex-col items-center justify-center text-center group">
            <div className="w-12 h-12 rounded-xl overflow-hidden mb-2 shadow-sm">
              <img src="/namaz.png" alt="نماز کا طریقہ" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-bold text-slate-800 font-urdu">نماز کا طریقہ</span>
            <span className="text-[10px] text-slate-400 font-urdu mt-0.5">ترجمہ اور طریقہ کار</span>
          </div>

          {/* مسنون دعائیں */}
          <div onClick={() => onNavigate('duas')} className="relative bg-white p-4 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer flex flex-col items-center justify-center text-center group">
            <div className="w-12 h-12 rounded-xl overflow-hidden mb-2 shadow-sm">
              <img src="/dua.jpg" alt="مسنون دعائیں" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-bold text-slate-800 font-urdu">مسنون دعائیں</span>
            <span className="text-[10px] text-slate-400 font-urdu mt-0.5">روزمرہ کلمات و اذکار</span>
          </div>

          {/* تسبیح کاؤنٹر */}
          <div onClick={() => onNavigate('tasbih')} className="relative bg-white p-4 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer flex flex-col items-center justify-center text-center group">
            <div className="w-12 h-12 rounded-xl overflow-hidden mb-2 shadow-sm">
              <img src="/tasbeeh.jpg" alt="تسبیح کاؤنٹر" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-bold text-slate-800 font-urdu">تسبیح کاؤنٹر</span>
            <span className="text-[10px] text-slate-400 font-urdu mt-0.5">تسبیح پڑھیں</span>
          </div>

          {/* قبلہ رخ */}
          <div onClick={() => onNavigate('qibla')} className="relative bg-white p-4 rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] transition-all cursor-pointer flex flex-col items-center justify-center text-center group">
            <div className="w-12 h-12 rounded-xl overflow-hidden mb-2 shadow-sm">
              <img src="/Qiblasemt.jpg" alt="قبلہ رخ" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-bold text-slate-800 font-urdu">قبلہ رخ سمت</span>
            <span className="text-[10px] text-slate-400 font-urdu mt-0.5">صحیح قبلہ سمت معلوم کریں</span>
          </div>

        </div>

        {/* آیتِ روز */}
        <div className="mx-4">
          <div className="text-center font-urdu text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1.5">✦ Verse of the Day ✦</div>
          <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] p-4 text-center space-y-2.5">
            {loadingAyah ? (
              <div className="flex items-center justify-center py-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div></div>
            ) : (
              <>
                <p className="text-base leading-loose font-amiri text-slate-800" dir="rtl">{dailyAyah?.ar}</p>
                <p className="text-xs text-emerald-800 font-urdu leading-relaxed border-t border-slate-100 pt-2" dir="rtl">{dailyAyah?.ur}</p>
                <div className="text-[9px] text-slate-400 font-mono text-left tracking-tight">{dailyAyah?.ref}</div>
              </>
            )}
          </div>
        </div>

        {/* حدیثِ روز */}
        <div className="mx-4">
          <div className="text-center font-urdu text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-1.5">✦ Hadith of the Day ✦</div>
          <div className="bg-white rounded-lg shadow-[0_2px_10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(0,0,0,0.03)] border-r-4 border-r-emerald-600 p-4 text-center space-y-2.5">
            {loadingHadith ? (
              <div className="flex items-center justify-center py-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div></div>
            ) : (
              <>
                <p className="text-sm leading-relaxed font-amiri text-slate-800 text-right font-medium" dir="rtl">{dailyHadith?.ar}</p>
                <p className="text-xs text-slate-600 font-urdu leading-relaxed border-t border-slate-100 pt-2 text-right" dir="rtl">{dailyHadith?.ur}</p>
                <div className="text-[9px] text-slate-400 font-mono text-left tracking-tight">{dailyHadith?.ref}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
