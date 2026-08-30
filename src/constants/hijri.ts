// ============ HIJRI DATE CONSTANTS & FUNCTIONS ============

export const hijriMonthsEnglish = [
  'Muharram', 'Safar', 'Rabi ul Awwal', 'Rabi ul Thani',
  'Jamadi ul Awwal', 'Jamadi ul Thani', 'Rajab', 'Shaban',
  'Ramadan', 'Shawwal', 'Dhul Qadah', 'Dhul Hijjah'
];

export const englishDays = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
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

  // ✅ پہلے cache چیک کریں
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  // ✅ API try کریں
  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/gToH?date=${today}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) throw new Error('API response not ok');

    const data = await res.json();

    if (data.code === 200 && data.data?.hijri) {
      const h = data.data.hijri;
      const monthIndex = parseInt(h.month.number) - 1;

      if (monthIndex >= 0 && monthIndex < 12) {
        const result = `${englishDays[d.getDay()]}, ${h.day} ${hijriMonthsEnglish[monthIndex]} ${h.year}H`;
        
        localStorage.setItem(cacheKey, result);
        
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('hijri_cache_') && k !== cacheKey)
            localStorage.removeItem(k);
        });

        return result;
      }
    }

    throw new Error('Invalid API data');

  } catch (err) {
    // ✅ صرف یہاں math fallback
    console.warn('Hijri API failed, using math:', err);
    const { hDay, hMonth, hYear } = getHijriMath(d);
    return `${englishDays[d.getDay()]}, ${hDay} ${hijriMonthsEnglish[hMonth - 1]} ${hYear}H`;
  }
};
