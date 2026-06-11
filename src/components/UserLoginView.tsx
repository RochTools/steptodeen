import { useState } from 'react';
import { UserCircle } from 'lucide-react';
import { firebaseSignIn, firebaseSignUp } from '../firebase';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
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

  // User OTP states
  const [name, setName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userError, setUserError] = useState('');
  const [userLoading, setUserLoading] = useState('');

  // OTP Flow states
  const [loginFlowStep, setLoginFlowStep] = useState<LoginFlowStep>('email-input');
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [existingUserData, setExistingUserData] = useState<any>(null);

  // ═══════════════════ OTP HANDLERS ═══════════════════

  const handleSendOTP = async () => {
    if (!userEmail || !userEmail.includes('@')) {
      setUserError('براہ کرم درست ای میل لکھیں');
      return;
    }
    setUserError('');
    setUserLoading('otp-send');
    setOtpMessage('');

    try {
      const { exists, userData } = await checkEmailExists(userEmail);
      setExistingUserData(userData || null);

      if (exists) {
        setOtpMessage('یہ ای میل پہلے سے رجسٹر ہے۔ لاگ ان کے لیے OTP درج کریں۔');
      }

      const result = await sendOTPToEmail(userEmail);
      if (result.success) {
        setLoginFlowStep('otp-verify');
        setOtpMessage(result.message);
        setResendTimer(60);
        const timer = setInterval(() => {
          setResendTimer(prev => {
            if (prev <= 1) { clearInterval(timer); return 0; }
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
        if (existingUserData) {
          setAuthEmail(existingUserData.email);
          setAuthName(existingUserData.name);
          setAuthUid(existingUserData.uid || '');
          onUserLogin(existingUserData.name, '');
        } else {
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
        onUserLogin(name.trim(), '');
      } else {
        setUserError(result.message);
      }
    } catch (err: any) {
      setUserError('اکاؤنٹ بنانے میں خرابی: ' + (err.message || 'دوبارہ کوشش کریں'));
    }
    setUserLoading('');
  };

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
        onUserLogin(result.userData.name, '');
      } else {
        setUserError(result.message);
      }
    } catch (err: any) {
      setUserError('لاگ ان میں خرابی: ' + (err.message || 'دوبارہ کوشش کریں'));
    }
    setUserLoading('');
  };

  const resetOTPFlow = () => {
    setLoginFlowStep('email-input');
    setOtpCode('');
    setOtpMessage('');
    setUserError('');
    setUserPassword('');
    setName('');
    setExistingUserData(null);
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
          await setDoc(doc(db, 'users', newImam.uid), { role: 'imam', email: email, name: imamName });
        } else {
          await firebaseSignIn(realtimeAuth, email, password);
        }
        onImamLoginSuccess();
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
          <h2 className="text-black font-urdu text-2xl font-black">{isSignUp ? 'نیا اکاؤنٹ بنائیں' : 'امام لاگ ان'}</h2>
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
            {loading ? '...' : isSignUp ? 'اکاؤنٹ بنائیں' : 'لاگ ان کریں'}
          </button>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setImamError(''); }}
            className="w-full text-center text-emerald-700 font-urdu text-sm hover:underline"
          >
            {isSignUp ? 'پہلے سے اکاؤنٹ ہے؟ لاگ ان کریں' : 'نیا اکاؤنٹ بنانا چاہتے ہیں؟ یہاں کلک کریں'}
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

        {/* Step 1: Email Input */}
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
            <button
              onClick={() => setLoginFlowStep('login-password')}
              className="w-full text-center text-emerald-700 font-urdu text-sm hover:underline"
            >
              پاسورڈ سے لاگ ان کریں
            </button>
          </>
        )}

        {/* Step 2: OTP Verify */}
        {loginFlowStep === 'otp-verify' && (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-emerald-800 font-urdu text-sm font-bold">✓ OTP بھیج دی گئی ہے</p>
              <p className="text-emerald-600 font-urdu text-xs mt-1">{userEmail} پر کوڈ بھیجا گیا</p>
            </div>
            {otpMessage && <p className="text-right text-xs text-emerald-600 font-urdu bg-emerald-50 p-2 rounded-lg">{otpMessage}</p>}
            <div className="space-y-1.5">
              <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">OTP کوڈ</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={otpCode}
                onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3.5 text-black text-center tracking-[0.5em] font-mono text-lg outline-none transition-all"
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
              <button onClick={resetOTPFlow} className="text-slate-400 font-urdu text-sm hover:text-slate-600">← ای میل تبدیل کریں</button>
              <button onClick={handleSendOTP} disabled={resendTimer > 0} className="text-emerald-700 font-urdu text-sm hover:underline disabled:text-slate-300">
                {resendTimer > 0 ? `دوبارہ بھیجیں (${resendTimer}s)` : 'OTP دوبارہ بھیجیں'}
              </button>
            </div>
          </>
        )}

        {/* Step 3: Create Password */}
        {loginFlowStep === 'create-password' && (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-emerald-800 font-urdu text-sm font-bold">✓ ای میل تصدیق ہو گئی</p>
              <p className="text-emerald-600 font-urdu text-xs mt-1">اب اپنا پاسورڈ اور نام سیٹ کریں</p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">نام *</label>
              <input type="text" placeholder="آپ کا نام" value={name} onChange={e => { setName(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 font-urdu text-right text-black placeholder:text-slate-300 outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">پاسورڈ (کم از کم 6 حروف)</label>
              <input type="password" placeholder="••••••••" value={userPassword} onChange={e => { setUserPassword(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm" dir="ltr" />
            </div>
            {userError && <p className="text-right text-xs text-red-500 font-urdu bg-red-50 p-2 rounded-lg">{userError}</p>}
            <button onClick={handleCreatePassword} disabled={userLoading === 'create' || !userPassword || !name}
              className="w-full py-4 bg-black hover:bg-slate-800 active:scale-95 text-white font-urdu font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40">
              {userLoading === 'create' ? 'اکاؤنٹ بن رہا ہے...' : 'اکاؤنٹ بنائیں اور لاگ ان کریں'}
            </button>
            <button onClick={resetOTPFlow} className="w-full text-center text-slate-400 font-urdu text-sm hover:text-slate-600">← واپس جائیں</button>
          </>
        )}

        {/* Step 4: Login with Password */}
        {loginFlowStep === 'login-password' && (
          <>
            <div className="space-y-1.5">
              <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">ای میل</label>
              <input type="email" placeholder="user@email.com" value={userEmail} onChange={e => { setUserEmail(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-right text-xs font-urdu text-slate-600 font-semibold">پاسورڈ</label>
              <input type="password" placeholder="••••••••" value={userPassword} onChange={e => { setUserPassword(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm" dir="ltr" />
            </div>
            {userError && <p className="text-right text-xs text-red-500 font-urdu bg-red-50 p-2 rounded-lg">{userError}</p>}
            <button onClick={handleLoginWithPassword} disabled={userLoading === 'login' || !userEmail || !userPassword}
              className="w-full py-4 bg-black hover:bg-slate-800 active:scale-95 text-white font-urdu font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40">
              {userLoading === 'login' ? 'لاگ ان ہو رہا ہے...' : 'داخل ہوں'}
            </button>
            <button onClick={() => { setLoginFlowStep('email-input'); setUserError(''); }}
              className="w-full text-center text-emerald-700 font-urdu text-sm hover:underline">OTP سے لاگ ان کریں</button>
            <button onClick={() => setMode('choice')} className="w-full text-center text-slate-400 font-urdu text-sm hover:text-slate-600">← واپس جائیں</button>
          </>
        )}
      </div>
      <p className="text-slate-300 font-urdu text-xs text-center max-w-xs">آپ کی معلومات Firebase میں محفوظ رہے گی</p>
    </div>
  );
}
