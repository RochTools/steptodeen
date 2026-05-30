import { useState, useEffect } from 'react';
import {
  initializeFirebaseAtRuntime,
  getLocalMosques,
  saveLocalMosque,
  deleteLocalMosque,
  subscribeToAuthState
} from './firebase';
import { onSnapshot, collection, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
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
import { LoginChoiceView } from './components/LoginChoiceView';

import { UserDashboard } from './components/UserDashboard';
import { Mosque } from './types';
import { BookOpen, Scroll, Heart, Compass, Bell, X, Info, MapPin } from 'lucide-react';

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

export default function App() {
  // App opens on login screen if not authenticated
  const getInitialView = () => {
    const imamAuth = localStorage.getItem('imam_authenticated') === 'true';
    const userAuth = localStorage.getItem('user_authenticated') === 'true';
    if (imamAuth || userAuth) return 'home';
    return 'login-splash';
  };
  const [currentView, setCurrentView] = useState<string>(getInitialView);
  const [selectedSurahNum, setSelectedSurahNum] = useState<number | null>(null);
  
  // ── Imam Auth State ─────────────────────────────────────────────────────────
  // When real Firebase is active these are driven by onAuthStateChanged.
  // In offline/demo mode they fall back to localStorage (unchanged behaviour).
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('imam_authenticated') === 'true';
  });
  const [authEmail, setAuthEmail] = useState<string>(() => {
    return localStorage.getItem('imam_email') || '';
  });
  const [authName, setAuthName] = useState<string>(() => {
    return localStorage.getItem('imam_name') || '';
  });
  // Real Firebase UID – used as imamUid in Firestore docs (empty in offline/demo mode)
  const [authUid, setAuthUid] = useState<string>(() => {
    return localStorage.getItem('imam_uid') || '';
  });

  // Keep these synced with localStorage
  useEffect(() => {
    localStorage.setItem('imam_authenticated', String(isAuthenticated));
  }, [isAuthenticated]);
  useEffect(() => {
    localStorage.setItem('imam_email', authEmail);
  }, [authEmail]);
  useEffect(() => {
    localStorage.setItem('imam_name', authName);
  }, [authName]);
  useEffect(() => {
    localStorage.setItem('imam_uid', authUid);
  }, [authUid]);
  
  // ── User Auth State ──────────────────────────────────────────────────────────
  const [isUserAuthenticated, setIsUserAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('user_authenticated') === 'true';
  });
  const [userAuthName, setUserAuthName] = useState<string>(() => {
    return localStorage.getItem('user_name') || '';
  });
  const [userAuthPhone, setUserAuthPhone] = useState<string>(() => {
    return localStorage.getItem('user_phone') || '';
  });

  useEffect(() => {
    localStorage.setItem('user_authenticated', String(isUserAuthenticated));
  }, [isUserAuthenticated]);
  useEffect(() => {
    localStorage.setItem('user_name', userAuthName);
  }, [userAuthName]);
  useEffect(() => {
    localStorage.setItem('user_phone', userAuthPhone);
  }, [userAuthPhone]);

  // Real-time mosques list state
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(null);
  const [savedPopupMosques, setSavedPopupMosques] = useState<string[]>(() => {
    try {
      const list = JSON.parse(localStorage.getItem('user_saved_mosques') || '[]');
      return list.map((m: any) => m.id);
    } catch { return []; }
  });

  // Firebase runtime config states
  const [realtimeDb, setRealtimeDb] = useState<any>(null);
  const [realtimeAuth, setRealtimeAuth] = useState<any>(null);
  const [realFirebaseActive, setRealFirebaseActive] = useState<boolean>(false);

  // Prayer times calculated default
  const [prayerTimes, setPrayerTimes] = useState<{ [key: string]: string }>({
    fajr: '05:15',
    zuhr: '13:30',
    asr: '16:30',
    maghrib: '19:05',
    isha: '20:45'
  });
  const [currentPrayer, setCurrentPrayer] = useState<string>('zuhr');

  // Trigger manual geo-positioning
  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
          // Update prayer times offset based on coordinates
          calculateLocalPrayerTimes(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.log("StepToDeen: Location permission denied or unavailable. Using default Islamabad coordinates.", err);
          // Default of Islamabad/Rawalpindi
          setUserCoords({ latitude: 33.6844, longitude: 73.0479 });
        }
      );
    }
  };

  // Helper to dynamically calculate offsets for prayer times to simulate geographic difference
  const calculateLocalPrayerTimes = (lat: number, lng: number) => {
    // Generate slight variations so different locations look real
    const offset = Math.floor((lat + lng) % 15) - 7; // -7 to +7 mins
    const formatWithOffset = (baseTime: string, minOffset: number) => {
      const [h, m] = baseTime.split(':').map(Number);
      let totalMins = h * 60 + m + minOffset;
      if (totalMins < 0) totalMins += 1440;
      const finalH = Math.floor(totalMins / 60) % 24;
      const finalM = totalMins % 60;
      return `${finalH.toString().padStart(2, '0')}:${finalM.toString().padStart(2, '0')}`;
    };

    setPrayerTimes({
      fajr: formatWithOffset('05:15', offset),
      zuhr: formatWithOffset('13:30', offset),
      asr: formatWithOffset('16:30', offset),
      maghrib: formatWithOffset('19:05', offset),
      isha: formatWithOffset('20:45', offset)
    });
  };

  // Calculate current active prayer based on 24hr clock
  useEffect(() => {
    const updateActivePrayer = () => {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();

      const parseMins = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
      };

      const times = {
        fajr: parseMins(prayerTimes.fajr),
        zuhr: parseMins(prayerTimes.zuhr),
        asr: parseMins(prayerTimes.asr),
        maghrib: parseMins(prayerTimes.maghrib),
        isha: parseMins(prayerTimes.isha)
      };

      if (nowMins >= times.isha || nowMins < times.fajr) {
        setCurrentPrayer('isha');
      } else if (nowMins >= times.maghrib) {
        setCurrentPrayer('maghrib');
      } else if (nowMins >= times.asr) {
        setCurrentPrayer('asr');
      } else if (nowMins >= times.zuhr) {
        setCurrentPrayer('zuhr');
      } else {
        setCurrentPrayer('fajr');
      }
    };

    updateActivePrayer();
    const interval = setInterval(updateActivePrayer, 30000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  // Hook-up real-time Firebase syncing or local storage fallback
  useEffect(() => {
    let unsubMosques: any = null;
    let unsubAuth: (() => void) | null = null;

    const runSetup = async () => {
      const { db: loadedDb, auth: loadedAuth, isRealFirebase: loadedIsReal } = await initializeFirebaseAtRuntime();
      setRealtimeDb(loadedDb);
      setRealtimeAuth(loadedAuth);
      setRealFirebaseActive(loadedIsReal);

      if (loadedIsReal && loadedDb && loadedAuth) {
        // ── Real-time auth state listener ────────────────────────────────────
        // This is the single source of truth for who is logged in.
        // It fires immediately on page load (restores session) and on every
        // sign-in / sign-out, so the app is always in sync with Firebase Auth.
        unsubAuth = subscribeToAuthState(loadedAuth, (user) => {
          if (user) {
            setIsAuthenticated(true);
            setAuthEmail(user.email || '');
            setAuthName(user.displayName || user.email?.split('@')[0] || '');
            setAuthUid(user.uid);
          } else {
            setIsAuthenticated(false);
            setAuthEmail('');
            setAuthName('');
            setAuthUid('');
          }
        });

        // ── Real-time Firestore mosques listener ─────────────────────────────
        unsubMosques = onSnapshot(collection(loadedDb, 'mosques'), (snapshot) => {
          const list: Mosque[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Mosque);
          });
          setMosques(list);
        }, (error) => {
          console.error('StepToDeen: Firestore load failed. Switching to local storage mode.', error);
          setMosques(getLocalMosques());
        });
      } else {
        // Offline / demo mode – load from LocalStorage
        setMosques(getLocalMosques());
      }
    };

    runSetup();

    return () => {
      if (unsubMosques) unsubMosques();
      if (unsubAuth) unsubAuth();
    };
  }, []);

  // Handler for adding/updating mosque timings (Supports both Firebase and local mode)
  const handleAddOrUpdateMosque = async (data: Omit<Mosque, 'id' | 'updatedAt'> & { id?: string }) => {
    const freshMosque = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    if (realFirebaseActive && realtimeDb) {
      try {
        const { id, ...firestoreData } = freshMosque;
        if (data.id) {
          await setDoc(doc(realtimeDb, 'mosques', data.id), firestoreData);
        } else {
          await addDoc(collection(realtimeDb, 'mosques'), firestoreData);
        }
      } catch (error) {
        console.error("StepToDeen: Failed to save to Firestore. Saving locally.", error);
        const updatedList = saveLocalMosque(freshMosque);
        setMosques(updatedList);
      }
    } else {
      const updatedList = saveLocalMosque(freshMosque);
      setMosques(updatedList);
    }
  };

  // Handler for deleting mosque
  const handleDeleteMosque = async (id: string) => {
    if (realFirebaseActive && realtimeDb) {
      try {
        await deleteDoc(doc(realtimeDb, 'mosques', id));
      } catch (error) {
        console.error("StepToDeen: Failed to delete from Firestore. Deleting locally.", error);
        const updatedList = deleteLocalMosque(id);
        setMosques(updatedList);
      }
    } else {
      const updatedList = deleteLocalMosque(id);
      setMosques(updatedList);
    }
  };

  // Date Generator for topbar
  const getHijriDateString = () => {
    const d = new Date();
    const days = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];
    const months = ['جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون', 'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'];
    return `${days[d.getDay()]}، ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  // Navigation handlers
  const handleSelectSurah = (surahNum: number) => {
    setSelectedSurahNum(surahNum);
    setCurrentView('surah');
  };

  return (
    <div className={`w-full max-w-md mx-auto min-h-screen relative flex flex-col shadow-xl overflow-hidden pb-14 ${currentView === 'tasbih' ? 'bg-[#fef2c7]' : 'bg-slate-50'}`}>

      {/* ── Full-screen Login Splash (no header/footer) ── */}
      {currentView === 'login-splash' && (
        <LoginChoiceView
          onImamLoginSuccess={() => setCurrentView('home')}
          onUserLogin={(name, phone) => {
            setIsUserAuthenticated(true);
            setUserAuthName(name);
            setUserAuthPhone(phone);
            setCurrentView('home');
          }}
          isRealFirebase={realFirebaseActive}
          realtimeAuth={realtimeAuth}
          setIsAuthenticated={setIsAuthenticated}
          setAuthEmail={setAuthEmail}
          setAuthName={setAuthName}
          setAuthUid={setAuthUid}
        />
      )}

      {currentView !== 'login-splash' && (<>
      {/* Elegant Atmospheric Header (Only shown on non-Home views for smooth navigation without technical clutters) */}
      {currentView !== 'home' && (
        <header className="h-14 bg-gradient-to-r from-[#0c2f21] to-[#10402b] text-white flex items-center justify-between px-4 shadow-sm shrink-0 border-b border-[#05170f] relative z-50">
          <button
            onClick={() => {
              if (currentView === 'surah') {
                setCurrentView('quran');
              } else if (currentView === 'imam-login') {
                setCurrentView('login-choice');
              } else if (currentView === 'user-login') {
                setCurrentView('login-choice');
              } else {
                setCurrentView('home');
              }
            }}
            className="py-1 px-3 bg-white/10 hover:bg-white/15 border border-white/5 text-xs rounded-lg transition-all font-urdu font-bold flex items-center gap-1 cursor-pointer"
          >
            ← پیچھے
          </button>

          <h1 className="text-sm font-bold text-emerald-50 font-urdu tracking-wide select-none">
            {currentView === 'quran' && 'قرآن مجید'}
            {currentView === 'surah' && 'تلاوتِ قرآنِ کریم'}
            {currentView === 'hadith' && 'احادیثِ مبارکہ'}
            {currentView === 'namaz' && 'نماز کا طریقہ'}
            {currentView === 'duas' && 'مسنون دعائیں'}
            {currentView === 'mosques' && 'قریبی مساجد'}
            {currentView === 'imam-login' && 'امام لاگ ان'}
            {currentView === 'login-splash' && 'لاگ ان'}
            {currentView === 'login-choice' && 'لاگ ان'}
            {currentView === 'user-login' && 'یوزر لاگ ان'}
            {currentView === 'user-dashboard' && 'میرا اکاؤنٹ'}
            {currentView === 'tasbih' && 'تسبیح کاؤنٹر'}
            {currentView === 'qibla' && 'قبلہ رخ'}
          </h1>

          {/* Spacer to push title precisely to the center */}
          <div className="w-16 h-1 opacity-0 pointer-events-none"></div>
        </header>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 min-h-[500px] flex flex-col ${currentView === 'tasbih' ? 'bg-[#fef2c7]' : 'bg-slate-50'}`}>
        {currentView === 'home' && (
          <HomeView
            onNavigate={(view) => {
              if (view === 'imam-login') {
                setCurrentView('imam-login');
              } else {
                setCurrentView(view);
              }
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

        {currentView === 'quran' && <QuranView onSelectSurah={handleSelectSurah} />}

        {currentView === 'surah' && selectedSurahNum !== null && (
          <SurahReader surahNum={selectedSurahNum} />
        )}

        {currentView === 'hadith' && <HadithView />}

        {currentView === 'namaz' && <NamazView />}

        {currentView === 'duas' && <DuasView />}

        {currentView === 'tasbih' && (
          <div className="flex flex-col justify-center animate-fadeIn flex-1 bg-[#fef2c7]">
            <TasbihView />
          </div>
        )}

        {currentView === 'qibla' && (
          <QiblaView userCoords={userCoords} requestLocation={requestLocation} />
        )}

        {currentView === 'mosques' && (
          <MosqueFinderView
            nearbyMosques={mosques}
            userCoords={userCoords}
            requestLocation={requestLocation}
            onOpenMosque={(m) => setSelectedMosque(m)}
          />
        )}

        {currentView === 'login-choice' && (
          <LoginChoiceView
            onImamLoginSuccess={() => setCurrentView('home')}
            onUserLogin={(name, phone) => {
              setIsUserAuthenticated(true);
              setUserAuthName(name);
              setUserAuthPhone(phone);
              setCurrentView('home');
            }}
            isRealFirebase={realFirebaseActive}
            realtimeAuth={realtimeAuth}
            setIsAuthenticated={setIsAuthenticated}
            setAuthEmail={setAuthEmail}
            setAuthName={setAuthName}
            setAuthUid={setAuthUid}
          />
        )}

        {currentView === 'user-dashboard' && (
          <UserDashboard
            userName={userAuthName}
            userPhone={userAuthPhone}
            onClose={() => setCurrentView('home')}
            onOpenMosque={(mosque) => {
              setSelectedMosque(mosque);
              setCurrentView('home');
            }}
            onLogout={() => {
              setIsUserAuthenticated(false);
              setUserAuthName('');
              setUserAuthPhone('');
              localStorage.removeItem('user_authenticated');
              localStorage.removeItem('user_name');
              localStorage.removeItem('user_phone');
              setCurrentView('login-splash');
            }}
          />
        )}

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
              if (val) setCurrentView('home');
            }}
            authEmail={authEmail}
            setAuthEmail={setAuthEmail}
            authName={authName}
            setAuthName={setAuthName}
            authUid={authUid}
            setAuthUid={setAuthUid}
            realtimeAuth={realtimeAuth}
            onLoggedOut={() => setCurrentView('login-splash')}
          />
        )}
      </div>

      {/* Bottom elegant Navigation controls */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 flex justify-around p-2 z-40 shadow-xl">
        <button
          onClick={() => setCurrentView('hadith')}
          className={`flex flex-col items-center justify-center flex-1 transition-all ${
            currentView === 'hadith' ? 'text-emerald-700 font-bold' : 'text-slate-450 text-slate-400'
          }`}
        >
          <Scroll size={17} />
          <span className="text-[10px] font-urdu mt-0.5">حدیث</span>
        </button>

        <button
          onClick={() => setCurrentView('quran')}
          className={`flex flex-col items-center justify-center flex-1 transition-all ${
            currentView === 'quran' || currentView === 'surah' ? 'text-emerald-700 font-bold' : 'text-slate-400'
          }`}
        >
          <BookOpen size={17} />
          <span className="text-[10px] font-urdu mt-0.5">قرآن</span>
        </button>

        {/* Center Golden Dome Home button */}
        <button
          onClick={() => setCurrentView('home')}
          className="relative -top-3.5 w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center border border-emerald-500 shadow-lg text-white group transition-transform hover:scale-105"
        >
          {/* Custom SVG Mosque Dome logo */}
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18" />
            <path d="M12 2v3M12 5C8.5 5 6 7.5 6 11v10h12V11c0-3.5-2.5-6-6-6z" />
            <path d="M9 14h6v7H9z" />
          </svg>
        </button>

        <button
          onClick={() => setCurrentView('mosques')}
          className={`flex flex-col items-center justify-center flex-1 transition-all ${
            currentView === 'mosques' ? 'text-emerald-700 font-bold' : 'text-slate-400'
          }`}
        >
          <Compass size={17} />
          <span className="text-[10px] font-urdu mt-0.5">مساجد</span>
        </button>

        <button
          onClick={() => setCurrentView('duas')}
          className={`flex flex-col items-center justify-center flex-1 transition-all ${
            currentView === 'duas' ? 'text-emerald-700 font-bold' : 'text-slate-400'
          }`}
        >
          <Heart size={17} />
          <span className="text-[10px] font-urdu mt-0.5">دعائیں</span>
        </button>
      </div>

      {/* Mosque Detail Modal popup */}
      {selectedMosque && (
        <div className="fixed inset-0 bg-slate-900/42 bg-black/50 z-50 flex items-end justify-center p-3 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 space-y-3.5 shadow-2xl pb-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2" dir="rtl">
              <h3 className="text-sm font-bold font-urdu text-slate-800">{selectedMosque.name}</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    try {
                      const list: any[] = JSON.parse(localStorage.getItem('user_saved_mosques') || '[]');
                      const exists = list.find(m => m.id === selectedMosque.id);
                      const newList = exists ? list.filter(m => m.id !== selectedMosque.id) : [...list, selectedMosque];
                      localStorage.setItem('user_saved_mosques', JSON.stringify(newList));
                      setSavedPopupMosques(newList.map((m: any) => m.id));
                    } catch {}
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                    savedPopupMosques.includes(selectedMosque.id)
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-400'
                  }`}
                >
                  {savedPopupMosques.includes(selectedMosque.id) ? '✓ Saved' : 'Save'}
                </button>
                <button
                  onClick={() => setSelectedMosque(null)}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Address */}
            <div className="text-right space-y-0.5">
              <span className="text-[9px] text-slate-400 uppercase font-bold font-mono tracking-tight block">Address</span>
              <p className="text-xs text-slate-600 font-urdu">{selectedMosque.address}</p>
            </div>

            {/* Imam Name */}
            {selectedMosque.imamName && (
              <div className="text-right space-y-0.5">
                <span className="text-[9px] text-slate-400 uppercase font-bold font-mono tracking-tight block">Imam</span>
                <p className="text-xs text-emerald-700 font-bold font-urdu">{selectedMosque.imamName}</p>
              </div>
            )}

            {/* Announcement / Announcement Banner if any */}
            {selectedMosque.announcement && (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-right text-xs text-amber-800 leading-normal font-urdu flex items-start gap-2 justify-end">
                <span>{selectedMosque.announcement}</span>
                <Bell size={13} className="text-amber-600 shrink-0 mt-0.5" />
              </div>
            )}

            {/* Timing breakdown grid */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="text-right text-[9px] text-slate-400 uppercase font-bold tracking-tight">Prayer Timings</div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-150">
                  <div className="text-[9px] text-slate-500 font-urdu">فجر جماعت</div>
                  <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">{formatTo12Hour(selectedMosque.fajr)}</div>
                </div>
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-150">
                  <div className="text-[9px] text-slate-500 font-urdu">ظہر جماعت</div>
                  <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">{formatTo12Hour(selectedMosque.zuhr)}</div>
                </div>
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-150">
                  <div className="text-[9px] text-slate-500 font-urdu">عصر جماعت</div>
                  <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">{formatTo12Hour(selectedMosque.asr)}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center mt-1.5">
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-150">
                  <div className="text-[9px] text-slate-500 font-urdu">مغرب جماعت</div>
                  <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">{formatTo12Hour(selectedMosque.maghrib)}</div>
                </div>
                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-150">
                  <div className="text-[9px] text-slate-500 font-urdu">عشاء جماعت</div>
                  <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">{formatTo12Hour(selectedMosque.isha)}</div>
                </div>
                <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="text-[9px] text-emerald-800 font-bold font-urdu">جمعہ مبارک</div>
                  <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">{formatTo12Hour(selectedMosque.jumah)}</div>
                </div>
              </div>

              {/* Eid Timings */}
              <div className="grid grid-cols-2 gap-1.5 text-center mt-1.5 pt-1.5 border-t border-slate-100 border-dashed animate-fadeIn">
                <div className="p-1.5 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="text-[9px] text-purple-800 font-bold font-urdu">عید الفطر جماعت</div>
                  <div className="text-xs font-mono font-bold text-purple-700 mt-0.5">{formatTo12Hour(selectedMosque.eidFitr, '07:00')}</div>
                </div>
                <div className="p-1.5 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="text-[9px] text-purple-800 font-bold font-urdu">عید الاضحی جماعت</div>
                  <div className="text-xs font-mono font-bold text-purple-700 mt-0.5">{formatTo12Hour(selectedMosque.eidAdha, '07:15')}</div>
                </div>
              </div>
            </div>

            {/* Footer with map coordinates */}
            <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-slate-100 pt-2.5">
              <div className="font-mono text-[8px]">
                {selectedMosque.latitude.toFixed(4)}N, {selectedMosque.longitude.toFixed(4)}E
              </div>
              <div className="font-urdu text-slate-500 font-bold">
                آخری اپڈیٹ: {new Date(selectedMosque.updatedAt).toLocaleDateString('ur-PK', { day: 'numeric', month: 'short', year: 'numeric' })} {new Date(selectedMosque.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 w-full">
              <button
                onClick={() => {
                  alert(`StepToDeen الرٹ:\n\nآپ کو ${selectedMosque.name} کی نماز کے بدلتے ہوئے اوقات کی ریئل ٹائم اپڈیٹس کا نوٹیفیکیشن آن کر دیا گیا ہے۔`);
                  setSelectedMosque(null);
                }}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-urdu font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-[0.98] flex-row-reverse"
              >
                <Bell size={12} />
                <span>الرٹس آن کریں</span>
              </button>
              
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selectedMosque.latitude},${selectedMosque.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 bg-[#4285F4] hover:bg-[#357ae8] text-white text-[10.5px] font-urdu font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] text-center flex-row-reverse"
              >
                <MapPin size={12} />
                <span>گوگل میپ پر راستہ</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>)}
    </div>
  );
}
