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
import { getFirestore, Firestore } from 'firebase/firestore';

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

/** Sign in existing user with email + password */
export async function firebaseSignIn(
  firebaseAuth: Auth,
  email: string,
  password: string
): Promise<User> {
  const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return cred.user;
}

/** Register new user with email + password + display name */
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

/** Google Sign-In */
export async function firebaseGoogleSignIn(firebaseAuth: Auth): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(firebaseAuth, provider);
  return result.user;
}

/** Sign out current user */
export async function firebaseSignOut(firebaseAuth: Auth): Promise<void> {
  await signOut(firebaseAuth);
}

/** Subscribe to auth state; returns unsubscribe fn */
export function subscribeToAuthState(
  firebaseAuth: Auth,
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(firebaseAuth, callback);
}

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
