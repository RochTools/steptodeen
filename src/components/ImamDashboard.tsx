import React, { useState, useEffect } from 'react';
import { LogIn, Key, UserPlus, Info, Save, RotateCcw, MapPin, CheckCircle, Trash, PlusCircle, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { Mosque } from '../types';
import { firebaseSignIn, firebaseSignUp, firebaseSignOut } from '../firebase';

interface ImamDashboardProps {
  onAddOrUpdateMosque: (mosque: Omit<Mosque, 'id' | 'updatedAt'> & { id?: string }) => void;
  onDeleteMosque: (id: string) => void;
  mosques: Mosque[];
  onLoggedOut?: () => void;
  userCoords: { latitude: number; longitude: number } | null;
  requestLocation: () => void;
  isRealFirebase: boolean;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  authEmail: string;
  setAuthEmail: (val: string) => void;
  authName: string;
  setAuthName: (val: string) => void;
  authUid: string;
  setAuthUid: (val: string) => void;
  realtimeAuth: any;
}

export const ImamDashboard: React.FC<ImamDashboardProps> = ({
  onAddOrUpdateMosque,
  onDeleteMosque,
  mosques,
  userCoords,
  requestLocation,
  isRealFirebase,
  isAuthenticated,
  setIsAuthenticated,
  authEmail,
  setAuthEmail,
  authName,
  setAuthName,
  authUid,
  setAuthUid,
  realtimeAuth,
  onLoggedOut
}) => {
  const [authEmailInput, setAuthEmailInput] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savingStep, setSavingStep] = useState(3);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [mosqueImage, setMosqueImage] = useState<string | null>(() => {
    return localStorage.getItem('mosque_profile_image') || null;
  });

  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [imamName, setImamName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [fajr, setFajr] = useState('05:30');
  const [zuhr, setZuhr] = useState('13:30');
  const [asr, setAsr] = useState('16:30');
  const [maghrib, setMaghrib] = useState('19:05');
  const [isha, setIsha] = useState('20:30');
  const [jumah, setJumah] = useState('13:30');
  const [eidFitr, setEidFitr] = useState('07:00');
  const [eidAdha, setEidAdha] = useState('07:15');
  const [sehri, setSehri] = useState('04:30');
  const [iftar, setIftar] = useState('18:30');
  const [announcement, setAnnouncement] = useState('');

  // ── نئے offset states ──
  // یہ ایک بار سیٹ کریں — API کے وقت میں ±منٹ کا فرق
  const [fajrOffset, setFajrOffset]       = useState<number>(0);
  const [zuhrOffset, setZuhrOffset]       = useState<number>(0);
  const [asrOffset, setAsrOffset]         = useState<number>(0);
  const [maghribOffset, setMaghribOffset] = useState<number>(5);
  const [ishaOffset, setIshaOffset]       = useState<number>(0);

  const [activePicker, setActivePicker] = useState<{
    prayerKey: 'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha' | 'jumah' | 'eidFitr' | 'eidAdha' | 'sehri' | 'iftar';
    label: string;
    hour: number;
    minute: number;
    isPm: boolean;
  } | null>(null);

  const formatTo12HourString = (timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const suffix = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  const openCustomTimePicker = (
    prayerKey: 'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isha' | 'jumah' | 'eidFitr' | 'eidAdha' | 'sehri' | 'iftar',
    label: string,
    currentTimeString: string
  ) => {
    const parts = currentTimeString.split(':');
    const h24 = parseInt(parts[0], 10) || 12;
    const minute = parseInt(parts[1], 10) || 0;
    let isPm = h24 >= 12;
    let hour = h24 % 12;
    if (hour === 0) hour = 12;
    setActivePicker({ prayerKey, label, hour, minute, isPm });
  };

  const saveCustomTime = () => {
    if (!activePicker) return;
    const { prayerKey, hour, minute, isPm } = activePicker;
    let h24 = hour;
    if (isPm && hour < 12) h24 += 12;
    if (!isPm && hour === 12) h24 = 0;
    const newTimeValue = `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    if (prayerKey === 'fajr') setFajr(newTimeValue);
    else if (prayerKey === 'zuhr') setZuhr(newTimeValue);
    else if (prayerKey === 'asr') setAsr(newTimeValue);
    else if (prayerKey === 'maghrib') setMaghrib(newTimeValue);
    else if (prayerKey === 'isha') setIsha(newTimeValue);
    else if (prayerKey === 'jumah') setJumah(newTimeValue);
    else if (prayerKey === 'eidFitr') setEidFitr(newTimeValue);
    else if (prayerKey === 'eidAdha') setEidAdha(newTimeValue);
    else if (prayerKey === 'sehri') setSehri(newTimeValue);
    else if (prayerKey === 'iftar') setIftar(newTimeValue);
    setActivePicker(null);
  };

  useEffect(() => {
    if (isAuthenticated) {
      setImamName(authName || authEmail.split('@')[0]);
    }
  }, [isAuthenticated, authEmail, authName]);

  useEffect(() => {
    if (isAuthenticated && !editId) {
      const existing = mosques.find((m) => m.imamEmail === authEmail);
      if (existing) handleEditMosque(existing);
    }
  }, [isAuthenticated, mosques, editId, authEmail]);

  useEffect(() => {
    if (activePicker) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [activePicker]);

  const handleAutoGrabLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('آپ کا براؤزر لوکیشن سپورٹ نہیں کرتا۔');
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }
    setSuccessMessage('لوکیشن حاصل کی جا رہی ہے...');
    setErrorMessage('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setSuccessMessage(`✅ لوکیشن کامیابی سے حاصل ہوئی — درستگی: ${Math.round(pos.coords.accuracy)} میٹر`);
        setTimeout(() => setSuccessMessage(''), 5000);
      },
      () => {
        setErrorMessage('لوکیشن نہیں مل سکی۔ براہ کرم GPS اور پرمیشن چیک کریں۔');
        setTimeout(() => setErrorMessage(''), 5000);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmailInput || !authPassword) {
      setErrorMessage('براہ کرم تمام معلومات کلاؤڈ میں لکھیں۔');
      return;
    }
    if (isSignUp && !authName) {
      setErrorMessage('برائے مہربانی اپنا نام تحریر کریں۔');
      return;
    }
    setErrorMessage('');
    if (isRealFirebase && realtimeAuth) {
      try {
        if (isSignUp) {
          await firebaseSignUp(realtimeAuth, authEmailInput, authPassword, authName);
        } else {
          await firebaseSignIn(realtimeAuth, authEmailInput, authPassword);
        }
        setSuccessMessage(isSignUp ? 'مبارک ہو! آپ کا امام اکاؤنٹ کامیابی سے رجسٹر ہو گیا ہے۔' : 'خوش آمدید! آپ کامیابی سے لاگ ان ہو گئے ہیں۔');
        setTimeout(() => setSuccessMessage(''), 4000);
      } catch (err: any) {
        const code: string = err?.code || '';
        if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          setErrorMessage('ای میل یا پاسورڈ غلط ہے۔ دوبارہ کوشش کریں۔');
        } else if (code === 'auth/email-already-in-use') {
          setErrorMessage('یہ ای میل پہلے سے رجسٹر ہے۔ لاگ ان کریں۔');
        } else if (code === 'auth/weak-password') {
          setErrorMessage('پاسورڈ کم از کم 6 حروف کا ہونا چاہیے۔');
        } else if (code === 'auth/invalid-email') {
          setErrorMessage('ای میل کا فارمیٹ درست نہیں ہے۔');
        } else if (code === 'auth/network-request-failed') {
          setErrorMessage('انٹرنیٹ کنکشن چیک کریں اور دوبارہ کوشش کریں۔');
        } else {
          setErrorMessage('لاگ ان میں دشواری پیش آئی: ' + (err?.message || code));
        }
      }
    } else {
      setIsAuthenticated(true);
      setAuthEmail(authEmailInput);
      setAuthUid('demo_' + authEmailInput.split('@')[0]);
      setSuccessMessage(isSignUp ? 'مبارک ہو! (آف لائن موڈ)' : 'خوش آمدید! (آف لائن موڈ)');
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const handleLogOut = async () => {
    if (isRealFirebase && realtimeAuth) {
      try { await firebaseSignOut(realtimeAuth); } catch (err) { console.error(err); }
    } else {
      setIsAuthenticated(false);
      setAuthEmail('');
      setAuthUid('');
    }
    setAuthPassword('');
    setAuthName('');
    setEditId(undefined);
    resetForm();
    if (onLoggedOut) onLoggedOut();
  };

  const resetForm = () => {
    setEditId(undefined);
    setName('');
    setAddress('');
    setLatitude('');
    setLongitude('');
    setFajr('05:30');
    setZuhr('13:15');
    setAsr('16:30');
    setMaghrib('19:05');
    setIsha('20:30');
    setJumah('13:30');
    setEidFitr('07:00');
    setEidAdha('07:15');
    setSehri('04:30');
    setIftar('18:30');
    setAnnouncement('');
    // offset reset
    setFajrOffset(0);
    setZuhrOffset(0);
    setAsrOffset(0);
    setMaghribOffset(5);
    setIshaOffset(0);
  };

  const myMosques = mosques.filter((m) => m.imamEmail === authEmail);

  const handleEditMosque = (mosque: Mosque) => {
    setEditId(mosque.id);
    setName(mosque.name);
    setImamName(mosque.imamName);
    setAddress(mosque.address);
    setLatitude(mosque.latitude);
    setLongitude(mosque.longitude);
    setFajr(mosque.fajr);
    setZuhr(mosque.zuhr);
    setAsr(mosque.asr);
    setMaghrib(mosque.maghrib);
    setIsha(mosque.isha);
    setJumah(mosque.jumah);
    setEidFitr(mosque.eidFitr || '07:00');
    setEidAdha(mosque.eidAdha || '07:15');
    setSehri(mosque.sehri || '04:30');
    setIftar(mosque.iftar || '18:30');
    setAnnouncement(mosque.announcement || '');
    // ── پرانی مسجد کے offset لوڈ کریں ──
    setFajrOffset(mosque.fajrOffset ?? 0);
    setZuhrOffset(mosque.zuhrOffset ?? 0);
    setAsrOffset(mosque.asrOffset ?? 0);
    setMaghribOffset(mosque.maghribOffset ?? 5);
    setIshaOffset(mosque.ishaOffset ?? 0);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address || latitude === '' || longitude === '') {
      setErrorMessage('براہ کرم سرخ نشان والی تمام معلومات پُر کریں۔');
      return;
    }
    setIsSaving(true);
    setSavingStep(3);
    const countdownInterval = setInterval(() => {
      setSavingStep((prev) => {
        if (prev <= 1) { clearInterval(countdownInterval); return 0; }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => {
      clearInterval(countdownInterval);
      onAddOrUpdateMosque({
        id: editId,
        name,
        imamName,
        imamEmail: authEmail,
        imamUid: authUid || ('demo_' + authEmail.split('@')[0]),
        address,
        latitude: Number(latitude),
        longitude: Number(longitude),
        fajr,
        zuhr,
        asr,
        maghrib,
        isha,
        jumah,
        eidFitr,
        eidAdha,
        sehri,
        iftar,
        announcement,
        // ── offset Firebase میں save ہوگا ──
        fajrOffset,
        zuhrOffset,
        asrOffset,
        maghribOffset,
        ishaOffset,
      });
      setIsSaving(false);
      setSuccessMessage(editId
        ? 'الحمد للہ! کلاؤڈ سرور پر مسجد کے نئے اوقات کامیابی کے ساتھ اپڈیٹ ہو گئے ہیں۔'
        : 'مبارک ہو! نئی مسجد کا کلاؤڈ ریکارڈ کامیابی سے رجسٹر ہو گیا ہے۔'
      );
      setErrorMessage('');
      resetForm();
      setTimeout(() => setSuccessMessage(''), 6000);
    }, 3000);
  };

  // ── Offset input helper component ──
  const OffsetInput = ({
    label, value, onChange, color
  }: {
    label: string; value: number; onChange: (v: number) => void; color: string;
  }) => (
    <div className={`flex flex-col items-center gap-1 bg-${color}-50/50 border border-${color}-100 rounded-2xl p-2`}>
      <span className={`text-[9px] font-bold font-urdu text-${color}-700`}>{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          className={`w-6 h-6 rounded-lg bg-white border border-${color}-200 text-${color}-700 font-bold text-sm flex items-center justify-center active:scale-95 cursor-pointer`}
        >−</button>
        <span className={`w-8 text-center font-mono font-black text-xs text-${color}-900`}>
          {value > 0 ? `+${value}` : value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className={`w-6 h-6 rounded-lg bg-white border border-${color}-200 text-${color}-700 font-bold text-sm flex items-center justify-center active:scale-95 cursor-pointer`}
        >+</button>
      </div>
      <span className="text-[8px] text-slate-400 font-mono">منٹ</span>
    </div>
  );

  return (
    <>
      <div className="space-y-4 pb-20 animate-fadeIn">

        {!isAuthenticated ? (
          <div className="mx-4 mt-8 bg-slate-50 rounded-2xl border border-slate-200 p-6 text-center space-y-3">
            <span className="text-3xl">🔒</span>
            <p className="text-slate-500 font-urdu text-sm">براہ کرم پہلے لاگ ان کریں</p>
          </div>
        ) : (
          <div className="space-y-3">

            {/* پروفائل سیکشن */}
            <div className="animate-fadeIn">
              <div className="bg-white pt-5 pb-4 px-4 text-center">
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="text-[10px] font-urdu text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-full border border-rose-100 transition-all cursor-pointer"
                  >لاگ آؤٹ</button>
                  <span className="text-[9px] font-urdu flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    {isRealFirebase ? 'لائیو' : 'آف لائن'}
                  </span>
                </div>
                <div className="flex justify-center -mt-2 mb-2">
                  <div className="relative">
                    <div className="w-28 h-28 rounded-full border-4 border-emerald-100 shadow-lg overflow-hidden bg-emerald-50 flex items-center justify-center">
                      {mosqueImage ? <img src={mosqueImage} alt="مسجد" className="w-full h-full object-cover" /> : <span className="text-4xl">🕌</span>}
                    </div>
                    <label className="absolute bottom-0.5 right-0.5 w-6 h-6 bg-emerald-600 hover:bg-emerald-700 rounded-full flex items-center justify-center cursor-pointer border-2 border-white shadow-md transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const result = ev.target?.result as string;
                          setMosqueImage(result);
                          localStorage.setItem('mosque_profile_image', result);
                        };
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                  </div>
                </div>
                <h2 className="text-lg font-black text-slate-900 font-urdu leading-snug">{imamName || authName || 'امام صاحب'}</h2>
                <p className="text-sm text-emerald-700 font-bold font-urdu mt-0.5">{name || myMosques[0]?.name || 'مسجد کا نام'}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">{authEmail}</p>
              </div>
            </div>

            {/* Toast messages */}
            {successMessage && (
              <div className="p-3.5 bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs rounded-2xl text-right font-urdu flex items-center gap-2 justify-end shadow-sm animate-scaleUp mx-4">
                <span className="font-bold">{successMessage}</span>
                <CheckCircle size={15} className="text-emerald-600 shrink-0" />
              </div>
            )}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 text-rose-900 border border-rose-200 text-xs rounded-2xl text-right font-urdu flex items-center gap-2 justify-end shadow-sm animate-scaleUp mx-4">
                <span className="font-bold">{errorMessage}</span>
                <AlertCircle size={15} className="text-rose-600 shrink-0" />
              </div>
            )}

            {/* میری مساجد */}
            {myMosques.length > 0 && (
              <div className="px-4 space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-[9px] text-emerald-700 font-urdu font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">{myMosques.length} مسجد</span>
                  <span className="text-[10px] font-bold text-slate-500 font-urdu flex items-center gap-1">
                    <MapPin size={11} className="text-emerald-600" /> رجسٹر مساجد
                  </span>
                </div>
                {myMosques.map((mosque) => (
                  <div key={mosque.id} className="flex items-center justify-between gap-2 py-2.5 px-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="text-right flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 font-urdu truncate">{mosque.name}</p>
                      <p className="text-[10px] text-slate-400 font-urdu truncate">{mosque.address}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={() => handleEditMosque(mosque)} className="w-7 h-7 flex items-center justify-center rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 transition-all cursor-pointer"><RefreshCw size={12} /></button>
                      <button type="button" onClick={() => setDeleteConfirmId(mosque.id)} className="w-7 h-7 flex items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-500 transition-all cursor-pointer"><Trash size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* فارم */}
            <div className="space-y-4 animate-fadeIn px-4">
              <div className="flex items-center justify-end">
                <span className="text-[9px] text-amber-600 font-urdu font-bold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                  {editId ? 'پبلک اوقات ترمیم' : 'نیا ریکارڈ'}
                </span>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4 text-right">
                {/* مسجد کا نام */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-705 font-bold font-urdu block">مسجد کا نام *</label>
                  <input type="text" required placeholder="مثال: جامع مسجد مدینہ" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-right font-urdu shadow-sm" dir="rtl" />
                </div>

                {/* پتہ */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-705 font-bold font-urdu block">پتہ / ریجن / سیکٹر *</label>
                  <input type="text" required placeholder="مثال: سیکٹر ایف ٹین، اسلام آباد" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-right font-urdu shadow-sm" dir="rtl" />
                </div>

                {/* GPS */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" onClick={handleAutoGrabLocation} className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 active:scale-95 rounded-xl text-[10px] font-bold border border-emerald-100/80 shadow-sm transition-all font-urdu flex items-center gap-1.5 cursor-pointer">
                      <MapPin size={12} className="shrink-0" /> موجودہ لوکیشن آٹو حاصل کریں
                    </button>
                    <label className="text-[11px] text-slate-705 font-bold font-urdu block">نقشہ کے کوآرڈینیٹس (GPS) *</label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100">
                    <div className="space-y-1">
                      <div className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider text-left">Longitude</div>
                      <input type="number" step="any" required placeholder="72.9984" value={longitude} onChange={(e) => setLongitude(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 transition-all text-left font-mono shadow-inner" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider text-left">Latitude</div>
                      <input type="number" step="any" required placeholder="33.6675" value={latitude} onChange={(e) => setLatitude(e.target.value === '' ? '' : Number(e.target.value))} className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 transition-all text-left font-mono shadow-inner" />
                    </div>
                  </div>
                </div>

                {/* ════════════════════════════════════════════
                    نیا سیکشن: اذان وقت adjustment (offset)
                    ════════════════════════════════════════════ */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-end gap-2">
                    <div className="text-right">
                      <span className="text-[11px] font-bold font-urdu text-slate-700 block">اذان وقت adjustment</span>
                      <span className="text-[9px] text-slate-400 font-urdu">ایک بار سیٹ کریں — API خودبخود وقت لائے گا</span>
                    </div>
                    <span className="text-lg">⏱️</span>
                  </div>

                  {/* مثال */}
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-right">
                    <p className="text-[9px] text-amber-800 font-urdu leading-relaxed">
                      <span className="font-black">مثال:</span> API نے عصر <span className="font-mono font-black">4:30</span> بھیجا، آپ نے <span className="font-mono font-black">+10</span> لگایا → یوزر کو <span className="font-mono font-black text-emerald-700">4:40</span> دکھے گا ✅
                    </p>
                  </div>

                  {/* 5 offset inputs */}
                  <div className="grid grid-cols-5 gap-1.5">
                    <OffsetInput label="فجر"   value={fajrOffset}    onChange={setFajrOffset}    color="sky"    />
                    <OffsetInput label="ظہر"   value={zuhrOffset}    onChange={setZuhrOffset}    color="orange" />
                    <OffsetInput label="عصر"   value={asrOffset}     onChange={setAsrOffset}     color="amber"  />
                    <OffsetInput label="مغرب"  value={maghribOffset} onChange={setMaghribOffset} color="rose"   />
                    <OffsetInput label="عشاء"  value={ishaOffset}    onChange={setIshaOffset}    color="indigo" />
                  </div>
                </div>

                {/* جماعت کے اوقات */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-end">
                    <span className="text-[11px] font-bold font-urdu text-slate-700">جماعت کے اوقات</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* فجر */}
                    <div className="bg-sky-50/40 border border-sky-100 rounded-2xl p-2 flex flex-col items-center justify-between shadow-sm">
                      <span className="text-[10px] text-sky-850 font-black font-urdu mb-1.5">فجر جماعت</span>
                      <button type="button" onClick={() => openCustomTimePicker('fajr', 'فجر جماعت', fajr)} className="w-full py-1.5 px-1 bg-white hover:bg-sky-100/80 active:scale-95 border border-sky-200 rounded-xl text-[10px] text-center font-mono font-bold text-sky-950 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm">
                        <Clock size={11} className="text-sky-600 shrink-0" /><span>{formatTo12HourString(fajr)}</span>
                      </button>
                    </div>
                    {/* ظہر */}
                    <div className="bg-yellow-50/40 border border-yellow-100 rounded-2xl p-2 flex flex-col items-center justify-between shadow-sm">
                      <span className="text-[10px] text-yellow-850 font-black font-urdu mb-1.5">ظہر جماعت</span>
                      <button type="button" onClick={() => openCustomTimePicker('zuhr', 'ظہر جماعت', zuhr)} className="w-full py-1.5 px-1 bg-white hover:bg-yellow-100/80 active:scale-95 border border-yellow-200 rounded-xl text-[10px] text-center font-mono font-bold text-yellow-950 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm">
                        <Clock size={11} className="text-yellow-600 shrink-0" /><span>{formatTo12HourString(zuhr)}</span>
                      </button>
                    </div>
                    {/* عصر */}
                    <div className="bg-orange-50/40 border border-orange-100 rounded-2xl p-2 flex flex-col items-center justify-between shadow-sm">
                      <span className="text-[10px] text-orange-850 font-black font-urdu mb-1.5">عصر جماعت</span>
                      <button type="button" onClick={() => openCustomTimePicker('asr', 'عصر جماعت', asr)} className="w-full py-1.5 px-1 bg-white hover:bg-orange-100/80 active:scale-95 border border-orange-200 rounded-xl text-[10px] text-center font-mono font-bold text-orange-950 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm">
                        <Clock size={11} className="text-orange-600 shrink-0" /><span>{formatTo12HourString(asr)}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {/* مغرب */}
                    <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-2 flex flex-col items-center justify-between shadow-sm">
                      <span className="text-[10px] text-rose-850 font-black font-urdu mb-1.5">مغرب جماعت</span>
                      <button type="button" onClick={() => openCustomTimePicker('maghrib', 'مغرب جماعت', maghrib)} className="w-full py-1.5 px-1 bg-white hover:bg-rose-100/80 active:scale-95 border border-rose-200 rounded-xl text-[10px] text-center font-mono font-bold text-rose-950 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm">
                        <Clock size={11} className="text-rose-600 shrink-0" /><span>{formatTo12HourString(maghrib)}</span>
                      </button>
                    </div>
                    {/* عشاء */}
                    <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-2 flex flex-col items-center justify-between shadow-sm">
                      <span className="text-[10px] text-indigo-850 font-black font-urdu mb-1.5">عشاء جماعت</span>
                      <button type="button" onClick={() => openCustomTimePicker('isha', 'عشاء جماعت', isha)} className="w-full py-1.5 px-1 bg-white hover:bg-indigo-100/80 active:scale-95 border border-indigo-200 rounded-xl text-[10px] text-center font-mono font-bold text-indigo-950 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm">
                        <Clock size={11} className="text-indigo-600 shrink-0" /><span>{formatTo12HourString(isha)}</span>
                      </button>
                    </div>
                    {/* جمعہ */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-2 flex flex-col items-center justify-between shadow-sm">
                      <span className="text-[10px] text-emerald-850 font-black font-urdu mb-1.5">نمازِ جمعہ</span>
                      <button type="button" onClick={() => openCustomTimePicker('jumah', 'نمازِ جمعہ', jumah)} className="w-full py-1.5 px-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 border border-emerald-600 rounded-xl text-[10px] text-center font-mono font-bold text-white flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md">
                        <Clock size={11} className="shrink-0 text-emerald-100" /><span>{formatTo12HourString(jumah)}</span>
                      </button>
                    </div>
                  </div>

                  {/* عیدین */}
                  <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-3.5 space-y-2 mt-1.5 shadow-sm">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <span className="text-[9px] text-purple-800 font-bold font-urdu block text-right">عید الفطر جماعت</span>
                        <button type="button" onClick={() => openCustomTimePicker('eidFitr', 'عید الفطر جماعت', eidFitr)} className="w-full py-2 bg-white hover:bg-purple-100 active:scale-95 border border-purple-200 rounded-xl text-[10px] text-center font-mono font-bold text-purple-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm">
                          <Clock size={11} className="text-purple-600 shrink-0" /><span>{formatTo12HourString(eidFitr)}</span>
                        </button>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-purple-800 font-bold font-urdu block text-right">عید الاضحی جماعت</span>
                        <button type="button" onClick={() => openCustomTimePicker('eidAdha', 'عید الاضحی جماعت', eidAdha)} className="w-full py-2 bg-white hover:bg-purple-100 active:scale-95 border border-purple-200 rounded-xl text-[10px] text-center font-mono font-bold text-purple-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm">
                          <Clock size={11} className="text-purple-600 shrink-0" /><span>{formatTo12HourString(eidAdha)}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* رمضان */}
                  <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-3.5 space-y-2 mt-1.5 shadow-sm">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <span className="text-[9px] text-teal-800 font-bold font-urdu block text-right">🌙 سحری کا وقت</span>
                        <button type="button" onClick={() => openCustomTimePicker('sehri', 'سحری کا وقت', sehri)} className="w-full py-2 bg-white hover:bg-teal-100 active:scale-95 border border-teal-200 rounded-xl text-[10px] text-center font-mono font-bold text-teal-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm">
                          <Clock size={11} className="text-teal-600 shrink-0" /><span>{formatTo12HourString(sehri)}</span>
                        </button>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] text-teal-800 font-bold font-urdu block text-right">🌅 افطاری کا وقت</span>
                        <button type="button" onClick={() => openCustomTimePicker('iftar', 'افطاری کا وقت', iftar)} className="w-full py-2 bg-white hover:bg-teal-100 active:scale-95 border border-teal-200 rounded-xl text-[10px] text-center font-mono font-bold text-teal-900 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm">
                          <Clock size={11} className="text-teal-600 shrink-0" /><span>{formatTo12HourString(iftar)}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* اعلان */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <label className="text-[11px] text-slate-705 font-bold font-urdu block">اہم اعلان یا وقتی تبدیلی (اختیاری)</label>
                  <textarea placeholder="مثال: کل انشاء اللہ فجر کی نماز نئے وقت پر ادا کی جائے گی۔" value={announcement} onChange={(e) => setAnnouncement(e.target.value)} className="w-full p-2.5 h-16 bg-slate-50/70 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-right font-urdu shadow-sm" dir="rtl" />
                </div>

                {/* Save button */}
                <div className="pt-3 border-t border-slate-100">
                  <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-urdu font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer">
                    <Save size={14} />
                    {editId ? 'ترمیم کلاؤڈ پر محفوظ کریں' : 'مسجد ریکارڈ کلاؤڈ پر رجسٹر کریں'}
                  </button>
                </div>
              </form>
            </div>

            {/* لاگ آؤٹ */}
            <div className="pt-1 pb-2 select-none px-4">
              <button type="button" onClick={() => setShowLogoutConfirm(true)} className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-urdu font-bold text-xs rounded-xl border border-rose-100 transition-all flex items-center justify-center gap-2 cursor-pointer">
                لاگ آؤٹ کریں
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Time Picker Modal */}
      {activePicker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-3 sm:p-4 touch-none overscroll-none select-none">
          <div className="bg-white rounded-3xl w-full max-w-[340px] shadow-2xl overflow-hidden border border-emerald-100 flex flex-col drop-shadow-lg animate-fadeIn">
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 text-white p-3 text-center space-y-0.5">
              <div className="text-[9px] text-emerald-200 font-bold uppercase tracking-wider font-urdu">جماعت کا وقت تبدیل کریں</div>
              <h3 className="text-xs font-bold font-urdu text-amber-300">{activePicker.label} کا وقت</h3>
              <div className="text-xl font-mono font-extrabold tracking-widest mt-1 bg-emerald-950/45 py-1 px-3 rounded-lg inline-block border border-emerald-600/30">
                {String(activePicker.hour).padStart(2, '0')}:{String(activePicker.minute).padStart(2, '0')}{' '}
                <span className="text-xs">{activePicker.isPm ? 'PM' : 'AM'}</span>
              </div>
            </div>
            <div className="p-3 space-y-3 text-right">
              <div className="grid grid-cols-2 gap-3">
                {/* گھنٹے */}
                <div className="space-y-2">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-center font-urdu">گھنٹہ</div>
                  <div className="grid grid-cols-3 gap-1">
                    {[12,1,2,3,4,5,6,7,8,9,10,11].map((h) => (
                      <button key={h} type="button" onClick={() => setActivePicker({ ...activePicker, hour: h })}
                        className={`py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${activePicker.hour === h ? 'bg-emerald-600 text-white shadow-inner' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-150'}`}>
                        {String(h).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-1 pt-1 bg-slate-50/50 rounded-lg p-1 border border-slate-100">
                    <button type="button" onClick={() => { let h = activePicker.hour - 1; if (h < 1) h = 12; setActivePicker({ ...activePicker, hour: h }); }} className="w-5 h-5 bg-white hover:bg-slate-100 text-slate-700 rounded-md font-bold flex items-center justify-center text-xs border border-slate-200 cursor-pointer">-</button>
                    <span className="text-[10px] font-mono font-bold text-slate-700">{String(activePicker.hour).padStart(2, '0')}</span>
                    <button type="button" onClick={() => { let h = activePicker.hour + 1; if (h > 12) h = 1; setActivePicker({ ...activePicker, hour: h }); }} className="w-5 h-5 bg-white hover:bg-slate-100 text-slate-700 rounded-md font-bold flex items-center justify-center text-xs border border-slate-200 cursor-pointer">+</button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    <button type="button" onClick={() => setActivePicker({ ...activePicker, isPm: false })} className={`py-2 rounded-xl text-[10px] font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer border ${!activePicker.isPm ? 'bg-sky-500 text-white border-sky-500 shadow-inner' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                      <span className="text-base leading-none">🌅</span><span className="text-[9px] leading-none mt-0.5">صبح</span>
                    </button>
                    <button type="button" onClick={() => setActivePicker({ ...activePicker, isPm: true })} className={`py-2 rounded-xl text-[10px] font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer border ${activePicker.isPm ? 'bg-indigo-600 text-white border-indigo-600 shadow-inner' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                      <span className="text-base leading-none">🌙</span><span className="text-[9px] leading-none mt-0.5">شام</span>
                    </button>
                  </div>
                </div>
                {/* منٹ */}
                <div className="space-y-2">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-center font-urdu">منٹ</div>
                  <div className="grid grid-cols-3 gap-1">
                    {[0,5,10,15,20,25,30,35,40,45,50,55].map((m) => (
                      <button key={m} type="button" onClick={() => setActivePicker({ ...activePicker, minute: m })}
                        className={`py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${activePicker.minute === m ? 'bg-emerald-600 text-white shadow-inner' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-150'}`}>
                        {String(m).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-1 pt-1 bg-slate-50/50 rounded-lg p-1 border border-slate-100 mt-1">
                    <button type="button" onClick={() => { let m = activePicker.minute - 1; if (m < 0) m = 59; setActivePicker({ ...activePicker, minute: m }); }} className="w-5 h-5 bg-white hover:bg-slate-100 text-slate-700 rounded-md font-bold flex items-center justify-center text-xs border border-slate-200 cursor-pointer">-</button>
                    <span className="text-[10px] font-mono font-bold text-slate-700">{String(activePicker.minute).padStart(2, '0')}</span>
                    <button type="button" onClick={() => { let m = activePicker.minute + 1; if (m > 59) m = 0; setActivePicker({ ...activePicker, minute: m }); }} className="w-5 h-5 bg-white hover:bg-slate-100 text-slate-700 rounded-md font-bold flex items-center justify-center text-xs border border-slate-200 cursor-pointer">+</button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100 font-urdu">
                <button type="button" onClick={() => setActivePicker(null)} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer">منسوخ کریں</button>
                <button type="button" onClick={saveCustomTime} className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer">محفوظ کریں</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirmId && (() => {
        const target = myMosques.find(m => m.id === deleteConfirmId);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-3 touch-none overscroll-none select-none animate-fadeIn">
            <div className="bg-white rounded-3xl w-full max-w-[325px] shadow-2xl border border-rose-100 p-4 space-y-4 text-right">
              <div className="flex items-center gap-2 justify-end text-rose-600 border-b border-rose-100 pb-2">
                <span className="text-xs font-bold font-urdu">مسجد ڈیلیٹ کریں</span>
                <Trash size={15} className="shrink-0 text-rose-500" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-slate-700 leading-relaxed font-urdu">کیا آپ واقعی یہ مسجد مکمل طور پر ڈیلیٹ کرنا چاہتے ہیں؟</p>
                {target && <p className="text-xs font-bold text-rose-700 font-urdu bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-100">{target.name}</p>}
                <p className="text-[10px] text-slate-400 font-urdu">یہ عمل واپس نہیں ہو سکتا۔</p>
              </div>
              <div className="flex gap-2.5 pt-1 font-urdu">
                <button type="button" onClick={() => setDeleteConfirmId(null)} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer">منسوخ کریں</button>
                <button type="button" onClick={() => { onDeleteMosque(deleteConfirmId); if (editId === deleteConfirmId) resetForm(); setDeleteConfirmId(null); setSuccessMessage('مسجد کا ریکارڈ کامیابی سے ڈیلیٹ کر دیا گیا ہے۔'); setTimeout(() => setSuccessMessage(''), 4000); }} className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer">ہاں، ڈیلیٹ کریں</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Logout Confirm */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-3 touch-none overscroll-none select-none animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-[325px] shadow-2xl border border-rose-100 p-4 space-y-4 text-right">
            <div className="flex items-center gap-2 justify-end text-rose-600 border-b border-rose-100 pb-2">
              <span className="text-xs font-bold font-urdu">تصدیق لاگ آؤٹ</span>
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
            </div>
            <p className="text-[11px] text-slate-700 leading-relaxed font-urdu">کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟</p>
            <div className="flex gap-2.5 pt-1 font-urdu">
              <button type="button" onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer">منسوخ کریں</button>
              <button type="button" onClick={() => { setShowLogoutConfirm(false); handleLogOut(); }} className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer">جی ہاں، لاگ آؤٹ کریں</button>
            </div>
          </div>
        </div>
      )}

      {/* Saving Overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[999999] flex flex-col items-center justify-center p-6 text-center select-none touch-none animate-fadeIn">
          <div className="bg-emerald-955/35 p-7 rounded-full border-2 border-emerald-500/25 shadow-2xl relative mb-4 animate-scaleUp">
            <RefreshCw className="text-amber-400 animate-spin" size={54} strokeWidth={2} />
            <span className="absolute inset-x-0 top-[26px] flex items-center justify-center font-mono font-black text-white text-sm">{savingStep}</span>
          </div>
          <h3 className="text-sm font-black font-urdu text-amber-300 animate-pulse tracking-wide">اوقاتِ جماعت کلاؤڈ سرور پر اپڈیٹ ہو رہے ہیں...</h3>
          <p className="text-[11px] text-emerald-100 leading-relaxed font-urdu max-w-xs mt-2.5">براہ کرم تھوڑا انتظار کیجیئے۔</p>
          <div className="w-52 bg-slate-850 rounded-full h-1.5 mt-5 overflow-hidden border border-emerald-800/10">
            <div className="bg-amber-400 h-full rounded-full" style={{ width: `${((3.3 - savingStep) / 3) * 100}%`, transition: 'width 1.1s linear' }}></div>
          </div>
        </div>
      )}
    </>
  );
};
