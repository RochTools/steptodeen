import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAlivb1p_ptLEfxxitQTUZ0jtBz9HDvHk8",
  authDomain: "steptodeen.firebaseapp.com",
  projectId: "steptodeen",
  storageBucket: "steptodeen.firebasestorage.app",
  messagingSenderId: "215948293153",
  appId: "1:215948293153:web:5a633139552f795bd41f60"
};

const VAPID_KEY = "BEV0ZYHrs3B70HGoupXn-JlJ8C4RY2P6FD-lnlGX_gGp4P0C7lmN8lrlZc6q_OOUNJpWJrPrcXSa-iMQmvac4wQ";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export async function initFCM(): Promise<string | null> {
  try {
    if (!('Notification' in window)) return null;

    // Permission مانگیں
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const messaging = getMessaging(app);

    // FCM Token لیں
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      console.log('FCM Token:', token);
      localStorage.setItem('fcm_token', token);
      return token;
    }
    return null;
  } catch (err) {
    console.error('FCM error:', err);
    return null;
  }
}

// Foreground notifications (ایپ کھلی ہو تو)
export function listenForegroundMessages() {
  try {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      if (Notification.permission === 'granted') {
        new Notification(title || 'StepToDeen', {
          body: body || 'نماز کا وقت ہو گیا',
          icon: '/icon-192.png',
          dir: 'rtl',
          lang: 'ur'
        } as any);
      }
    });
  } catch (err) {
    console.error('FCM foreground error:', err);
  }
}
