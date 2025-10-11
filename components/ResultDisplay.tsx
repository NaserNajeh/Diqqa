import React, { useState, useEffect, useRef } from 'react';
import { CopyIcon, CheckIcon, WarningIcon, DownloadIcon, SparkleIcon, Spinner, TranslateIcon } from './Icons';
import { formatTextForWord, translateTextAndFormatForWord } from '../services/geminiService';

interface ResultDisplayProps {
  text: string;
  isLoading: boolean;
  error: string | null;
  hasFiles: boolean;
  apiKey: string | null;
  openApiKeyModal: () => void;
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

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ text, isLoading, error, hasFiles, apiKey, openApiKeyModal }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattingError, setFormattingError] = useState<string | null>(null);
  const [formattingProgress, setFormattingProgress] = useState(0);
  const [showLongWaitMessage, setShowLongWaitMessage] = useState(false);
  
  const [isTranslationPanelOpen, setIsTranslationPanelOpen] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translationDomain, setTranslationDomain] = useState('عام');
  const [customDomain, setCustomDomain] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translatedHtml, setTranslatedHtml] = useState<string>('');
  const [translationProgress, setTranslationProgress] = useState(0);
  const [showLongTranslationWaitMessage, setShowLongTranslationWaitMessage] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const longWaitTimerRef = useRef<number | null>(null);
  const translationProgressIntervalRef = useRef<number | null>(null);
  const longTranslationWaitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        if (longWaitTimerRef.current) clearTimeout(longWaitTimerRef.current);
        if (translationProgressIntervalRef.current) clearInterval(translationProgressIntervalRef.current);
        if (longTranslationWaitTimerRef.current) clearTimeout(longTranslationWaitTimerRef.current);
    };
  }, []);


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

  const startProgressSimulation = (
      setProgress: React.Dispatch<React.SetStateAction<number>>,
      setShowWaitMessage: React.Dispatch<React.SetStateAction<boolean>>,
      intervalRef: React.MutableRefObject<number | null>,
      timerRef: React.MutableRefObject<number | null>
  ) => {
      setProgress(0);
      setShowWaitMessage(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      
      intervalRef.current = window.setInterval(() => {
          setProgress(prev => {
              if (prev >= 90) {
                  if (intervalRef.current) clearInterval(intervalRef.current);
                  return 90;
              }
              const increment = prev < 60 ? 10 : 3;
              return prev + increment;
          });
      }, 400);

      timerRef.current = window.setTimeout(() => {
          setShowWaitMessage(true);
          setProgress(95);
      }, 15000);
  };

  const stopProgressSimulation = (
    setProgress: React.Dispatch<React.SetStateAction<number>>,
    setShowWaitMessage: React.Dispatch<React.SetStateAction<boolean>>,
    intervalRef: React.MutableRefObject<number | null>,
    timerRef: React.MutableRefObject<number | null>,
    isSuccess: boolean
  ) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (isSuccess) {
        setProgress(100);
        setShowWaitMessage(false);
      }
  };

  const handleFormattedDownload = async () => {
    if (!text || isFormatting) return;
    if (!apiKey) {
      openApiKeyModal();
      return;
    }
    setIsFormatting(true);
    setFormattingError(null);
    startProgressSimulation(setFormattingProgress, setShowLongWaitMessage, progressIntervalRef, longWaitTimerRef);

    try {
      const rawFormattedHtml = await formatTextForWord(apiKey, text);
      const formattedHtml = cleanApiResponse(rawFormattedHtml);
      stopProgressSimulation(setFormattingProgress, setShowLongWaitMessage, progressIntervalRef, longWaitTimerRef, true);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `formatted-text-${timestamp}.doc`;
        const fullHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'><title>Formatted Text</title>
                <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/><w:UpdateFields>true</w:UpdateFields></w:WordDocument></xml><![endif]-->
                <style>
                    @page Section1 { size: 8.27in 11.69in; margin: 1in 1in 1in 1in; mso-header-margin: .5in; mso-footer-margin: .5in; mso-footer: f1; mso-paper-source:0; }
                    div.Section1 { page: Section1; }
                    p.MsoFooter { text-align: left; margin-bottom: 0; }
                    body { font-family: 'Calibri', sans-serif; font-size: 14pt; }
                    p { font-size: 14pt; margin: 0 0 10pt 0; text-align: justify; }
                    h1 { font-size: 18pt; font-weight: bold; }
                    h2 { font-size: 16pt; font-weight: bold; }
                    sup { vertical-align: super; font-size: smaller; }
                    .endnotes { margin-top: 40px; padding-top: 20px; border-top: 1px solid #aaaaaa; }
                    .endnotes h2 { font-size: 16pt; }
                    .endnotes ol { padding-right: 20px; font-size: 12pt; }
                </style>
            </head>
            <body lang="AR-SA" dir="rtl">
                <div class="Section1">
                    ${formattedHtml}
                    <div style='mso-element:footer' id="f1"><p class="MsoFooter" align="left" style="text-align:left"><span dir="ltr"><span style='mso-field-code:"PAGE"'></span></span></p></div>
                </div>
            </body>
            </html>`;
        const blob = new Blob([fullHtml], { type: 'application/msword' });
        triggerDownload(filename, blob);
        setTimeout(() => setIsFormatting(false), 1500);
    } catch (err) {
        stopProgressSimulation(setFormattingProgress, setShowLongWaitMessage, progressIntervalRef, longWaitTimerRef, false);
        const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء التنسيق.';
        setFormattingError(message);
        setIsFormatting(false);
    }
  };

  const handleTranslate = async () => {
    if (!text || isTranslating) return;
    if (!apiKey) {
      openApiKeyModal();
      return;
    }
    setIsTranslating(true);
    setTranslationError(null);
    setTranslatedHtml('');
    startProgressSimulation(setTranslationProgress, setShowLongTranslationWaitMessage, translationProgressIntervalRef, longTranslationWaitTimerRef);

    const finalDomain = translationDomain === 'غير ذلك' ? customDomain : translationDomain;
    if (!finalDomain) {
        setTranslationError('يرجى تحديد مجال الترجمة.');
        setIsTranslating(false);
        return;
    }

    try {
        const rawHtml = await translateTextAndFormatForWord(apiKey, text, targetLanguage, finalDomain);
        const cleanedHtml = cleanApiResponse(rawHtml);
        setTranslatedHtml(cleanedHtml);
        stopProgressSimulation(setTranslationProgress, setShowLongTranslationWaitMessage, translationProgressIntervalRef, longTranslationWaitTimerRef, true);
        setTimeout(() => setIsTranslating(false), 500);
    } catch (err) {
        stopProgressSimulation(setTranslationProgress, setShowLongTranslationWaitMessage, translationProgressIntervalRef, longTranslationWaitTimerRef, false);
        const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
        setTranslationError(message);
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
              <meta charset='utf-8'><title>Translated Document</title>
              <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/><w:UpdateFields>true</w:UpdateFields></w:WordDocument></xml><![endif]-->
              <style>
                  @page Section1 { size: 8.27in 11.69in; margin: 1in 1in 1in 1in; mso-header-margin: .5in; mso-footer-margin: .5in; mso-footer: f1; mso-paper-source:0; }
                  div.Section1 { page: Section1; }
                  p.MsoFooter { text-align: ${isRtl ? 'right' : 'left'}; margin-bottom: 0; }
                  body { font-family: Calibri, 'Times New Roman', serif; font-size: 12pt; }
                  p { font-size: 12pt; margin: 0 0 10pt 0; text-align: justify; }
                  h1 { font-size: 16pt; font-weight: bold; }
                  h2 { font-size: 14pt; font-weight: bold; }
                  sup { vertical-align: super; font-size: smaller; }
                  .endnotes { margin-top: 40px; padding-top: 20px; border-top: 1px solid #aaaaaa; }
                  .endnotes h2 { font-size: 14pt; }
                  .endnotes ol { ${isRtl ? 'padding-right: 20px;' : 'padding-left: 20px;'} font-size: 10pt; }
              </style>
          </head>
          <body lang="${targetLanguage}" dir="${isRtl ? 'rtl' : 'ltr'}">
              <div class="Section1">
                  ${translatedHtml}
                  <div style='mso-element:footer' id="f1"><p class="MsoFooter" align="${isRtl ? 'right' : 'left'}" style="text-align:${isRtl ? 'right' : 'left'}"><span dir="ltr"><span style='mso-field-code:"PAGE"'></span></span></p></div>
              </div>
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
        const content = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export</title></head><body lang="AR-SA" dir="rtl" style="font-family: Calibri, sans-serif;">${text.replace(/\n/g, '<br />')}</body></html>`;
        const blob = new Blob([content], { type: 'application/msword' });
        triggerDownload(`${filename}.doc`, blob);
    } else if (format === 'pdf') {
        const iframe = document.createElement('iframe');
        iframe.style.visibility = 'hidden';
        iframe.style.position = 'absolute';
        document.body.appendChild(iframe);
        const content = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>النص المستخرج</title><style>@media print { @page { size: A4; margin: 2cm; } } body { font-family: 'DejaVu Sans', Arial, sans-serif; white-space: pre-wrap; word-wrap: break-word; } pre { margin: 0; font-family: inherit; font-size: 12pt; }</style></head><body><pre>${text}</pre></body></html>`;
        const iframeDoc = iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(content);
          iframeDoc.close();
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
    }
  };


  useEffect(() => {
    if (!text) {
        setIsCopied(false);
        setFormattingError(null);
        setTranslatedHtml('');
        setTranslationError(null);
        setIsTranslationPanelOpen(false);
    }
  }, [text]);
  
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
        <div className="space-y-3 animate-pulse w-full p-4">
          <div className="h-4 bg-slate-300/50 dark:bg-slate-700/50 rounded w-3/4"></div>
          <div className="h-4 bg-slate-300/50 dark:bg-slate-700/50 rounded w-full"></div>
          <div className="h-4 bg-slate-300/50 dark:bg-slate-700/50 rounded w-5/6"></div>
           <div className="h-4 bg-slate-300/50 dark:bg-slate-700/50 rounded w-1/2"></div>
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
                                <a href="#" onClick={(e) => { e.preventDefault(); handleDownload('pdf'); }} className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-500/10 dark:hover:bg-slate-700/50 text-right w-full" role="menuitem">ملف PDF</a>
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
              {isFormatting ? (
                <div className="text-center">
                    <div className="flex justify-between items-center mb-1 text-sm font-medium text-slate-600 dark:text-slate-300"><span>جاري التنسيق الاحترافي...</span><span>{formattingProgress}%</span></div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700"><div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2.5 rounded-full transition-all duration-300" style={{ width: `${formattingProgress}%` }}></div></div>
                    {showLongWaitMessage && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 animate-pulse">التنسيق يتطلب وقتاً إضافياً، نرجو الانتظار قليلاً...</p>}
                </div>
              ) : (
                <button onClick={handleFormattedDownload} disabled={isFormatting || isTranslating} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-300 disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed">
                    <SparkleIcon className="w-5 h-5" />
                    <span>تنزيل مستند Word منسق</span>
                </button>
              )}
            </div>
            {formattingError && <div className="flex items-center gap-2 text-sm text-red-500 font-semibold" role="alert"><WarningIcon className="w-5 h-5" /><span>خطأ في التنسيق: {formattingError}</span></div>}

            <div className="pt-4 border-t border-slate-300/50 dark:border-slate-700/50">
                <button onClick={() => setIsTranslationPanelOpen(p => !p)} className="w-full flex justify-between items-center text-left font-semibold text-slate-700 dark:text-slate-200">
                    <span className="flex items-center gap-3"><TranslateIcon className="w-5 h-5 text-green-500" />ترجمة احترافية وتنسيق</span>
                    <svg className={`w-5 h-5 transition-transform ${isTranslationPanelOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {isTranslationPanelOpen && (
                    <div className="mt-4 space-y-4 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="target-language" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الترجمة إلى</label>
                                <select id="target-language" value={targetLanguage} onChange={e => setTargetLanguage(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 focus:ring-blue-500 focus:border-blue-500">
                                    {languages.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="translation-domain" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">مجال النص</label>
                                <select id="translation-domain" value={translationDomain} onChange={e => setTranslationDomain(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 focus:ring-blue-500 focus:border-blue-500">
                                    {domains.map(dom => <option key={dom} value={dom}>{dom}</option>)}
                                </select>
                            </div>
                        </div>
                        {translationDomain === 'غير ذلك' && (
                            <div>
                                <label htmlFor="custom-domain" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تحديد المجال المناسب</label>
                                <input type="text" id="custom-domain" value={customDomain} onChange={e => setCustomDomain(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 focus:ring-blue-500 focus:border-blue-500" placeholder="مثال: تاريخي، اقتصادي..." />
                            </div>
                        )}
                        {!isTranslating && !translatedHtml && (
                            <button onClick={handleTranslate} disabled={isTranslating || (translationDomain === 'غير ذلك' && !customDomain)} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transform hover:-translate-y-0.5 transition-all duration-300 disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed">
                                <TranslateIcon className="w-5 h-5" />
                                <span>ترجمة وتنسيق</span>
                            </button>
                        )}
                    </div>
                )}
                
                {isTranslating && (
                    <div className="text-center mt-4">
                        <div className="flex justify-between items-center mb-1 text-sm font-medium text-slate-600 dark:text-slate-300"><span>جاري الترجمة والتنسيق...</span><span>{translationProgress}%</span></div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700"><div className="bg-gradient-to-r from-green-500 to-emerald-400 h-2.5 rounded-full transition-all duration-300" style={{ width: `${translationProgress}%` }}></div></div>
                        {showLongTranslationWaitMessage && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 animate-pulse">العملية معقدة وتتطلب وقتاً إضافياً، نرجو الانتظار...</p>}
                    </div>
                )}
                {translationError && <div className="mt-4 flex items-center gap-2 text-sm text-red-500 font-semibold" role="alert"><WarningIcon className="w-5 h-5" /><span>خطأ في الترجمة: {translationError}</span></div>}
                {translatedHtml && !isTranslating && (
                    <div className="mt-4 p-4 bg-green-500/10 dark:bg-green-900/30 rounded-lg text-center animate-fade-in">
                        <h3 className="font-semibold text-green-800 dark:text-green-300">المستند المترجم جاهز للتنزيل!</h3>
                        <button onClick={handleTranslatedDownload} className="mt-3 w-full max-w-sm mx-auto flex items-center justify-center gap-3 bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:bg-green-700 transition-all">
                            <DownloadIcon className="w-5 h-5" />
                            <span>تنزيل مستند Word المترجم</span>
                        </button>
                    </div>
                )}

            </div>
        </div>
      )}
    </div>
  );
};