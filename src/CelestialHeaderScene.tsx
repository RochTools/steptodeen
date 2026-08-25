import React, { useEffect, useState } from 'react';

interface CelestialHeaderSceneProps {
  prayerTimes: { [key: string]: string };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const extractClockTime = (timeValue?: string) => {
  if (!timeValue) return '';
  const match = timeValue.match(/(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

const parseTimeToMinutes = (timeValue?: string) => {
  const normalized = extractClockTime(timeValue);
  if (!normalized) return null;
  const [hours, minutes] = normalized.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const getPrayerTimeValue = (times: { [key: string]: string }, aliases: string[]) => {
  for (const alias of aliases) {
    if (times?.[alias]) return times[alias];
  }

  const entries = Object.entries(times || {});
  for (const alias of aliases.map(item => item.toLowerCase())) {
    const match = entries.find(([key, value]) => key.toLowerCase() === alias && !!value);
    if (match) return match[1];
  }

  return '';
};

const getQuadraticPoint = (
  progress: number,
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number }
) => {
  const t = clamp(progress, 0, 1);
  const inverse = 1 - t;

  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
};

const getCelestialScene = (times: { [key: string]: string }, nowDate: Date) => {
  const fajrMinutes = parseTimeToMinutes(getPrayerTimeValue(times, ['fajr', 'Fajr']));
  const sunriseMinutes = parseTimeToMinutes(getPrayerTimeValue(times, ['sunrise', 'Sunrise']));
  const sunsetMinutes = parseTimeToMinutes(getPrayerTimeValue(times, ['sunset', 'Sunset']));
  const maghribMinutes = parseTimeToMinutes(getPrayerTimeValue(times, ['maghrib', 'Maghrib']));
  const ishaMinutes = parseTimeToMinutes(getPrayerTimeValue(times, ['isha', 'Isha']));

  const sunrise = sunriseMinutes ?? (fajrMinutes !== null ? clamp(fajrMinutes + 25, 0, 1439) : 360);
  const sunset = sunsetMinutes ?? maghribMinutes ?? clamp(sunrise + 12 * 60, 0, 1439);
  const isha = ishaMinutes ?? clamp(sunset + 75, 0, 1439);
  const currentMinutes = nowDate.getHours() * 60 + nowDate.getMinutes() + nowDate.getSeconds() / 60;
  const overlapWindow = 42;

  const isInWrappedWindow = (current: number, start: number, end: number) => {
    if (start <= end) return current >= start && current <= end;
    return current >= start || current <= end;
  };

  // Shared header arc for both sun and moon.
  // Start  { x: 12%, y: 88% }
  // Control{ x: 50%, y: 5%  }
  // End    { x: 88%, y: 12% }
  const startPoint = { x: 12, y: 88 };
  const controlPoint = { x: 50, y: 5 };
  const endPoint = { x: 88, y: 12 };

  const daylightDuration = Math.max(1, sunset - sunrise);
  const dayProgress = clamp((currentMinutes - sunrise) / daylightDuration, 0, 1);
  const sunPoint = getQuadraticPoint(dayProgress, startPoint, controlPoint, endPoint);

  const moonVisibleStart = clamp(sunset - overlapWindow, 0, 1439);
  const moonVisibleEnd = clamp(sunrise + overlapWindow, 0, 1439);
  const adjustedCurrentForMoon = currentMinutes < moonVisibleStart ? currentMinutes + 1440 : currentMinutes;
  const adjustedMoonEnd = moonVisibleEnd + 1440;
  const moonProgress = clamp(
    (adjustedCurrentForMoon - moonVisibleStart) / Math.max(1, adjustedMoonEnd - moonVisibleStart),
    0,
    1
  );
  const moonPoint = getQuadraticPoint(moonProgress, startPoint, controlPoint, endPoint);

  const isSunriseHandoff = currentMinutes >= sunrise && currentMinutes <= sunrise + overlapWindow;
  const isSunsetHandoff = currentMinutes >= moonVisibleStart && currentMinutes <= sunset;
  const isDaytime = currentMinutes >= sunrise && currentMinutes < sunset;
  const isTwilight = isSunriseHandoff || isSunsetHandoff || (!isDaytime && currentMinutes >= sunset && currentMinutes <= isha);

  const showSun = currentMinutes >= sunrise && currentMinutes <= sunset;
  const showMoon = isInWrappedWindow(currentMinutes, moonVisibleStart, moonVisibleEnd);

  const sunriseFadeIn = clamp((currentMinutes - sunrise) / overlapWindow, 0, 1);
  const sunsetFadeOut = clamp((sunset - currentMinutes) / overlapWindow, 0, 1);
  const sunOpacity = !showSun
    ? 0
    : currentMinutes <= sunrise + overlapWindow
    ? 0.38 + sunriseFadeIn * 0.62
    : currentMinutes >= moonVisibleStart
    ? 0.38 + sunsetFadeOut * 0.62
    : 1;

  const duskMoonRise = clamp((currentMinutes - moonVisibleStart) / overlapWindow, 0, 1);
  const dawnMoonFade = clamp((moonVisibleEnd - currentMinutes) / overlapWindow, 0, 1);
  const moonOpacity = !showMoon
    ? 0
    : currentMinutes >= moonVisibleStart && currentMinutes <= sunset
    ? 0.34 + duskMoonRise * 0.66
    : currentMinutes >= sunrise && currentMinutes <= moonVisibleEnd
    ? 0.34 + dawnMoonFade * 0.66
    : 1;

  return {
    showSun,
    showMoon,
    headerBackground: isDaytime
      ? 'linear-gradient(180deg, #79d7ff 0%, #4eb2f3 30%, #2f84df 66%, #2169cd 100%)'
      : isTwilight
        ? 'linear-gradient(180deg, #4c77ae 0%, #428ad2 34%, #347fd7 64%, #2169cd 100%)'
        : 'linear-gradient(180deg, #385d93 0%, #356daf 34%, #2c78c9 64%, #2169cd 100%)',
    sun: {
      x: sunPoint.x,
      y: sunPoint.y,
      opacity: clamp(sunOpacity, 0, 1),
      scale: 0.96 + Math.sin(dayProgress * Math.PI) * 0.12,
    },
    moon: {
      x: moonPoint.x,
      y: moonPoint.y,
      opacity: clamp(moonOpacity, 0, 1),
      scale: 0.98 + Math.sin(moonProgress * Math.PI) * 0.08,
      glowOpacity: 0,
    },
  };
};


const CelestialHeaderScene: React.FC<CelestialHeaderSceneProps> = ({ prayerTimes }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const updateNow = () => setNow(new Date());
    updateNow();
    const intervalId = window.setInterval(updateNow, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const celestialScene = getCelestialScene(prayerTimes, now);

  return (
    <>
      <style>{`
        .celestial-sun-core {
          background: radial-gradient(circle at 34% 34%, rgba(255,255,255,0.98) 0%, rgba(254,240,138,0.98) 34%, rgba(251,191,36,0.96) 66%, rgba(245,158,11,0.82) 100%);
          box-shadow: 0 0 22px rgba(251, 191, 36, 0.45), 0 0 42px rgba(251, 191, 36, 0.20);
        }
        .celestial-sun-glow {
          animation: celestial-sun-pulse 4.8s ease-in-out infinite;
        }
        .celestial-ray-ring {
          animation: celestial-spin 18s linear infinite;
        }
        .celestial-moon-core {
          background: radial-gradient(circle at 28% 26%, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 38%, rgba(226,232,240,0.99) 68%, rgba(148,163,184,0.96) 100%);
          box-shadow: inset -4px -5px 9px rgba(71, 85, 105, 0.16), 0 0 16px rgba(255, 255, 255, 0.24), 0 0 28px rgba(226, 232, 240, 0.18);
        }
        .celestial-moon-glow {
          animation: celestial-moon-breathe 6.2s ease-in-out infinite;
          opacity: 0.84;
        }
        .celestial-cloud--one {
          animation: celestial-cloud-drift-one 9.5s ease-in-out infinite;
        }
        .celestial-cloud--two {
          animation: celestial-cloud-drift-two 11.5s ease-in-out infinite;
        }
        .celestial-cloud-piece {
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.34));
          box-shadow: 0 6px 18px rgba(255, 255, 255, 0.08);
        }
        @keyframes celestial-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes celestial-sun-pulse {
          0%, 100% { transform: scale(1); opacity: 0.56; }
          50% { transform: scale(1.12); opacity: 0.84; }
        }
        @keyframes celestial-moon-breathe {
          0%, 100% { transform: scale(1); opacity: 0.52; }
          50% { transform: scale(1.09); opacity: 0.82; }
        }
        @keyframes celestial-cloud-drift-one {
          0% { transform: translate3d(-12px, 0, 0) scale(0.92); opacity: 0; }
          22% { opacity: 0.72; }
          58% { transform: translate3d(10px, -3px, 0) scale(1); }
          100% { transform: translate3d(26px, -8px, 0) scale(1.04); opacity: 0; }
        }
        @keyframes celestial-cloud-drift-two {
          0% { transform: translate3d(12px, 2px, 0) scale(0.90); opacity: 0; }
          24% { opacity: 0.65; }
          62% { transform: translate3d(-8px, -4px, 0) scale(1.02); }
          100% { transform: translate3d(-22px, -9px, 0) scale(1.06); opacity: 0; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 z-[0]" style={{ background: celestialScene.headerBackground }} />
      <div
        className="pointer-events-none absolute inset-0 z-[0] opacity-100"
        style={{
          background: celestialScene.showMoon
            ? 'transparent'
            : 'radial-gradient(circle at 52% 10%, rgba(255,255,255,0.30) 0%, rgba(214,240,255,0.22) 20%, rgba(155,218,255,0.12) 34%, transparent 54%), radial-gradient(circle at 18% 20%, rgba(255,255,255,0.15) 0%, transparent 34%), radial-gradient(circle at 82% 22%, rgba(255,255,255,0.14) 0%, transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.07), transparent 38%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.11]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70' viewBox='0 0 70 70'%3E%3Cg fill='none' stroke='%239bdfff' stroke-width='1'%3E%3Cpath d='M35 8l7 13 13 7-13 7-7 13-7-13-13-7 13-7z'/%3E%3Ccircle cx='35' cy='28' r='5'/%3E%3C/g%3E%3C/svg%3E\")",
          backgroundSize: '70px 70px',
        }}
      />

      <div className="pointer-events-none absolute inset-0 z-[4] overflow-hidden" aria-hidden="true">
        {celestialScene.showSun && (
          <div
            className="absolute transition-[left,top,opacity,transform] duration-[1200ms] ease-linear"
            style={{
              left: `${celestialScene.sun.x}%`,
              top: `${celestialScene.sun.y}%`,
              opacity: celestialScene.sun.opacity,
              transform: `translate(-50%, -50%) scale(${celestialScene.sun.scale})`,
            }}
          >
            <div className="relative h-12 w-12">
              <div className="celestial-sun-glow absolute inset-[-10px] rounded-full bg-amber-300/40 blur-xl" />
              <div className="celestial-cloud--one absolute -top-1 left-6 opacity-0">
                <div className="relative h-3 w-8">
                  <span className="celestial-cloud-piece absolute bottom-0 left-0 h-2.5 w-4.5" />
                  <span className="celestial-cloud-piece absolute bottom-0.5 left-2.5 h-3 w-4" />
                  <span className="celestial-cloud-piece absolute bottom-0 right-0 h-2.5 w-3.5" />
                </div>
              </div>
              <div className="celestial-cloud--two absolute top-4 -left-6 opacity-0">
                <div className="relative h-3 w-7">
                  <span className="celestial-cloud-piece absolute bottom-0 left-0 h-2.5 w-4" />
                  <span className="celestial-cloud-piece absolute bottom-0.5 left-2 h-3 w-3.5" />
                  <span className="celestial-cloud-piece absolute bottom-0 right-0 h-2 w-3" />
                </div>
              </div>
              <div className="celestial-ray-ring absolute inset-[-6px] rounded-full border border-amber-100/35" />
              <div className="celestial-ray-ring absolute inset-[-2px] rounded-full border border-amber-50/20" style={{ animationDuration: '28s' }} />
              <div className="celestial-sun-core relative h-12 w-12 rounded-full border border-white/30">
                <div className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full bg-white/55 blur-[1px]" />
              </div>
            </div>
          </div>
        )}

        {celestialScene.showMoon && (
          <div
            className="absolute transition-[left,top,opacity,transform] duration-[1300ms] ease-linear"
            style={{
              left: `${celestialScene.moon.x}%`,
              top: `${celestialScene.moon.y}%`,
              opacity: celestialScene.moon.opacity,
              transform: `translate(-50%, -50%) scale(${celestialScene.moon.scale})`,
            }}
          >
            <div className="relative h-12 w-12">
              <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
                <defs>
                  <linearGradient id="moonFillGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="55%" stopColor="#f8fbff" />
                    <stop offset="100%" stopColor="#dce7f5" />
                  </linearGradient>
                  <mask id="moonCrescentMask">
                    <rect width="48" height="48" fill="black" />
                    <circle cx="24" cy="24" r="17" fill="white" />
                    <circle cx="33" cy="19" r="15" fill="black" />
                  </mask>
                </defs>
                <circle cx="24" cy="24" r="17" fill="url(#moonFillGradient)" mask="url(#moonCrescentMask)" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CelestialHeaderScene;
