import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Surah } from '../types';

interface SurahReaderProps {
  surahNum: number;
}

const SURAH_NAMES_UR = [
  'الفاتحہ','البقرہ','آل عمران','النساء','المائدہ','الانعام','الاعراف','الانفال',
  'التوبہ','یونس','ہود','یوسف','الرعد','ابراہیم','الحجر','النحل','الاسراء',
  'الکہف','مریم','طہ','الانبیاء','الحج','المومنون','النور','الفرقان','الشعراء',
  'النمل','القصص','العنکبوت','الروم','لقمان','السجدہ','الاحزاب','سبا','فاطر',
  'یسین','الصافات','ص','الزمر','غافر','فصلت','الشوریٰ','الزخرف','الدخان',
  'الجاثیہ','الاحقاف','محمد','الفتح','الحجرات','ق','الذاریات','الطور','النجم',
  'القمر','الرحمٰن','الواقعہ','الحدید','المجادلہ','الحشر','الممتحنہ','الصف',
  'الجمعہ','المنافقون','التغابن','الطلاق','التحریم','الملک','القلم','الحاقہ',
  'المعارج','نوح','الجن','المزمل','المدثر','القیامہ','الانسان','المرسلات',
  'النبا','النازعات','عبس','التکویر','الانفطار','المطففین','الانشقاق','البروج',
  'الطارق','الاعلیٰ','الغاشیہ','الفجر','البلد','الشمس','اللیل','الضحیٰ',
  'الشرح','التین','العلق','القدر','البینہ','الزلزلہ','العادیات','القارعہ',
  'التکاثر','العصر','الہمزہ','الفیل','قریش','الماعون','الکوثر','الکافرون',
  'النصر','المسد','الاخلاص','الفلق','الناس'
];

export const SurahReader: React.FC<SurahReaderProps> = ({ surahNum }) => {
  const [loading, setLoading] = useState(true);
  const [errorObj, setErrorObj] = useState<string | null>(null);
  const [surahData, setSurahData] = useState<{
    info: any;
    arrAr: any[];
    arrUr: any[];
  } | null>(null);

  const fetchSurah = () => {
    setLoading(true);
    setErrorObj(null);
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}/editions/quran-uthmani,ur.jalandhry`)
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 200 && json.data && json.data.length >= 2) {
          setSurahData({
            info: json.data[0],
            arrAr: json.data[0].ayahs,
            arrUr: json.data[1].ayahs
          });
        } else {
          setErrorObj('قرآن پاک سرور سے رابطے میں ناکامی ہوئی۔ برائے مہربانی اپنا انٹرنیٹ کنکشن چیک کریں۔');
        }
        setLoading(false);
      })
      .catch(() => {
        setErrorObj('قرآن پاک سرور سے رابطے میں ناکامی ہوئی۔ برائے مہربانی اپنا انٹرنیٹ کنکشن چیک کریں۔');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSurah();
  }, [surahNum]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
        <p className="text-xs text-slate-500 font-urdu">مبارک کلمات لوڈ ہورہے ہیں...</p>
      </div>
    );
  }

  if (errorObj) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <AlertCircle size={32} className="text-red-500" />
        <p className="text-xs text-red-700 font-urdu leading-relaxed max-w-xs">{errorObj}</p>
        <button
          onClick={fetchSurah}
          className="py-1.5 px-4 bg-emerald-600 text-white text-xs font-bold rounded-full font-urdu hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow"
        >
          <RefreshCw size={12} />
          دوبارہ کوشش کریں
        </button>
      </div>
    );
  }

  const hasBismillah = surahNum !== 9 && surahNum !== 1;

  return (
    <div className="space-y-4 pb-20 animate-fadeIn">
      {/* Header card with name details */}
      <div className="bg-emerald-50 text-emerald-950 p-3.5 text-center space-y-1 border border-emerald-100 rounded-2xl shadow-sm m-4">
        <div className="text-[9px] text-emerald-600 font-mono font-bold tracking-wider uppercase">سورت نمبر {surahNum}</div>
        <h2 className="text-lg font-bold font-amiri text-emerald-900 leading-normal">{surahData?.info.name}</h2>
        <h3 className="text-xs font-bold font-urdu text-emerald-800">{SURAH_NAMES_UR[surahNum - 1]}</h3>
        <p className="text-[10px] text-slate-500 font-urdu mt-0.5">
          {surahData?.info.numberOfAyahs} آیات • {surahData?.info.revelationType === 'Meccan' ? 'مکی' : 'مدنی'}
        </p>
      </div>

      {hasBismillah && (
        <div className="text-center text-lg font-amiri font-bold py-2 bg-emerald-50/50 border-y border-emerald-100 text-emerald-900 leading-normal">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </div>
      )}

      {/* Verses Container */}
      <div className="p-4 space-y-3 pt-0">
        {surahData?.arrAr.map((ayah, i) => {
          // Remove Bismillah from intermediate text if is not Surah 1 and is first Ayah (api often appends it)
          let cleanAr = ayah.text;
          if (surahNum !== 1 && ayah.numberInSurah === 1 && cleanAr.startsWith("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ")) {
            cleanAr = cleanAr.slice("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ".length).trim();
          }

          const urText = surahData?.arrUr[i] ? surahData.arrUr[i].text : '';

          return (
            <div key={ayah.number} className="relative bg-white rounded-2xl border border-slate-200 p-3 py-3.5 shadow-sm space-y-2.5">
              {/* Ayah number badge on top-left */}
              <div className="absolute top-2 left-2 w-6 h-6 rounded bg-emerald-50 text-emerald-800 border border-emerald-150 flex items-center justify-center text-[9px] font-bold font-mono">
                {ayah.numberInSurah}
              </div>

              {/* Arabic text with beautiful ligatures */}
              <p className="text-base leading-loose text-slate-900 text-right pr-6 font-amiri font-medium" dir="rtl">
                {cleanAr}
              </p>

              {/* Urdu Translation */}
              <p className="text-xs text-slate-750 text-slate-700 leading-relaxed text-right font-urdu border-t border-slate-100 pt-2" dir="rtl">
                {urText}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
