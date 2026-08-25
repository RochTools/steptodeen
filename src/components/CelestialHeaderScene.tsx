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
  const maghribMinutes = parseTimeToMinutes(getPrayerTimeValue(times, ['maghrib', 'Maghrib']));
  const ishaMinutes = parseTimeToMinutes(getPrayerTimeValue(times, ['isha', 'Isha']));

  const sunrise = sunriseMinutes ?? (fajrMinutes !== null ? clamp(fajrMinutes + 25, 0, 1439) : 360);
  const solarEnd = maghribMinutes ?? clamp(sunrise + 12 * 60, 0, 1439);
  const isha = ishaMinutes ?? clamp(solarEnd + 75, 0, 1439);
  const currentMinutes = nowDate.getHours() * 60 + nowDate.getMinutes() + nowDate.getSeconds() / 60;

  const dawnStart = clamp(sunrise - 30, 0, 1439);
  const daylightDuration = Math.max(1, solarEnd - sunrise || 12 * 60);
  const isDaytime = currentMinutes >= sunrise && currentMinutes < solarEnd;
  const isTwilight = !isDaytime && ((currentMinutes >= dawnStart && currentMinutes < sunrise) || (currentMinutes >= solarEnd && currentMinutes <= isha));

  const dayProgress = clamp((currentMinutes - sunrise) / daylightDuration, 0, 1);
  const nightDuration = Math.max(1, (1440 - solarEnd) + sunrise);
  const nightElapsed = currentMinutes >= solarEnd ? currentMinutes - solarEnd : 1440 - solarEnd + currentMinutes;
  const nightProgress = clamp(nightElapsed / nightDuration, 0, 1);

  const sunPoint = getQuadraticPoint(dayProgress, { x: 18, y: 86 }, { x: 54, y: 8 }, { x: 90, y: 13 });
  const moonPoint = getQuadraticPoint(nightProgress, { x: 91, y: 34 }, { x: 56, y: 15 }, { x: 17, y: 27 });

  const rawSunOpacity = (dayProgress < 0.08 ? dayProgress / 0.08 : 1) * (dayProgress > 0.88 ? (1 - dayProgress) / 0.12 : 1);
  const rawMoonOpacity = (nightProgress < 0.08 ? nightProgress / 0.08 : 1) * (nightProgress > 0.92 ? (1 - nightProgress) / 0.08 : 1);

  return {
    showSun: isDaytime || isTwilight,
    showMoon: !isDaytime,
    headerBackground: isDaytime
      ? 'linear-gradient(180deg, #7fe3ff 0%, #52bff9 30%, #2b8ae7 66%, #155ec8 100%)'
      : isTwilight
        ? 'linear-gradient(180deg, #496f9f 0%, #3d86cf 38%, #5aa8e6 62%, #f2ad6c 100%)'
        : 'linear-gradient(180deg, #18345c 0%, #204a7a 38%, #205f9c 68%, #1f6ec0 100%)',
    sun: {
      x: sunPoint.x,
      y: sunPoint.y,
      opacity: clamp(rawSunOpacity, 0, 1),
      scale: 0.94 + Math.sin(dayProgress * Math.PI) * 0.18,
    },
    moon: {
      x: moonPoint.x,
      y: moonPoint.y,
      opacity: clamp(rawMoonOpacity, 0.7, 1),
      scale: 0.98 + Math.sin(nightProgress * Math.PI) * 0.1,
      glowOpacity: isTwilight ? 0.72 : 1,
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
            <div className="relative h-16 w-16">
              <div className="celestial-sun-glow absolute inset-[-20px] rounded-full bg-amber-300/40 blur-2xl" />
              <div className="celestial-cloud--one absolute -top-2 left-8 opacity-0">
                <div className="relative h-4 w-12">
                  <span className="celestial-cloud-piece absolute bottom-0 left-0 h-3.5 w-7" />
                  <span className="celestial-cloud-piece absolute bottom-1 left-3 h-4 w-5.5" />
                  <span className="celestial-cloud-piece absolute bottom-0.5 right-0 h-3 w-5" />
                </div>
              </div>
              <div className="celestial-cloud--two absolute top-5 -left-8 opacity-0">
                <div className="relative h-3.5 w-10">
                  <span className="celestial-cloud-piece absolute bottom-0 left-0 h-3 w-5.5" />
                  <span className="celestial-cloud-piece absolute bottom-0.5 left-2.5 h-3.5 w-5" />
                  <span className="celestial-cloud-piece absolute bottom-0 right-0 h-2.5 w-4" />
                </div>
              </div>
              <div className="celestial-ray-ring absolute inset-[-10px] rounded-full border border-amber-100/35" />
              <div className="celestial-ray-ring absolute inset-[-4px] rounded-full border border-amber-50/20" style={{ animationDuration: '28s' }} />
              <div className="celestial-sun-core relative h-16 w-16 rounded-full border border-white/30">
                <div className="absolute left-3 top-3 h-3.5 w-3.5 rounded-full bg-white/55 blur-[1px]" />
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
            <div className="relative h-11 w-11">
              <div className="celestial-moon-core relative h-11 w-11 rounded-full border border-white/60" />
              <div className="absolute inset-[3px] rounded-full bg-[#0a2f66]" style={{ transform: 'translateX(10px)' }} />
              <div className="absolute left-[8px] top-[8px] h-1.5 w-1.5 rounded-full bg-white/65 blur-[0.7px]" />
              <div className="absolute left-[11px] top-[16px] h-1 w-1 rounded-full bg-slate-300/60 blur-[0.4px]" />
              <div className="absolute left-[14px] top-[21px] h-[3px] w-[3px] rounded-full bg-slate-300/35 blur-[0.2px]" />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CelestialHeaderScene;
