
import React, { useState, useEffect, useRef } from 'react';
import { CopyIcon, CheckIcon, WarningIcon, DownloadIcon, SparkleIcon, TranslateIcon } from './Icons';
import { formatTextForWord, translateTextAndFormatForWord } from '../services/geminiService';

interface ResultDisplayProps {
  text: string;
  isLoading: boolean;
  error: string | null;
  hasFiles: boolean;
}

const languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'tr', name: 'Türkçe' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ur', name: 'اردو' },
];

const domains = ['عام', 'ديني', 'قانوني', 'علمي', 'تقني', 'طبي', 'أدبي', 'غير ذلك'];
const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'yi', 'syr'];

const cleanApiResponse = (htmlString: string) => {
    return htmlString.replace(/`{3}(html)?/g, '').trim();
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ text, isLoading, error, hasFiles }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattingError, setFormattingError] = useState<string | null>(null);
  const [formattingStep, setFormattingStep] = useState({ current: 0, total: 0 });
  const [processFootnotes, setProcessFootnotes] = useState(true);
  
  const [isTranslationPanelOpen, setIsTranslationPanelOpen] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translationDomain, setTranslationDomain] = useState('عام');
  const [customDomain, setCustomDomain] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translatedHtml, setTranslatedHtml] = useState<string>('');
  const [translationStep, setTranslationStep] = useState({ current: 0, total: 0 });
  const [processFootnotesForTranslation, setProcessFootnotesForTranslation] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    if (text) {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const triggerDownload = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFormattedDownload = async () => {
    if (!text || isFormatting) return;
    setIsFormatting(true);
    setFormattingError(null);
    setFormattingStep({ current: 0, total: 0 });

    try {
      const formattedHtml = await formatTextForWord(text, processFootnotes, (current, total) => {
          setFormattingStep({ current, total });
      });
      
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `formatted-text-${timestamp}.doc`;
        const fullHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <style>
                    body { font-family: 'Calibri', 'Traditional Arabic', sans-serif; font-size: 14pt; }
                    p { margin: 0 0 10pt 0; text-align: justify; line-height: 1.6; }
                    h1, h2 { color: #2563eb; }
                </style>
            </head>
            <body lang="AR-SA" dir="rtl">
                ${formattedHtml}
            </body>
            </html>`;
        const blob = new Blob([fullHtml], { type: 'application/msword' });
        triggerDownload(filename, blob);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء التنسيق.';
        setFormattingError(message);
    } finally {
        setIsFormatting(false);
    }
  };

  const handleTranslate = async () => {
    if (!text || isTranslating) return;
    setIsTranslating(true);
    setTranslationError(null);
    setTranslatedHtml('');
    setTranslationStep({ current: 0, total: 0 });

    const finalDomain = translationDomain === 'غير ذلك' ? customDomain : translationDomain;

    try {
        const cleanedHtml = await translateTextAndFormatForWord(
            text, 
            targetLanguage, 
            finalDomain, 
            processFootnotesForTranslation,
            (current, total) => setTranslationStep({ current, total })
        );
        setTranslatedHtml(cleanedHtml);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
        setTranslationError(message);
    } finally {
        setIsTranslating(false);
    }
  };
  
  const handleTranslatedDownload = () => {
      if (!translatedHtml) return;
      const isRtl = rtlLanguages.includes(targetLanguage);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `translated-document-${timestamp}.doc`;
      const fullHtml = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
              <meta charset='utf-8'>
              <style>
                  body { font-family: Calibri, 'Times New Roman', serif; font-size: 12pt; }
                  p { text-align: justify; margin-bottom: 10pt; line-height: 1.5; }
              </style>
          </head>
          <body lang="${targetLanguage}" dir="${isRtl ? 'rtl' : 'ltr'}">
              ${translatedHtml}
          </body>
          </html>`;
      const blob = new Blob([fullHtml], { type: 'application/msword' });
      triggerDownload(filename, blob);
  };

  const handleDownload = (format: 'txt' | 'doc' | 'pdf') => {
    setIsDropdownOpen(false);
    if (!text) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `extracted-text-${timestamp}`;

    if (format === 'txt') {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        triggerDownload(`${filename}.txt`, blob);
    } else if (format === 'doc') {
        const content = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body lang="AR-SA" dir="rtl" style="font-family: Calibri, sans-serif;">${text.replace(/\n/g, '<br />')}</body></html>`;
        const blob = new Blob([content], { type: 'application/msword' });
        triggerDownload(`${filename}.doc`, blob);
    } else if (format === 'pdf') {
        window.print();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 w-full p-4">
          <p className="text-blue-600 dark:text-blue-400 font-black text-center animate-pulse">
            ( لحظات الانتظار .. املأها بالاستغفار )
          </p>
          <div className="space-y-3 w-full">
            <div className="h-4 bg-slate-300/50 dark:bg-slate-700/50 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-slate-300/50 dark:bg-slate-700/50 rounded w-full"></div>
            <div className="h-4 bg-slate-300/50 dark:bg-slate-700/50 rounded w-5/6 mx-auto"></div>
          </div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center text-center text-red-500 p-4">
          <WarningIcon className="w-12 h-12 mb-4"/>
          <p className="font-semibold text-lg">خطأ في استخراج النص</p>
          <p className="text-sm">{error}</p>
        </div>
      );
    }
    if (text) {
      return (
        <textarea
          readOnly
          value={text}
          className="w-full h-full bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none resize-none p-4"
          aria-label="النص المستخرج"
        />
      );
    }
    if (!hasFiles) {
        return <p className="text-center text-slate-500 dark:text-slate-400 p-4 font-medium">الرجاء تحميل ملف أو أكثر لبدء استخراج النص.</p>
    }
    return <p className="text-center text-slate-500 dark:text-slate-400 p-4 font-medium">انقر فوق "استخراج النص" لعرض النتائج هنا.</p>;
  };

  return (
    <div className="glass-card p-6 rounded-3xl shadow-2xl shadow-slate-300/20 dark:shadow-black/20 relative flex flex-col h-full min-h-[500px]">
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-300/50 dark:border-slate-700/50">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">النص المستخرج</h2>
        {text && !error && (
            <div className="flex items-center gap-2">
                <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 bg-slate-500/10 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-500/20 dark:hover:bg-slate-600 disabled:opacity-50" disabled={isLoading || isFormatting || isTranslating} aria-label={isCopied ? "تم النسخ" : "نسخ النص"}>
                    {isCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                    <span>{isCopied ? 'تم النسخ' : 'نسخ'}</span>
                </button>
                <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setIsDropdownOpen(prev => !prev)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 bg-blue-500/10 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 hover:bg-blue-500/20 dark:hover:bg-blue-800/50" aria-haspopup="true" aria-expanded={isDropdownOpen} disabled={isFormatting || isTranslating}>
                        <DownloadIcon className="w-4 h-4" />
                        <span>تنزيل</span>
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute end-0 mt-2 w-56 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                            <div className="py-1" role="menu" aria-orientation="vertical">
                                <a href="#" onClick={(e) => { e.preventDefault(); handleDownload('txt'); }} className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-500/10 dark:hover:bg-slate-700/50 text-right w-full" role="menuitem">ملف نصي (TXT)</a>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleDownload('doc'); }} className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-500/10 dark:hover:bg-slate-700/50 text-right w-full" role="menuitem">مستند Word (DOC)</a>
                            </div>
                        </div>
                    )}
                </div>
          </div>
        )}
      </div>
      <div className="flex-grow flex items-center justify-center bg-slate-200/30 dark:bg-slate-800/30 rounded-lg overflow-hidden min-h-[200px]">
        {renderContent()}
      </div>

      {text && !error && (
        <div className="mt-4 space-y-4">
            <div className="pt-4 border-t border-slate-300/50 dark:border-slate-700/50">
                <div className="flex items-center justify-end mb-3">
                    <label htmlFor="processFootnotes" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer font-bold">
                        <input 
                            type="checkbox" 
                            id="processFootnotes" 
                            checked={processFootnotes} 
                            onChange={(e) => setProcessFootnotes(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span>معالجة وتجميع الحواشي بدقة</span>
                    </label>
                </div>
              {isFormatting ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <div className="flex justify-between items-center mb-1 text-sm font-black text-blue-600 dark:text-blue-400">
                        <span>جاري معالجة الجزء {formattingStep.current} من {formattingStep.total}...</span>
                        <span>{Math.round((formattingStep.current / formattingStep.total) * 100)}%</span>
                    </div>
                    <p className="text-[10px] text-center font-black text-blue-500 mb-2 animate-pulse">
                      ( لحظات الانتظار .. املأها بالاستغفار )
                    </p>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${(formattingStep.current / formattingStep.total) * 100}%` }}></div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 text-center font-bold italic">نحن نقسم النص الطويل لضمان عدم ضياع أي صفحة أثناء التنسيق.</p>
                </div>
              ) : (
                <button onClick={handleFormattedDownload} disabled={isFormatting || isTranslating} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg py-4 px-4 rounded-xl shadow-lg hover:scale-[1.01] transition-all">
                    <SparkleIcon className="w-5 h-5" />
                    <span>تنسيق كامل النص وتحميل Word</span>
                </button>
              )}
            </div>
            {formattingError && <div className="flex items-center gap-2 text-sm text-red-500 font-semibold" role="alert"><WarningIcon className="w-5 h-5" /><span>خطأ في التنسيق: {formattingError}</span></div>}

            <div className="pt-4 border-t border-slate-300/50 dark:border-slate-700/50">
                <button onClick={() => setIsTranslationPanelOpen(p => !p)} className="w-full flex justify-between items-center text-left font-black text-slate-700 dark:text-slate-200">
                    <span className="flex items-center gap-3"><TranslateIcon className="w-5 h-5 text-green-500" />ترجمة احترافية لكامل الكتاب</span>
                    <svg className={`w-5 h-5 transition-transform ${isTranslationPanelOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {isTranslationPanelOpen && (
                    <div className="mt-4 space-y-4 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">اللغة المستهدفة</label>
                                <select value={targetLanguage} onChange={e => setTargetLanguage(e.target.value)} className="w-full p-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 font-bold">
                                    {languages.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">طبيعة النص</label>
                                <select value={translationDomain} onChange={e => setTranslationDomain(e.target.value)} className="w-full p-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-900/50 font-bold">
                                    {domains.map(dom => <option key={dom} value={dom}>{dom}</option>)}
                                </select>
                            </div>
                        </div>
                        {!isTranslating && !translatedHtml && (
                            <button onClick={handleTranslate} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black py-4 px-4 rounded-xl shadow-lg hover:scale-[1.01] transition-all">
                                <TranslateIcon className="w-5 h-5" />
                                <span>بدء ترجمة جميع الأجزاء وتنسيقها</span>
                            </button>
                        )}
                    </div>
                )}
                
                {isTranslating && (
                    <div className="text-center mt-4 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                        <div className="flex justify-between items-center mb-1 text-sm font-black text-emerald-700 dark:text-emerald-400">
                            <span>جاري ترجمة المقطع {translationStep.current} من {translationStep.total}...</span>
                            <span>{Math.round((translationStep.current / translationStep.total) * 100)}%</span>
                        </div>
                        <p className="text-[10px] text-center font-black text-emerald-600 mb-2 animate-pulse">
                          ( لحظات الانتظار .. املأها بالاستغفار )
                        </p>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div className="bg-gradient-to-r from-emerald-500 to-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${(translationStep.current / translationStep.total) * 100}%` }}></div>
                        </div>
                    </div>
                )}
                {translationError && <div className="mt-4 flex items-center gap-2 text-sm text-red-500 font-semibold" role="alert"><WarningIcon className="w-5 h-5" /><span>خطأ في الترجمة: {translationError}</span></div>}
                {translatedHtml && !isTranslating && (
                    <div className="mt-4 p-5 bg-green-500/10 dark:bg-green-900/30 rounded-xl text-center border-2 border-green-500/20">
                        <h3 className="font-black text-green-800 dark:text-green-300 text-xl">اكتملت ترجمة وتنسيق كامل المستند!</h3>
                        <button onClick={handleTranslatedDownload} className="mt-4 w-full flex items-center justify-center gap-3 bg-green-600 text-white font-black py-3 px-4 rounded-lg shadow-md hover:bg-green-700 transition-all">
                            <DownloadIcon className="w-6 h-6" />
                            <span>تنزيل الكتاب المترجم (Word)</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
