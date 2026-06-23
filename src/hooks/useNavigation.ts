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

  const navigateTo = useCallback((newView: string) => {
    if (navRef.current[navRef.current.length - 1] === newView) return;
    navRef.current = [...navRef.current, newView];
    setNavigationHistory([...navRef.current]);
  }, []);

  const goBack = useCallback(() => {
    if (navRef.current.length <= 1) {
      navRef.current = ['home'];
    } else {
      navRef.current = navRef.current.slice(0, -1);
    }
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

  // ✅ Refs تاکہ useEffect دوبارہ register نہ ہو
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
    window.history.pushState({ view: 'app' }, '', window.location.href);

    const handlePopState = () => {
      window.history.pushState({ view: 'app' }, '', window.location.href);

      // mosque modal
      if (selectedMosqueRef.current) {
        setSelectedMosqueRef.current(null);
        return;
      }

      const current = navRef.current[navRef.current.length - 2];

      // سورت
      if (current === 'surah') {
        goBackRef.current();
        return;
      }

      // حدیث
      if (current === 'hadith') {
        window.dispatchEvent(new Event('hadith-back'));
        return;
      }

      // کوئی اور view
      if (navRef.current.length > 1) {
        goBackRef.current();
        return;
      }

      // home پر — کچھ نہیں
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // ✅ خالی — صرف ایک بار register

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
