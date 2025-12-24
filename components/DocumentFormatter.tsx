
import React, { useState, useRef, ChangeEvent } from 'react';
import { SparkleIcon, WarningIcon, UploadIcon, ClipboardPasteIcon } from './Icons';
import { formatTextForWord } from '../services/geminiService';

declare global {
    interface Window {
      mammoth: any;
    }
}

export const DocumentFormatter: React.FC = () => {
    const [text, setText] = useState<string>('');
    const [isFormatting, setIsFormatting] = useState(false);
    const [formattingError, setFormattingError] = useState<string | null>(null);
    const [formattingStep, setFormattingStep] = useState({ current: 0, total: 0 });
    const [processFootnotes, setProcessFootnotes] = useState(true);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    const handleFormattedDownload = async () => {
        if (!text || isFormatting) return;
        setIsFormatting(true);
        setFormattingError(null);
        setFormattingStep({ current: 0, total: 0 });

        try {
            const formattedHtml = await formatTextForWord(text, processFootnotes, (current, total) => {
                setFormattingStep({ current, total });
            });
            
            const filename = `formatted-doc-${new Date().getTime()}.doc`;
            const fullHtml = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                    <meta charset='utf-8'>
                    <style>
                        body { font-family: 'Calibri', 'Traditional Arabic', sans-serif; font-size: 14pt; } 
                        p { text-align: justify; margin-bottom: 10pt; line-height: 1.6; }
                        h1, h2 { color: #1e40af; }
                    </style>
                </head>
                <body lang="AR-SA" dir="rtl">
                    ${formattedHtml}
                </body>
                </html>`;
            triggerDownload(filename, new Blob([fullHtml], { type: 'application/msword' }));
        } catch (err: any) {
            setFormattingError(err.message === "EXHAUSTED_KEYS" ? "نفدت المفاتيح المتاحة. يرجى إضافة مفاتيح جديدة من الأعلى والإكمال." : err.message);
        } finally {
            setIsFormatting(false);
        }
    };

    return (
        <div className="glass-card p-10 sm:p-14 rounded-[3.5rem] w-full flex flex-col gap-12 max-w-6xl mx-auto shadow-2xl border-slate-200 dark:border-slate-800">
            <div className="text-center">
                <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white leading-tight">تنسيق المستندات والكتب</h2>
                <p className="mt-5 text-slate-600 dark:text-slate-400 font-black max-w-3xl mx-auto text-xl">
                    حوّل مسوداتك المكتوبة إلى مستندات أكاديمية منسقة بالكامل دون فقدان أي جزء.
                </p>
            </div>

            {/* تم تغميق لون النص الوصفي هنا كما هو مطلوب */}
            <div className="p-8 bg-blue-100 dark:bg-slate-900 border-2 border-blue-400 dark:border-blue-700 rounded-[2.5rem] flex gap-6 items-center shadow-md">
                <SparkleIcon className="w-10 h-10 text-blue-800 dark:text-blue-300 shrink-0" />
                <p className="text-xl text-slate-950 dark:text-slate-100 font-black leading-relaxed">
                    نحن نستخدم تقنية <span className="text-blue-800 dark:text-blue-400 underline decoration-2 decoration-blue-500">المعالجة التتابعية</span> لضمان وصول التنسيق لكل صفحة في مستندك، مهما كان حجمه.
                </p>
            </div>
            
            <div className="relative group shadow-2xl rounded-[2.5rem] overflow-hidden border-2 border-slate-200 dark:border-slate-800 focus-within:border-blue-500 transition-all ring-1 ring-slate-200 dark:ring-slate-800">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="الصق النص الطويل هنا..."
                    className="w-full h-[600px] p-10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md outline-none text-slate-900 dark:text-white font-black text-xl leading-loose"
                />
                 <div className="absolute bottom-10 end-10 flex flex-wrap gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-8 py-5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-[1.5rem] hover:bg-slate-200 dark:hover:bg-slate-700 font-black transition-all shadow-lg border border-slate-200 dark:border-slate-700">
                        <UploadIcon className="w-6 h-6" />
                        <span>رفع وورد</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".docx" />
                    <button onClick={async () => {
                        try {
                            const clipText = await navigator.clipboard.readText();
                            setText(clipText);
                        } catch(e) {
                            alert("يرجى منح إذن الوصول للحافظة أولاً.");
                        }
                    }} className="flex items-center gap-3 px-8 py-5 bg-blue-600 text-white rounded-[1.5rem] hover:bg-blue-700 font-black transition-all shadow-2xl">
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
                            className="w-7 h-7 text-blue-600 rounded-xl border-2 border-slate-300 focus:ring-blue-500"
                        />
                        <span className="group-hover:text-blue-600 transition-colors">تفعيل معالجة وتجميع الحواشي أوتوماتيكياً</span>
                    </label>
                </div>

                {isFormatting ? (
                  <div className="bg-slate-100 dark:bg-slate-900/80 p-10 rounded-[2.5rem] shadow-[inset_0_5px_20px_rgba(0,0,0,0.05)] border-2 border-slate-200 dark:border-slate-800 animate-fade-in">
                      <div className="flex justify-between items-center mb-3 text-2xl font-black text-slate-900 dark:text-white">
                        <span>جاري معالجة الجزء {formattingStep.current} من {formattingStep.total}...</span>
                        <span>{Math.round((formattingStep.current / (formattingStep.total || 1)) * 100)}%</span>
                      </div>
                      <p className="text-center font-black text-blue-600 mb-6 text-3xl animate-bounce">
                        ( لحظات الانتظار .. املأها بالاستغفار )
                      </p>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-8 overflow-hidden shadow-inner border border-slate-300 dark:border-slate-700">
                        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 h-full rounded-full transition-all duration-500 shadow-md" style={{ width: `${(formattingStep.current / (formattingStep.total || 1)) * 100}%` }}></div>
                      </div>
                      <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 font-black text-center animate-pulse">يتم الآن تنسيق مستندك جزءاً بجزء لضمان الدقة الأكاديمية الكاملة.</p>
                  </div>
                ) : (
                  <button onClick={handleFormattedDownload} disabled={!text || text.length < 10} className="w-full bg-gradient-to-r from-blue-600 via-indigo-700 to-purple-800 hover:scale-[1.01] text-white font-black text-3xl py-8 px-10 rounded-[2.5rem] shadow-2xl shadow-blue-500/20 transform transition-all disabled:opacity-40">
                      <SparkleIcon className="w-10 h-10 inline-block ml-4 mb-1" />
                      تنسيق وتحميل المستند المكتمل
                  </button>
                )}

                {formattingError && (
                    <div className="p-8 bg-red-100 border-2 border-red-300 rounded-[2rem] text-red-950 font-black flex items-center gap-6 shadow-lg animate-fade-in">
                        <WarningIcon className="w-10 h-10 shrink-0" />
                        <div className="text-xl">
                            <p className="mb-1">حدث خطأ أثناء التنسيق:</p>
                            <p className="text-base font-bold opacity-80">{formattingError}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
