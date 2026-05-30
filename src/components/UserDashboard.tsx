import { useState, useRef } from 'react';
import { LogOut, Camera, User } from 'lucide-react';

interface UserDashboardProps {
  userName: string;
  userPhone: string;
  onLogout: () => void;
  onClose: () => void;
}

export function UserDashboard({ userName, onLogout, onClose }: UserDashboardProps) {
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    return localStorage.getItem('user_profile_image') || null;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setProfileImage(result);
      localStorage.setItem('user_profile_image', result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-6 pt-12 gap-6">

      {/* Profile Picture */}
      <div className="relative">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
        >
          {profileImage ? (
            <img src={profileImage} alt="profile" className="w-full h-full object-cover" />
          ) : (
            <User size={44} className="text-slate-400" />
          )}
        </div>

        {/* Camera Icon */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-700 rounded-full flex items-center justify-center border-2 border-white shadow"
        >
          <Camera size={13} className="text-white" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Name */}
      <div className="text-center">
        <h2 className="text-black font-urdu text-2xl font-black">{userName}</h2>
        <p className="text-slate-400 font-urdu text-xs mt-1">عام صارف</p>
      </div>

      {/* Divider */}
      <div className="w-full border-t border-slate-100"></div>

      {/* Future sections placeholder */}
      <div className="w-full space-y-3">
        <div className="flex justify-between items-center py-3 border-b border-slate-100 opacity-40">
          <span className="text-xs text-slate-400 font-urdu">جلد آ رہا ہے...</span>
          <span className="text-slate-500 font-urdu text-sm">⭐ پسندیدہ مساجد</span>
        </div>
        <div className="flex justify-between items-center py-3 border-b border-slate-100 opacity-40">
          <span className="text-xs text-slate-400 font-urdu">جلد آ رہا ہے...</span>
          <span className="text-slate-500 font-urdu text-sm">📖 آخری پڑھی سورت</span>
        </div>
        <div className="flex justify-between items-center py-3 border-b border-slate-100 opacity-40">
          <span className="text-xs text-slate-400 font-urdu">جلد آ رہا ہے...</span>
          <span className="text-slate-500 font-urdu text-sm">📿 تسبیح ڈیٹا</span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Back */}
      <button
        onClick={onClose}
        className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-urdu font-bold text-sm rounded-xl transition-all"
      >
        ← ایپ پر واپس جائیں
      </button>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full py-3.5 bg-red-50 hover:bg-red-100 active:scale-95 border border-red-200 text-red-600 font-urdu font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all mb-6"
      >
        <LogOut size={16} />
        لاگ آؤٹ
      </button>

    </div>
  );
}
