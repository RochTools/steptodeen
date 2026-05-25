import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, Scroll, Book, BookOpen } from 'lucide-react';
import { HadithBook, Hadith } from '../types';

const HADITH_BOOKS: HadithBook[] = [
  {
    key: 'bukhari',
    name: 'صحیح بخاری',
    ar: 'صحيح البخاري',
    total: 7563,
    icon: '📖',
    ar_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari.min.json',
    ur_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-bukhari.min.json'
  },
  {
    key: 'muslim',
    name: 'صحیح مسلم',
    ar: 'صحيح مسلم',
    total: 3033,
    icon: '📚',
    ar_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim.min.json',
    ur_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-muslim.min.json'
  }
];

export const HadithView: React.FC = () => {
  // Navigation states: 'books' | 'chapters' | 'reader'
  const [currentScreen, setCurrentScreen] = useState<'books' | 'chapters' | 'reader'>('books');
  const [selectedBook, setSelectedBook] = useState<HadithBook | null>(null);
  const [chapters, setChapters] = useState<{ [key: string]: any } | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<{ key: string; name: string; from: number; to: number } | null>(null);
  
  // Reader navigation & list loaded state
  const [loading, setLoading] = useState(false);
  const [errorObj, setErrorObj] = useState<string | null>(null);
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);

  // Global cache of books / sections
  const [cacheChapters, setCacheChapters] = useState<{ [key: string]: any }>({});
  const [cachePages, setCachePages] = useState<{ [key: string]: any }>({});

  const handleOpenChapters = (book: HadithBook) => {
    setSelectedBook(book);
    setCurrentScreen('chapters');
    setLoading(true);
    setErrorObj(null);

    if (cacheChapters[book.key]) {
      setChapters(cacheChapters[book.key]);
      setLoading(false);
      return;
    }

    fetch(book.ur_url)
      .then((r) => r.json())
      .then((json) => {
        const sections = json.metadata && json.metadata.sections ? json.metadata.sections : null;
        if (sections && Object.keys(sections).length > 0) {
          setChapters(sections);
          setCacheChapters((prev) => ({ ...prev, [book.key]: sections }));
        } else {
          setErrorObj('ابواب لوڈ کرنے میں ناکامی ہوئی۔ برائے مہربانی اپنا انٹرنیٹ چیک کریں۔');
        }
        setLoading(false);
      })
      .catch(() => {
        setErrorObj('ابواب لوڈ کرنے میں ناکامی ہوئی۔ برائے مہربانی اپنا انٹرنیٹ چیک کریں۔');
        setLoading(false);
      });
  };

  const handleOpenReader = (chapterKey: string, chapterName: string, from: number, to: number) => {
    if (!selectedBook) return;
    setSelectedChapter({ key: chapterKey, name: chapterName, from, to });
    setCurrentScreen('reader');
    setPage(1);
    setLoading(true);
    setErrorObj(null);

    const cacheKey = `${selectedBook.key}_sec_${chapterKey}`;

    const loadChapterData = (dataAr: any, dataUr: any) => {
      const arHadiths = dataAr.hadiths || [];
      const urHadiths = dataUr.hadiths || [];
      const urMap: { [key: string]: string } = {};
      urHadiths.forEach((h: any) => { urMap[h.hadithnumber] = h.text || ''; });

      const parsed = arHadiths.map((h: any) => ({
        num: h.hadithnumber,
        ar: h.text || '',
        ur: urMap[h.hadithnumber] || ''
      }));

      setHadiths(parsed);
      setLoading(false);
    };

    if (cachePages[cacheKey]) {
      const [dataAr, dataUr] = cachePages[cacheKey];
      loadChapterData(dataAr, dataUr);
      return;
    }

    const arEdition = selectedBook.key === 'bukhari' ? 'ara-bukhari' : 'ara-muslim';
    const urEdition = selectedBook.key === 'bukhari' ? 'urd-bukhari' : 'urd-muslim';
    const arSecUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${arEdition}/sections/${chapterKey}.min.json`;
    const urSecUrl = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${urEdition}/sections/${chapterKey}.min.json`;

    Promise.all([
      fetch(arSecUrl).then((r) => r.json()),
      fetch(urSecUrl).then((r) => r.json())
    ])
      .then(([resAr, resUr]) => {
        setCachePages((prev) => ({ ...prev, [cacheKey]: [resAr, resUr] }));
        loadChapterData(resAr, resUr);
      })
      .catch(() => {
        setErrorObj('حدیثِ مبارکہ لوڈ کرنے میں ناکامی ہوئی۔ برائے مہربانی انٹرنیٹ کنکشن چیک کریں۔');
        setLoading(false);
      });
  };

  const totalPages = Math.ceil(hadiths.length / perPage);
  const currentHadiths = hadiths.slice((page - 1) * perPage, page * perPage);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a6b4a]"></div>
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
          onClick={() => {
            if (currentScreen === 'chapters' && selectedBook) handleOpenChapters(selectedBook);
            if (currentScreen === 'reader' && selectedChapter) handleOpenReader(selectedChapter.key, selectedChapter.name, selectedChapter.from, selectedChapter.to);
          }}
          className="py-1.5 px-4 bg-[#1a6b4a] text-white text-xs font-bold rounded-full font-urdu hover:bg-[#134d36] transition-colors flex items-center gap-1.5 shadow"
        >
          <RefreshCw size={12} />
          دوبارہ کوشش کریں
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* 1. Books List screen */}
      {currentScreen === 'books' && (
        <div className="space-y-4 p-4 pb-20">
          <div className="bg-emerald-50 text-emerald-950 p-3.5 text-center space-y-1.5 border border-emerald-100 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold font-amiri leading-normal text-emerald-700">الحديث الشريف</h2>
            <p className="text-[11px] text-slate-750 text-slate-700 font-urdu leading-relaxed">صحیح اور مستند کتبِ احادیث کا عظیم سورس</p>
          </div>

          <div className="space-y-3">
            {HADITH_BOOKS.map((b) => (
              <div
                key={b.key}
                onClick={() => handleOpenChapters(b)}
                className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-pointer group"
              >
                <span className="text-xs text-slate-300 group-hover:text-emerald-700 transition-colors">←</span>
                <div className="text-right flex-1 pr-3">
                  <div className="text-xs font-bold text-slate-800 font-urdu">{b.name}</div>
                  <div className="text-[10px] text-slate-450 text-slate-400 font-urdu mt-0.5">
                    {b.ar} • کل {b.total} احادیث مبارکہ
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-[#1a6b4a] flex items-center justify-center shadow-inner">
                  {b.key === 'bukhari' ? (
                    <BookOpen size={20} className="text-emerald-700" />
                  ) : (
                    <Book size={20} className="text-emerald-700" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Chapters List screen */}
      {currentScreen === 'chapters' && selectedBook && (
        <div className="space-y-3 p-4 pb-20">
          <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setCurrentScreen('books')}
              className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold font-urdu hover:underline"
            >
              <ArrowLeft size={13} className="scale-x-[-1]" />
              پیچھے
            </button>
            <span className="text-xs font-bold text-slate-800 font-urdu">{selectedBook.name} کے ابواب</span>
          </div>

          <div className="space-y-2">
            {chapters &&
              Object.keys(chapters).map((k, i) => {
                const sec = chapters[k];
                const name =
                  typeof sec === 'string'
                    ? sec
                    : sec.urdu || sec.arabic || sec.english || `باب ${i + 1}`;
                const from = sec.hadithnumber_first || sec.hadith_number_first || 0;
                const to = sec.hadithnumber_last || sec.hadith_number_last || 0;
                const range = from && to ? `${from} - ${to}` : '';
 
                return (
                  <div
                    key={k}
                    onClick={() => handleOpenReader(k, name, from, to)}
                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-emerald-300 cursor-pointer transition-all flex items-center justify-between gap-2"
                  >
                    <span className="text-xs text-slate-350 text-slate-300">←</span>
                    <div className="text-right flex-1 pr-1">
                      <div className="text-xs font-bold text-slate-800 font-urdu leading-normal">{name}</div>
                      {range && (
                        <div className="text-[9px] text-emerald-700 font-mono mt-0.5 font-bold" dir="ltr">
                          [{range}]
                        </div>
                      )}
                    </div>
                    <span className="w-6 h-6 rounded bg-emerald-50 text-emerald-800 border border-emerald-150 font-bold text-[10px] flex items-center justify-center font-mono">
                      {i + 1}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 3. Paginated Reader screen */}
      {currentScreen === 'reader' && selectedBook && selectedChapter && (
        <div className="space-y-3 p-4 pb-20">
          <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setCurrentScreen('chapters')}
              className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold font-urdu hover:underline"
            >
              <ArrowLeft size={13} className="scale-x-[-1]" />
              پیچھے
            </button>
            <span className="text-xs font-bold font-urdu text-slate-800 text-right max-w-[200px] truncate">
              {selectedChapter.name}
            </span>
          </div>

          {/* Reader items */}
          <div className="space-y-3">
            {currentHadiths.map((hadith) => (
              <div key={hadith.num} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-right">
                <div className="bg-emerald-50 border-b border-slate-100 p-2 px-3 flex justify-between items-center text-emerald-900 text-[10px] font-bold">
                  <span className="font-mono bg-white text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-lg">{hadith.num}</span>
                  <span className="font-urdu">{selectedBook.name}</span>
                </div>
                <div className="p-3.5 space-y-2 text-right">
                  <p className="text-sm leading-relaxed font-amiri text-slate-800 text-right font-medium" dir="rtl">
                    {hadith.ar}
                  </p>
                  {hadith.ur && (
                    <p className="text-xs text-slate-650 text-slate-650 leading-relaxed font-urdu text-right border-t border-slate-100 pt-2.5" dir="rtl">
                      {hadith.ur}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-2xl shadow-sm">
              <button
                disabled={page >= totalPages}
                onClick={() => {
                  setPage(page + 1);
                  window.scrollTo(0, 0);
                }}
                className="py-1 px-3 text-emerald-750 text-emerald-700 disabled:text-slate-300 font-bold font-urdu text-xs flex items-center hover:underline"
              >
                اگلا
                <ChevronLeft size={13} />
              </button>

              <span className="text-xs font-mono font-bold text-slate-700">
                {page} / {totalPages}
              </span>

              <button
                disabled={page <= 1}
                onClick={() => {
                  setPage(page - 1);
                  window.scrollTo(0, 0);
                }}
                className="py-1 px-3 text-emerald-750 text-emerald-700 disabled:text-slate-300 font-bold font-urdu text-xs flex items-center hover:underline"
              >
                <ChevronRight size={13} />
                پچھلا
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
