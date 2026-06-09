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

const calculatePrayerTimeWithOffset = (baseTime: string, lat: number, lng: number) => {
  const offset = Math.round((lat + lng) % 15) - 7;
  const totalMins = parseTimeToMinutes(baseTime) + offset;
  const normalizedMins = ((totalMins % 1440) + 1440) % 1440;
  const finalH = Math.floor(normalizedMins / 60) % 24;
  const finalM = normalizedMins % 60;
  return `${finalH.toString().padStart(2, '0')}:${finalM.toString().padStart(2, '0')}`;
};

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

const getHijriDateString = () => {
  const d = new Date();
  const days = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];
  const months = ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'];
  return `${days[d.getDay()]}، ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
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
    // Check if it's array of objects with id property
    if (typeof parsed[0] === 'object' && parsed[0] !== null) {
      return parsed.filter((m: any) => m && validateMosqueId(m.id)).map((m: any) => m.id);
    }
    // If it's array of strings, validate each
    return parsed.filter(validateMosqueId);
  } catch {
    return [];
  }
};

const DEFAULT_COORDS = { latitude: 21.4225, longitude: 39.8262 }; // Mecca

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
    if (imamAuth || userAuth) return 'home';
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

  // Sync imam auth to localStorage
  useEffect(() => {
    localStorage.setItem('imam_authenticated', String(isAuthenticated));
    localStorage.setItem('imam_email', authEmail);
    localStorage.setItem('imam_name', authName);
    localStorage.setItem('imam_uid', authUid);
  }, [isAuthenticated, authEmail, authName, authUid]);

  // Sync user auth to localStorage
  useEffect(() => {
    localStorage.setItem('user_authenticated', String(isUserAuthenticated));
    localStorage.setItem('user_name', userAuthName);
    localStorage.setItem('user_phone', userAuthPhone);
  }, [isUserAuthenticated, userAuthName, userAuthPhone]);

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
  
  const isMounted = useRef(true);

  // ============ CALCULATE LOCAL PRAYER TIMES (DEFINED BEFORE USE) ============
  const calculateLocalPrayerTimes = useCallback((lat: number, lng: number) => {
    if (isMounted.current) {
      setPrayerTimes({
        fajr: calculatePrayerTimeWithOffset('05:15', lat, lng),
        zuhr: calculatePrayerTimeWithOffset('13:30', lat, lng),
        asr: calculatePrayerTimeWithOffset('16:30', lat, lng),
        maghrib: calculatePrayerTimeWithOffset('19:05', lat, lng),
        isha: calculatePrayerTimeWithOffset('20:45', lat, lng)
      });
    }
  }, []);

  // ============ LOCATION FUNCTIONS (NOW AFTER calculateLocalPrayerTimes) ============
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setUserCoords(DEFAULT_COORDS);
      calculateLocalPrayerTimes(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (isMounted.current) {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          calculateLocalPrayerTimes(pos.coords.latitude, pos.coords.longitude);
        }
      },
      (err) => {
        console.warn("StepToDeen: Location permission denied or unavailable.", err);
        if (isMounted.current) {
          const lastCoords = localStorage.getItem('last_known_coords');
          const coords = lastCoords ? JSON.parse(lastCoords) : DEFAULT_COORDS;
          setUserCoords(coords);
          calculateLocalPrayerTimes(coords.latitude, coords.longitude);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }, [calculateLocalPrayerTimes]);

  // Save coordinates when they change
  useEffect(() => {
    if (userCoords) {
      localStorage.setItem('last_known_coords', JSON.stringify(userCoords));
    }
  }, [userCoords]);

  // Initialize location on mount
  useEffect(() => {
    requestLocation();
    return () => {
      isMounted.current = false;
    };
  }, [requestLocation]);

  // ============ PRAYER TIMER ============
  useEffect(() => {
    const updateActivePrayer = () => {
      setCurrentPrayer(getCurrentPrayer(prayerTimes));
    };

    updateActivePrayer();
    const interval = setInterval(updateActivePrayer, 30000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  // ============ FCM INITIALIZATION ============
  useEffect(() => {
    let isMountedLocal = true;
    let unsubscribe: (() => void) | undefined;

    if (isUserAuthenticated || isAuthenticated) {
      initFCM()
        .then(token => {
          if (isMountedLocal && token) console.log('FCM ready ✅');
        })
        .catch(err => {
          console.warn('FCM initialization failed:', err);
        });

      unsubscribe = listenForegroundMessages();
    }

    return () => {
      isMountedLocal = false;
      if (unsubscribe) unsubscribe();
    };
  }, [isUserAuthenticated, isAuthenticated]);

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
                  } else {
                    setIsAuthenticated(false);
                    setIsUserAuthenticated(true);
                    setUserAuthName(user.displayName || user.email?.split('@')[0] || '');
                  }
                }
              } catch (error) {
                console.warn('Error fetching user role:', error);
                if (isMounted.current) {
                  setIsAuthenticated(true);
                }
              }
            } else {
              if (isMounted.current) {
                setIsAuthenticated(false);
                setIsUserAuthenticated(false);
                setAuthEmail('');
                setAuthName('');
                setAuthUid('');
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
              if (isMounted.current) {
                setMosques(getLocalMosques());
              }
            }
          );
        } else {
          if (isMounted.current) {
            setMosques(getLocalMosques());
          }
        }
      } catch (error) {
        console.error('Firebase initialization failed:', error);
        if (isMounted.current) {
          setMosques(getLocalMosques());
        }
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
    if (selectedMosque) {
      setSelectedMosque(null);
      return;
    }
    if (selectedSurahNum) {
      setSelectedSurahNum(null);
      return;
    }
    goBack();
  }, [selectedMosque, selectedSurahNum, goBack]);

  // Cleanup surah selection when leaving surah view
  useEffect(() => {
    if (currentView !== 'surah') {
      setSelectedSurahNum(null);
    }
  }, [currentView]);

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
              currentList = parsed
                .filter(validateMosqueId)
                .map((id: string) => ({ id } as Mosque));
            }
          }
        } catch {
          currentList = [];
        }
      }

      const exists = currentList.find(m => m.id === mosque.id);
      let newList: Mosque[];

      if (exists) {
        newList = currentList.filter(m => m.id !== mosque.id);
      } else {
        newList = [...currentList, mosque];
      }

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

  // ============ RENDER ============
  return (
    <ErrorBoundary>
      <div className={`w-full max-w-md mx-auto min-h-screen relative flex flex-col shadow-xl overflow-hidden pb-14 ${currentView === 'tasbih' ? 'bg-[#fef2c7]' : 'bg-slate-50'}`}>

        {/* LOGIN SPLASH SCREEN */}
        {currentView === 'login-splash' && (
          <LoginChoiceView
            onImamLoginSuccess={() => {
              setNavigationHistory(['home']);
            }}
            onUserLogin={(name, phone) => {
              setIsUserAuthenticated(true);
              setUserAuthName(name);
              setUserAuthPhone(phone);
              setNavigationHistory(['home']);
            }}
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
            {currentView !== 'home' && (
              <div className="absolute top-3 right-3 z-50">
                <button
                  onClick={handleBack}
                  className="py-1 px-2.5 text-xs text-slate-500 font-urdu font-bold flex items-center gap-1 bg-white/80 rounded-lg shadow-sm hover:bg-white"
                >
                  ← پیچھے
                </button>
              </div>
            )}

            {/* VIEW RENDERER */}
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
                  todayDate={getHijriDateString()}
                  nearbyMosques={mosques}
                  onOpenMosque={(m) => setSelectedMosque(m)}
                  userCoords={userCoords}
                  requestLocation={requestLocation}
                  isRealFirebase={realFirebaseActive}
                  isAuthenticated={isAuthenticated}
                  isUserAuthenticated={isUserAuthenticated}
                  userAuthName={userAuthName}
                  authName={authName}
                />
              )}

              {/* QURAN VIEW */}
              {currentView === 'quran' && (
                <QuranView onSelectSurah={handleSelectSurah} />
              )}

              {/* SURAH READER */}
              {currentView === 'surah' && selectedSurahNum !== null && (
                <SurahReader
                  surahNum={selectedSurahNum}
                  onBack={() => goBack()}
                />
              )}

              {/* HADITH VIEW */}
              {currentView === 'hadith' && <HadithView />}

              {/* NAMAZ VIEW */}
              {currentView === 'namaz' && <NamazView />}

              {/* DUAS VIEW */}
              {currentView === 'duas' && <DuasView />}

              {/* TASBIH VIEW */}
              {currentView === 'tasbih' && (
                <div className="flex flex-col justify-center animate-fadeIn flex-1 bg-[#fef2c7]">
                  <TasbihView />
                </div>
              )}

              {/* QIBLA VIEW */}
              {currentView === 'qibla' && (
                <QiblaView userCoords={userCoords} requestLocation={requestLocation} />
              )}

              {/* MOSQUES VIEW */}
              {currentView === 'mosques' && (
                <MosqueFinderView
                  nearbyMosques={mosques}
                  userCoords={userCoords}
                  requestLocation={requestLocation}
                  onOpenMosque={(m) => setSelectedMosque(m)}
                />
              )}

              {/* USER DASHBOARD */}
              {currentView === 'user-dashboard' && (
                <UserDashboard
                  userName={userAuthName}
                  userPhone={userAuthPhone}
                  onClose={() => goBack()}
                  onOpenMosque={(mosque) => {
                    setSelectedMosque(mosque);
                    goHome();
                  }}
                  onLogout={() => {
                    setIsUserAuthenticated(false);
                    setUserAuthName('');
                    setUserAuthPhone('');
                    localStorage.removeItem('user_authenticated');
                    localStorage.removeItem('user_name');
                    localStorage.removeItem('user_phone');
                    localStorage.removeItem('user_saved_mosques');
                    setSavedPopupMosques([]);
                    setNavigationHistory(['login-splash']);
                  }}
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
                  setIsAuthenticated={(val) => {
                    setIsAuthenticated(val);
                    if (val) setNavigationHistory(['home']);
                  }}
                  authEmail={authEmail}
                  setAuthEmail={setAuthEmail}
                  authName={authName}
                  setAuthName={setAuthName}
                  authUid={authUid}
                  setAuthUid={setAuthUid}
                  realtimeAuth={realtimeAuth}
                  onLoggedOut={() => {
                    setNavigationHistory(['login-splash']);
                  }}
                />
              )}
            </div>

            {/* BOTTOM NAVIGATION */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 flex justify-around p-2 z-40 shadow-xl">
              <button
                onClick={() => navigateTo('hadith')}
                className={`flex flex-col items-center justify-center flex-1 transition-all ${currentView === 'hadith' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
              >
                <Scroll size={17} />
                <span className="text-[10px] font-urdu mt-0.5">حدیث</span>
              </button>

              <button
                onClick={() => navigateTo('quran')}
                className={`flex flex-col items-center justify-center flex-1 transition-all ${currentView === 'quran' || currentView === 'surah' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
              >
                <BookOpen size={17} />
                <span className="text-[10px] font-urdu mt-0.5">قرآن</span>
              </button>

              <button
                onClick={goHome}
                className="relative -top-3.5 w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center border border-emerald-500 shadow-lg text-white group transition-transform hover:scale-105"
              >
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" />
                  <path d="M12 2v3M12 5C8.5 5 6 7.5 6 11v10h12V11c0-3.5-2.5-6-6-6z" />
                  <path d="M9 14h6v7H9z" />
                </svg>
              </button>

              <button
                onClick={() => navigateTo('mosques')}
                className={`flex flex-col items-center justify-center flex-1 transition-all ${currentView === 'mosques' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
              >
                <Compass size={17} />
                <span className="text-[10px] font-urdu mt-0.5">مساجد</span>
              </button>

              <button
                onClick={() => navigateTo('duas')}
                className={`flex flex-col items-center justify-center flex-1 transition-all ${currentView === 'duas' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
              >
                <Heart size={17} />
                <span className="text-[10px] font-urdu mt-0.5">دعائیں</span>
              </button>
            </div>

            {/* MOSQUE DETAIL MODAL */}
            {selectedMosque && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-3 animate-fadeIn">
                <div className="bg-white w-full max-w-sm rounded-2xl p-4 space-y-3.5 shadow-2xl pb-6 border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2" dir="rtl">
                    <h3 className="text-sm font-bold font-urdu text-slate-800">{selectedMosque.name || 'مسجد'}</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleSaveMosque(selectedMosque)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                          savedPopupMosques.includes(selectedMosque.id)
                            ? 'bg-red-50 border-red-200 text-red-500'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-400'
                        }`}
                      >
                        {savedPopupMosques.includes(selectedMosque.id) ? '✓ محفوظ' : 'محفوظ کریں'}
                      </button>
                      <button
                        onClick={() => setSelectedMosque(null)}
                        className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                      >
                        <X size={16} />
                      </button>
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
                      <span>{selectedMosque.announcement}</span>
                      <Bell size={13} className="text-amber-600 shrink-0 mt-0.5" />
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <div className="text-right text-[9px] text-slate-400 uppercase font-bold tracking-tight">نماز کے اوقات</div>

                    {['fajr', 'zuhr', 'asr', 'maghrib', 'isha'].some(key => selectedMosque[key as keyof Mosque]) && (
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        {[
                          ['فجر', selectedMosque.fajr],
                          ['ظہر', selectedMosque.zuhr],
                          ['عصر', selectedMosque.asr]
                        ].map(([label, time]) => (
                          <div key={label} className="p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="text-[9px] text-slate-500 font-urdu">{label} جماعت</div>
                            <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                              {formatTo12Hour(time as string, '--:--')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-1.5 text-center mt-1.5">
                      <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-[9px] text-slate-500 font-urdu">مغرب جماعت</div>
                        <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                          {formatTo12Hour(selectedMosque.maghrib, '--:--')}
                        </div>
                      </div>
                      <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-[9px] text-slate-500 font-urdu">عشاء جماعت</div>
                        <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                          {formatTo12Hour(selectedMosque.isha, '--:--')}
                        </div>
                      </div>
                      <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                        <div className="text-[9px] text-emerald-800 font-bold font-urdu">جمعہ مبارک</div>
                        <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
                          {formatTo12Hour(selectedMosque.jumah, '--:--')}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-center mt-1.5 pt-1.5 border-t border-slate-100 border-dashed animate-fadeIn">
                      <div className="p-1.5 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="text-[9px] text-purple-800 font-bold font-urdu">عید الفطر جماعت</div>
                        <div className="text-xs font-mono font-bold text-purple-700 mt-0.5">
                          {formatTo12Hour(selectedMosque.eidFitr, '07:00')}
                        </div>
                      </div>
                      <div className="p-1.5 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="text-[9px] text-purple-800 font-bold font-urdu">عید الاضحی جماعت</div>
                        <div className="text-xs font-mono font-bold text-purple-700 mt-0.5">
                          {formatTo12Hour(selectedMosque.eidAdha, '07:15')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedMosque.latitude && selectedMosque.longitude && (
                    <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-slate-100 pt-2.5">
                      <div className="font-mono text-[8px]">
                        {selectedMosque.latitude.toFixed(4)}N, {selectedMosque.longitude.toFixed(4)}E
                      </div>
                      {selectedMosque.updatedAt && (
                        <div className="font-urdu text-slate-500 font-bold">
                          آخری اپڈیٹ: {new Date(selectedMosque.updatedAt).toLocaleDateString('ur-PK', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })} {new Date(selectedMosque.updatedAt).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-2 w-full">
                    <button
                      onClick={() => {
                        handleMosqueAlert(selectedMosque);
                        setSelectedMosque(null);
                      }}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-urdu font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98] flex-row-reverse"
                    >
                      <Bell size={12} />
                      <span>الرٹس آن کریں</span>
                    </button>
                    {selectedMosque.latitude && selectedMosque.longitude && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedMosque.latitude},${selectedMosque.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2.5 bg-[#4285F4] hover:bg-[#357ae8] text-white text-[10.5px] font-urdu font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] text-center flex-row-reverse"
                      >
                        <MapPin size={12} />
                        <span>گوگل میپ پر راستہ</span>
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
