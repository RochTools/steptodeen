import { useState, useRef, useCallback, useEffect } from 'react';
import { Mosque } from '../types';

interface UseNavigationProps {
  selectedMosque: Mosque | null;
  setSelectedMosque: (m: Mosque | null) => void;
  setSelectedSurahNum: (n: number | null) => void;
}

export const useNavigation = ({
  selectedMosque,
  setSelectedMosque,
  setSelectedSurahNum
}: UseNavigationProps) => {

  const getInitialView = useCallback(() => {
    const imamAuth = localStorage.getItem('imam_authenticated') === 'true';
    const userAuth = localStorage.getItem('user_authenticated') === 'true';
    const otpAuth = localStorage.getItem('otp_authenticated') === 'true';
    if (imamAuth || userAuth || otpAuth) return 'home';
    return 'login-splash';
  }, []);

  const navRef = useRef<string[]>([getInitialView()]);
  const [navigationHistory, setNavigationHistory] = useState<string[]>(
    () => [getInitialView()]
  );

  const currentView = navigationHistory[navigationHistory.length - 1];

  // ✅ اصلاح 1: یہاں سے ALL pushState ہٹا دیں (صرف React اسٹیک چلے گا)
  const navigateTo = useCallback((newView: string) => {
    if (navRef.current[navRef.current.length - 1] === newView) return;
    navRef.current = [...navRef.current, newView];
    setNavigationHistory([...navRef.current]);
  }, []);

  const goBack = useCallback(() => {
    if (navRef.current.length <= 1) {
      navRef.current = ['home'];
      setNavigationHistory(['home']);
      return;
    }
    navRef.current = navRef.current.slice(0, -1);
    setNavigationHistory([...navRef.current]);
  }, []);

  const goHome = useCallback(() => {
    navRef.current = ['home'];
    setNavigationHistory(['home']);
    setSelectedSurahNum(null);
    setSelectedMosque(null);
  }, [setSelectedSurahNum, setSelectedMosque]);

  const setNavigationHistoryDirect = useCallback((views: string[]) => {
    navRef.current = views;
    setNavigationHistory(views);
  }, []);

  const selectedMosqueRef = useRef(selectedMosque);
  useEffect(() => {
    selectedMosqueRef.current = selectedMosque;
  }, [selectedMosque]);

  const setSelectedMosqueRef = useRef(setSelectedMosque);
  const goBackRef = useRef(goBack);
  useEffect(() => {
    goBackRef.current = goBack;
  }, [goBack]);

  // ============ ANDROID BACK BUTTON ============
  useEffect(() => {
    // ✅ اصلاح 2: شروع میں بالکل 3 دفعہ pushState کریں (یہ Android کو کنٹرول کرے گا)
    window.history.pushState({ view: 'app' }, '', window.location.href);
    window.history.pushState({ view: 'app' }, '', window.location.href);
    window.history.pushState({ view: 'app' }, '', window.location.href);

    const handlePopState = () => {
      // Mosque modal
      if (selectedMosqueRef.current) {
        setSelectedMosqueRef.current(null);
        return;
      }

      const current = navRef.current[navRef.current.length - 1];

      // ✅ حدیث اور سورہ سے بیک پر ایک سٹیپ پیچھے جائیں
      if (current === 'surah' || current === 'hadith') {
        goBackRef.current(); // اس سے آپ 'abwab' یا 'surah-list' پر آئیں گے
        return;
      }

      // ✅ باقی تمام اسٹیک (kitaab, abwab, surah-list وغیرہ) یہاں ہینڈل ہوں گے
      if (navRef.current.length > 1) {
        goBackRef.current();
        return;
      }

      // ✅ جب 'home' پر ہوں اور ہسٹری ختم ہو، Android خود بخود ایپ بند کر دے گا
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ============ SURAH RESET ON VIEW CHANGE ============
  useEffect(() => {
    if (currentView !== 'surah') setSelectedSurahNum(null);
  }, [currentView, setSelectedSurahNum]);

  return {
    currentView,
    navigationHistory,
    navigateTo,
    goBack,
    goHome,
    setNavigationHistory: setNavigationHistoryDirect,
  };
};
