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
    setNavigationHistory(['home']);
    setSelectedSurahNum(null);
    setSelectedMosque(null);
  }, [setSelectedSurahNum, setSelectedMosque]);

  const setNavigationHistoryDirect = useCallback((views: string[]) => {
    navRef.current = views;
    setNavigationHistory(views);
  }, []);


// ============ ANDROID BACK BUTTON ============
useEffect(() => {
  window.history.pushState({ view: 'app-initial' }, '', window.location.href);

  const handlePopState = () => {
    window.history.pushState({ view: 'app' }, '', window.location.href);

    // mosque modal
    if (selectedMosque) {
      setSelectedMosque(null);
      return;
    }

    const current = navRef.current[navRef.current.length - 1];

    // سورت کھلی ہے
    if (current === 'surah') {
      // صرف goBack — useEffect خود surahNum null کرے گا
      goBack();
      return;
    }

    // حدیث
    if (current === 'hadith') {
      window.dispatchEvent(new Event('hadith-back'));
      return;
    }

    // کوئی اور view
    if (navRef.current.length > 1) {
      goBack();
      return;
    }

    // home پر ہیں
    const toast = document.createElement('div');
    toast.textContent = 'باہر نکلنے کے لیے دوبارہ دبائیں';
    toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-sm font-urdu z-50';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, [selectedMosque, goBack, setSelectedMosque]);

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
