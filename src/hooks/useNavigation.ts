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
    window.history.pushState({ view: newView }, '', `#${newView}`);
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
    window.history.pushState({ view: 'home' }, '', '#home');
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
    // ✅ اصلاح 1: شروع میں 3 بار pushState کریں (Android WebView کو کنٹرول کرنے کے لیے)
    window.history.pushState({ view: 'home' }, '', '#home');
    window.history.pushState({ view: 'home' }, '', '#home');
    window.history.pushState({ view: 'home' }, '', '#home');

    const handlePopState = () => { // ❌ اصلاح 2: event کو ہٹا دیا کیونکہ event.state پر کوئی انحصار نہیں
      // mosque modal
      if (selectedMosqueRef.current) {
        setSelectedMosqueRef.current(null);
        return;
      }

      const current = navRef.current[navRef.current.length - 1];

      // اگر browser نے پیچھے لیا
      if (navRef.current.length > 1) {
        goBackRef.current();
        return;
      }

      // ✅ home پر — Android خود ایپ بند کرے گا (کیونکہ اب ہم 3 pushStates کے اندر ہیں)
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
