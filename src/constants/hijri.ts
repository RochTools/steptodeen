// ============ HIJRI DATE CONSTANTS & FUNCTIONS ============

export const hijriMonthsUrdu = [
  'محرم','صفر','ربیع الاول','ربیع الثانی',
  'جمادی الاول','جمادی الثانی','رجب','شعبان',
  'رمضان','شوال','ذوالقعدہ','ذوالحجہ'
];

export const urduDays = [
  'اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'
];

export const getHijriMath = (d: Date) => {
  const JD = Math.floor((d.getTime() / 86400000) + 2440587.5);
  let l = JD - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
            Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hMonth = Math.floor((24 * l) / 709);
  const hDay = l - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;
  return { hDay, hMonth, hYear };
};

export const fetchHijriDate = async (): Promise<string> => {
  const d = new Date();
  const today = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
  const cacheKey = `hijri_cache_${today}`;

  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`https://api.aladhan.com/v1/gToH?date=${today}`);
    const data = await res.json();
    if (data.code === 200) {
      const h = data.data.hijri;
      const result = `${urduDays[d.getDay()]}، ${h.day} ${hijriMonthsUrdu[parseInt(h.month.number) - 1]} ${h.year}ھ`;
      localStorage.setItem(cacheKey, result);
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('hijri_cache_') && k !== cacheKey) localStorage.removeItem(k);
      });
      return result;
    }
  } catch {
    // internet نہیں — math fallback
  }

  const { hDay, hMonth, hYear } = getHijriMath(d);
  return `${urduDays[d.getDay()]}، ${hDay} ${hijriMonthsUrdu[hMonth - 1]} ${hYear}ھ`;
};
