import React, { Component, useCallback, useEffect, useRef, useState } from 'react';
import { initializeFirebaseAtRuntime, subscribeToAuthState } from './firebase';
import { onSnapshot, collection, doc, getDoc } from 'firebase/firestore';
import { initFCM, listenForegroundMessages } from './utils/fcm';

// ============ HOOKS ============
import { useAuth } from './hooks/useAuth';
import { usePrayerTimes } from './hooks/usePrayerTimes';
import { useMosques } from './hooks/useMosques';
import { useNavigation } from './hooks/useNavigation';

// ============ COMPONENTS ============
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
import { UserDashboard } from './components/UserDashboard';
import { LoginChoiceView } from './components/LoginChoiceView';
import { Mosque } from './types';
import { BookOpen, Scroll, Heart, Compass, Bell, X, MapPin } from 'lucide-react';
import { formatTo12Hour } from './utils/timeHelpers';

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
            <h2 className="text-xl font-bold text-slate-800 font-urdu">کچھ غلط ہو گیا</h2>
            <p className="text-sm text-slate-600">براہ کرم ایپ کو دوبارہ شروع کریں</p>
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

// ============ MAIN APP ============
export default function App() {

  const [selectedSurahNum, setSelectedSurahNum] = useState<number | null>(null);
  const [realtimeDb, setRealtimeDb] = useState<any>(null);
  const [realtimeAuth, setRealtimeAuth] = useState<any>(null);
  const [realFirebaseActive, setRealFirebaseActive] = useState<boolean>(false);
  const isMounted = useRef(true);

  // ============ HOOKS ============
  const auth = useAuth();
  const prayer = usePrayerTimes();
  const mosques = useMosques(realtimeDb, realFirebaseActive);
  const nav = useNavigation({
    selectedMosque: mosques.selectedMosque,
    setSelectedMosque: mosques.setSelectedMosque,
    setSelectedSurahNum,
  });

  // ============ SURAH HANDLER ============
  const handleSelectSurah = useCallback((surahNum: number) => {
    setSelectedSurahNum(surahNum);
    nav.navigateTo('surah');
  }, [nav]);

  // ============ FCM ============
  useEffect(() => {
    let isMountedLocal = true;
    let unsubscribe: (() => void) | undefined;

    if (auth.isAnyUser || auth.isAuthenticated) {
      initFCM(auth.authUid || undefined)
        .then(token => { if (isMountedLocal && token) console.log('FCM ready ✅'); })
        .catch(err => console.warn('FCM init failed:', err));
      unsubscribe = listenForegroundMessages();
    }

    return () => {
      isMountedLocal = false;
      if (unsubscribe) unsubscribe();
    };
  }, [auth.isAnyUser, auth.isAuthenticated, auth.authUid]);

  // ============ FIREBASE SETUP ============
  useEffect(() => {
    let unsubMosques: (() => void) | null = null;
    let unsubAuth: (() => void) | null = null;

    const runSetup = async () => {
      try {
        const {
          db: loadedDb,
          auth: loadedAuth,
          isRealFirebase: loadedIsReal
        } = await initializeFirebaseAtRuntime();

        if (!isMounted.current) return;

        setRealtimeDb(loadedDb);
        setRealtimeAuth(loadedAuth);
        setRealFirebaseActive(loadedIsReal);

        if (loadedIsReal && loadedDb && loadedAuth) {
          unsubAuth = subscribeToAuthState(loadedAuth, async (user) => {
            if (!isMounted.current) return;
            if (user) {
              auth.setAuthEmail(user.email || '');
              auth.setAuthName(user.displayName || user.email?.split('@')[0] || '');
              auth.setAuthUid(user.uid);

              try {
                const userDocSnap = await getDoc(doc(loadedDb, 'users', user.uid));
                const role = userDocSnap.exists() ? userDocSnap.data()?.role : 'user';
                if (isMounted.current) {
                  if (role === 'imam') {
                    auth.setIsAuthenticated(true);
                    auth.setIsUserAuthenticated(false);
                    auth.setIsOTPAuthenticated(false);
                  } else {
                    auth.setIsAuthenticated(false);
                    auth.setIsUserAuthenticated(true);
                    auth.setUserAuthName(
                      user.displayName || user.email?.split('@')[0] || ''
                    );
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
                mosques.setMosques(list);
              }
            },
            (error) => {
              console.error('Firestore load failed:', error);
            }
          );
        }
      } catch (error) {
        console.error('Firebase init failed:', error);
      }
    };

    runSetup();
    return () => {
      isMounted.current = false;
      if (unsubMosques) unsubMosques();
      if (unsubAuth) unsubAuth();
    };
  }, []);

  const { currentView } = nav;

  // ============ RENDER ============
  return (
    <ErrorBoundary>
      <div className={`w-full max-w-md mx-auto min-h-screen relative flex flex-col shadow-xl overflow-hidden pb-14 ${currentView === 'tasbih' ? 'bg-[#fef2c7]' : 'bg-slate-50'}`}>

        {/* LOGIN SPLASH */}
        {currentView === 'login-splash' && (
          <LoginChoiceView
            onImamLoginSuccess={() => {
              auth.setIsAuthenticated(true);
              nav.setNavigationHistory(['home']);
            }}
            onUserLogin={(name, phone) => {
              auth.handleUserLogin(name, phone);
              nav.setNavigationHistory(['home']);
            }}
            isRealFirebase={realFirebaseActive}
            realtimeAuth={realtimeAuth}
            setIsAuthenticated={auth.setIsAuthenticated}
            setAuthEmail={auth.setAuthEmail}
            setAuthName={auth.setAuthName}
            setAuthUid={auth.setAuthUid}
          />
        )}

        {/* MAIN CONTENT */}
        {currentView !== 'login-splash' && (
          <>
            <div className={`flex-1 min-h-[500px] flex flex-col ${currentView === 'tasbih' ? 'bg-[#fef2c7]' : 'bg-slate-50'}`}>

              {currentView === 'home' && (
                <HomeView
                  onNavigate={(view) => nav.navigateTo(view)}
                  prayerTimes={prayer.prayerTimes}
                  currentPrayer={prayer.currentPrayer}
                  todayDate={prayer.todayDate}
                  nearbyMosques={mosques.mosques}
                  onOpenMosque={(m) => mosques.setSelectedMosque(m)}
                  userCoords={prayer.userCoords}
                  requestLocation={prayer.requestLocation}
                  isRealFirebase={realFirebaseActive}
                  isAuthenticated={auth.isAuthenticated}
                  isUserAuthenticated={auth.isAnyUser}
                  userAuthName={auth.currentUserName}
                  authName={auth.authName}
                />
              )}

              {currentView === 'quran' && (
                <QuranView onSelectSurah={handleSelectSurah} />
              )}

              {currentView === 'surah' && selectedSurahNum !== null && (
                <SurahReader
                  surahNum={selectedSurahNum}
                  onBack={() => nav.goBack()}
                />
              )}

              {currentView === 'hadith' && (
                <HadithView onBack={() => nav.goBack()} />
              )}

              {currentView === 'namaz' && <NamazView />}
              {currentView === 'duas' && <DuasView />}

              {currentView === 'tasbih' && (
                <div className="flex flex-col justify-center animate-fadeIn flex-1 bg-[#fef2c7]">
                  <TasbihView />
                </div>
              )}

              {currentView === 'qibla' && (
                <QiblaView
                  userCoords={prayer.userCoords}
                  requestLocation={prayer.requestLocation}
                />
              )}

              {currentView === 'mosques' && (
                <MosqueFinderView
                  nearbyMosques={mosques.mosques}
                  userCoords={prayer.userCoords}
                  requestLocation={prayer.requestLocation}
                  onOpenMosque={(m) => mosques.setSelectedMosque(m)}
                />
              )}

              {currentView === 'user-dashboard' && (
                <UserDashboard
                  userName={auth.currentUserName}
                  userPhone={auth.currentUserEmail}
                  onClose={() => nav.goBack()}
                  onOpenMosque={(mosque) => {
                    mosques.setSelectedMosque(mosque);
                    nav.goHome();
                  }}
                  onLogout={() => {
                    auth.handleLogoutAll();
                    mosques.setSavedPopupMosques([]);
                    nav.setNavigationHistory(['login-splash']);
                  }}
                />
              )}

              {currentView === 'imam-login' && (
                <ImamDashboard
                  onAddOrUpdateMosque={mosques.handleAddOrUpdateMosque}
                  onDeleteMosque={mosques.handleDeleteMosque}
                  mosques={mosques.mosques}
                  userCoords={prayer.userCoords}
                  requestLocation={prayer.requestLocation}
                  isRealFirebase={realFirebaseActive}
                  isAuthenticated={auth.isAuthenticated}
                  setIsAuthenticated={(val) => {
                    auth.setIsAuthenticated(val);
                    if (val) nav.setNavigationHistory(['home']);
                  }}
                  authEmail={auth.authEmail}
                  setAuthEmail={auth.setAuthEmail}
                  authName={auth.authName}
                  setAuthName={auth.setAuthName}
                  authUid={auth.authUid}
                  setAuthUid={auth.setAuthUid}
                  realtimeAuth={realtimeAuth}
                  onLoggedOut={() => nav.setNavigationHistory(['login-splash'])}
                />
              )}
            </div>

            {/* BOTTOM NAV */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 flex justify-around p-2 z-40 shadow-xl">
              <button
                onClick={() => nav.navigateTo('hadith')}
                className={`flex flex-col items-center justify-center flex-1 transition-all ${currentView === 'hadith' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
              >
                <Scroll size={17} />
                <span className="text-[10px] font-urdu mt-0.5">حدیث</span>
              </button>

              <button
                onClick={() => nav.navigateTo('quran')}
                className={`flex flex-col items-center justify-center flex-1 transition-all ${currentView === 'quran' || currentView === 'surah' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
              >
                <BookOpen size={17} />
                <span className="text-[10px] font-urdu mt-0.5">قرآن</span>
              </button>

              <button
                onClick={nav.goHome}
                className="relative -top-3.5 w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center border border-emerald-500 shadow-lg text-white transition-transform hover:scale-105"
              >
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" />
                  <path d="M12 2v3M12 5C8.5 5 6 7.5 6 11v10h12V11c0-3.5-2.5-6-6-6z" />
                  <path d="M9 14h6v7H9z" />
                </svg>
              </button>

              <button
                onClick={() => nav.navigateTo('mosques')}
                className={`flex flex-col items-center justify-center flex-1 transition-all ${currentView === 'mosques' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
              >
                <Compass size={17} />
                <span className="text-[10px] font-urdu mt-0.5">مساجد</span>
              </button>

              <button
                onClick={() => nav.navigateTo('duas')}
                className={`flex flex-col items-center justify-center flex-1 transition-all ${currentView === 'duas' ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}
              >
                <Heart size={17} />
                <span className="text-[10px] font-urdu mt-0.5">دعائیں</span>
              </button>
            </div>

            {/* MOSQUE MODAL */}
            {mosques.selectedMosque && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-3 animate-fadeIn">
                <div className="bg-white w-full max-w-sm rounded-2xl p-4 space-y-3.5 shadow-2xl pb-6 border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2" dir="rtl">
                    <h3 className="text-sm font-bold font-urdu text-slate-800">
                      {mosques.selectedMosque.name || 'مسجد'}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => mosques.handleToggleSaveMosque(mosques.selectedMosque!)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                          mosques.savedPopupMosques.includes(mosques.selectedMosque.id)
                            ? 'bg-red-50 border-red-200 text-red-500'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        {mosques.savedPopupMosques.includes(mosques.selectedMosque.id)
                          ? '✓ محفوظ'
                          : 'محفوظ کریں'}
                      </button>
                      <button
                        onClick={() => mosques.setSelectedMosque(null)}
                        className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {mosques.selectedMosque.address && (
                    <div className="text-right space-y-0.5">
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">پتہ</span>
                      <p className="text-xs text-slate-600 font-urdu">{mosques.selectedMosque.address}</p>
                    </div>
                  )}

                  {mosques.selectedMosque.imamName && (
                    <div className="text-right space-y-0.5">
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">امام</span>
                      <p className="text-xs text-emerald-700 font-bold font-urdu">{mosques.selectedMosque.imamName}</p>
                    </div>
                  )}

                  {mosques.selectedMosque.announcement && (
                    <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-right text-xs text-amber-800 font-urdu flex items-start gap-2 justify-end">
                      <span>{mosques.selectedMosque.announcement}</span>
                      <Bell size={13} className="text-amber-600 shrink-0 mt-0.5" />
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <div className="text-right text-[9px] text-slate-400 uppercase font-bold tracking-tight">
                      نماز کے اوقات
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      {[
                        ['فجر', mosques.selectedMosque.fajr],
                        ['ظہر', mosques.selectedMosque.zuhr],
                        ['عصر', mosques.selectedMosque.asr],
                      ].map(([label, time]) => (
                        <div key={label} className="p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="text-[9px] text-slate-500 font-urdu">{label} جماعت</div>
                          <div className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                            {formatTo12Hour(time as string, '--:--')}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      {[
                        ['مغرب', mosques.selectedMosque.maghrib],
                        ['عشاء', mosques.selectedMosque.isha],
                        ['جمعہ', mosques.selectedMosque.jumah],
                      ].map(([label, time]) => (
                        <div key={label} className={`p-1.5 rounded-lg border ${label === 'جمعہ' ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                          <div className={`text-[9px] font-urdu ${label === 'جمعہ' ? 'text-emerald-800 font-bold' : 'text-slate-500'}`}>
                            {label} جماعت
                          </div>
                          <div className={`text-xs font-mono font-bold mt-0.5 ${label === 'جمعہ' ? 'text-emerald-700' : 'text-slate-800'}`}>
                            {formatTo12Hour(time as string, '--:--')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => {
                        mosques.handleMosqueAlert(mosques.selectedMosque!);
                        mosques.setSelectedMosque(null);
                      }}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-urdu font-bold rounded-xl flex items-center justify-center gap-1 flex-row-reverse"
                    >
                      <Bell size={12} /><span>الرٹس آن کریں</span>
                    </button>
                    {mosques.selectedMosque.latitude && mosques.selectedMosque.longitude && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${mosques.selectedMosque.latitude},${mosques.selectedMosque.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2.5 bg-[#4285F4] hover:bg-[#357ae8] text-white text-[10.5px] font-urdu font-bold rounded-xl flex items-center justify-center gap-1.5 flex-row-reverse"
                      >
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
