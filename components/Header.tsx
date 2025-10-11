import React from 'react';
import { OcrIcon, KeyIcon } from './Icons';

interface HeaderProps {
    onApiKeyClick: () => void;
    hasApiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onApiKeyClick, hasApiKey }) => {
  return (
    <header className="bg-transparent sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between h-24">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-400 p-3 rounded-xl shadow-lg shadow-blue-500/30">
                <OcrIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">دِقَّة</span> - لاستخراج الحروف العربية وتشكيلاتها
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                مدعوم بالذكاء الاصطناعي
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <button 
              onClick={onApiKeyClick}
              className={`flex items-center gap-2.5 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-offset-slate-900 ${
                hasApiKey 
                  ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'
              }`}
            >
                <KeyIcon className="w-5 h-5" />
                <span>{hasApiKey ? 'تم تعيين المفتاح' : 'تعيين مفتاح API'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};