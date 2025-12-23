
import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { SparkleIcon, WarningIcon, UploadIcon, ClipboardPasteIcon, DownloadIcon } from './Icons';
import { formatTextForWord, translateTextAndFormatForWord } from '../services/geminiService';

declare global {
    interface Window {
      mammoth: any;
    }
}

const cleanApiResponse = (htmlString: string) => {
    return htmlString.replace(/`{3}(html)?/g, '').trim();
};

export const DocumentFormatter: React.FC = () => {
    const [text, setText] = useState<string>('');
    const [isFormatting, setIsFormatting] = useState(false);
    const [formattingError, setFormattingError] = useState<string | null>(null);
    const [formattingProgress, setFormattingProgress] = useState(0);
    const [showLongWaitMessage, setShowLongWaitMessage] = useState(false);
    const [processFootnotes, setProcessFootnotes] = useState(true);
    
    const progressIntervalRef = useRef<number | null>(null);
    const longWaitTimerRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            if (longWaitTimerRef.current) clearTimeout(longWaitTimerRef.current);
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
        setText('جاري استخراج النص من ملف الوورد...');
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await window.mammoth.extractRawText({ arrayBuffer });
            setText(result.value);
        } catch (error) {
            setFormattingError("فشل في قراءة ملف الوورد.");
            setText('');
        }
        event.target.value = '';
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
        intervalRef.current = window.setInterval(() => setProgress((p: number) => Math.min(p + (p < 60 ? 8 : 2), 90)), 500);
        timerRef.current = window.setTimeout(() => { setShowWaitMessage(true); setProgress(95); }, 20000);
    };

    const stopProgressSimulation = (setProgress: any, setShowWaitMessage: any, intervalRef: any, timerRef: any, isSuccess: boolean) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (isSuccess) setProgress(100);
        setShowWaitMessage(false);
    };
    
    const handleFormattedDownload = async () => {
        if (!text || isFormatting) return;
        setIsFormatting(true);
        setFormattingError(null);
        startProgressSimulation(setFormattingProgress, setShowLongWaitMessage, progressIntervalRef, longWaitTimerRef);
        try {
            const rawFormattedHtml = await formatTextForWord(text, processFootnotes);
            const formattedHtml = cleanApiResponse(rawFormattedHtml);
            stopProgressSimulation(setFormattingProgress, setShowLongWaitMessage, progressIntervalRef, longWaitTimerRef, true);
            const filename = `formatted-doc-${new Date().getTime()}.doc`;
            const fullHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><style>body { font-family: 'Calibri', sans-serif; font-size: 14pt; } p { text-align: justify; margin-bottom: 10pt; }</style></head><body lang="AR-SA" dir="rtl">${formattedHtml}</body></html>`;
            triggerDownload(filename, new Blob([fullHtml], { type: 'application/msword' }));
            setTimeout(() => setIsFormatting(false), 1500);
        } catch (err) {
            stopProgressSimulation(setFormattingProgress, setShowLongWaitMessage, progressIntervalRef, longWaitTimerRef, false);
            setFormattingError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
            setIsFormatting(false);
        }
    };

    return (
        <div className="glass-card p-10 sm:p-14 rounded-[3.5rem] w-full flex flex-col gap-12 max-w-6xl mx-auto shadow-2xl border-slate-200 dark:border-slate-800">
            <div className="text-center">
                <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white leading-tight">تنسيق المستندات والكتب</h2>
                <p className="mt-5 text-slate-600 dark:text-slate-400 font-black max-w-3xl mx-auto text-xl">
                    حوّل مسوداتك إلى مستندات أكاديمية منسقة بذكاء اصطناعي فائق الدقة.
                </p>
            </div>

            {/* تنبيه الجودة بلون غامق وواضح جداً */}
            <div className="p-8 bg-amber-100 border-2 border-amber-400 rounded-[2.5rem] flex gap-6 items-center shadow-md ring-8 ring-amber-400/5">
                <WarningIcon className="w-10 h-10 text-amber-900 shrink-0" />
                <p className="text-xl text-amber-950 font-black leading-relaxed">
                    <strong className="underline underline-offset-4 ml-2 decoration-amber-500">تنبيه الجودة:</strong>
                    لضمان دقة الاستخراج والسيطرة الكاملة على التنسيق، يفضل عدم معالجة ملفات تزيد عن <span className="bg-red-700 text-white px-3 rounded-lg mx-1 shadow-sm font-black">100 صفحة</span> في المرة الواحدة.
                </p>
            </div>
            
            <div className="relative group shadow-2xl rounded-[2.5rem] overflow-hidden border-2 border-slate-200 dark:border-slate-800 focus-within:border-blue-500 transition-all ring-1 ring-slate-200 dark:ring-slate-800 focus-within:ring-8 focus-within:ring-blue-500/5">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="الصق النص الطويل هنا للمُعالجة..."
                    className="w-full h-[600px] p-10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md outline-none text-slate-900 dark:text-white font-black text-xl leading-loose"
                />
                 <div className="absolute bottom-10 end-10 flex flex-wrap gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-[1.5rem] hover:bg-slate-200 dark:hover:bg-slate-700 font-black transition-all shadow-lg border border-slate-200 dark:border-slate-700">
                        <UploadIcon className="w-6 h-6" />
                        <span>رفع وورد</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".docx" />
                    <button onClick={async () => setText(await navigator.clipboard.readText())} className="flex items-center gap-3 px-8 py-5 bg-blue-600 text-white rounded-[1.5rem] hover:bg-blue-700 font-black transition-all shadow-2xl">
                        <ClipboardPasteIcon className="w-6 h-6" />
                        <span>لصق من الحافظة</span>
                    </button>
                 </div>
            </div>
            
            <div className="space-y-10">
                <div className="flex items-center justify-end">
                    <label className="flex items-center gap-5 text-xl font-black text-slate-800 dark:text-slate-200 cursor-pointer group">
                        <input 
                            type="checkbox" 
                            checked={processFootnotes} 
                            onChange={(e) => setProcessFootnotes(e.target.checked)}
                            className="w-7 h-7 text-blue-600 rounded-xl focus:ring-blue-500 border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <span className="group-hover:text-blue-600 transition-colors">تفعيل معالجة وتجميع الحواشي أوتوماتيكياً</span>
                    </label>
                </div>

                {isFormatting ? (
                  <div className="bg-slate-100 dark:bg-slate-900/80 p-10 rounded-[2.5rem] shadow-inner border border-slate-200 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-5 text-xl font-black text-slate-900 dark:text-white">
                        <span>جاري الهندسة الأكاديمية للمستند...</span>
                        <span>{formattingProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-6 overflow-hidden shadow-inner">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500 shadow-md" style={{ width: `${formattingProgress}%` }}></div>
                      </div>
                      {showLongWaitMessage && <p className="mt-5 text-base text-amber-900 dark:text-amber-400 font-black text-center animate-pulse">المستند ضخم، جاري تكثيف المعالجة لضمان الأمانة في النقل...</p>}
                  </div>
                ) : (
                  <button onClick={handleFormattedDownload} disabled={!text} className="w-full bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 hover:scale-[1.01] text-white font-black text-2xl py-7 px-10 rounded-[2rem] shadow-2xl shadow-blue-500/20 transform transition-all disabled:opacity-40 disabled:transform-none">
                      <SparkleIcon className="w-8 h-8 inline-block ml-4 mb-1" />
                      تنسيق وتحميل المستند المكتمل
                  </button>
                )}

                {formattingError && (
                    <div className="p-6 bg-red-100 border-2 border-red-300 rounded-3xl text-red-950 font-black flex items-center gap-5 shadow-sm">
                        <WarningIcon className="w-7 h-7" />
                        <span>{formattingError}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
