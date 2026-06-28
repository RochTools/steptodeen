import { useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentPrayer } from '../utils/timeHelpers';
import { fetchHijriDate } from '../constants/hijri';

const DEFAULT_COORDS = null;

export const usePrayerTimes = () => {
  const isMounted = useRef(true);

  const [prayerTimes, setPrayerTimes] = useState<{ [key: string]: string }>({
    fajr: '05:15',
    zuhr: '13:30',
    asr: '16:30',
    maghrib: '19:05',
    isha: '20:45'
  });
  const [currentPrayer, setCurrentPrayer] = useState<string>('zuhr');
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [todayDate, setTodayDate] = useState<string>('');

  // ============ HIJRI DATE ============
  useEffect(() => {
    fetchHijriDate().then(date => setTodayDate(date));
  }, []);

  // ============ FETCH PRAYER TIMES ============
  const fetchPrayerTimes = useCallback(async (lat: number, lng: number) => {
    const d = new Date();
    const today = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
    const cacheKey = `prayer_cache_${today}_${Math.round(lat * 10)}_${Math.round(lng * 10)}`;

    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      if (isMounted.current) setPrayerTimes(JSON.parse(cached));
      return;
    }

    try {
      const res = await fetch(
        `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=1`
      );
      const data = await res.json();
      if (data.code === 200) {
        const t = data.data.timings;
        const times = {
          fajr: t.Fajr,
          zuhr: t.Dhuhr,
          asr: t.Asr,
          maghrib: t.Maghrib,
          isha: t.Isha
        };
        if (isMounted.current) setPrayerTimes(times);
        localStorage.setItem(cacheKey, JSON.stringify(times));
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('prayer_cache_') && k !== cacheKey)
            localStorage.removeItem(k);
        });
      }
    } catch {
      console.warn('Prayer API failed, using cached/default times');
    }
  }, []);

  // ============ LOCATION ============
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      fetchPrayerTimes(31.5204, 74.3587); // Lahore default
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (isMounted.current) {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          };
          setUserCoords(coords);
          fetchPrayerTimes(coords.latitude, coords.longitude);
        }
      },
       (err) => {
  console.warn('Location denied:', err);
  if (isMounted.current) {
    setUserCoords(null);
    fetchPrayerTimes(31.5204, 74.3587);
  }
},
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, [fetchPrayerTimes]);


  // ============ INIT LOCATION ============
  useEffect(() => {
    requestLocation();
    return () => { isMounted.current = false; };
  }, [requestLocation]);

  // ============ PRAYER TIMER ============
  useEffect(() => {
    const update = () => setCurrentPrayer(getCurrentPrayer(prayerTimes));
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  return {
    prayerTimes,
    currentPrayer,
    userCoords,
    todayDate,
    requestLocation,
  };
};
