import React, { Component } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  initializeFirebaseAtRuntime,
  getLocalMosques,
  saveLocalMosque,
  deleteLocalMosque,
  subscribeToAuthState
} from './firebase';
import { onSnapshot, collection, addDoc, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { HomeView } from './components/HomeView';
import { QuranView } from './components/QuranView';
import { SurahReader } from './components/SurahReader';
import { HadithView } from './components/HadithView';
import { NamazView } from './components/NamazView';
import { DuasView } from './components/DuasView';
import { MosqueFinderView } from './components/MosqueFinderView';
import { ImamDashboard } from './components/ImamDashboard';
import { TasbihView } from './components/TasbihView';
import { QiblaView } from './components/QiblaView';
import { initFCM, listenForegroundMessages } from './utils/fcm';
import { UserDashboard } from './components/UserDashboard';
import { LoginChoiceView } from './components/LoginChoiceView';
import { Mosque } from './types';
import { BookOpen, Scroll, Heart, Compass, Bell, X, MapPin } from 'lucide-react';

// ============ UTILITY FUNCTIONS ============

const formatTo12Hour = (timeStr?: string, defaultVal = '') => {
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

const parseTimeToMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// calculatePrayerTimeWithOffset removed - using AlAdhan API instead

const getCurrentPrayer = (prayerTimes: { [key: string]: string }) => {
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

// ============ HIJRI DATE HELPERS ============

const hijriMonthsUrdu = ['محرم','صفر','ربیع الاول','ربیع الثانی','جمادی الاول','جمادی الثانی','رجب','شعبان','رمضان','شوال','ذوالقعدہ','ذوالحجہ'];
const urduDays = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];

const getHijriMath = (d: Date) => {
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

const fetchHijriDate = async (): Promise<string> => {
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
      Object.keys(localStorage).forEach(k => { if (k.startsWith('hijri_cache_') && k !== cacheKey) localStorage.removeItem(k); });
      return result;
    }
  } catch {
    // internet نہیں — math fallback
  }

  const { hDay, hMonth, hYear } = getHijriMath(d);
  return `${urduDays[d.getDay()]}، ${hDay} ${hijriMonthsUrdu[hMonth - 1]} ${hYear}ھ`;
};

const validateMosqueId = (id: any): id is string => {
  return typeof id === 'string' && id.length > 0;
};

const parseSavedMosques = (savedData: string | null): string[] => {
  if (!savedData) return [];
  try {
    const parsed = JSON.parse(savedData);
    if (!Array.isArray(parsed)) return [];
    if (parsed.length === 0) return [];
    if (typeof parsed[0] === 'object' && parsed[0] !== null) {
      return parsed.filter((m: any) => m && validateMosqueId(m.id)).map((m: any) => m.id);
    }
    return parsed.filter(validateMosqueId);
  } catch {
    return [];
  }
};

const DEFAULT_COORDS = { latitude: 21.4225, longitude: 39.8262 };

// ============ ERROR BOUNDARY ============

class ErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('StepToDeen Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
          <div className="text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h2 className="text-xl font-bold text-slate-800 font-urdu">
              کچھ غلط ہو گیا
            </h2>
            <p className="text-sm text-slate-600">
              براہ کرم ایپ کو دوبارہ شروع کریں
            </p>
            <button
              onClick={this.handleRetry}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-urdu hover:bg-emerald-700 transition-colors"
            >
              دوبارہ کوشش کریں
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============ MAIN APP COMPONENT ============

export default function App() {
  // ============ INITIAL VIEW ============
  const getInitialView = useCallback(() => {
    const imamAuth = localStorage.getItem('imam_authenticated') === 'true';
    const userAuth = localStorage.getItem('user_authenticated') === 'true';
    const otpAuth = localStorage.getItem('otp_authenticated') === 'true';
    if (imamAuth || userAuth || otpAuth) return 'home';
    return 'login-splash';
  }, []);

  // ============ NAVIGATION HISTORY STACK ============
  const [navigationHistory, setNavigationHistory] = useState<string[]>(() => [getInitialView()]);
  const currentView = navigationHistory[navigationHistory.length - 1];

  const navigateTo = useCallback((newView: string) => {
    setNavigationHistory(prev => {
      if (prev[prev.length - 1] === newView) return prev;
      return [...prev, newView];
    });
  }, []);

  const goBack = useCallback(() => {
    setNavigationHistory(prev => {
      if (prev.length <= 1) return ['home'];
      return prev.slice(0, -1);
    });
  }, []);

  const goHome = useCallback(() => {
    setNavigationHistory(['home']);
    setSelectedSurahNum(null);
    setSelectedMosque(null);
  }, []);

  // ============ AUTH STATES ============
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('imam_authenticated') === 'true';
  });
  const [authEmail, setAuthEmail] = useState<string>(() => {
    return localStorage.getItem('imam_email') || '';
  });
  const [authName, setAuthName] = useState<string>(() => {
    return localStorage.getItem('imam_name') || '';
  });
  const [authUid, setAuthUid] = useState<string>(() => {
    return localStorage.getItem('imam_uid') || '';
  });

  const [isUserAuthenticated, setIsUserAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('user_authenticated') === 'true';
  });
  const [userAuthName, setUserAuthName] = useState<string>(() => {
    return localStorage.getItem('user_name') || '';
  });
  const [userAuthPhone, setUserAuthPhone] = useState<string>(() => {
    return localStorage.getItem('user_phone') || '';
  });

  // OTP-based user auth
  const [isOTPAuthenticated, setIsOTPAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('otp_authenticated') === 'true';
  });
  const [otpUserEmail, setOtpUserEmail] = useState<string>(() => {
    return localStorage.getItem('otp_user_email') || '';
  });
  const [otpUserName, setOtpUserName] = useState<string>(() => {
    return localStorage.getItem('otp_user_name') || '';
  });

  // ============ LOCAL STORAGE SYNC ============
  useEffect(() => {
    localStorage.setItem('imam_authenticated', String(isAuthenticated));
    localStorage.setItem('imam_email', authEmail);
    localStorage.setItem('imam_name', authName);
    localStorage.setItem('imam_uid', authUid);
  }, [isAuthenticated, authEmail, authName, authUid]);

  useEffect(() => {
    localStorage.setItem('user_authenticated', String(isUserAuthenticated));
    localStorage.setItem('user_name', userAuthName);
    localStorage.setItem('user_phone', userAuthPhone);
  }, [isUserAuthenticated, userAuthName, userAuthPhone]);

  useEffect(() => {
    localStorage.setItem('otp_authenticated', String(isOTPAuthenticated));
    localStorage.setItem('otp_user_email', otpUserEmail);
    localStorage.setItem('otp_user_name', otpUserName);
  }, [isOTPAuthenticated, otpUserEmail, otpUserName]);

  // ============ COMBINED USER STATE ============
  const isAnyUser = isUserAuthenticated || isOTPAuthenticated;
  const currentUserName = userAuthName || otpUserName;
  const currentUserEmail = userAuthPhone || otpUserEmail;

  // ============ MOSQUES & LOCATION STATES ============
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(null);
  const [realtimeDb, setRealtimeDb] = useState<any>(null);
  const [realtimeAuth, setRealtimeAuth] = useState<any>(null);
  const [realFirebaseActive, setRealFirebaseActive] = useState<boolean>(false);

  const [savedPopupMosques, setSavedPopupMosques] = useState<string[]>(() => {
    return parseSavedMosques(localStorage.getItem('user_saved_mosques'));
  });

  const [prayerTimes, setPrayerTimes] = useState<{ [key: string]: string }>({
    fajr: '05:15', zuhr: '13:30', asr: '16:30', maghrib: '19:05', isha: '20:45'
  });
  const [currentPrayer, setCurrentPrayer] = useState<string>('zuhr');
  const [selectedSurahNum, setSelectedSurahNum] = useState<number | null>(null);
  const [todayDate, setTodayDate] = useState<string>('');

  // ============ HIJRI DATE FETCH ============
  useEffect(() => {
    fetchHijriDate().then(date => setTodayDate(date));
  }, []);
  
  const isMounted = useRef(true);

  // ============ FETCH PRAYER TIMES FROM API ============
  const fetchPrayerTimes = useCallback(async (lat: number, lng: number) => {
    const d = new Date();
    const today = `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
    const cacheKey = `prayer_cache_${today}_${Math.round(lat * 10)}_${Math.round(lng * 10)}`;

    // پہلے cache چیک کریں
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      if (isMounted.current) setPrayerTimes(JSON.parse(cached));
      return;
    }

    try {
      // method=1 = University of Islamic Sciences, Karachi
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
          if (k.startsWith('prayer_cache_') && k !== cacheKey) localStorage.removeItem(k);
        });
      }
    } catch {
      console.warn('StepToDeen: Prayer API failed, using cached/default times');
    }
  }, []);

  // ============ LOCATION FUNCTIONS ============
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setUserCoords(DEFAULT_COORDS);
      fetchPrayerTimes(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (isMounted.current) {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          fetchPrayerTimes(pos.coords.latitude, pos.coords.longitude);
        }
      },
      (err) => {
        console.warn("StepToDeen: Location permission denied or unavailable.", err);
        if (isMounted.current) {
          const lastCoords = localStorage.getItem('last_known_coords');
          const coords = lastCoords ? JSON.parse(lastCoords) : DEFAULT_COORDS;
          setUserCoords(coords);
          fetchPrayerTimes(coords.latitude, coords.longitude);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }, [fetchPrayerTimes]);

  useEffect(() => {
    if (userCoords) {
      localStorage.setItem('last_known_coords', JSON.stringify(userCoords));
    }
  }, [userCoords]);

  useEffect(() => {
    requestLocation();
    return () => { isMounted.current = false; };
  }, [requestLocation]);

  // ============ PRAYER TIMER ============
  useEffect(() => {
    const updateActivePrayer = () => setCurrentPrayer(getCurrentPrayer(prayerTimes));
    updateActivePrayer();
    const interval = setInterval(updateActivePrayer, 30000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  // ============ FCM INITIALIZATION ============
  useEffect(() => {
    let isMountedLocal = true;
    let unsubscribe: (() => void) | undefined;

    if (isAnyUser || isAuthenticated) {
      initFCM(authUid || undefined).then(token => {
        if (isMountedLocal && token) console.log('FCM ready ✅');
      }).catch(err => console.warn('FCM initialization failed:', err));

      unsubscribe = listenForegroundMessages();
    }

    return () => {
      isMountedLocal = false;
      if (unsubscribe) unsubscribe();
    };
  }, [isAnyUser, isAuthenticated, authUid]);

  // ============ FIREBASE SETUP ============
  useEffect(() => {
    let unsubMosques: (() => void) | null = null;
    let unsubAuth: (() => void) | null = null;

    const runSetup = async () => {
      try {
        const { db: loadedDb, auth: loadedAuth, isRealFirebase: loadedIsReal } = await initializeFirebaseAtRuntime();

        if (!isMounted.current) return;

        setRealtimeDb(loadedDb);
        setRealtimeAuth(loadedAuth);
        setRealFirebaseActive(loadedIsReal);

        if (loadedIsReal && loadedDb && loadedAuth) {
          unsubAuth = subscribeToAuthState(loadedAuth, async (user) => {
            if (!isMounted.current) return;

            if (user) {
              setAuthEmail(user.email || '');
              setAuthName(user.displayName || user.email?.split('@')[0] || '');
              setAuthUid(user.uid);

              try {
                const userDocSnap = await getDoc(doc(loadedDb, 'users', user.uid));
                const role = userDocSnap.exists() ? userDocSnap.data()?.role : 'user';

                if (isMounted.current) {
                  if (role === 'imam') {
                    setIsAuthenticated(true);
                    setIsUserAuthenticated(false);
                    setIsOTPAuthenticated(false);
                  } else {
                    setIsAuthenticated(false);
                    setIsUserAuthenticated(true);
                    setUserAuthName(user.displayName || user.email?.split('@')[0] || '');
                  }
                }
              } catch (error) {
                console.warn('Error fetching user role:', error);
              }
            }
          });

          unsubMosques = onSnapshot(
            collection(loadedDb, 'mosques'),
            (snapshot) => {
              if (isMounted.current) {
                const list: Mosque[] = [];
                snapshot.forEach((docSnap) => {
                  list.push({ id: docSnap.id, ...docSnap.data() } as Mosque);
                });
                setMosques(list);
              }
            },
            (error) => {
              console.error('StepToDeen: Firestore load failed.', error);
              if (isMounted.current) setMosques(getLocalMosques());
            }
          );
        } else {
          if (isMounted.current) setMosques(getLocalMosques());
        }
      } catch (error) {
        console.error('Firebase initialization failed:', error);
        if (isMounted.current) setMosques(getLocalMosques());
      }
    };

    runSetup();
    return () => {
      isMounted.current = false;
      if (unsubMosques) unsubMosques();
      if (unsubAuth) unsubAuth();
    };
  }, []);

  // ============ BACK BUTTON HANDLER ============
  const handleBack = useCallback(() => {
    if (selectedMosque) { setSelectedMosque(null); return; }
    // سورہ سے پیچھے جائیں تو quran list پر جائیں
    if (currentView === 'surah') {
      setSelectedSurahNum(null);
      setNavigationHistory(prev => {
        const without = prev.filter(v => v !== 'surah');
        return without.length > 0 ? without : ['quran'];
      });
      return;
    }
    goBack();
  }, [selectedMosque, currentView, goBack]);

  useEffect(() => {
    if (currentView !== 'surah') setSelectedSurahNum(null);
  }, [currentView]);

  // ============ ANDROID BACK BUTTON (PWA) ============
  useEffect(() => {
    // App شروع ہونے پر 2 entries ڈالیں تاکہ history کبھی خالی نہ ہو
    window.history.replaceState({ view: 'base' }, '', '#base');
    window.history.pushState({ view: currentView }, '', `#${currentView}`);
  }, []);

  useEffect(() => {
    // ہر view change پر current entry replace کریں
    window.history.replaceState({ view: currentView }, '', `#${currentView}`);
    // پھر ایک اور push تاکہ Back کے لیے entry ہمیشہ موجود ہو
    window.history.pushState({ view: currentView }, '', `#${currentView}`);
  }, [currentView]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // واپس ایک entry push کریں تاکہ history خالی نہ ہو
      window.history.pushState({ view: currentView }, '', `#${currentView}`);
      handleBack();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handleBack, currentView]);

  // ============ MOSQUE CRUD ============
  const handleAddOrUpdateMosque = async (data: Omit<Mosque, 'id' | 'updatedAt'> & { id?: string }) => {
    const freshMosque = { ...data, updatedAt: new Date().toISOString() };
    if (realFirebaseActive && realtimeDb) {
      try {
        const { id, ...firestoreData } = freshMosque;
        if (data.id) {
          await setDoc(doc(realtimeDb, 'mosques', data.id), firestoreData);
        } else {
          await addDoc(collection(realtimeDb, 'mosques'), firestoreData);
        }
      } catch (error) {
        console.error("StepToDeen: Failed to save to Firestore.", error);
        setMosques(saveLocalMosque(freshMosque));
      }
    } else {
      setMosques(saveLocalMosque(freshMosque));
    }
  };

  const handleDeleteMosque = async (id: string) => {
    if (realFirebaseActive && realtimeDb) {
      try {
        await deleteDoc(doc(realtimeDb, 'mosques', id));
      } catch (error) {
        console.error("StepToDeen: Failed to delete from Firestore.", error);
        setMosques(deleteLocalMosque(id));
      }
    } else {
      setMosques(deleteLocalMosque(id));
    }
  };

  // ============ SURAH SELECTION ============
  const handleSelectSurah = useCallback((surahNum: number) => {
    setSelectedSurahNum(surahNum);
    navigateTo('surah');
  }, [navigateTo]);

  // ============ SAVE/UNSAVE MOSQUE ============
  const handleToggleSaveMosque = useCallback((mosque: Mosque) => {
    try {
      const savedData = localStorage.getItem('user_saved_mosques');
      let currentList: Mosque[] = [];
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (Array.isArray(parsed)) {
            if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
              currentList = parsed;
            } else if (parsed.length > 0 && typeof parsed[0] === 'string') {
              currentList = parsed.filter(validateMosqueId).map((id: string) => ({ id } as Mosque));
            }
          }
        } catch { currentList = []; }
      }
      const exists = currentList.find(m => m.id === mosque.id);
      const newList = exists ? currentList.filter(m => m.id !== mosque.id) : [...currentList, mosque];
      localStorage.setItem('user_saved_mosques', JSON.stringify(newList));
      setSavedPopupMosques(newList.map((m: Mosque) => m.id));
    } catch (error) {
      console.error('Error saving mosque:', error);
    }
  }, []);

  // ============ MOSQUE ALERT ============
  const handleMosqueAlert = useCallback((mosque: Mosque) => {
    try {
      const alertList = JSON.parse(localStorage.getItem('mosque_alerts') || '[]');
      if (!alertList.includes(mosque.id)) {
        alertList.push(mosque.id);
        localStorage.setItem('mosque_alerts', JSON.stringify(alertList));
      }
      alert(`StepToDeen الرٹ:\n\nآپ کو ${mosque.name} کی نماز کے بدلتے ہوئے اوقات کی ریئل ٹائم اپڈیٹس کا نوٹیفیکیشن آن کر دیا گیا ہے۔`);
    } catch (error) {
      console.error('Error setting alert:', error);
    }
  }, []);

  // ============ OTP USER LOGIN HANDLER ============
  const handleOTPUserLogin = useCallback((name: string, email: string) => {
    setIsOTPAuthenticated(true);
    setOtpUserEmail(email);
    setOtpUserName(name);
    setIsUserAuthenticated(false);
    setNavigationHistory(['home']);
  }, []);

  // ============ USER LOGIN HANDLER (COMBINED) ============
  const handleUserLogin = useCallback((name: string, phone: string) => {
    // phone parameter ab email ke liye use ho raha hai OTP flow mein
    if (phone && phone.includes('@')) {
      // OTP-based login (phone contains email)
      handleOTPUserLogin(name, phone);
    } else if (phone) {
      // Legacy Firebase Auth user login
      setIsUserAuthenticated(true);
      setUserAuthName(name);
      setUserAuthPhone(phone);
      setIsOTPAuthenticated(false);
    } else {
      // Google Sign-In
      setIsUserAuthenticated(true);
      setUserAuthName(name);
      setIsOTPAuthenticated(false);
    }
    setNavigationHistory(['home']);
  }, [handleOTPUserLogin]);

  // ============ LOGOUT HANDLER ============
  const handleLogoutAll = useCallback(() => {
    setIsAuthenticated(false);
    setIsUserAuthenticated(false);
    setIsOTPAuthenticated(false);
    setAuthEmail('');
    setAuthName('');
    setAuthUid('');
    setUserAuthName('');
    setUserAuthPhone('');
    setOtpUserEmail('');
    setOtpUserName('');
    localStorage.removeItem('imam_authenticated');
    localStorage.removeItem('imam_email');
    localStorage.removeItem('imam_name');
    localStorage.removeItem('imam_uid');
    localStorage.removeItem('user_authenticated');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_phone');
    localStorage.removeItem('otp_authenticated');
    localStorage.removeItem('otp_user_email');
    localStorage.removeItem('otp_user_name');
    localStorage.removeItem('user_saved_mosques');
    setSavedPopupMosques([]);
    setNavigationHistory(['login-splash']);
  }, []);

  // ============ RENDER ============
  return (
    <ErrorBoundary>
      <div className={`w-full max-w-md mx-auto min-h-screen relative flex flex-col shadow-xl overflow-hidden pb-14 ${currentView === 'tasbih' ? 'bg-[#fef2c7]' : 'bg-slate-50'}`}>

        {/* LOGIN SPLASH SCREEN */}
        {currentView === 'login-splash' && (
          <LoginChoiceView
            onImamLoginSuccess={() => {
              setIsAuthenticated(true);
              setNavigationHistory(['home']);
            }}
            onUserLogin={handleUserLogin}
            isRealFirebase={realFirebaseActive}
            realtimeAuth={realtimeAuth}
            setIsAuthenticated={setIsAuthenticated}
            setAuthEmail={setAuthEmail}
            setAuthName={setAuthName}
            setAuthUid={setAuthUid}
          />
        )}

        {/* MAIN APP CONTENT */}
        {currentView !== 'login-splash' && (
          <>
            {/* BACK BUTTON */}

            <div className={`flex-1 min-h-[500px] flex flex-col ${currentView === 'tasbih' ? 'bg-[#fef2c7]' : 'bg-slate-50'}`}>

              {/* HOME VIEW */}
              {currentView === 'home' && (
                <HomeView
                  onNavigate={(view) => {
                    if (view === 'imam-login') navigateTo('imam-login');
                    else navigateTo(view);
                  }}
                  prayerTimes={prayerTimes}
                  currentPrayer={currentPrayer}
                  todayDate={todayDate}
                  nearbyMosques={mosques}
                  onOpenMosque={(m) => setSelectedMosque(m)}
                  userCoords={userCoords}
                  requestLocation={requestLocation}
                  isRealFirebase={realFirebaseActive}
                  isAuthenticated={isAuthenticated}
                  isUserAuthenticated={isAnyUser}
                  userAuthName={currentUserName}
                  authName={authName}
                />
              )}

              {currentView === 'quran' && <QuranView onSelectSurah={handleSelectSurah} />}
              {currentView === 'surah' && selectedSurahNum !== null && <SurahReader surahNum={selectedSurahNum} onBack={() => goBack()} />}
              {currentView === 'hadith' && <HadithView onBack={() => goBack()} />}
              {currentView === 'namaz' && <NamazView />}
              {currentView === 'duas' && <DuasView />}
              {currentView === 'tasbih' && (
                <div className="flex flex-col justify-center animate-fadeIn flex-1 bg-[#fef2c7]">
                  <TasbihView />
                </div>
              )}
              {currentView === 'qibla' && <QiblaView userCoords={userCoords} requestLocation={requestLocation} />}
              {currentView === 'mosques' && (
                <MosqueFinderView nearbyMosques={mosques} userCoords={userCoords} requestLocation={requestLocation} onOpenMosque={(m) => setSelectedMosque(m)} />
              )}

              {/* USER DASHBOARD */}
              {currentView === 'user-dashboard' && (
                <UserDashboard
                  userName={currentUserName}
                  userPhone={currentUserEmail}
                  onClose={() => goBack()}
                  onOpenMosque={(mosque) => { setSelectedMosque(mosque); goHome(); }}
                  onLogout={handleLogoutAll}
                />
              )}

              {/* IMAM DASHBOARD */}
              {currentView === 'imam-login' && (
                <ImamDashboard
                  onAddOrUpdateMosque={handleAddOrUpdateMosque}
                  onDeleteMosque={handleDeleteMosque}
                  mosques={mosques}
                  userCoords={userCoords}
                  requestLocation={requestLocation}
                  isRealFirebase={realFirebaseActive}
                  isAuthenticated={isAuthenticated}
                  setIsAuthenticated={(val) => { setIsAuthenticated(val); if (val) setNavigationHistory(['home']); }}
                  authEmail={authEmail}
                  setAuthEmail={setAuthEmail}
                  authName={authName}
                  setAuthName={setAuthName}
                  authUid={authUid}
                  setAuthUid={setAuthUid}
                  realtimeAuth={realtimeAuth}
                  onLoggedOut={() => setNavigationHistory(['login-splash'])}
                />
              )}
            </div>

            {/* BOTTOM NAVIGATION */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 flex justify-around p-2 z-40 shadow-xl">
              <button onClick={() => navigateTo('hadith')} className={`flex flex-col items-center justify-center flex-1 transition-all ${currentView === 'hadith' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                <Scroll size={17} /><span className="text-[10px] font-urdu mt-0.5">حدیث</span>
              </button>
              <button onClick={() => navigateTo('quran')} className={`flex flex-col items-center justify-center flex-1 transition-all ${currentView === 'quran' || currentView === 'surah' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                <BookOpen size={17} /><span className="text-[10px] font-urdu mt-0.5">قرآن</span>
              </button>
              <button onClick={goHome} className="relative -top-3.5 w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center border border-emerald-500 shadow-lg text-white group transition-transform hover:scale-105">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" /><path d="M12 2v3M12 5C8.5 5 6 7.5 6 11v10h12V11c0-3.5-2.5-6-6-6z" /><path d="M9 14h6v7H9z" />
                </svg>
              </button>
              <button onClick={() => navigateTo('mosques')} className={`flex flex-col items-center justify-center flex-1 transition-all ${currentView === 'mosques' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                <Compass size={17} /><span className="text-[10px] font-urdu mt-0.5">مساجد</span>
              </button>
              <button onClick={() => navigateTo('duas')} className={`flex flex-col items-center justify-center flex-1 transition-all ${currentView === 'duas' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                <Heart size={17} /><span className="text-[10px] font-urdu mt-0.5">دعائیں</span>
              </button>
            </div>

            {/* MOSQUE DETAIL MODAL */}
            {selectedMosque && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-3 animate-fadeIn">
                <div className="bg-white w-full max-w-sm rounded-2xl p-4 space-y-3.5 shadow-2xl pb-6 border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2" dir="rtl">
                    <h3 className="text-sm font-bold font-urdu text-slate-800">{selectedMosque.name || 'مسجد'}</h3>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleToggleSaveMosque(selectedMosque)} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${savedPopupMosques.includes(selectedMosque.id) ? 'bg-red-50 border-red-200 text-red-500' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-400'}`}>
                        {savedPopupMosques.includes(selectedMosque.id) ? '✓ محفوظ' : 'محفوظ کریں'}
                      </button>
                      <button onClick={() => setSelectedMosque(null)} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={16} /></button>
                    </div>
                  </div>

                  {selectedMosque.address && (
                    <div className="text-right space-y-0.5">
                      <span className="text-[9px] text-slate-400 uppercase font-bold font-mono tracking-tight block">پتہ</span>
                      <p className="text-xs text-slate-600 font-urdu">{selectedMosque.address}</p>
                    </div>
                  )}
                  {selectedMosque.imamName && (
                    <div className="text-right space-y-0.5">
                      <span className="text-[9px] text-slate-400 uppercase font-bold font-mono tracking-tight block">امام</span>
                      <p className="text-xs text-emerald-700 font-bold font-urdu">{selectedMosque.imamName}</p>
                    </div>
                  )}
                  {selectedMosque.announcement && (
                    <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-right text-xs text-amber-800 leading-normal font-urdu flex items-start gap-2 justify-end">
                      <span>{selectedMosque.announcement}</span><Bell size={13} className="text-amber-600 shrink-0 mt-0.5" />
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <div className="text-right text-[9px] text-slate-400 uppercase font-bold tracking-tight">نماز کے اوقات</div>
                    {['fajr', 'zuhr', 'asr', 'maghrib', 'isha'].some(key => selectedMosque[key as keyof Mosque]) && (
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        {[['فجر', selectedMosque.fajr], ['ظہر', selectedMosque.zuhr], ['عصر', selectedMosque.asr]].map(([label, time]) => (
                          <div key={label} className="p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="text-[9px] text-slate-500 font-urdu">{label} جماعت</div>
                            <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">{formatTo12Hour(time as string, '--:--')}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-1.5 text-center mt-1.5">
                      {[['مغرب', selectedMosque.maghrib], ['عشاء', selectedMosque.isha], ['جمعہ', selectedMosque.jumah]].map(([label, time]) => (
                        <div key={label} className={`p-1.5 rounded-lg border ${label === 'جمعہ' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                          <div className={`text-[9px] font-urdu ${label === 'جمعہ' ? 'text-emerald-800 font-bold' : 'text-slate-500'}`}>{label} جماعت</div>
                          <div className={`text-xs font-mono font-bold mt-0.5 ${label === 'جمعہ' ? 'text-emerald-700' : 'text-slate-800'}`}>{formatTo12Hour(time as string, '--:--')}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 w-full">
                    <button onClick={() => { handleMosqueAlert(selectedMosque); setSelectedMosque(null); }} className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-urdu font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98] flex-row-reverse">
                      <Bell size={12} /><span>الرٹس آن کریں</span>
                    </button>
                    {selectedMosque.latitude && selectedMosque.longitude && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${selectedMosque.latitude},${selectedMosque.longitude}`} target="_blank" rel="noreferrer" className="py-2.5 bg-[#4285F4] hover:bg-[#357ae8] text-white text-[10.5px] font-urdu font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] text-center flex-row-reverse">
                        <MapPin size={12} /><span>گوگل میپ پر راستہ</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
