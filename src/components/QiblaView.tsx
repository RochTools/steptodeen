import React, { useState, useEffect } from 'react';
import { Compass, Key, Sparkles, MapPin, RefreshCw, Info } from 'lucide-react';

interface QiblaViewProps {
  userCoords: { latitude: number; longitude: number } | null;
  requestLocation?: () => void;
}

// Coordinates of the holy Kaaba in Makkah, Saudi Arabia
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

export const QiblaView: React.FC<QiblaViewProps> = ({ userCoords, requestLocation }) => {
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [qiblaAngle, setQiblaAngle] = useState<number>(262.2); // Pakistan default is ~262°
  const [sensorPermission, setSensorPermission] = useState<string>('unknown');
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [manualRotation, setManualRotation] = useState<number>(0);

  // Computes the great circle direction (bearing) from user to Makkah
  useEffect(() => {
    if (userCoords) {
      const latRad = userCoords.latitude * Math.PI / 180;
      const lngRad = userCoords.longitude * Math.PI / 180;
      const kaabaLatRad = KAABA_LAT * Math.PI / 180;
      const kaabaLngRad = KAABA_LNG * Math.PI / 180;

      const dLng = kaabaLngRad - lngRad;

      const y = Math.sin(dLng) * Math.cos(kaabaLatRad);
      const x = Math.cos(latRad) * Math.sin(kaabaLatRad) - 
                Math.sin(latRad) * Math.cos(kaabaLatRad) * Math.cos(dLng);

      let bearing = Math.atan2(y, x) * 180 / Math.PI;
      bearing = (bearing + 360) % 360;

      setQiblaAngle(parseFloat(bearing.toFixed(1)));
    } else {
      setQiblaAngle(262.2); // Pakistan Rawalpindi/Islamabad default
    }
  }, [userCoords]);

  // Hook-up actual sensor orientation if on mobile phone
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      // Check for iOS webkit specific heading
      if ((event as any).webkitCompassHeading !== undefined) {
        setDeviceHeading((event as any).webkitCompassHeading);
        setSensorPermission('granted');
      } else if (event.alpha !== null) {
        // Standard Android - absolute heading
        // Note: event.alpha might need absolute flag correction, standard fallback
        // standard alpha is 0 to 360 increasing counter-clockwise, compass is clockwise
        // so we derive standard 360 - alpha
        const heading = (360 - event.alpha) % 360;
        setDeviceHeading(heading);
        setSensorPermission('granted');
      }
    };

    // Check if absolute event exists
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, []);

  // Handle manual mock rotation for desktop simulations
  const handleManualRotateLeft = () => {
    setManualRotation((prev) => (prev + 345) % 360);
  };

  const handleManualRotateRight = () => {
    setManualRotation((prev) => (prev + 15) % 360);
  };

  // Determine relative degree to Kaaba based on device/manual heading
  const currentHeading = deviceHeading !== null ? deviceHeading : manualRotation;
  
  // Angle user needs to rotate to face the Qibla: (qiblaAngle - currentHeading)
  const relativeAngleToKaaba = (qiblaAngle - currentHeading + 360) % 360;

  // Let's calibrate visually (simulate refreshing sensors)
  const handleRecalibrate = () => {
    setIsCalibrating(true);
    setTimeout(() => {
      setIsCalibrating(false);
      if (requestLocation) requestLocation();
    }, 1200);
  };

  // Is aligned if within 5 degrees
  const isAligned = Math.abs(relativeAngleToKaaba) < 6 || Math.abs(relativeAngleToKaaba - 360) < 6;

  return (
    <div className="p-4 space-y-4 animate-fadeIn pb-12">
      {/* Informational Guidance bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-right space-y-2.5">
        <h3 className="text-xs font-black text-emerald-850 font-urdu flex items-center gap-1.5 justify-end">
          <Sparkles size={14} className="text-amber-500" />
          قبلہ رخ معلوم کرنے کا طریقہ
        </h3>
        <p className="text-[11px] text-slate-600 font-urdu leading-relaxed">
          اپنے موبائل فون کو بالکل ہموار سطح (جیسے زمین یا میز) پر رکھیں۔ اگر فون میں کیلیبریٹر سینسر لائیو ہے تو کمپاس خود بخود گھومے گا۔ سبز رنگ کا تیر کا نشان کعبتہ اللہ کی طرف سیدھی سمت کی رہنمائی کرتا ہے۔
        </p>

        {/* Coords and calculated Qibla angle Info */}
        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-right text-[10px]">
          <button
            onClick={handleRecalibrate}
            className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-urdu font-bold active:scale-95 cursor-pointer"
          >
            <RefreshCw size={11} className={`${isCalibrating ? 'animate-spin' : ''}`} />
            مقام اپڈیٹ کریں
          </button>
          
          <div className="space-y-0.5 text-right">
            <span className="text-slate-500 font-urdu block">
              آپ کے مقام سے مستند سمتی زاویہ: <strong className="font-mono text-slate-800">{qiblaAngle}°</strong>
            </span>
            <span className="text-[9px] text-slate-400 font-mono block">
              {userCoords 
                ? `${userCoords.latitude.toFixed(4)}N, ${userCoords.longitude.toFixed(4)}E` 
                : 'پاکستان (مرکزی ڈیفالٹ لوکیشن)'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Main Beautiful Rotating Compass Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Dynamic alignment alert header banner */}
        <div className={`py-1.5 px-4 rounded-full text-[10px] font-bold font-urdu mb-6 border transition-all ${
          isAligned 
            ? 'bg-emerald-50 text-emerald-850 border-emerald-200 animate-pulse' 
            : 'bg-amber-50 text-amber-950 border-amber-200'
        }`}>
          {isAligned 
            ? '● آپ کا رخ بالکل قبلہ شریف کی طرف ہے (Aligned)' 
            : `قبلہ رخ کے لئے فون کو ${Math.round(relativeAngleToKaaba)}° دائیں گھمائیں`
          }
        </div>

        {/* Visual Simulated Canvas Compass Frame */}
        <div className="relative w-56 h-56 flex items-center justify-center tracking-normal">
          {/* Compass Outer static Dial */}
          <div className="absolute inset-0 rounded-full border border-slate-150-inset bg-slate-50/15" />

          {/* Calibrated Kaaba Target locator Arrow indicator (Outer Ring Pointer) - Constantly pointing to calculated Qibla bearing */}
          <div 
            className="absolute inset-0 transition-transform duration-500 flex items-start justify-center"
            style={{ transform: `rotate(${qiblaAngle - currentHeading}deg)` }}
          >
            <div className="flex flex-col items-center -mt-9 relative z-30">
              <span className="text-2xl animate-bounce">🕋</span>
              <div className="w-4 h-4 bg-emerald-600 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[8px] text-white">
                ↑
              </div>
              <span className="text-[8px] text-emerald-800 font-black font-urdu bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm mt-0.5">
                قبلہ رخ
              </span>
            </div>
          </div>

          {/* Active Rotating Compass Card, Rotate Dial opposite of current Heading */}
          <div 
            className="w-44 h-44 rounded-full bg-gradient-to-tr from-[#0c2f21] via-[#092218] to-[#124d34] border-4 border-slate-100 text-white shadow-2xl relative flex items-center justify-center transition-transform duration-300"
            style={{ transform: `rotate(${-currentHeading}deg)` }}
          >
            {/* Compass Card Direction Markers */}
            <span className="absolute top-2.5 font-sans font-black text-amber-400 text-xs text-center">N<br/><span className="text-[7px] text-white/50">شمال</span></span>
            <span className="absolute bottom-2.5 font-sans font-black text-white/90 text-[10px] text-center"><span className="text-[7px] text-white/50">جنوب</span><br/>S</span>
            <span className="absolute right-3.5 font-sans font-black text-white/90 text-[10px] flex gap-1 items-center">E <span className="text-[7px] text-white/50">مشرق</span></span>
            <span className="absolute left-3.5 font-sans font-black text-white/90 text-[10px] flex gap-1 items-center"><span className="text-[7px] text-white/50">مغرب</span> W</span>

            {/* Glowing Center Hub and fine crosshairs line */}
            <div className="absolute inset-x-0 h-0.5 bg-white/[0.05] pointer-events-none" />
            <div className="absolute inset-y-0 w-0.5 bg-white/[0.05] pointer-events-none" />

            {/* Dial Center Needle Hub */}
            <div className="w-14 h-14 rounded-full bg-emerald-950 border border-white/20 flex flex-col items-center justify-center shadow-2xl relative">
              <Compass className="text-emerald-400 animate-spin" size={16} style={{ animationDuration: isAligned ? '4s' : '15s' }} />
              <span className="text-[7px] font-mono font-bold text-amber-200 mt-0.5">{Math.round(currentHeading)}°</span>
            </div>
          </div>
        </div>

        {/* Alignment Success Ring Overlay */}
        {isAligned && (
          <div className="absolute inset-0 bg-emerald-950/5 pointer-events-none rounded-3xl border-4 border-emerald-500/35 animate-fadeIn" />
        )}

        {/* Desktop Helper buttons for Manual Calibration / Non-Sensor simulations */}
        <div className="w-full mt-6 space-y-3.5">
          {deviceHeading === null && (
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150-inset text-center space-y-2">
              <span className="text-[9px] text-slate-400 font-urdu block">ہم ڈیسک ٹاپ یا بغیر سینسر ڈیوائس پر ہیں، ذیل میں نقلی گھماؤ چیک کریں:</span>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleManualRotateLeft}
                  className="py-1 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 active:scale-95 transition-all select-none cursor-pointer"
                >
                  ↺ بائیں گھمائیں
                </button>
                <button
                  type="button"
                  onClick={handleManualRotateRight}
                  className="py-1 px-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 active:scale-95 transition-all select-none cursor-pointer"
                >
                  دائیں گھمائیں ↻
                </button>
              </div>
            </div>
          )}

          {/* Exact degrees status log box */}
          <div className="flex justify-between items-center px-2 text-[10px] text-slate-500">
            <span className="font-mono text-left bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-semibold text-slate-700">
              کہکشاں سمت: {Math.round(relativeAngleToKaaba)}°
            </span>
            <span className="font-urdu text-right">
              حالتِ حسّاسہ: {deviceHeading !== null ? 'لائیو سینسر فعال' : 'سمولیٹر چالو ہے'}
            </span>
          </div>
        </div>
      </div>

      {/* Islamic Significance / Sacred Makkah details banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm text-right space-y-1.5">
        <h4 className="text-xs font-bold text-slate-800 font-urdu flex items-center gap-1 justify-end">
          <Info size={13} className="text-emerald-600 shrink-0" />
          قبلہ رخ (مکہ مکرمہ) کے بارے میں
        </h4>
        <blockquote className="text-[11px] leading-relaxed font-urdu text-slate-600">
          مسجد حرام میں قائم مقدس خانہ کعبہ دنیا بھر کے تمام مسلمانوں کا نماز پڑھنے کا رخ ہے، جسے قبلہ کہتے ہیں۔ دنیا کے کسی بھی کونے میں نماز پڑھتے وقت کعبہ کی سمت کی طرف رخ کرنا ہر مسلمان کے لئے لازمی ہے۔
        </blockquote>
      </div>
    </div>
  );
};
