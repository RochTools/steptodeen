import { useState } from 'react';
import { firebaseGoogleSignIn } from '../firebase';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

interface LoginChoiceViewProps {
  onImamLoginSuccess: () => void;
  onUserLogin: (name: string, phone: string) => void;
  isRealFirebase: boolean;
  realtimeAuth: any;
  setIsAuthenticated: (val: boolean) => void;
  setAuthEmail: (val: string) => void;
  setAuthName: (val: string) => void;
  setAuthUid: (val: string) => void;
}

export function LoginChoiceView({
  onImamLoginSuccess,
  isRealFirebase,
  realtimeAuth,
  setIsAuthenticated,
  setAuthEmail,
  setAuthName,
  setAuthUid,
}: LoginChoiceViewProps) {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    if (!isRealFirebase || !realtimeAuth) {
      setError('No internet connection. Please try again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await firebaseGoogleSignIn(realtimeAuth);
      if (!user) { setError('Google sign-in failed. Please try again.'); setLoading(false); return; }
      setLoading(false);
      setVerifying(true);

      setAuthEmail(user.email || '');
      setAuthName(user.displayName || user.email?.split('@')[0] || '');
      setAuthUid(user.uid);

      const db = getFirestore();
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (userDoc.exists() && userDoc.data()?.role === 'imam') {
        localStorage.setItem('imam_authenticated', 'true');
        setIsAuthenticated(true);
        onImamLoginSuccess();
      } else {
        setError('This account is not registered as an Imam. Please contact support.');
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (code === 'auth/popup-blocked') {
        setError('Pop-up was blocked by your browser. Please allow pop-ups and try again.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled. Please contact support.');
      } else if (code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with a different sign-in method.');
      } else if (code === 'permission-denied' || code === 'firestore/permission-denied') {
        setError('Access denied. You do not have permission to sign in.');
      } else if (code === 'unavailable') {
        setError('Service is temporarily unavailable. Please try again later.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      console.error('Google sign-in error:', code, err);
    }
    setLoading(false);
  };

  if (verifying) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <div className="text-center space-y-6">
          {/* Spinning mosque icon */}
          <div className="relative mx-auto h-20 w-20">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
            <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
            <div className="absolute inset-2 flex items-center justify-center rounded-full bg-emerald-50">
              <svg className="h-8 w-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18" />
                <path d="M12 2v3M12 5C8.5 5 6 7.5 6 11v10h12V11c0-3.5-2.5-6-6-6z" />
                <path d="M9 14h6v7H9z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">Signing you in...</p>
            <p className="mt-1 text-sm text-slate-400">Please wait a moment</p>
          </div>
          {/* Animated dots */}
          <div className="flex items-center justify-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 rounded-full bg-emerald-300 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg">
          <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18" />
            <path d="M12 2v3M12 5C8.5 5 6 7.5 6 11v10h12V11c0-3.5-2.5-6-6-6z" />
            <path d="M9 14h6v7H9z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Imam Login</h1>
        <p className="mt-1 text-sm text-slate-500">Only for registered Imams</p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow-md active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-center text-xs text-red-600">{error}</p>
        )}

        <p className="text-center text-[11px] text-slate-400">
          This login is only for Imams to manage their mosque.
        </p>
      </div>
    </div>
  );
}
