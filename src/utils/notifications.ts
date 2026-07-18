// ═══════════════════════════════════════════════════════════════
// notifications.ts — StepToDeen
// نماز نوٹیفکیشن سسٹم
// ═══════════════════════════════════════════════════════════════

// ── Permission مانگنا ──────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// ── Service Worker سے notification دکھانا (ایپ کھلی ہو یا بند) ──
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

// ── فوری notification (foreground + background دونوں) ───────────
export async function showLocalNotification(title: string, body: string) {
  if (Notification.permission !== 'granted') return;

  // پہلے Service Worker سے کوشش کریں
  const swOk = await showViaServiceWorker(title, body);

  // اگر SW نہ ہو تو direct
  if (!swOk) {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      dir: 'rtl',
      lang: 'ur',
    } as any);
  }
}

// ── نماز وقت parse کرنا ─────────────────────────────────────────
function parsePrayerTime(timeStr: string): Date | null {
  if (!timeStr) return null;

  // "05:30" یا "5:30 AM" یا "1:30 PM" — دونوں formats سنبھالتا ہے
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

// ── ایک نماز کی notification schedule کرنا ─────────────────────
export function schedulePrayerNotification(prayerName: string, timeStr: string) {
  if (Notification.permission !== 'granted') return;

  const target = parsePrayerTime(timeStr);
  if (!target) return;

  const now = new Date();
  const diff = target.getTime() - now.getTime();

  // وقت گزر گیا ہو تو skip
  if (diff <= 0) return;

  // 5 منٹ پہلے reminder
  const fiveMinBefore = diff - 5 * 60 * 1000;
  if (fiveMinBefore > 0) {
    setTimeout(() => {
      showLocalNotification(
        `🕌 ${prayerName} — 5 منٹ باقی`,
        `${prayerName} کی نماز 5 منٹ میں ہے — ابھی تیاری کریں`
      );
    }, fiveMinBefore);
  }

  // نماز کے وقت notification
  setTimeout(() => {
    showLocalNotification(
      `🕌 ${prayerName} کا وقت ہو گیا`,
      `نماز کا وقت ہو گیا — السلام علیکم ورحمۃ اللہ`
    );
  }, diff);
}

// ── تمام نمازوں کی notifications ایک ساتھ schedule کرنا ────────
export function scheduleAllPrayerNotifications(prayerTimes: {
  fajr?: string;
  zuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
}) {
  const prayers = [
    { name: 'فجر',    time: prayerTimes.fajr },
    { name: 'ظہر',    time: prayerTimes.zuhr },
    { name: 'عصر',    time: prayerTimes.asr },
    { name: 'مغرب',   time: prayerTimes.maghrib },
    { name: 'عشاء',   time: prayerTimes.isha },
  ];

  prayers.forEach(({ name, time }) => {
    if (time) schedulePrayerNotification(name, time);
  });

  console.log('StepToDeen: نماز notifications schedule ہو گئیں ✅');
}
