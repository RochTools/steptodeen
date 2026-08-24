// ═══════════════════════════════════════════════════════════════
// notifications.ts — StepToDeen
// Namaz notification system (Roman Urdu)
// ═══════════════════════════════════════════════════════════════

// ── Permission maangna ──────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// ── Service Worker ke zariye notification dikhana (app khuli ho ya band) ──
async function showViaServiceWorker(title: string, body: string, tag?: string) {
  if (!navigator.serviceWorker?.controller) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      dir: 'rtl',
      lang: 'ur',
      vibrate: [200, 100, 200],
      tag: tag || 'prayer',
      renotify: true,
    } as any);
    return true;
  } catch {
    return false;
  }
}

// ── Fori notification (foreground + background dono) ───────────
export async function showLocalNotification(title: string, body: string) {
  if (Notification.permission !== 'granted') return;

  // Pehle Service Worker se koshish karein
  const swOk = await showViaServiceWorker(title, body);

  // Agar SW nahi hai to direct
  if (!swOk) {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      dir: 'rtl',
      lang: 'ur',
    } as any);
  }
}

// ── Namaz ka time parse karna ─────────────────────────────────────────
function parsePrayerTime(timeStr: string): Date | null {
  if (!timeStr) return null;

  // "05:30" ya "5:30 AM" ya "1:30 PM" — dono formats handle karta hai
  const parts = timeStr.trim().split(' ');
  const timePart = parts[0];
  const period = parts[1]?.toUpperCase();

  const [hStr, mStr] = timePart.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);

  if (isNaN(h) || isNaN(m)) return null;

  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;

  const target = new Date();
  target.setHours(h, m, 0, 0);
  return target;
}

// ── Ek namaz ki notification schedule karna ─────────────────────
export function schedulePrayerNotification(prayerName: string, timeStr: string) {
  if (Notification.permission !== 'granted') return;

  const target = parsePrayerTime(timeStr);
  if (!target) return;

  const now = new Date();
  const diff = target.getTime() - now.getTime();

  // Agar time guzar gaya ho to skip karein
  if (diff <= 0) return;

  // 5 minute pehle reminder
  const fiveMinBefore = diff - 5 * 60 * 1000;
  if (fiveMinBefore > 0) {
    setTimeout(() => {
      showLocalNotification(
        `🕌 ${prayerName} — 5 minute baqi`,
        `${prayerName} ki namaz 5 minute mein hai — abhi tayyari karein`
      );
    }, fiveMinBefore);
  }

  // Namaz ke waqt notification
  setTimeout(() => {
    showLocalNotification(
      `🕌 ${prayerName} ka waqt ho gaya`,
      `Namaz ka waqt ho gaya — Assalamu alaikum wa rahmatullah`
    );
  }, diff);
}

// ── Tamam namazon ki notifications ek saath schedule karna ────────────────
export function scheduleAllPrayerNotifications(prayerTimes: {
  fajr?: string;
  zuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
}) {
  const prayers = [
    { name: 'Fajr',    time: prayerTimes.fajr },
    { name: 'Zuhr',    time: prayerTimes.zuhr },
    { name: 'Asr',     time: prayerTimes.asr },
    { name: 'Maghrib', time: prayerTimes.maghrib },
    { name: 'Isha',    time: prayerTimes.isha },
  ];

  prayers.forEach(({ name, time }) => {
    if (time) schedulePrayerNotification(name, time);
  });

  console.log('StepToDeen: Namaz notifications schedule ho gayin ✅');
}
