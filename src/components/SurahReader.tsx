import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, RefreshCw, Play, Pause } from 'lucide-react';
import { Surah } from '../types';

interface SurahReaderProps {
  surahNum: number;
  onBack: () => void;
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

export const SurahReader: React.FC<SurahReaderProps> = ({ surahNum, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [errorObj, setErrorObj] = useState<string | null>(null);
  const [surahData, setSurahData] = useState<{
    info: any;
    arrAr: any[];
    arrUr: any[];
  } | null>(null);

  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [loadingAyah, setLoadingAyah] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getAudioUrl = (surah: number, ayah: number) => {
    const s = String(surah).padStart(3, '0');
    const a = String(ayah).padStart(3, '0');
    return `https://everyayah.com/data/Abdul_Basit_Murattal_64kbps/${s}${a}.mp3`;
  };

  const togglePlay = (ayahNum: number) => {
    // اگر یہی آیت چل رہی ہے تو pause کریں
    if (playingAyah === ayahNum) {
      audioRef.current?.pause();
      setPlayingAyah(null);
      setLoadingAyah(null);
      return;
    }

    // پرانا آڈیو بند کریں
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    // نیا آڈیو چلائیں
    setLoadingAyah(ayahNum);
    const audio = new Audio(getAudioUrl(surahNum, ayahNum));
    audioRef.current = audio;

    audio.oncanplay = () => {
      setLoadingAyah(null);
      setPlayingAyah(ayahNum);
      audio.play();
    };

    audio.onended = () => {
      setPlayingAyah(null);
      setLoadingAyah(null);
    };

    audio.onerror = () => {
      setLoadingAyah(null);
      setPlayingAyah(null);
    };

    audio.load();
  };

  // کمپوننٹ بند ہونے پر آڈیو بند کریں
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // سورت بدلنے پر آڈیو بند کریں
  useEffect(() => {
    audioRef.current?.pause();
    setPlayingAyah(null);
    setLoadingAyah(null);
  }, [surahNum]);

  const fetchSurah = async () => {
    setLoading(true);
    setErrorObj(null);
    try {
      const [versesRes, infoRes] = await Promise.all([
        fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahNum}?language=ur&translations=97&fields=text_uthmani&per_page=286`),
        fetch(`https://api.quran.com/api/v4/chapters/${surahNum}?language=ur`)
      ]);
      const versesJson = await versesRes.json();
      const infoJson = await infoRes.json();

      if (versesJson.verses && infoJson.chapter) {
        const arrAr = versesJson.verses.map((v: any) => ({
          number: v.id,
          numberInSurah: v.verse_number,
          text: v.text_uthmani,
        }));
        const arrUr = versesJson.verses.map((v: any) => ({
          number: v.id,
          numberInSurah: v.verse_number,
          text: v.translations?.[0]?.text || '',
        }));
        setSurahData({
          info: {
            name: infoJson.chapter.name_arabic,
            numberOfAyahs: infoJson.chapter.verses_count,
            revelationType: infoJson.chapter.revelation_place === 'mecca' ? 'Meccan' : 'Medinan',
          },
          arrAr,
          arrUr,
        });
      } else {
        setErrorObj('قرآن پاک سرور سے رابطے میں ناکامی ہوئی۔ برائے مہربانی اپنا انٹرنیٹ کنکشن چیک کریں۔');
      }
    } catch {
      setErrorObj('قرآن پاک سرور سے رابطے میں ناکامی ہوئی۔ برائے مہربانی اپنا انٹرنیٹ کنکشن چیک کریں۔');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="pb-20 animate-fadeIn">
      {/* Header card */}
      <div className="bg-gradient-to-b from-emerald-900 to-emerald-600 text-white px-4 py-4 shadow-lg w-full rounded-b-3xl flex items-center justify-between" dir="rtl">
        {/* دائیں طرف — عربی نام */}
        <h2 className="text-2xl font-bold font-naskh text-white drop-shadow">{surahData?.info.name}</h2>

        {/* بائیں طرف — تفصیل + back بٹن */}
        <div className="text-right space-y-1" dir="ltr">
          <button
            onClick={onBack}
            className="py-1 px-3 bg-white/10 hover:bg-white/20 border border-white/20 text-xs rounded-lg transition-all font-urdu font-bold flex items-center gap-1 mb-1"
          >
            ← پیچھے
          </button>
          <div className="text-[9px] text-emerald-200 font-mono font-bold tracking-widest uppercase opacity-80">سورت نمبر {surahNum}</div>
          <p className="text-[11px] text-emerald-100 font-urdu">
            {surahData?.info.numberOfAyahs} آیات • {surahData?.info.revelationType === 'Meccan' ? 'مکی' : 'مدنی'}
          </p>
        </div>
      </div>

      {/* بسم اللہ سیکشن */}
      {surahNum !== 9 && (
        <div className="mx-4 mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl py-3 px-4 text-center shadow-sm">
          <p className="font-amiri text-xl text-emerald-900 font-bold leading-loose" dir="rtl">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
        </div>
      )}

      {/* Verses */}
      <div className="p-4 space-y-3 pt-4">
        {surahData?.arrAr.map((ayah, i) => {
          const cleanAr = ayah.text;

          const rawUr = surahData?.arrUr[i] ? surahData.arrUr[i].text : '';
          const urText = rawUr.replace(/<sup[^>]*>.*?<\/sup>/gi, '').replace(/<[^>]*>/g, '').trim();
          const isPlaying = playingAyah === ayah.numberInSurah;
          const isLoading = loadingAyah === ayah.numberInSurah;

          return (
            <div
              key={ayah.number}
              className={`relative bg-[#ffffff] rounded-md border-hidden p-3 py-3.5 shadow-md space-y-2.5 transition-all
                ${isPlaying ? 'shadow-emerald-200' : ''}`}
            >
              {/* آیت نمبر */}
              <div className="absolute top-2 left-2 w-6 h-6 rounded bg-emerald-50 text-emerald-800 border border-emerald-150 flex items-center justify-center text-[9px] font-bold font-mono">
                {ayah.numberInSurah}
              </div>

              {/* عربی متن */}
              <p className="text-xl leading-[3.5rem] tracking-wide text-blue-900 text-right pr-2 pl-8 font-amiri font-bold" dir="rtl">
                {cleanAr}
              </p>

              {/* اردو ترجمہ */}
              <p className="text-xs text-emerald-700 font-semibold leading-relaxed text-right font-urdu border-t border-slate-100 pt-2" dir="rtl">
                {urText}
              </p>

              {/* پلے بٹن */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => togglePlay(ayah.numberInSurah)}
                  className={`flex items-center gap-1.5 text-[10px] font-urdu px-3 py-1.5 rounded-full border transition-all
                    ${isPlaying
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : isLoading
                      ? 'bg-emerald-50 text-emerald-400 border-emerald-200 cursor-wait'
                      : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400'
                    }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      لوڈ ہو رہا ہے...
                    </>
                  ) : isPlaying ? (
                    <>
                      <Pause size={10} />
                      رکیں
                    </>
                  ) : (
                    <>
                      <Play size={10} />
                      تلاوت سنیں
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
