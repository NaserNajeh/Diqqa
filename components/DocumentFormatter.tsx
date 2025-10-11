import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { SparkleIcon, WarningIcon, UploadIcon, ClipboardPasteIcon, TranslateIcon, DownloadIcon } from './Icons';
import { formatTextForWord, translateTextAndFormatForWord } from '../services/geminiService';

declare global {
    interface Window {
      mammoth: any;
    }
}

interface DocumentFormatterProps {
    apiKey: string | null;
    openApiKeyModal: () => void;
}

const cleanApiResponse = (htmlString: string) => {
    return htmlString.replace(/`{3}(html)?/g, '').trim();
};

const languages = [
    { code: 'en', name: 'English' }, { code: 'ar', name: 'العربية' }, { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' }, { code: 'de', name: 'Deutsch' }, { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' }, { code: 'ru', name: 'Русский' }, { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' }, { code: 'ko', name: '한국어' }, { code: 'tr', name: 'Türkçe' },
    { code: 'hi', name: 'हिन्दी' }, { code: 'ur', name: 'اردو' },
];

const domains = ['عام', 'ديني', 'قانوني', 'علمي', 'تقني', 'طبي', 'أدبي', 'غير ذلك'];
const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'yi', 'syr'];


export const DocumentFormatter: React.FC<DocumentFormatterProps> = ({ apiKey, openApiKeyModal }) => {
    const [text, setText] = useState<string>('');
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
    const [translationProgress, setTranslationProgress] = useState(0);
    const [showLongTranslationWaitMessage, setShowLongTranslationWaitMessage] = useState(false);

    const progressIntervalRef = useRef<number | null>(null);
    const longWaitTimerRef = useRef<number | null>(null);
    const translationProgressIntervalRef = useRef<number | null>(null);
    const longTranslationWaitTimerRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            if (longWaitTimerRef.current) clearTimeout(longWaitTimerRef.current);
            if (translationProgressIntervalRef.current) clearInterval(translationProgressIntervalRef.current);
            if (longTranslationWaitTimerRef.current) clearTimeout(longTranslationWaitTimerRef.current);
        };
    }, []);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.docx')) {
            setFormattingError("يرجى تحميل ملف بصيغة .docx فقط.");
            return;
        }

        setFormattingError(null);
        setTranslationError(null);
        setText('جاري قراءة الملف...');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await window.mammoth.extractRawText({ arrayBuffer });
            setText(result.value);
        } catch (error) {
            console.error("Error reading docx file:", error);
            setFormattingError("فشل في قراءة ملف الوورد.");
            setText('');
        }
        event.target.value = ''; // Reset input
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

    const startProgressSimulation = (setProgress: any, setShowWaitMessage: any, intervalRef: any, timerRef: any) => {
        setProgress(0);
        setShowWaitMessage(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timerRef.current) clearTimeout(timerRef.current);
        intervalRef.current = window.setInterval(() => setProgress((p: number) => Math.min(p + (p < 60 ? 10 : 3), 90)), 400);
        timerRef.current = window.setTimeout(() => { setShowWaitMessage(true); setProgress(95); }, 15000);
    };

    const stopProgressSimulation = (setProgress: any, setShowWaitMessage: any, intervalRef: any, timerRef: any, isSuccess: boolean) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (isSuccess) { setProgress(100); }
        setShowWaitMessage(false);
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
            const filename = `formatted-document-${timestamp}.doc`;

            const fullHtml = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                    <meta charset='utf-8'><title>Formatted Document</title>
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
                    <div class="Section1">${formattedHtml}<div style='mso-element:footer' id="f1"><p class="MsoFooter" align="left" style="text-align:left"><span dir="ltr"><span style='mso-field-code:"PAGE"'></span></span></p></div></div>
                </body></html>`;

            const blob = new Blob([fullHtml], { type: 'application/msword' });
            triggerDownload(filename, blob);
            setTimeout(() => setIsFormatting(false), 1500);
        } catch (err) {
            stopProgressSimulation(setFormattingProgress, setShowLongWaitMessage, progressIntervalRef, longWaitTimerRef, false);
            const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
            setFormattingError(message);
            setIsFormatting(false);
        }
    };

    const handleTranslateAndDownload = async () => {
        if (!text || isTranslating) return;
        if (!apiKey) {
            openApiKeyModal();
            return;
        }
        setIsTranslating(true);
        setTranslationError(null);
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
            stopProgressSimulation(setTranslationProgress, setShowLongTranslationWaitMessage, translationProgressIntervalRef, longTranslationWaitTimerRef, true);
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
                  <div class="Section1">${cleanedHtml}<div style='mso-element:footer' id="f1"><p class="MsoFooter" align="${isRtl ? 'right' : 'left'}" style="text-align:${isRtl ? 'right' : 'left'}"><span dir="ltr"><span style='mso-field-code:"PAGE"'></span></span></p></div></div>
              </body></html>`;
            const blob = new Blob([fullHtml], { type: 'application/msword' });
            triggerDownload(filename, blob);
            setTimeout(() => setIsTranslating(false), 1500);
        } catch (err) {
            stopProgressSimulation(setTranslationProgress, setShowLongTranslationWaitMessage, translationProgressIntervalRef, longTranslationWaitTimerRef, false);
            const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
            setTranslationError(message);
            setIsTranslating(false);
        }
    };


    return (
        <div className="glass-card p-6 sm:p-8 rounded-3xl shadow-2xl shadow-slate-300/20 dark:shadow-black/20 w-full flex flex-col gap-6 max-w-4xl mx-auto">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">تنسيق مستند جاهز</h2>
                <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    الصق نصًا، أو ارفع مستند وورد، وسيقوم الذكاء الاصطناعي بتحويله إلى مستند احترافي، أو ترجمته وتنسيقه لك.
                </p>
            </div>
            
            <div className="relative">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="الصق النص هنا أو ارفع ملف وورد..."
                    className="w-full h-80 p-4 bg-slate-200/30 dark:bg-slate-800/30 rounded-lg border border-slate-300/50 dark:border-slate-700/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    aria-label="مربع إدخال النص للتنسيق"
                />
                 <div className="absolute bottom-4 end-4 flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-600/80 font-semibold transition-colors shadow-sm border border-slate-200 dark:border-slate-600" title="رفع ملف وورد (.docx)">
                        <UploadIcon className="w-5 h-5" />
                        <span>رفع ملف</span>
                    </button>
                    <input
                        type="file" ref={fileInputRef} onChange={handleFileChange}
                        className="hidden" accept=".docx"
                    />
                    <button onClick={async () => setText(await navigator.clipboard.readText())} className="flex items-center justify-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-600/80 font-semibold transition-colors shadow-sm border border-slate-200 dark:border-slate-600" title="لصق نص من الحافظة">
                        <ClipboardPasteIcon className="w-5 h-5" />
                        <span>لصق</span>
                    </button>
                 </div>
            </div>
            
            <div className="space-y-4">
              <div className="pt-2">
                {isFormatting ? (
                  <div className="text-center">
                      <div className="flex justify-between items-center mb-1 text-sm font-medium text-slate-600 dark:text-slate-300"><span>جاري التنسيق الاحترافي...</span><span>{formattingProgress}%</span></div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700"><div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2.5 rounded-full transition-all duration-300" style={{ width: `${formattingProgress}%` }}></div></div>
                      {showLongWaitMessage && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 animate-pulse">التنسيق يتطلب وقتاً إضافياً، نرجو الانتظار قليلاً...</p>}
                  </div>
                ) : (
                  <button onClick={handleFormattedDownload} disabled={isFormatting || !text || isTranslating} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold py-3.5 px-4 rounded-lg shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-300 disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed">
                      <SparkleIcon className="w-5 h-5" />
                      <span>تنسيق وتنزيل مستند Word</span>
                  </button>
                )}
                {formattingError && <div className="mt-2 flex items-center gap-2 text-sm text-red-500 font-semibold" role="alert"><WarningIcon className="w-5 h-5" /><span>خطأ في التنسيق: {formattingError}</span></div>}
              </div>

              <div className="pt-4 border-t border-slate-300/50 dark:border-slate-700/50">
                  <button onClick={() => setIsTranslationPanelOpen(p => !p)} className="w-full flex justify-between items-center text-left font-semibold text-slate-700 dark:text-slate-200" disabled={!text || isFormatting || isTranslating}>
                      <span className="flex items-center gap-3"><TranslateIcon className="w-5 h-5 text-green-500" />ترجمة المستند وتنسيقه</span>
                      <svg className={`w-5 h-5 transition-transform ${isTranslationPanelOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {isTranslationPanelOpen && (
                      <div className="mt-4 space-y-4 animate-fade-in">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label htmlFor="target-language-formatter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الترجمة إلى</label>
                                  <select id="target-language-formatter" value={targetLanguage} onChange={e => setTargetLanguage(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 focus:ring-blue-500 focus:border-blue-500">
                                      {languages.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label htmlFor="translation-domain-formatter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">مجال النص</label>
                                  <select id="translation-domain-formatter" value={translationDomain} onChange={e => setTranslationDomain(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 focus:ring-blue-500 focus:border-blue-500">
                                      {domains.map(dom => <option key={dom} value={dom}>{dom}</option>)}
                                  </select>
                              </div>
                          </div>
                          {translationDomain === 'غير ذلك' && (
                              <div>
                                  <label htmlFor="custom-domain-formatter" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تحديد المجال المناسب</label>
                                  <input type="text" id="custom-domain-formatter" value={customDomain} onChange={e => setCustomDomain(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 focus:ring-blue-500 focus:border-blue-500" placeholder="مثال: تاريخي، اقتصادي..." />
                              </div>
                          )}
                           <button onClick={handleTranslateAndDownload} disabled={isTranslating || isFormatting || (translationDomain === 'غير ذلك' && !customDomain)} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold py-3.5 px-4 rounded-lg shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transform hover:-translate-y-0.5 transition-all duration-300 disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed">
                                <DownloadIcon className="w-5 h-5" />
                                <span>ترجمة وتنسيق وتنزيل</span>
                            </button>
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
              </div>
            </div>
        </div>
    );
};