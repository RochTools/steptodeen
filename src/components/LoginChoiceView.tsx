import { useState } from 'react';
import { UserCircle } from 'lucide-react';
import { firebaseSignIn, firebaseSignUp, firebaseGoogleSignIn } from '../firebase';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import {
  sendOTPToEmail,
  verifyOTP,
  checkEmailExists,
  saveUserToFirestore,
  loginWithEmailPassword,
  resetPasswordInFirestore
} from '../firebase';
// LoginFlowStep: 'email-input' | 'otp-verify' | 'create-password' | 'login-password' | 'forgot-otp' | 'forgot-new-password'
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

  // ── Imam states ──────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [imamName, setImamName] = useState('');
  const [imamError, setImamError] = useState('');
  const [imamSuccess, setImamSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Imam OTP states (Sign Up only)
  const [imamOtpStep, setImamOtpStep] = useState<'form' | 'otp'>('form');
  const [imamOtpCode, setImamOtpCode] = useState('');
  const [imamResendTimer, setImamResendTimer] = useState(0);

  // ── User OTP states ──────────────────────────────────
  const [name, setName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userError, setUserError] = useState('');
  const [userLoading, setUserLoading] = useState('');

  // Forgot Password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotResendTimer, setForgotResendTimer] = useState(0);
  const [forgotOtpCode, setForgotOtpCode] = useState('');

  // OTP Flow states
  const [loginFlowStep, setLoginFlowStep] = useState<LoginFlowStep>('email-input');
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [existingUserData, setExistingUserData] = useState<any>(null);

  // ═══════════════════ IMAM OTP HELPERS ═══════════════════

  const startImamResendTimer = () => {
    setImamResendTimer(60);
    const t = setInterval(() => {
      setImamResendTimer(prev => {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Rate Limiting (max 4 requests per 2 hours) ──
  const OTP_RATE_KEY = 'otp_rate_limit';
  const MAX_REQUESTS = 4;
  const BLOCK_DURATION_MS = 2 * 60 * 60 * 1000;

  const checkRateLimit = (emailKey: string): { allowed: boolean; minutesLeft: number } => {
    try {
      const raw = localStorage.getItem(OTP_RATE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      const record = data[emailKey] || { count: 0, blockedAt: null };
      if (record.blockedAt) {
        const elapsed = Date.now() - record.blockedAt;
        if (elapsed < BLOCK_DURATION_MS) {
          const minutesLeft = Math.ceil((BLOCK_DURATION_MS - elapsed) / 60000);
          return { allowed: false, minutesLeft };
        } else {
          data[emailKey] = { count: 0, blockedAt: null };
          localStorage.setItem(OTP_RATE_KEY, JSON.stringify(data));
        }
      }
      return { allowed: true, minutesLeft: 0 };
    } catch { return { allowed: true, minutesLeft: 0 }; }
  };

  const recordOTPRequest = (emailKey: string) => {
    try {
      const raw = localStorage.getItem(OTP_RATE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      const record = data[emailKey] || { count: 0, blockedAt: null };
      record.count = (record.count || 0) + 1;
      if (record.count >= MAX_REQUESTS) record.blockedAt = Date.now();
      data[emailKey] = record;
      localStorage.setItem(OTP_RATE_KEY, JSON.stringify(data));
    } catch {}
  };

  // Step 1: Validate form → Send OTP
  const handleImamSubmit = async () => {
    if (!email || !password) { setImamError('Please enter your email and password.'); return; }
    if (isSignUp && !imamName) { setImamError('Please enter your name.'); return; }
    if (isSignUp && password.length < 6) { setImamError('Password must be at least 6 characters.'); return; }
    setImamError('');
    setLoading(true);

    if (!isRealFirebase || !realtimeAuth) {
      setImamError('No Firebase connection. Please check your internet.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Sign Up: check rate limit then send OTP
        const rateCheck = checkRateLimit(email);
        if (!rateCheck.allowed) {
          setImamError(`Too many OTP requests. Please try again in ${rateCheck.minutesLeft} minute(s).`);
          setLoading(false);
          return;
        }
        const result = await sendOTPToEmail(email);
        if (result.success) {
          recordOTPRequest(email);
          setImamOtpStep('otp');
          startImamResendTimer();
        } else {
          setImamError(result.message);
        }
      } else {
        // Login: directly via Firebase
        const user = await firebaseSignIn(realtimeAuth, email, password);
        const db = getFirestore();
        const userDocSnap = await getDoc(doc(db, 'users', user.uid));
        if (userDocSnap.exists() && userDocSnap.data()?.role === 'user') {
          setImamError('This is a user account. Please use the User Login.');
          setLoading(false);
          return;
        }
        onImamLoginSuccess();
      }
    } catch (err: any) {
      const code: string = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setImamError('Incorrect email or password. Please try again.');
      } else if (code === 'auth/email-already-in-use') {
        setImamError('This email is already registered. Please log in.');
      } else if (code === 'auth/weak-password') {
        setImamError('Password must be at least 6 characters.');
      } else if (code === 'auth/invalid-email') {
        setImamError('Invalid email format.');
      } else if (code === 'auth/network-request-failed') {
        setImamError('Network error. Please check your internet connection.');
      } else {
        setImamError('Error: ' + (err?.message || code));
      }
    }
    setLoading(false);
  };

  // Step 2: Verify OTP → Create Firebase account
  const handleImamVerifyOTP = async () => {
    if (!imamOtpCode || imamOtpCode.length !== 6) {
      setImamError('Please enter the 6-digit OTP code.');
      return;
    }
    setImamError('');
    setLoading(true);

    try {
      const result = await verifyOTP(email, imamOtpCode);
      if (result.success) {
        // OTP verified — now create Firebase account
        const newImam = await firebaseSignUp(realtimeAuth, email, password, imamName);
        const db = getFirestore();
        await setDoc(doc(db, 'users', newImam.uid), {
          role: 'imam',
          email: email,
          name: imamName,
        });
        setImamSuccess('Congratulations! Your Imam account has been created successfully.');
        setTimeout(() => onImamLoginSuccess(), 1200);
      } else {
        setImamError(result.message);
      }
    } catch (err: any) {
      const code: string = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setImamError('This email is already registered. Please log in.');
      } else {
        setImamError('Error creating account: ' + (err?.message || code));
      }
    }
    setLoading(false);
  };

  // Resend OTP for imam
  const handleImamResendOTP = async () => {
    setImamError('');
    const rateCheck = checkRateLimit(email);
    if (!rateCheck.allowed) {
      setImamError(`Too many OTP requests. Please try again in ${rateCheck.minutesLeft} minute(s).`);
      return;
    }
    setLoading(true);
    try {
      const result = await sendOTPToEmail(email);
      if (result.success) {
        recordOTPRequest(email);
        startImamResendTimer();
      } else {
        setImamError(result.message);
      }
    } catch {
      setImamError('Failed to resend OTP. Please try again.');
    }
    setLoading(false);
  };

  const resetImamOtpFlow = () => {
    setImamOtpStep('form');
    setImamOtpCode('');
    setImamError('');
    setImamSuccess('');
  };

  // ═══════════════════ GOOGLE SIGN-IN ═══════════════════
  const handleGoogleSignIn = async () => {
    setUserError('');
    setUserLoading('google');
    try {
      const user = await firebaseGoogleSignIn(realtimeAuth);
      const db = getFirestore();
      const userDocSnap = await getDoc(doc(db, 'users', user.uid));
      if (userDocSnap.exists() && userDocSnap.data()?.role === 'imam') {
        setUserError('This is an Imam account. Please use the Imam Login.');
        setUserLoading('');
        return;
      }
      await setDoc(doc(db, 'users', user.uid), {
        role: 'user',
        email: user.email,
        name: user.displayName || '',
      }, { merge: true });
      onUserLogin(user.displayName || user.email?.split('@')[0] || 'User', '');
    } catch (err: any) {
      const code: string = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setUserError('Google popup was closed. Please try again.');
      } else if (code === 'auth/network-request-failed') {
        setUserError('Network error. Please check your internet connection.');
      } else {
        setUserError('Google sign-in error: ' + (err?.message || code));
      }
    }
    setUserLoading('');
  };

  // ═══════════════════ USER OTP HANDLERS ═══════════════════

  const handleSendOTP = async () => {
    if (!userEmail || !userEmail.includes('@')) {
      setUserError('Please enter a valid email address.');
      return;
    }
    setUserError('');
    setUserLoading('otp-send');
    setOtpMessage('');
    try {
      const { exists, userData } = await checkEmailExists(userEmail);
      setExistingUserData(userData || null);
      const rateCheck = checkRateLimit(userEmail);
      if (!rateCheck.allowed) {
        setUserError(`Too many OTP requests. Please try again in ${rateCheck.minutesLeft} minute(s).`);
        setUserLoading('');
        return;
      }
      const result = await sendOTPToEmail(userEmail);
      if (result.success) {
        recordOTPRequest(userEmail);
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
      setUserError('Failed to send OTP: ' + (err.message || 'Please try again.'));
    }
    setUserLoading('');
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setUserError('Please enter the 6-digit OTP code.');
      return;
    }
    setUserError('');
    setUserLoading('otp-verify');
    try {
      const result = await verifyOTP(userEmail, otpCode);
      if (result.success) {
        setOtpMessage(result.message);
        if (existingUserData) {
          setAuthEmail(existingUserData.email);
          setAuthName(existingUserData.name);
          setAuthUid(existingUserData.uid || '');
          onUserLogin(existingUserData.name, existingUserData.email);
        } else {
          setLoginFlowStep('create-password');
        }
      } else {
        setUserError(result.message);
      }
    } catch (err: any) {
      setUserError('OTP verification failed: ' + (err.message || 'Please try again.'));
    }
    setUserLoading('');
  };

  const handleCreatePassword = async () => {
    if (!userPassword || userPassword.length < 6) {
      setUserError('Password must be at least 6 characters.');
      return;
    }
    if (!name.trim()) {
      setUserError('Please enter your name.');
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
        onUserLogin(name.trim(), userEmail);
      } else {
        setUserError(result.message);
      }
    } catch (err: any) {
      setUserError('Error creating account: ' + (err.message || 'Please try again.'));
    }
    setUserLoading('');
  };

  const handleLoginWithPassword = async () => {
    if (!userEmail || !userPassword) {
      setUserError('Please enter your email and password.');
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
        onUserLogin(result.userData.name, result.userData.email);
      } else {
        setUserError(result.message);
      }
    } catch (err: any) {
      setUserError('Login failed: ' + (err.message || 'Please try again.'));
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

  // ═══════════════════ FORGOT PASSWORD HANDLERS ═══════════════════

  const startForgotResendTimer = () => {
    setForgotResendTimer(60);
    const t = setInterval(() => {
      setForgotResendTimer(prev => {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleForgotSendOTP = async () => {
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setUserError('Please enter a valid email address.');
      return;
    }
    // Check if account exists
    const { exists } = await checkEmailExists(forgotEmail);
    if (!exists) {
      setUserError('No account found with this email.');
      return;
    }
    // Rate limit check
    const rateCheck = checkRateLimit(forgotEmail);
    if (!rateCheck.allowed) {
      setUserError(`Too many requests. Please try again in ${rateCheck.minutesLeft} minute(s).`);
      return;
    }
    setUserError('');
    setUserLoading('forgot-otp');
    try {
      const result = await sendOTPToEmail(forgotEmail);
      if (result.success) {
        recordOTPRequest(forgotEmail);
        setLoginFlowStep('forgot-otp');
        startForgotResendTimer();
      } else {
        setUserError(result.message);
      }
    } catch (err: any) {
      setUserError('Failed to send OTP: ' + err.message);
    }
    setUserLoading('');
  };

  const handleForgotVerifyOTP = async () => {
    if (!forgotOtpCode || forgotOtpCode.length !== 6) {
      setUserError('Please enter the 6-digit OTP code.');
      return;
    }
    setUserError('');
    setUserLoading('forgot-verify');
    try {
      const result = await verifyOTP(forgotEmail, forgotOtpCode);
      if (result.success) {
        setLoginFlowStep('forgot-new-password');
      } else {
        setUserError(result.message);
      }
    } catch (err: any) {
      setUserError('Verification failed: ' + err.message);
    }
    setUserLoading('');
  };

  const handleForgotSetNewPassword = async () => {
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setUserError('Password must be at least 6 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setUserError('Passwords do not match.');
      return;
    }
    setUserError('');
    setUserLoading('forgot-save');
    try {
      const result = await resetPasswordInFirestore(forgotEmail, forgotNewPassword);
      if (result.success) {
        // Reset all forgot states and go to login
        setForgotEmail('');
        setForgotOtpCode('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setUserEmail(forgotEmail);
        setLoginFlowStep('login-password');
        setUserError('');
        // Show success briefly
        setOtpMessage('Password updated! Please log in with your new password.');
      } else {
        setUserError(result.message);
      }
    } catch (err: any) {
      setUserError('Error: ' + err.message);
    }
    setUserLoading('');
  };

  // ═══════════════════════════════════════════════════
  // ── CHOICE SCREEN ─────────────────────────────────
  // ═══════════════════════════════════════════════════
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
          <h1 className="text-black text-3xl font-black">StepToDeen</h1>
          <p className="text-slate-500 text-sm text-center">Your Islamic Digital Companion</p>
        </div>

        <div className="w-full max-w-xs">
          <div className="border-t border-slate-200 relative">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white px-3 text-slate-400 text-xs">Sign In</span>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <button
            onClick={() => setMode('imam')}
            className="w-full py-4 px-6 bg-black hover:bg-slate-800 active:scale-95 text-white font-black text-base rounded-2xl flex items-center justify-between shadow-md transition-all"
          >
            <span className="text-2xl">🕌</span>
            <span>Imam Login</span>
            <span className="text-slate-400 text-sm">→</span>
          </button>
          <button
            onClick={() => { setMode('user'); resetOTPFlow(); }}
            className="w-full py-4 px-6 bg-white hover:bg-slate-50 active:scale-95 text-black font-black text-base rounded-2xl flex items-center justify-between shadow-sm border-2 border-slate-200 transition-all"
          >
            <UserCircle size={24} className="text-slate-600 shrink-0" />
            <span>User Login</span>
            <span className="text-slate-400 text-sm">→</span>
          </button>
        </div>
        <p className="text-slate-400 text-xs text-center max-w-xs">Imam login is for mosque administration only.</p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // ── IMAM LOGIN SCREEN ─────────────────────────────
  // ═══════════════════════════════════════════════════
  if (mode === 'imam') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 gap-6">
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center shadow-lg">
            <span className="text-3xl">🕌</span>
          </div>
          <h2 className="text-black text-2xl font-black">
            {imamOtpStep === 'otp' ? 'Email Verification' : isSignUp ? 'New Imam Account' : 'Imam Login'}
          </h2>
          <p className="text-slate-500 text-xs">For mosque administration</p>
        </div>

        <div className="w-full max-w-xs space-y-4">

          {/* ── OTP Verify Step (Sign Up only) ── */}
          {imamOtpStep === 'otp' ? (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <p className="text-emerald-800 text-sm font-bold">✓ OTP Sent</p>
                <p className="text-emerald-600 text-xs mt-1">A code was sent to {email}</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-left text-xs text-slate-600 font-semibold">OTP Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={imamOtpCode}
                  onChange={e => { setImamOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setImamError(''); }}
                  className="w-full border-2 border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-3.5 text-black text-center tracking-[0.5em] font-mono text-lg outline-none transition-all"
                  dir="ltr"
                />
              </div>

              {/* Resend Timer — above verify button */}
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <button onClick={handleImamResendOTP} disabled={imamResendTimer > 0 || loading}
                  className="text-sm font-bold text-emerald-700 hover:underline disabled:text-slate-400 disabled:cursor-not-allowed transition-all">
                  {imamResendTimer > 0 ? `⏳ Resend in ${imamResendTimer}s` : '🔄 Resend OTP'}
                </button>
                <button onClick={resetImamOtpFlow} className="text-sm text-slate-500 hover:text-slate-700 font-medium">
                  Go Back →
                </button>
              </div>

              {imamError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{imamError}</p>}
              {imamSuccess && <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg">{imamSuccess}</p>}

              <button
                onClick={handleImamVerifyOTP}
                disabled={loading || imamOtpCode.length !== 6}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40"
              >
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </button>
            </>
          ) : (
            <>
              {/* ── Normal Form Step ── */}
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="block text-left text-xs text-slate-600 font-semibold">Full Name *</label>
                  <input
                    type="text"
                    placeholder="Imam's name"
                    value={imamName}
                    onChange={e => setImamName(e.target.value)}
                    dir="ltr"
                    className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black text-left placeholder:text-slate-300 outline-none transition-all text-sm"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-left text-xs text-slate-600 font-semibold">Email</label>
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
                <label className="block text-left text-xs text-slate-600 font-semibold">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm"
                  dir="ltr"
                />
              </div>

              {imamError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{imamError}</p>}

              <button
                onClick={handleImamSubmit}
                disabled={loading || !email || !password}
                className="w-full py-4 bg-black hover:bg-slate-800 active:scale-95 text-white font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40"
              >
                {loading ? '...' : isSignUp ? 'Get OTP' : 'Login'}
              </button>

              <button
                onClick={() => { setIsSignUp(!isSignUp); setImamError(''); resetImamOtpFlow(); }}
                className="w-full text-center text-emerald-700 text-sm hover:underline"
              >
                {isSignUp ? 'Already have an account? Log in' : 'Create a new Imam account'}
              </button>

              <button onClick={() => { setMode('choice'); resetImamOtpFlow(); }} className="w-full text-center text-slate-400 text-sm hover:text-slate-600 transition-colors">
                Go Back →
              </button>
            </>
          )}
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
        <h2 className="text-black text-2xl font-black">
          {loginFlowStep === 'email-input' && 'User Login'}
          {loginFlowStep === 'otp-verify' && 'OTP Verification'}
          {loginFlowStep === 'create-password' && 'Create Password'}
          {loginFlowStep === 'login-password' && 'Login with Password'}
        </h2>
        <p className="text-slate-500 text-xs">For general users</p>
      </div>

      <div className="w-full max-w-xs space-y-4">

        {/* Step 1: Email Input */}
        {loginFlowStep === 'email-input' && (
          <>
            <div className="space-y-1.5">
              <label className="block text-left text-xs text-slate-600 font-semibold">Email</label>
              <input
                type="email"
                placeholder="user@email.com"
                value={userEmail}
                onChange={e => { setUserEmail(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm"
                dir="ltr"
              />
            </div>
            <p className="text-center text-slate-400 text-xs">
              Enter your email — an OTP will be sent to it.
            </p>
            {userError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{userError}</p>}
            <button
              onClick={handleSendOTP}
              disabled={userLoading === 'otp-send' || !userEmail}
              className="w-full py-4 bg-black hover:bg-slate-800 active:scale-95 text-white font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40"
            >
              {userLoading === 'otp-send' ? 'Sending OTP...' : 'Get OTP'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-slate-400 text-xs">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

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
              <span className="font-bold text-sm text-black">Continue with Google</span>
            </button>

            <button
              onClick={() => setLoginFlowStep('login-password')}
              className="w-full text-center text-emerald-700 text-sm hover:underline"
            >
              Login with Password
            </button>

            <button
              onClick={() => setMode('choice')}
              className="w-full text-center text-slate-400 text-sm hover:text-slate-600 transition-colors"
            >
              Go Back →
            </button>
          </>
        )}

        {/* Step 2: OTP Verify */}
        {loginFlowStep === 'otp-verify' && (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-emerald-800 text-sm font-bold">✓ OTP Sent</p>
              <p className="text-emerald-600 text-xs mt-1">A code was sent to {userEmail}</p>
            </div>
            {otpMessage && <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg">{otpMessage}</p>}
            <div className="space-y-1.5">
              <label className="block text-left text-xs text-slate-600 font-semibold">OTP Code</label>
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
            {/* Resend Timer — above verify button */}
            <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <button onClick={handleSendOTP} disabled={resendTimer > 0}
                className="text-sm font-bold text-emerald-700 hover:underline disabled:text-slate-400 disabled:cursor-not-allowed transition-all">
                {resendTimer > 0 ? `⏳ Resend in ${resendTimer}s` : '🔄 Resend OTP'}
              </button>
              <button onClick={resetOTPFlow} className="text-sm text-slate-500 hover:text-slate-700 font-medium">
                Change Email
              </button>
            </div>
            {userError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{userError}</p>}
            <button
              onClick={handleVerifyOTP}
              disabled={userLoading === 'otp-verify' || otpCode.length !== 6}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40"
            >
              {userLoading === 'otp-verify' ? 'Verifying...' : 'Verify'}
            </button>
          </>
        )}

        {/* Step 3: Create Password */}
        {loginFlowStep === 'create-password' && (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-emerald-800 text-sm font-bold">✓ Email Verified</p>
              <p className="text-emerald-600 text-xs mt-1">Now set your name and password.</p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-left text-xs text-slate-600 font-semibold">Full Name *</label>
              <input type="text" placeholder="Your name" value={name} onChange={e => { setName(e.target.value); setUserError(''); }}
                dir="ltr" className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black text-left placeholder:text-slate-300 outline-none transition-all text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-left text-xs text-slate-600 font-semibold">Password (min. 6 characters)</label>
              <input type="password" placeholder="••••••••" value={userPassword} onChange={e => { setUserPassword(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm" dir="ltr" />
            </div>
            {userError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{userError}</p>}
            <button onClick={handleCreatePassword} disabled={userLoading === 'create' || !userPassword || !name}
              className="w-full py-4 bg-black hover:bg-slate-800 active:scale-95 text-white font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40">
              {userLoading === 'create' ? 'Creating account...' : 'Create Account & Login'}
            </button>
            <button onClick={resetOTPFlow} className="w-full text-center text-slate-400 text-sm hover:text-slate-600">Go Back →</button>
          </>
        )}

        {/* Step 4: Login with Password */}
        {loginFlowStep === 'login-password' && (
          <>
            <div className="space-y-1.5">
              <label className="block text-left text-xs text-slate-600 font-semibold">Email</label>
              <input type="email" placeholder="user@email.com" value={userEmail} onChange={e => { setUserEmail(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-left text-xs text-slate-600 font-semibold">Password</label>
              <input type="password" placeholder="••••••••" value={userPassword} onChange={e => { setUserPassword(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm" dir="ltr" />
            </div>
            {userError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{userError}</p>}
            <button onClick={handleLoginWithPassword} disabled={userLoading === 'login' || !userEmail || !userPassword}
              className="w-full py-4 bg-black hover:bg-slate-800 active:scale-95 text-white font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40">
              {userLoading === 'login' ? 'Logging in...' : 'Login'}
            </button>
            <button onClick={() => { setLoginFlowStep('email-input'); setUserError(''); }}
              className="w-full text-center text-emerald-700 text-sm hover:underline">Login with OTP instead</button>
            <button
              onClick={() => { setForgotEmail(userEmail); setLoginFlowStep('forgot-email'); setUserError(''); }}
              className="w-full text-center text-rose-500 text-sm hover:underline font-semibold"
            >
              Forgot Password?
            </button>
            <button onClick={() => setMode('choice')} className="w-full text-center text-slate-400 text-sm hover:text-slate-600">Go Back →</button>
          </>
        )}
        {/* Forgot Step 1: Enter Email */}
        {loginFlowStep === 'forgot-email' && (
          <>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
              <p className="text-rose-800 text-sm font-bold">🔑 Reset Your Password</p>
              <p className="text-rose-600 text-xs mt-1">Enter your email — we'll send an OTP to verify.</p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs text-slate-600 font-semibold">Email</label>
              <input
                type="email"
                placeholder="user@email.com"
                value={forgotEmail}
                onChange={e => { setForgotEmail(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-rose-400 rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm"
                dir="ltr"
              />
            </div>
            {userError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{userError}</p>}
            <button
              onClick={handleForgotSendOTP}
              disabled={userLoading === 'forgot-otp' || !forgotEmail}
              className="w-full py-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40"
            >
              {userLoading === 'forgot-otp' ? 'Sending OTP...' : 'Send OTP'}
            </button>
            <button
              onClick={() => { setLoginFlowStep('login-password'); setUserError(''); }}
              className="w-full text-center text-slate-400 text-sm hover:text-slate-600"
            >
              Go Back →
            </button>
          </>
        )}

        {/* Forgot Step 2: Verify OTP */}
        {loginFlowStep === 'forgot-otp' && (
          <>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
              <p className="text-rose-800 text-sm font-bold">✓ OTP Sent</p>
              <p className="text-rose-600 text-xs mt-1">A code was sent to {forgotEmail}</p>
            </div>

            {/* Resend Timer */}
            <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <button
                onClick={async () => {
                  const rateCheck = checkRateLimit(forgotEmail);
                  if (!rateCheck.allowed) { setUserError(`Too many requests. Try again in ${rateCheck.minutesLeft} min.`); return; }
                  setUserLoading('forgot-otp');
                  const result = await sendOTPToEmail(forgotEmail);
                  if (result.success) { recordOTPRequest(forgotEmail); startForgotResendTimer(); }
                  else setUserError(result.message);
                  setUserLoading('');
                }}
                disabled={forgotResendTimer > 0}
                className="text-sm font-bold text-rose-600 hover:underline disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {forgotResendTimer > 0 ? `⏳ Resend in ${forgotResendTimer}s` : '🔄 Resend OTP'}
              </button>
              <button
                onClick={() => { setLoginFlowStep('forgot-email'); setUserError(''); setForgotOtpCode(''); }}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium"
              >
                Change Email
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-slate-600 font-semibold">OTP Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={forgotOtpCode}
                onChange={e => { setForgotOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-rose-400 rounded-xl px-4 py-3.5 text-black text-center tracking-[0.5em] font-mono text-lg outline-none transition-all"
                dir="ltr"
              />
            </div>
            {userError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{userError}</p>}
            <button
              onClick={handleForgotVerifyOTP}
              disabled={userLoading === 'forgot-verify' || forgotOtpCode.length !== 6}
              className="w-full py-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40"
            >
              {userLoading === 'forgot-verify' ? 'Verifying...' : 'Verify'}
            </button>
          </>
        )}

        {/* Forgot Step 3: Set New Password */}
        {loginFlowStep === 'forgot-new-password' && (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-emerald-800 text-sm font-bold">✓ Identity Verified</p>
              <p className="text-emerald-600 text-xs mt-1">Now set your new password.</p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs text-slate-600 font-semibold">New Password (min. 6 characters)</label>
              <input
                type="password"
                placeholder="••••••••"
                value={forgotNewPassword}
                onChange={e => { setForgotNewPassword(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs text-slate-600 font-semibold">Confirm New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={forgotConfirmPassword}
                onChange={e => { setForgotConfirmPassword(e.target.value); setUserError(''); }}
                className="w-full border-2 border-slate-200 focus:border-black rounded-xl px-4 py-3.5 text-black placeholder:text-slate-300 outline-none transition-all text-sm"
                dir="ltr"
              />
            </div>
            {userError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{userError}</p>}
            <button
              onClick={handleForgotSetNewPassword}
              disabled={userLoading === 'forgot-save' || !forgotNewPassword || !forgotConfirmPassword}
              className="w-full py-4 bg-black hover:bg-slate-800 active:scale-95 text-white font-bold text-base rounded-xl shadow-md transition-all disabled:opacity-40"
            >
              {userLoading === 'forgot-save' ? 'Saving...' : 'Save New Password & Login'}
            </button>
          </>
        )}

      </div>
      <p className="text-slate-300 text-xs text-center max-w-xs">Your information is stored securely in Firebase.</p>
    </div>
  );
}
