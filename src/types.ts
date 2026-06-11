export interface PrayerTimes {
  fajr: string;
  zuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export interface Mosque {
  id: string;
  name: string;
  imamName: string;
  imamEmail: string;
  imamUid: string;
  address: string;
  latitude: number;
  longitude: number;
  fajr: string;
  zuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jumah: string;
  jumah2?: string;
  eidFitr?: string;
  eidAdha?: string;
  sehri?: string;
  iftar?: string;
  announcement?: string;
  updatedAt: string;
}

export interface Surah {
  n: number;
  ar: string;
  ur: string;
  v: number;
  t: string;
}

export interface HadithBook {
  key: string;
  name: string;
  ar: string;
  total: number;
  icon?: string;
  ar_url: string;
  ur_url: string;
}

export interface Hadith {
  num: string | number;
  ar: string;
  ur: string;
  grades?: { name: string; grade: string }[];
}

export interface NamazStep {
  s: number;
  t: string;
  ar: string;
  ur: string;
}

export interface Dua {
  c: string;
  ar: string;
  ur: string;
}

// ============ OTP SYSTEM TYPES ============

export interface OTPRequest {
  email: string;
  otp: string;
  createdAt: number;
  expiresAt: number;
  verified: boolean;
}

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  password?: string; // Firestore میں save ہوگا (hashed recommended)
  role: 'user' | 'imam';
  createdAt: string;
  emailVerified: boolean;
}

export type LoginFlowStep = 
  | 'email-input'       // Gmail ڈالنے کا مرحلہ
  | 'otp-verify'        // OTP verify کرنے کا مرحلہ
  | 'create-password'   // پاسورڈ بنانے کا مرحلہ
  | 'login-password';   // پاسورڈ سے لاگ ان کا مرحلہ
