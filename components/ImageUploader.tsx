
import React, { useRef, useState, useCallback } from 'react';
import { UploadIcon, TrashIcon, Spinner, PdfFileIcon, XIcon, WarningIcon } from './Icons';

interface PreviewState {
  url: string;
  type: string;
  name: string;
}

interface ImageUploaderProps {
  onFilesUpload: (files: FileList) => void;
  previews: PreviewState[];
  isLoading: boolean;
  reset: () => void;
  onRemoveFile: (index: number) => void;
  onExtractText: () => void;
  maxFiles: number;
  error: string | null;
  hasProcessed: boolean;
  progress?: {current: number, total: number};
}

const PreviewItem: React.FC<{preview: PreviewState, onRemove: () => void, disabled: boolean}> = ({ preview, onRemove, disabled }) => {
  return (
    <div className="relative aspect-square glass-card rounded-2xl overflow-hidden group shadow-sm transition-all duration-300 border-slate-200 dark:border-slate-800 hover:shadow-lg">
        {preview.type.startsWith('image/') ? (
            <img src={preview.url} alt={preview.name} className="w-full h-full object-cover" />
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/50 p-3">
                <PdfFileIcon className="w-12 h-12 text-red-500" />
                <p className="mt-3 text-[10px] font-black text-slate-800 dark:text-slate-200 text-center break-all px-1" title={preview.name}>
                    {preview.name}
                </p>
            </div>
        )}
        {!disabled && (
            <button
                onClick={onRemove}
                className="absolute top-2 end-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 shadow-lg"
                aria-label="إزالة الملف"
            >
                <XIcon className="w-4 h-4" />
            </button>
        )}
    </div>
  );
};


export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onFilesUpload, previews, isLoading, reset, onRemoveFile, onExtractText, maxFiles, error, hasProcessed, progress
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFilesUpload(files);
      event.target.value = '';
    }
  };

  const handleAddFilesClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleDragEvent = useCallback((e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDragging(isEntering);
  }, [isLoading]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvent(e, false);
    if (!isLoading) {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        onFilesUpload(files);
      }
    }
  }, [handleDragEvent, isLoading, onFilesUpload]);
  
  const dropzoneClasses = `
    relative flex flex-col items-center justify-center w-full h-full min-h-[350px]
    border-2 border-dashed rounded-[2.5rem] cursor-pointer
    transition-all duration-300 ease-in-out p-8
    ${isDragging ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/10 scale-[1.01]' : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}
  `;

  if (previews.length === 0) {
    return (
      <div 
        className="glass-card p-8 rounded-[3rem] h-full flex flex-col justify-center border-slate-200 dark:border-slate-800 shadow-xl"
        onDragEnter={(e) => handleDragEvent(e, true)}
        onDragLeave={(e) => handleDragEvent(e, false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className={dropzoneClasses} onClick={handleAddFilesClick} role="button" tabIndex={0}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*, application/pdf"
                disabled={isLoading}
                multiple
            />
            <div className="flex flex-col items-center justify-center text-center">
                <div className="p-7 bg-blue-100 dark:bg-blue-900/30 rounded-[2rem] mb-7 shadow-sm ring-1 ring-blue-200 dark:ring-blue-800"><UploadIcon className="w-16 h-16 text-blue-600 dark:text-blue-400" /></div>
                <p className="mb-3 text-3xl font-black text-slate-900 dark:text-white">
                اسحب ملفاتك هنا أو انقر للتحميل
                </p>
                <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
                يدعم الصور و ملفات PDF (سيتم تقسيمها تلقائياً)
                </p>
            </div>
        </div>

        <div className="mt-10 p-7 bg-amber-100 border-2 border-amber-400 rounded-[2rem] flex gap-5 items-start shadow-md ring-8 ring-amber-400/5">
            <WarningIcon className="w-9 h-9 text-amber-900 shrink-0 mt-0.5" />
            <div className="text-lg text-amber-950 leading-relaxed font-bold">
                <strong className="block text-2xl mb-2 text-amber-900 underline decoration-amber-500 decoration-4 underline-offset-4">تنبيه حاسم للدقة والشمول:</strong>
                لضمان استخراج النص كاملاً وبدقة 100%، يفضل عدم تحويل ملف أكبر من <span className="bg-red-700 text-white px-3 py-0.5 rounded-lg font-black text-xl mx-1 shadow-sm">100 صفحة</span> دفعة واحدة. تقسيم الملفات الضخمة يمنحك سيطرة كاملة ويمنع انقطاع الاستجابة في منتصف العمل.
            </div>
        </div>

        {error && (
            <div className="mt-6 flex items-center gap-4 text-lg text-red-950 font-black p-5 bg-red-100 border-2 border-red-300 rounded-2xl shadow-sm" role="alert">
                <WarningIcon className="w-7 h-7 shrink-0" />
                <span>{error}</span>
            </div>
        )}
      </div>
    );
  }

  return (
     <div className="glass-card p-8 rounded-[3rem] h-full flex flex-col justify-between border-slate-200 dark:border-slate-800 shadow-xl">
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">الصفحات المحددة ({previews.length})</h2>
                {!isLoading && (
                    <button onClick={reset} className="flex items-center gap-2 text-base font-black text-red-600 hover:text-red-700 transition-colors">
                        <TrashIcon className="w-5 h-5" />
                        <span>مسح الكل</span>
                    </button>
                )}
            </div>

            <div className="relative min-h-[200px]">
                {isLoading && (
                    <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 flex flex-col items-center justify-center rounded-[2rem] z-20 backdrop-blur-md p-8 text-center border-2 border-blue-500/20 shadow-2xl">
                        <Spinner className="w-20 h-20 text-blue-600 mx-auto" />
                        <p className="text-slate-900 dark:text-white mt-8 mb-6 font-black text-3xl">جاري استخراج كامل المحتوى...</p>
                        
                        {progress && progress.total > 0 && (
                            <div className="w-full max-w-md space-y-4">
                                <div className="flex justify-between text-xl font-black text-blue-600">
                                    <span>جاري معالجة الصفحة {progress.current} من {progress.total}</span>
                                    <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-6 overflow-hidden shadow-inner">
                                    <div 
                                        className="bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-lg"
                                        style={{width: `${(progress.current / progress.total) * 100}%`}}
                                    ></div>
                                </div>
                            </div>
                        )}
                        
                        {!progress && (
                            <div className="w-full max-w-md bg-slate-200 dark:bg-slate-800 rounded-full h-5 overflow-hidden shadow-inner">
                                <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 w-full h-full rounded-full animate-progress-indeterminate shadow-lg"></div>
                            </div>
                        )}
                        
                        <p className="text-lg text-slate-600 dark:text-slate-400 mt-8 font-bold">نقوم بمعالجة الصفحات بدقة متناهية لضمان عدم سقوط أي حرف.</p>
                    </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 max-h-[400px] overflow-y-auto p-2">
                    {previews.map((p, i) => (
                        <PreviewItem key={i} preview={p} onRemove={() => onRemoveFile(i)} disabled={isLoading || hasProcessed} />
                    ))}
                    {!isLoading && !hasProcessed && (
                        <button 
                            onClick={handleAddFilesClick} 
                            className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all hover:bg-blue-50/50 dark:hover:bg-blue-900/10 group"
                        >
                            <UploadIcon className="w-12 h-12 group-hover:scale-110 transition-transform duration-300"/>
                            <span className="text-sm mt-4 font-black">إضافة المزيد</span>
                        </button>
                    )}
                </div>
            </div>
        </div>

        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*, application/pdf" multiple />

        {error && !isLoading && (
            <div className="mt-6 flex items-center gap-4 text-lg text-red-950 font-black p-5 bg-red-100 border-2 border-red-300 rounded-2xl shadow-sm">
                <WarningIcon className="w-7 h-7 shrink-0" />
                <span>{error}</span>
            </div>
        )}
        
        <div className="mt-10">
            {!hasProcessed ? (
                <button 
                    onClick={onExtractText} 
                    disabled={isLoading || previews.length === 0}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-black text-xl py-6 px-8 rounded-[1.5rem] shadow-2xl shadow-blue-500/20 transform hover:-translate-y-1.5 transition-all disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                >
                    بدء استخراج النص لـ {previews.length} صفحة
                </button>
            ) : (
                <button onClick={reset} className="w-full bg-slate-900 dark:bg-slate-800 text-white font-black py-6 px-8 rounded-[1.5rem] transition-all hover:bg-black dark:hover:bg-slate-700 text-xl shadow-lg">
                    تجهيز استخراج جديد
                </button>
            )}
        </div>
     </div>
  );
};
