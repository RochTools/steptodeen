import { useState } from 'react';
import { UserCircle } from 'lucide-react';
import { firebaseSignIn, firebaseSignUp, firebaseGoogleSignIn } from '../firebase';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import {
  sendOTPToEmail,
  verifyOTP,
  checkEmailExists,
  saveUserToFirestore,
  loginWithEmailPassword
} from '../firebase';
import type { LoginFlowStep } from '../types';

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
  onUserLogin,
  isRealFirebase,
  realtimeAuth,
  setIsAuthenticated,
  setAuthEmail,
  setAuthName,
  setAuthUid,
}: LoginChoiceViewProps) {
  const [mode, setMode] = useState<'choice' | 'imam' | 'user'>('choice');

  // Imam states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [imamName, setImamName] = useState('');
  const [imamError, setImamError] = useState('');
  const [loading, setLoading] = useState(false);

  // User states
  const [name, setName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [isUserSignUp, setIsUserSignUp] = useState(false);
  const [userError, setUserError] = useState('');
  const [userLoading, setUserLoading] = useState('');

  // ═══════════════════ OTP STATES ═══════════════════
  const [loginFlowStep, setLoginFlowStep] = useState<LoginFlowStep>('email-input');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [existingUserData, setExistingUserData] = useState<any>(null);

  // ── Google Sign-In Handler (صرف user کے لیے) ─────────────────────────────
  const handleGoogleSignIn = async () => {
    setUserError('');
    setUserLoading('google');
    try {
      const user = await firebaseGoogleSignIn(realtimeAuth);
      const db = getFirestore();

      // پہلے چیک کریں کہ یہ imam تو نہیں
      const userDocSnap = await getDoc(doc(db, 'users', user.uid));
      if (userDocSnap.exists() && userDocSnap.data()?.role === 'imam') {
        setUserError('یہ اکاؤنٹ امام کا ہے۔ امام لاگ ان استعمال کریں۔');
        setUserLoading('');
        return;
      }

      // role: user کے ساتھ save کریں
      await setDoc(doc(db, 'users', user.uid), {
        role: 'user',
        email: user.email,
        name: user.displayName || '',
      }, { merge: true });

      onUserLogin(user.displayName || user.email?.split('@')[0] || 'User', '');
    } catch (err: any) {
      const code: string = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setUserError('Google popup بند ہو گیا۔ دوبارہ کوشش کریں۔');
      } else if (code === 'auth/network-request-failed') {
        setUserError('انٹرنیٹ کنکشن چیک کریں۔');
      } else {
        setUserError('Google لاگ ان میں دشواری: ' + (err?.message || code));
      }
    }
    setUserLoading('');
  };

  // ═══════════════════ OTP HANDLERS ═══════════════════

  // Step 1: Send OTP
  const handleSendOTP = async () => {
    if (!userEmail || !userEmail.includes('@')) {
      setUserError('براہ کرم درست ای میل لکھیں');
      return;
    }
    setUserError('');
    setUserLoading('otp-send');
    setOtpMessage('');

    try {
      // Check if email already exists
      const { exists, userData } = await checkEmailExists(userEmail);
      setExistingUserData(userData || null);

      if (exists) {
        setOtpMessage('یہ ای میل پہلے سے رجسٹر ہے۔ لاگ ان کے لیے OTP درج کریں۔');
      }

      // Send OTP
      const result = await sendOTPToEmail(userEmail);
      if (result.success) {
        setOtpSent(true);
        setLoginFlowStep('otp-verify');
        setOtpMessage(result.message);
        // Start 60s resend timer
        setResendTimer(60);
        const timer = setInterval(() => {
          setResendTimer(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setUserError(result.message);
      }
    } catch (err: any) {
      setUserError('OTP بھیجنے میں خرابی: ' + (err.message || 'دوبارہ کوشش کریں'));
    }
    setUserLoading('');
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setUserError('براہ کرم 6 ہندسوں کا OTP کوڈ لکھیں');
      return;
    }
    setUserError('');
    setUserLoading('otp-verify');

    try {
      const result = await verifyOTP(userEmail, otpCode);
      if (result.success) {
        setOtpVerified(true);
        setOtpMessage(result.message);

        // Check flow: existing user → login, new user → create password
        if (existingUserData) {
          // Existing user - auto login
          setAuthEmail(existingUserData.email);
          setAuthName(existingUserData.name);
          setAuthUid(existingUserData.uid || '');
          setIsAuthenticated(false);
          onUserLogin(existingUserData.name, '');
        } else {
          // New user - show create password
          setLoginFlowStep('create-password');
        }
      } else {
        setUserError(result.message);
      }
    } catch (err: any) {
      setUserError('OTP تصدیق میں خرابی: ' + (err.message || 'دوبارہ کوشش کریں'));
    }
    setUserLoading('');
  };

  // Step 3: Create Password & Save User
  const handleCreatePassword = async () => {
    if (!userPassword || userPassword.length < 6) {
      setUserError('پاسورڈ کم از کم 6 حروف کا ہونا چاہیے');
      return;
    }
    if (!name.trim()) {
      setUserError('براہ کرم اپنا نام لکھیں');
      return;
    }
    setUserError('');
    setUserLoading('create');

    try {
      const result = await saveUserToFirestore(userEmail, userPassword, name.trim(), 'user');
      if (result.success) {
        setAuthEmail(userEmail);
        setAuthName(name.trim());
        setAuthUid(userEmail);
        setIsAuthenticated(false);
        onUserLogin(name.trim(), '');
      } else {
        setUserError(result.message);
      }
    } catch (err: any) {
      setUserError('اکاؤنٹ بنانے میں خرابی: ' + (err.message || 'دوبارہ کوشش کریں'));
    }
    setUserLoading('');
  };

  // Step 4: Login with Password (existing user with password)
  const handleLoginWithPassword = async () => {
    if (!userEmail || !userPassword) {
      setUserError('براہ کرم ای میل اور پاسورڈ لکھیں');
      return;
    }
    setUserError('');
    setUserLoading('login');

    try {
      const result = await loginWithEmailPassword(userEmail, userPassword);
      if (result.success) {
        setAuthEmail(result.userData.email);
        setAuthName(result.userData.name);
        setAuthUid(result.userData.uid || userEmail);
        setIsAuthenticated(false);
        onUserLogin(result.userData.name, '');
      } else {
        setUserError(result.message);
      }
    } catch (err: any) {
      setUserError('لاگ ان میں خرابی: ' + (err.message || 'دوبارہ کوشش کریں'));
    }
    setUserLoading('');
  };

  // ── Imam Login Handler ────────────────────────────────────────────────────
  const handleImamSubmit = async () => {
    if (!email || !password) { setImamError('براہ کرم ای میل اور پاسورڈ لکھیں'); return; }
    if (isSignUp && !imamName) { setImamError('براہ کرم اپنا نام لکھیں'); return; }
    setImamError('');
    setLoading(true);

    if (isRealFirebase && realtimeAuth) {
      try {
        if (isSignUp) {
          const newImam = await firebaseSignUp(realtimeAuth, email, password, imamName);
          const db = getFirestore();
          await setDoc(doc(db, 'users', newImam.uid), {
            role: 'imam',
            email: email,
            name: imamName,
          });
          onImamLoginSuccess();
        } else {
          const user = await firebaseSignIn(realtimeAuth, email, password);
          const db = getFirestore();
          const userDocSnap = await getDoc(doc(db, 'users', user.uid));

          if (userDocSnap.exists() && userDocSnap.data()?.role === 'user') {
            setImamError('یہ اکاؤنٹ یوزر کا ہے۔ یوزر لاگ ان استعمال کریں۔');
            setLoading(false);
            return;
          }

          onImamLoginSuccess();
        }
      } catch (err: any) {
        const code: string = err?.code || '';
        if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          setImamError('ای میل یا پاسورڈ غلط ہے۔ دوبارہ کوشش کریں۔');
        } else if (code === 'auth/email-already-in-use') {
          setImamError('یہ ای میل پہلے سے رجسٹر ہے۔ لاگ ان کریں۔');
        } else if (code === 'auth/weak-password') {
          setImamError('پاسورڈ کم از کم 6 حروف کا ہونا چاہیے۔');
        } else if (code === 'auth/invalid-email') {
          setImamError('ای میل کا فارمیٹ درست نہیں۔');
        } else if (code === 'auth/network-request-failed') {
          setImamError('انٹرنیٹ کنکشن چیک کریں۔');
        } else {
          setImamError('لاگ ان میں دشواری: ' + (err?.message || code));
        }
      }
    } else {
      setImamError('Firebase سے کنکشن نہیں ہے۔ انٹرنیٹ چیک کریں۔');
    }
    setLoading(false);
  };

  // ── Reset OTP Flow ─────────────────────────────────────────────────────────
  const resetOTPFlow = () => {
    setLoginFlowStep('email-input');
    setOtpCode('');
    setOtpSent(false);
    setOtpVerified(false);
    setOtpMessage('');
    setUserError('');
    setUserPassword('');
    setName('');
    setExistingUserData(null);
  };

  // ── Choice Screen ─────────────────────────────────────────────────────────
  if (mode === 'choice') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 gap-8">
        <div className="flex flex-col items-center gap-3 mb-2">
          <div className="w-20 h-20 rounded-3xl bg-emerald-700 flex items-center justify-center shadow-xl">
            <svg className="w-11 h-11 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18" />
              <path d="M12 2v3M12 5C8.5 5 6 7.5 6 11v10h12V11c0-3.5-2.5-6-6-6z" />
              <path d="M9 14h6v7H9z" />
            </svg>
          </div>
          <h1 className="text-black font-urdu text-3xl font-black">StepToDeen</h1>
          <p className="text-slate-500 font-urdu text-sm text-center">اسلامی راہنمائی کا ڈیجیٹل ساتھی</p>
        </div>

        <div className="w-full max-w-xs">
          <div className="border-t border-slate-200 relative">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white px-3 text-slate-400 text-xs font-urdu">لاگ ان کریں</span>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <button
            onClick={() => setMode('imam')}
            className="w-full py-4 px-6 bg-black hover:bg-slate-800 active:scale-95 text-white font-urdu font-black text-base rounded-2xl flex items-center justify-between shadow-md transition-all"
          >
            <span className="text-2xl">🕌</span>
            <span>امام لاگ ان</span>
            <span className="text-slate-400 text-sm">←</span>
          </button>
          <button
            onClick={() => { setMode('user'); resetOTPFlow(); }}
            className="w-full py-4 px-6 bg-white hover:bg-slate-50 active:scale-95 text-black font-urdu font-black text-base rounded-2xl flex items-center justify-between shadow-sm border-2 border-slate-200 transition-all"
          >
            <UserCircle size={24} className="text-slate-600 shrink-0" />
            <span>یوزر لاگ ان</span>
            <span className="text-slate-400 text-sm">←</span>
          </button>
        </div>
        <p className="text-slate-400 font-urdu text-xs text-center max-w-xs">امام صرف مسجد انتظامیہ کے لیے ہے</p>
      </div>
    );
  }

  // ── Imam Login Screen ─────────────────────────────────────────────────────
  if (mode === 'imam') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 gap-6">
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center shadow-lg">
            <span className="text-3xl">🕌</span>
          </div>
          <h2 className="text-black font-urdu text-2xl font-black">{isSignUp ? 'نیا امام اکاؤنٹ' : 'امام لاگ ان'}</h2>
          <p className="text-slate-500 font-urdu text-xs">مسجد انتظامیہ کے لیے</p>
        </div>

        <div className="w-full max-w-xs space-y-4">
          {isSignUp && (
            <div className="space-y-1.5">
              <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">نام *</label>
              <input
                type="text"
                placeholder="امام کا نام"
                value={imamName}
                onChange={e => setImamName(e.target.value)}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 font-urdu text-right text-black placeholder:text-slate-300 outline-none transition-all text-sm"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">ای میل</label>
            <input
              type="email"
              placeholder="imam@mosque.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">پاسورڈ</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm"
              dir="ltr"
            />
          </div>

          {imamError && (
            <p className="text-right text-xs text-red-500 font-urdu bg-red-50 p-2 rounded-lg">{imamError}</p>
          )}

          <button
            onClick={handleImamSubmit}
            disabled={loading || !email || !password}
            className="w-full py-4 bg-black hover:bg-slate-800 active:scale-95 text-white font-urdu font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40"
          >
            {loading ? '...' : isSignUp ? 'امام اکاؤنٹ بنائیں' : 'لاگ ان کریں'}
          </button>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setImamError(''); }}
            className="w-full text-center text-emerald-700 font-urdu text-sm hover:underline"
          >
            {isSignUp ? 'پہلے سے اکاؤنٹ ہے؟ لاگ ان کریں' : 'نیا امام اکاؤنٹ بنانا چاہتے ہیں؟'}
          </button>

          <button onClick={() => setMode('choice')} className="w-full text-center text-slate-400 font-urdu text-sm hover:text-slate-600 transition-colors">
            ← واپس جائیں
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // ── USER LOGIN SCREEN (OTP FLOW) ──────────────────
  // ═══════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 gap-6">
      <div className="flex flex-col items-center gap-2 mb-2">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center shadow-sm">
          <UserCircle size={38} className="text-slate-700" />
        </div>
        <h2 className="text-black font-urdu text-2xl font-black">
          {loginFlowStep === 'email-input' && 'یوزر لاگ ان'}
          {loginFlowStep === 'otp-verify' && 'OTP تصدیق'}
          {loginFlowStep === 'create-password' && 'پاسورڈ بنائیں'}
          {loginFlowStep === 'login-password' && 'پاسورڈ سے لاگ ان'}
        </h2>
        <p className="text-slate-500 font-urdu text-xs">عام صارفین کے لیے</p>
      </div>

      <div className="w-full max-w-xs space-y-4">

        {/* ═══════ STEP 1: EMAIL INPUT ═══════ */}
        {loginFlowStep === 'email-input' && (
          <>
            <div className="space-y-1.5">
              <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">ای میل</label>
              <input
                type="email"
                placeholder="user@email.com"
                value={userEmail}
                onChange={e => { setUserEmail(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm"
                dir="ltr"
              />
            </div>

            <p className="text-center text-slate-400 font-urdu text-xs">
              اپنا Gmail لکھیں، OTP ای میل پر بھیجی جائے گی
            </p>

            {userError && <p className="text-right text-xs text-red-500 font-urdu bg-red-50 p-2 rounded-lg">{userError}</p>}

            <button
              onClick={handleSendOTP}
              disabled={userLoading === 'otp-send' || !userEmail}
              className="w-full py-4 bg-black hover:bg-slate-800 active:scale-95 text-white font-urdu font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40"
            >
              {userLoading === 'otp-send' ? 'OTP بھیج رہے ہیں...' : 'OTP حاصل کریں'}
            </button>

            {/* OR Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-slate-400 text-xs font-urdu">یا</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Google Sign-In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={userLoading === 'google'}
              className="w-full py-3.5 bg-white border-2 border-slate-200 hover:bg-slate-50 active:scale-95 rounded-xl shadow-sm transition-all flex items-center justify-center gap-3 disabled:opacity-40"
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.2 0 5.9 1.1 8.1 2.9l6-6C34.5 3.1 29.6 1 24 1 14.8 1 7 6.7 3.7 14.6l7 5.4C12.4 13.8 17.7 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.8-2.1 5.1-4.4 6.7l7 5.4c4-3.8 6.3-9.4 6.3-16.1z"/>
                <path fill="#FBBC05" d="M10.7 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.2.7-4.6l-7-5.4A23.9 23.9 0 0 0 .1 24c0 3.8.9 7.4 2.5 10.6l8.1-6z"/>
                <path fill="#34A853" d="M24 47c5.6 0 10.3-1.9 13.7-5.1l-7-5.4c-1.9 1.3-4.3 2-6.7 2-6.3 0-11.6-4.3-13.5-10l-8.1 6C7 41.3 14.8 47 24 47z"/>
              </svg>
              <span className="font-urdu font-bold text-sm text-black">Google سے لاگ ان کریں</span>
            </button>

            {/* Password Login Option */}
            <button
              onClick={() => setLoginFlowStep('login-password')}
              className="w-full text-center text-emerald-700 font-urdu text-sm hover:underline"
            >
              پاسورڈ سے لاگ ان کریں
            </button>
          </>
        )}

        {/* ═══════ STEP 2: OTP VERIFY ═══════ */}
        {loginFlowStep === 'otp-verify' && (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-emerald-800 font-urdu text-sm font-bold">✓ OTP بھیج دی گئی ہے</p>
              <p className="text-emerald-600 font-urdu text-xs mt-1">
                {userEmail} پر 6 ہندسوں کا کوڈ بھیجا گیا ہے
              </p>
            </div>

            {otpMessage && (
              <p className="text-right text-xs text-emerald-600 font-urdu bg-emerald-50 p-2 rounded-lg">{otpMessage}</p>
            )}

            <div className="space-y-1.5">
              <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">OTP کوڈ</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={otpCode}
                onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm text-center tracking-[0.5em] font-mono text-lg"
                dir="ltr"
              />
            </div>

            {userError && <p className="text-right text-xs text-red-500 font-urdu bg-red-50 p-2 rounded-lg">{userError}</p>}

            <button
              onClick={handleVerifyOTP}
              disabled={userLoading === 'otp-verify' || otpCode.length !== 6}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-urdu font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40"
            >
              {userLoading === 'otp-verify' ? 'تصدیق ہو رہی ہے...' : 'تصدیق کریں'}
            </button>

            <div className="flex justify-between items-center">
              <button
                onClick={resetOTPFlow}
                className="text-slate-400 font-urdu text-sm hover:text-slate-600 transition-colors"
              >
                ← ای میل تبدیل کریں
              </button>
              <button
                onClick={handleSendOTP}
                disabled={resendTimer > 0 || userLoading === 'otp-send'}
                className="text-emerald-700 font-urdu text-sm hover:underline disabled:text-slate-300"
              >
                {resendTimer > 0 ? `دوبارہ بھیجیں (${resendTimer}s)` : 'OTP دوبارہ بھیجیں'}
              </button>
            </div>
          </>
        )}

        {/* ═══════ STEP 3: CREATE PASSWORD ═══════ */}
        {loginFlowStep === 'create-password' && (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-emerald-800 font-urdu text-sm font-bold">✓ ای میل تصدیق ہو گئی</p>
              <p className="text-emerald-600 font-urdu text-xs mt-1">اب اپنا پاسورڈ اور نام سیٹ کریں</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">نام <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="آپ کا نام"
                value={name}
                onChange={e => { setName(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 font-urdu text-right text-black placeholder:text-slate-300 outline-none transition-all text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">پاسورڈ (کم از کم 6 حروف)</label>
              <input
                type="password"
                placeholder="••••••••"
                value={userPassword}
                onChange={e => { setUserPassword(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm"
                dir="ltr"
              />
            </div>

            {userError && <p className="text-right text-xs text-red-500 font-urdu bg-red-50 p-2 rounded-lg">{userError}</p>}

            <button
              onClick={handleCreatePassword}
              disabled={userLoading === 'create' || !userPassword || !name}
              className="w-full py-4 bg-black hover:bg-slate-800 active:scale-95 text-white font-urdu font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40"
            >
              {userLoading === 'create' ? 'اکاؤنٹ بن رہا ہے...' : 'اکاؤنٹ بنائیں اور لاگ ان کریں'}
            </button>

            <button onClick={resetOTPFlow} className="w-full text-center text-slate-400 font-urdu text-sm hover:text-slate-600 transition-colors">
              ← واپس جائیں
            </button>
          </>
        )}

        {/* ═══════ STEP 4: LOGIN WITH PASSWORD ═══════ */}
        {loginFlowStep === 'login-password' && (
          <>
            <div className="space-y-1.5">
              <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">ای میل</label>
              <input
                type="email"
                placeholder="user@email.com"
                value={userEmail}
                onChange={e => { setUserEmail(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">پاسورڈ</label>
              <input
                type="password"
                placeholder="••••••••"
                value={userPassword}
                onChange={e => { setUserPassword(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm"
                dir="ltr"
              />
            </div>

            {userError && <p className="text-right text-xs text-red-500 font-urdu bg-red-50 p-2 rounded-lg">{userError}</p>}

            <button
              onClick={handleLoginWithPassword}
              disabled={userLoading === 'login' || !userEmail || !userPassword}
              className="w-full py-4 bg-black hover:bg-slate-800 active:scale-95 text-white font-urdu font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40"
            >
              {userLoading === 'login' ? 'لاگ ان ہو رہا ہے...' : 'داخل ہوں'}
            </button>

            <button
              onClick={() => { setLoginFlowStep('email-input'); setUserError(''); }}
              className="w-full text-center text-emerald-700 font-urdu text-sm hover:underline"
            >
              OTP سے لاگ ان کریں
            </button>

            <button onClick={() => setMode('choice')} className="w-full text-center text-slate-400 font-urdu text-sm hover:text-slate-600 transition-colors">
              ← واپس جائیں
            </button>
          </>
        )}

      </div>
      <p className="text-slate-300 font-urdu text-xs text-center max-w-xs">آپ کی معلومات Firebase میں محفوظ رہے گی</p>
    </div>
  );
}
