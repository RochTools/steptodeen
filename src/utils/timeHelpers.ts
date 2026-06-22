// ============ TIME UTILITY FUNCTIONS ============

export const formatTo12Hour = (timeStr?: string, defaultVal = ''): string => {
  const target = timeStr || defaultVal;
  if (!target) return '';
  if (target.toLowerCase().includes('am') || target.toLowerCase().includes('pm')) {
    return target;
  }
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

export const parseTimeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const getCurrentPrayer = (prayerTimes: { [key: string]: string }): string => {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const times = {
    fajr: parseTimeToMinutes(prayerTimes.fajr),
    zuhr: parseTimeToMinutes(prayerTimes.zuhr),
    asr: parseTimeToMinutes(prayerTimes.asr),
    maghrib: parseTimeToMinutes(prayerTimes.maghrib),
    isha: parseTimeToMinutes(prayerTimes.isha)
  };

  if (nowMins >= times.isha || nowMins < times.fajr) return 'isha';
  if (nowMins >= times.maghrib) return 'maghrib';
  if (nowMins >= times.asr) return 'asr';
  if (nowMins >= times.zuhr) return 'zuhr';
  return 'fajr';
};
