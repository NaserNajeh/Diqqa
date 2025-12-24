
import React, { useEffect, useState } from 'react';
import { OcrIcon, KeyIcon, CheckIcon, XIcon } from './Icons';

export const Header: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [isGifZoomed, setIsGifZoomed] = useState<boolean>(false);

  useEffect(() => {
    const savedKeys = localStorage.getItem('user_gemini_api_key');
    if (savedKeys) {
      setApiKeys(savedKeys);
      setIsSaved(true);
    }
  }, []);

  const handleKeysChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setApiKeys(value);
    localStorage.setItem('user_gemini_api_key', value);
    setIsSaved(value.trim().length > 0);
  };

  const keyCount = apiKeys.split('\n').filter(k => k.trim() !== "").length;

  return (
    <header className="bg-transparent sticky top-0 z-30 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50">
      <div className="container mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between py-6 gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-3.5 rounded-2xl shadow-xl shadow-blue-500/20">
                <OcrIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-x-3">
                <h1 className="text-4xl font-black text-blue-600 dark:text-blue-500 leading-none">دِقَّة</h1>
                <span className="hidden sm:inline text-slate-300 font-light text-2xl">|</span>
                <span className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-[#D10056] leading-tight">
                  استخراج الحروف العربية وتشكيلاتها
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 mt-2">
                نظام التدوير الذكي للمفاتيح والمعالجة التتابعية
              </p>
            </div>
          </div>

          <div className="w-full lg:w-auto flex flex-col items-end gap-2">
            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-start gap-3">
                <div className="relative w-full sm:w-80 group">
                    <div className="absolute top-3 start-4 pointer-events-none">
                        <KeyIcon className={`w-5 h-5 ${isSaved ? 'text-green-500' : 'text-slate-400 group-focus-within:text-blue-500'}`} />
                    </div>
                    <textarea
                        value={apiKeys}
                        onChange={handleKeysChange}
                        placeholder="ضع مفاتيح Gemini هنا (مفتاح في كل سطر)..."
                        className="block w-full h-12 p-2.5 ps-12 text-xs text-slate-900 border-2 border-slate-200 rounded-2xl bg-white/80 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none dark:bg-slate-900/80 dark:border-slate-700 dark:text-white font-mono resize-none overflow-hidden hover:h-32 focus:h-40"
                    />
                    {isSaved && (
                        <div className="absolute top-3 end-4">
                            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-bold">
                                {keyCount} مفتاح
                            </span>
                        </div>
                    )}
                </div>
                <button 
                  onClick={() => setShowHelp(!showHelp)}
                  className="whitespace-nowrap px-4 py-3 text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all border border-blue-200 dark:border-blue-800 shadow-sm"
                >
                  كيف أحصل على مفاتيح؟
                </button>
            </div>
            
            {showHelp && (
              <div className="absolute top-full mt-4 w-full max-w-sm glass-card p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-50 border-2 border-blue-200 dark:border-blue-800 animate-fade-in ring-8 ring-blue-500/5">
                <p className="text-base font-black text-slate-800 dark:text-slate-100 mb-4 text-center">
                  احصل على مفاتيحك المجانية من هنا:
                </p>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center rounded-xl font-black text-sm hover:from-blue-700 hover:to-indigo-700 mb-5 transition-all shadow-lg hover:scale-[1.02]"
                >
                  فتح صفحة مفاتيح Google API
                </a>
                
                <div 
                  className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-inner cursor-zoom-in group"
                  onClick={() => setIsGifZoomed(true)}
                >
                  <img 
                    src="https://raw.githubusercontent.com/NinjaWorld1234/API-key/refs/heads/main/GIF/API.gif" 
                    alt="طريقة الحصول على المفتاح"
                    className="w-full h-auto transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white/90 text-blue-600 px-3 py-1 rounded-full text-xs font-black shadow-lg">اضغط للتكبير</span>
                  </div>
                </div>

                <p className="mt-4 text-[11px] text-slate-500 font-bold leading-relaxed">
                  * نصيحة: استخرج 3-5 مفاتيح وضعها في الأداة لتنسيق الكتب الضخمة دون توقف.
                </p>

                <button 
                  onClick={() => setShowHelp(false)}
                  className="w-full mt-4 text-xs text-slate-400 hover:text-red-500 font-bold transition-colors"
                >
                  إغلاق التعليمات [X]
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* نافذة تكبير الـ GIF - تم تعديل التموضع ليكون في المركز تماماً ومعالجة الاختفاء */}
      {isGifZoomed && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in cursor-pointer overflow-hidden"
          style={{ height: '100vh', width: '100vw', top: 0, left: 0 }}
          onClick={() => setIsGifZoomed(false)}
        >
          <button 
            className="fixed top-4 end-4 sm:top-8 sm:end-8 text-white bg-white/10 p-3 sm:p-4 rounded-full hover:bg-white/30 transition-all hover:scale-110 shadow-2xl z-[110]" 
            onClick={(e) => { e.stopPropagation(); setIsGifZoomed(false); }}
            aria-label="إغلاق"
          >
            <XIcon className="w-8 h-8 sm:w-10 sm:h-10" />
          </button>
          
          <div 
            className="relative max-w-6xl w-full flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_0_150px_rgba(37,99,235,0.5)] ring-4 ring-blue-500/20 cursor-default animate-zoom-in"
            onClick={e => e.stopPropagation()}
          >
             <div className="overflow-auto max-h-[85vh] flex items-center justify-center bg-slate-100 dark:bg-slate-950">
               <img 
                  src="https://raw.githubusercontent.com/NinjaWorld1234/API-key/refs/heads/main/GIF/API.gif" 
                  alt="طريقة الحصول على المفتاح - مكبرة"
                  className="max-w-full h-auto object-contain shadow-inner"
                />
             </div>
              <div className="bg-blue-600 text-white py-3 sm:py-5 text-center font-black text-sm sm:text-lg shadow-lg">
                 شرح الحصول على مفتاح Gemini API المجاني
              </div>
          </div>
        </div>
      )}
    </header>
  );
};
