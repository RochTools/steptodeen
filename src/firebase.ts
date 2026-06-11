import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

let app: any;
let db: Firestore | null = null;
let auth: Auth | null = null;
let isRealFirebase = false;

export async function initializeFirebaseAtRuntime(): Promise<{
  db: Firestore | null;
  auth: Auth | null;
  isRealFirebase: boolean;
}> {
  if (isRealFirebase && db && auth) {
    return { db, auth, isRealFirebase };
  }
  try {
    const response = await fetch('/firebase-applet-config.json').catch(() => null);
    if (response && response.ok) {
      const firebaseConfig = await response.json().catch(() => null);
      if (firebaseConfig && firebaseConfig.apiKey) {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
        auth = getAuth(app);
        isRealFirebase = true;
        console.log('StepToDeen: Connected successfully to real Firebase backend at runtime.');
      }
    }
  } catch (error) {
    console.log(
      'StepToDeen: Running in secure offline/local simulation mode until Firebase is provisioned.',
      error
    );
  }
  return { db, auth, isRealFirebase };
}

// ─── Real Firebase Auth helpers ───────────────────────────────────────────────

export async function firebaseSignIn(
  firebaseAuth: Auth,
  email: string,
  password: string
): Promise<User> {
  const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return cred.user;
}

export async function firebaseSignUp(
  firebaseAuth: Auth,
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  await updateProfile(cred.user, { displayName });
  return cred.user;
}

export async function firebaseGoogleSignIn(firebaseAuth: Auth): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(firebaseAuth, provider);
  return result.user;
}

export async function firebaseSignOut(firebaseAuth: Auth): Promise<void> {
  await signOut(firebaseAuth);
}

export function subscribeToAuthState(
  firebaseAuth: Auth,
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(firebaseAuth, callback);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 OTP EMAIL VERIFICATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

const HF_SPACE_URL = 'https://zameerbaloch12458-steptodeen.hf.space';

/**
 * Generate 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP to user's email via Hugging Face Space API
 */
export async function sendOTPToEmail(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save OTP to Firestore (or localStorage if offline)
    if (db && isRealFirebase) {
      await setDoc(doc(db, 'otps', email), {
        email,
        otp,
        createdAt: Date.now(),
        expiresAt,
        verified: false
      });
    } else {
      // Offline fallback
      localStorage.setItem(`otp_${email}`, JSON.stringify({
        email,
        otp,
        createdAt: Date.now(),
        expiresAt,
        verified: false
      }));
    }

    // Send OTP via HF Space API
    const response = await fetch(`${HF_SPACE_URL}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });

    if (response.ok) {
      return { success: true, message: 'OTP آپ کے ای میل پر بھیج دی گئی ہے' };
    } else {
      // If HF Space fails, still return success for testing (OTP stored locally)
      console.warn('HF Space API failed, but OTP saved locally');
      return { success: true, message: 'OTP آپ کے ای میل پر بھیج دی گئی ہے (ڈیمو موڈ)' };
    }
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    // If network fails but OTP is saved locally, still return success for demo
    return { success: true, message: 'OTP محفوظ کر لی گئی ہے۔ براہ کرم ای میل چیک کریں (ڈیمو موڈ)' };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(email: string, code: string): Promise<{ success: boolean; message: string }> {
  try {
    let otpData: any = null;

    if (db && isRealFirebase) {
      const docSnap = await getDoc(doc(db, 'otps', email));
      if (docSnap.exists()) {
        otpData = docSnap.data();
      }
    } else {
      const stored = localStorage.getItem(`otp_${email}`);
      if (stored) {
        otpData = JSON.parse(stored);
      }
    }

    if (!otpData) {
      return { success: false, message: 'OTP نہیں ملی۔ دوبارہ کوشش کریں' };
    }

    // Check expiry
    if (Date.now() > otpData.expiresAt) {
      return { success: false, message: 'OTP کی مدت ختم ہو گئی ہے۔ نئی OTP حاصل کریں' };
    }

    // Check code match
    if (otpData.otp !== code) {
      return { success: false, message: 'OTP غلط ہے۔ دوبارہ کوشش کریں' };
    }

    // Mark as verified
    if (db && isRealFirebase) {
      await setDoc(doc(db, 'otps', email), { ...otpData, verified: true }, { merge: true });
    } else {
      localStorage.setItem(`otp_${email}`, JSON.stringify({ ...otpData, verified: true }));
    }

    return { success: true, message: 'OTP کامیابی سے تصدیق ہو گئی' };
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return { success: false, message: 'تصدیق میں خرابی: ' + (error.message || 'دوبارہ کوشش کریں') };
  }
}

/**
 * Check if email already has an account in Firestore
 */
export async function checkEmailExists(email: string): Promise<{ exists: boolean; userData?: any }> {
  try {
    if (db && isRealFirebase) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { exists: true, userData: { uid: userDoc.id, ...userDoc.data() } };
      }
    } else {
      // Offline check
      const stored = localStorage.getItem('steptodeen_local_users');
      if (stored) {
        const users = JSON.parse(stored);
        const found = users.find((u: any) => u.email === email);
        if (found) {
          return { exists: true, userData: found };
        }
      }
    }
    return { exists: false };
  } catch (error) {
    console.error('Error checking email:', error);
    return { exists: false };
  }
}

/**
 * Save user to Firestore after OTP verification + password creation
 */
export async function saveUserToFirestore(
  email: string,
  password: string,
  name: string,
  role: 'user' | 'imam'
): Promise<{ success: boolean; message: string }> {
  try {
    const userData = {
      email,
      password, // ⚠️ Production میں hash کرنا بہتر ہے
      name,
      role,
      createdAt: new Date().toISOString(),
      emailVerified: true
    };

    if (db && isRealFirebase) {
      // Save to Firestore users collection
      const usersRef = collection(db, 'users');
      await setDoc(doc(db, 'users', email), userData);
    } else {
      // Offline fallback
      const stored = localStorage.getItem('steptodeen_local_users');
      const users = stored ? JSON.parse(stored) : [];
      const existingIndex = users.findIndex((u: any) => u.email === email);
      if (existingIndex > -1) {
        users[existingIndex] = userData;
      } else {
        users.push(userData);
      }
      localStorage.setItem('steptodeen_local_users', JSON.stringify(users));
    }

    // Clean up OTP
    if (db && isRealFirebase) {
      await deleteDoc(doc(db, 'otps', email)).catch(() => {});
    } else {
      localStorage.removeItem(`otp_${email}`);
    }

    return { success: true, message: 'اکاؤنٹ کامیابی سے بن گیا' };
  } catch (error: any) {
    console.error('Error saving user:', error);
    return { success: false, message: 'اکاؤنٹ بنانے میں خرابی: ' + (error.message || 'دوبارہ کوشش کریں') };
  }
}

/**
 * Login with email + password (Firestore check)
 */
export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<{ success: boolean; message: string; userData?: any }> {
  try {
    if (db && isRealFirebase) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: false, message: 'اکاؤنٹ موجود نہیں۔ نیا اکاؤنٹ بنائیں' };
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (userData.password !== password) {
        return { success: false, message: 'پاسورڈ غلط ہے۔ دوبارہ کوشش کریں' };
      }

      return {
        success: true,
        message: 'لاگ ان کامیاب',
        userData: { uid: userDoc.id, ...userData }
      };
    } else {
      // Offline check
      const stored = localStorage.getItem('steptodeen_local_users');
      if (stored) {
        const users = JSON.parse(stored);
        const user = users.find((u: any) => u.email === email);
        if (!user) {
          return { success: false, message: 'اکاؤنٹ موجود نہیں۔ نیا اکاؤنٹ بنائیں' };
        }
        if (user.password !== password) {
          return { success: false, message: 'پاسورڈ غلط ہے۔ دوبارہ کوشش کریں' };
        }
        return { success: true, message: 'لاگ ان کامیاب', userData: user };
      }
      return { success: false, message: 'کوئی اکاؤنٹ موجود نہیں' };
    }
  } catch (error: any) {
    console.error('Error logging in:', error);
    return { success: false, message: 'لاگ ان میں خرابی: ' + (error.message || 'دوبارہ کوشش کریں') };
  }
}

// ═══════════════════════════════════════════════════════════════════════════

// ─── LocalStorage fallback helpers (offline / demo mode) ──────────────────────

const LOCAL_MOSQUES_KEY = 'steptodeen_local_mosques';
const INITIAL_MOCK_MOSQUES = [
  {
    id: 'mosque_1',
    name: 'جامع مسجد بلال (G-11)',
    imamName: 'قاری محمد امین',
    imamEmail: 'imam.bilal@example.com',
    imamUid: 'mock_uid_1',
    address: 'جی الیون مرکز، اسلام آباد',
    latitude: 33.6675,
    longitude: 72.9984,
    fajr: '05:15',
    zuhr: '01:30',
    asr: '04:30',
    maghrib: '07:05',
    isha: '08:45',
    jumah: '01:30',
    announcement: 'نمازِ عشاء کی جماعت اب سے پونے نو بجے (8:45) ہوگی۔',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mosque_2',
    name: 'جامع مسجد رحمانیہ',
    imamName: 'مولانا ساجد الرحمن',
    imamEmail: 'imam.rehman@example.com',
    imamUid: 'mock_uid_2',
    address: 'سیکٹر F-10، اسلام آباد',
    latitude: 33.6892,
    longitude: 73.0104,
    fajr: '05:30',
    zuhr: '01:15',
    asr: '04:45',
    maghrib: '07:08',
    isha: '08:30',
    jumah: '02:00',
    announcement: 'جمعہ کا پہلا خطبہ ٹھیک ڈیڑھ بجے شروع ہوگا۔',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mosque_3',
    name: 'فیصل مسجد',
    imamName: 'ڈاکٹر قاری ضیاء الرحمن',
    imamEmail: 'imam.faisal@example.com',
    imamUid: 'mock_uid_3',
    address: 'شاہراہِ اسلام آباد، مارگلہ ہلز',
    latitude: 33.7298,
    longitude: 73.0372,
    fajr: '05:10',
    zuhr: '01:45',
    asr: '04:30',
    maghrib: '07:05',
    isha: '09:00',
    jumah: '01:30',
    announcement: 'نمازِ عشاء اور خطبہء جمعہ مبارکہ کا وقت تبدیل کر دیا گیا ہے۔',
    updatedAt: new Date().toISOString()
  }
];

export function getLocalMosques() {
  const data = localStorage.getItem(LOCAL_MOSQUES_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_MOSQUES_KEY, JSON.stringify(INITIAL_MOCK_MOSQUES));
    return INITIAL_MOCK_MOSQUES;
  }
  return JSON.parse(data);
}

export function saveLocalMosque(mosque: any) {
  const list = getLocalMosques();
  const index = list.findIndex((m: any) => m.id === mosque.id);
  if (index > -1) {
    list[index] = { ...mosque, updatedAt: new Date().toISOString() };
  } else {
    list.push({ ...mosque, id: 'mosque_' + Date.now(), updatedAt: new Date().toISOString() });
  }
  localStorage.setItem(LOCAL_MOSQUES_KEY, JSON.stringify(list));
  return list;
}

export function deleteLocalMosque(id: string) {
  const list = getLocalMosques();
  const filtered = list.filter((m: any) => m.id !== id);
  localStorage.setItem(LOCAL_MOSQUES_KEY, JSON.stringify(filtered));
  return filtered;
}
