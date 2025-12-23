
import React, { useEffect, useState } from 'react';
import { OcrIcon, KeyIcon, CheckIcon } from './Icons';

export const Header: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('user_gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsSaved(true);
    }
  }, []);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim(); // تنظيف المسافات تلقائياً
    setApiKey(value);
    localStorage.setItem('user_gemini_api_key', value);
    setIsSaved(!!value);
  };

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
              <div className="flex items-center gap-x-4 mt-2">
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
                  مدعوم بالذكاء الاصطناعي الأكاديمي
                </p>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-80 group">
                <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none">
                    <KeyIcon className={`w-5 h-5 ${isSaved ? 'text-green-500' : 'text-slate-400 group-focus-within:text-blue-500'}`} />
                </div>
                <input
                    type="password"
                    value={apiKey}
                    onChange={handleKeyChange}
                    placeholder="أدخل مفتاح Gemini API هنا..."
                    className="block w-full p-3 ps-12 text-sm text-slate-900 border-2 border-slate-200 rounded-2xl bg-white/80 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none dark:bg-slate-900/80 dark:border-slate-700 dark:text-white font-sans"
                />
                {isSaved && (
                    <div className="absolute inset-y-0 end-0 flex items-center pe-4 pointer-events-none">
                        <CheckIcon className="w-5 h-5 text-green-500" />
                    </div>
                )}
            </div>
            {!isSaved && (
                <p className="text-[10px] sm:text-xs font-bold text-amber-700 dark:text-amber-400 animate-pulse">
                   يرجى إدخال المفتاح لتفعيل المعالجة
                </p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
