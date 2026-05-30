export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function showLocalNotification(title: string, body: string) {
  if (Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    icon: '/icon-192.png',
    dir: 'rtl',
    lang: 'ur',
    vibrate: [200, 100, 200]
  } as any);
}

export function schedulePrayerNotification(prayerName: string, timeStr: string) {
  if (Notification.permission !== 'granted') return;
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let h = hours;
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const now = new Date();
  const target = new Date();
  target.setHours(h, minutes, 0, 0);
  if (target <= now) return;
  const diff = target.getTime() - now.getTime();
  const fiveMin = diff - 5 * 60 * 1000;
  if (fiveMin > 0) {
    setTimeout(() => showLocalNotification(`🕌 ${prayerName} — 5 منٹ باقی`, `${prayerName} کی نماز 5 منٹ میں ہے`), fiveMin);
  }
  setTimeout(() => showLocalNotification(`🕌 ${prayerName} کا وقت`, `نماز کا وقت ہو گیا — السلام علیکم`), diff);
}


