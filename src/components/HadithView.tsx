import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, Scroll, Book, BookOpen } from 'lucide-react';
import { HadithBook, Hadith } from '../types';

const BookIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="2" fill="#d1fae5" stroke="#059669" strokeWidth="1.5"/>
    <line x1="8" y1="3" x2="8" y2="21" stroke="#059669" strokeWidth="1.5"/>
    <line x1="11" y1="7" x2="19" y2="7" stroke="#059669" strokeWidth="1" strokeLinecap="round"/>
    <line x1="11" y1="10" x2="19" y2="10" stroke="#059669" strokeWidth="1" strokeLinecap="round"/>
    <line x1="11" y1="13" x2="19" y2="13" stroke="#059669" strokeWidth="1" strokeLinecap="round"/>
    <line x1="11" y1="16" x2="16" y2="16" stroke="#059669" strokeWidth="1" strokeLinecap="round"/>
    <path d="M5 3 L5 10 L6.5 8.5 L8 10 L8 3" fill="#059669"/>
  </svg>
);

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#d97706" stroke="#d97706" strokeWidth="1"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-slate-400 shrink-0">
    <circle cx="11" cy="11" r="8" stroke="#94a3b8" strokeWidth="2"/>
    <path d="M21 21l-4.35-4.35" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const HADITH_BOOKS: HadithBook[] = [
  {
    key: 'bukhari',
    name: 'صحیح بخاری',
    ar: 'صحيح البخاري',
    total: 7563,
    icon: '',
    ar_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari.min.json',
    ur_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-bukhari.min.json'
  },
  {
    key: 'muslim',
    name: 'صحیح مسلم',
    ar: 'صحيح مسلم',
    total: 3033,
    icon: '',
    ar_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim.min.json',
    ur_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-muslim.min.json'
  },
  {
    key: 'abudawud',
    name: 'سنن ابو داود',
    ar: 'سنن أبي داود',
    total: 5274,
    icon: '',
    ar_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-abudawud.min.json',
    ur_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-abudawud.min.json'
  },
  {
    key: 'tirmidhi',
    name: 'جامع ترمذی',
    ar: 'جامع الترمذي',
    total: 3956,
    icon: '',
    ar_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-tirmidhi.min.json',
    ur_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-tirmidhi.min.json'
  },
  {
    key: 'nasai',
    name: 'سنن نسائی',
    ar: 'سنن النسائي',
    total: 5758,
    icon: '',
    ar_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-nasai.min.json',
    ur_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-nasai.min.json'
  },
  {
    key: 'ibnmajah',
    name: 'سنن ابن ماجہ',
    ar: 'سنن ابن ماجه',
    total: 4341,
    icon: '',
    ar_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-ibnmajah.min.json',
    ur_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-ibnmajah.min.json'
  },
  {
    key: 'malik',
    name: 'موطا امام مالک',
    ar: 'موطأ مالك',
    total: 1857,
    icon: '',
    ar_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-malik.min.json',
    ur_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-malik.min.json'
  },
  {
    key: 'riyadussalihin',
    name: 'ریاض الصالحین',
    ar: 'رياض الصالحين',
    total: 1896,
    icon: '',
    ar_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-riyadussalihin.min.json',
    ur_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-riyadussalihin.min.json'
  },
  {
    key: 'adab',
    name: 'الادب المفرد',
    ar: 'الأدب المفرد',
    total: 1322,
    icon: '',
    ar_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-adab.min.json',
    ur_url: 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-adab.min.json'
  }
];

export const HadithView: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'books' | 'chapters' | 'reader'>('books');
  const [selectedBook, setSelectedBook] = useState<HadithBook | null>(null);
  const [chapters, setChapters] = useState<{ [key: string]: any } | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<{ key: string; name: string; from: number; to: number } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [errorObj, setErrorObj] = useState<string | null>(null);
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Hadith | null | 'not-found'>(null);
  const [savedHadithsState, setSavedHadithsState] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('user_saved_hadiths') || '[]'); } catch { return []; }
  });

  const [lastSeen, setLastSeen] = useState<{ bookKey: string; bookName: string; chapterKey: string; chapterName: string; from: number; to: number; hadithNum: number } | null>(() => {
    try { return JSON.parse(localStorage.getItem('last_seen_hadith') || 'null'); } catch { return null; }
  });

  const [cacheChapters, setCacheChapters] = useState<{ [key: string]: any }>({});
  const [cachePages, setCachePages] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    setTotalPages(Math.ceil(hadiths.length / perPage));
  }, [hadiths, perPage]);

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        setSavedHadithsState(JSON.parse(localStorage.getItem('user_saved_hadiths') || '[]'));
      } catch {}
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleOpenChapters = (book: HadithBook) => {
    setSelectedBook(book);
    setCurrentScreen('chapters');
    setLoading(true);
    setErrorObj(null);
    setSearchQuery('');
    setSearchResult(null);

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

  const handleOpenReader = (chapterKey: string, chapterName: string, from: number, to: number, bookOverride?: HadithBook) => {
    const book = bookOverride || selectedBook;
    if (!book) return;
    if (bookOverride) setSelectedBook(bookOverride);
    setSelectedChapter({ key: chapterKey, name: chapterName, from, to });
    setCurrentScreen('reader');
    setPage(1);
    setLoading(true);
    setErrorObj(null);
    setSearchQuery('');
    setSearchResult(null);

    const cacheKey = `${book.key}_sec_${chapterKey}`;

    const loadChapterData = (dataAr: any, dataUr: any) => {
      const arHadiths = dataAr.hadiths || [];
      const urHadiths = dataUr.hadiths || [];
      const urMap: { [key: string]: string } = {};
      urHadiths.forEach((h: any) => { urMap[h.hadithnumber] = h.text || ''; });

      const parsed = arHadiths.map((h: any) => ({
        num: h.hadithnumber,
        ar: h.text || '',
        ur: urMap[h.hadithnumber] || '',
        grades: h.grades || []
      }));

      setHadiths(parsed);
      setLoading(false);
    };

    if (cachePages[cacheKey]) {
      const [dataAr, dataUr] = cachePages[cacheKey];
      loadChapterData(dataAr, dataUr);
      return;
    }

    const arEdition = `ara-${book.key}`;
    const urEdition = `urd-${book.key}`;
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

  const handleSearchHadith = () => {
    const num = parseInt(searchQuery.trim(), 10);
    if (isNaN(num)) { setSearchResult('not-found'); return; }
    const found = hadiths.find(h => h.num === num);
    if (found) {
      setSearchResult(found);
      const idx = hadiths.indexOf(found);
      const targetPage = Math.ceil((idx + 1) / perPage);
      setPage(targetPage);
    } else {
      setSearchResult('not-found');
    }
  };

  const handleSaveHadith = (e: React.MouseEvent, hadith: Hadith) => {
    e.stopPropagation();
    if (!selectedBook) return;
    try {
      const list = JSON.parse(localStorage.getItem('user_saved_hadiths') || '[]');
      const isSaved = list.some((h: any) => h.num === hadith.num && h.book === selectedBook.key);
      
      let updated;
      if (isSaved) {
        updated = list.filter((h: any) => !(h.num === hadith.num && h.book === selectedBook.key));
      } else {
        updated = [...list, { num: hadith.num, book: selectedBook.key, bookName: selectedBook.name, ar: hadith.ar, ur: hadith.ur }];
      }
      
      localStorage.setItem('user_saved_hadiths', JSON.stringify(updated));
      setSavedHadithsState(updated);
      window.dispatchEvent(new Event('storage'));
    } catch {}
  };

  const handleSaveLastSeen = (hadithNum: number) => {
    if (!selectedBook || !selectedChapter) return;
    const data = { bookKey: selectedBook.key, bookName: selectedBook.name, chapterKey: selectedChapter.key, chapterName: selectedChapter.name, from: selectedChapter.from, to: selectedChapter.to, hadithNum };
    setLastSeen(data);
    localStorage.setItem('last_seen_hadith', JSON.stringify(data));
  };

  const handleGoToLastSeen = () => {
    if (!lastSeen) return;
    const book = HADITH_BOOKS.find(b => b.key === lastSeen.bookKey);
    if (!book) return;
    handleOpenReader(lastSeen.chapterKey, lastSeen.chapterName, lastSeen.from, lastSeen.to, book);
  };

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
      {/* Books List screen */}
      {currentScreen === 'books' && (
        <div className="space-y-4 p-4 pb-20">
          <div className="bg-emerald-50 text-emerald-950 p-3.5 text-center space-y-1.5 border border-emerald-100 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold font-amiri leading-normal text-emerald-700">الحديث الشريف</h2>
            <p className="text-[11px] text-slate-700 font-urdu leading-relaxed">صحیح اور مستند کتبِ احادیث کا عظیم سورس</p>
          </div>

          {lastSeen && (
            <button
              onClick={handleGoToLastSeen}
              className="w-full flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 shadow-sm hover:bg-amber-100 transition-all"
            >
              <span className="text-amber-600 text-[11px] font-bold font-urdu">جاری رکھیں</span>
              <div className="text-right">
                <p className="text-amber-800 font-urdu text-xs font-bold">{lastSeen.bookName}</p>
                <p className="text-amber-600 font-mono text-[10px]">آخری دیکھی حدیث: #{lastSeen.hadithNum}</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
                <StarIcon />
              </div>
            </button>
          )}

          <div className="space-y-3">
            {HADITH_BOOKS.map((b) => (
              <div
                key={b.key}
                onClick={() => handleOpenChapters(b)}
                className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:bg-emerald-50 hover:border-emerald-200 transition-all cursor-pointer group"
              >
                <span className="text-xs text-slate-300 group-hover:text-emerald-700 transition-colors"></span>
                <div className="text-right flex-1 pr-3">
                  <div className="text-xs font-bold text-slate-800 font-urdu">{b.name}</div>
                  <div className="text-[10px] text-slate-400 font-urdu mt-0.5">
                    {b.ar} | کل {b.total} احادیث مبارکہ
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-inner">
                  <BookIcon />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chapters List screen */}
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
                    <span className="text-xs text-slate-300"></span>
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

      {/* Paginated Reader screen */}
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

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
            <button
              onClick={handleSearchHadith}
              className="bg-emerald-700 text-white text-[10px] font-bold font-urdu px-3 py-1.5 rounded-lg hover:bg-emerald-800 transition-all whitespace-nowrap"
            >
              تلاش
            </button>
            <input
              type="number"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchResult(null); }}
              onKeyDown={e => e.key === 'Enter' && handleSearchHadith()}
              placeholder="حدیث نمبر... مثلاً 123"
              dir="rtl"
              className="flex-1 text-xs font-urdu text-right bg-transparent outline-none text-slate-700 placeholder:text-slate-300"
            />
            <SearchIcon />
          </div>
          
          {searchResult === 'not-found' && (
            <p className="text-center text-red-500 font-urdu text-[11px]">یہ حدیث نمبر اس باب میں نہیں ملی</p>
          )}
          {searchResult && searchResult !== 'not-found' && (
            <p className="text-center text-emerald-700 font-urdu text-[11px]">حدیث نمبر {searchResult.num} مل گئی، صفحہ {page} پر دیکھیں</p>
          )}

          <div className="space-y-3">
            {currentHadiths.map((hadith) => {
              const isSaved = savedHadithsState.some((h: any) => h.num === hadith.num && h.book === selectedBook.key);
              const isLastSeen = lastSeen?.hadithNum === hadith.num && lastSeen?.bookKey === selectedBook.key;

              return (
                <div key={hadith.num} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-right">
                  <div className="bg-emerald-50 border-b border-slate-100 p-2 px-3 flex justify-between items-center text-emerald-900 text-[10px] font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono bg-white text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-lg">{hadith.num}</span>
                      
                      {hadith.grades && hadith.grades.length > 0 && (() => {
                        const g = hadith.grades[0].grade?.toLowerCase() || '';
                        const isSahih = g.includes('sahih') || g.includes('صحيح');
                        const isDaif = g.includes('da') || g.includes('weak') || g.includes('ضعيف');
                        const isHasan = g.includes('hasan') || g.includes('حسن');
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            isSahih ? 'bg-green-50 text-green-700 border-green-200' :
                            isHasan ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            isDaif  ? 'bg-red-50 text-red-600 border-red-200' :
                                      'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {isSahih ? 'صحیح' : isHasan ? 'حسن' : isDaif ? 'ضعیف' : hadith.grades[0].grade}
                          </span>
                        );
                      })()}
                      
                      <button
                        onClick={(e) => handleSaveHadith(e, hadith)}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all ${
                          isSaved
                            ? 'bg-red-50 border-red-200 text-red-500'
                            : 'bg-white border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-400'
                        }`}
                      >
                        {isSaved ? 'محفوظ' : 'محفوظ کریں'}
                      </button>
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSaveLastSeen(hadith.num); }}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all ${
                          isLastSeen
                            ? 'bg-amber-50 border-amber-300 text-amber-600'
                            : 'bg-white border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-500'
                        }`}
                        title="آخری سین محفوظ کریں"
                      >
                        {isLastSeen ? 'آخری سین' : 'آخری سین'}
                      </button>
                    </div>
                    <span className="font-urdu">{selectedBook.name}</span>
                  </div>
                  <div className="p-3.5 space-y-2 text-right">
                    <p className="text-sm leading-relaxed font-amiri text-slate-800 text-right font-bold" dir="rtl">
                      {hadith.ar}
                    </p>
                    {hadith.ur && (
                      <p className="text-xs text-emerald-700 leading-relaxed font-urdu text-right border-t border-slate-100 pt-2.5 font-bold" dir="rtl">
                        {hadith.ur}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-2xl shadow-sm">
              <button
                disabled={page >= totalPages}
                onClick={() => {
                  setPage(page + 1);
                  window.scrollTo(0, 0);
                }}
                className="py-1 px-3 text-emerald-700 disabled:text-slate-300 font-bold font-urdu text-xs flex items-center hover:underline"
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
                className="py-1 px-3 text-emerald-700 disabled:text-slate-300 font-bold font-urdu text-xs flex items-center hover:underline"
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
