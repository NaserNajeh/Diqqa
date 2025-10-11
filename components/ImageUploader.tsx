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
}

const PreviewItem: React.FC<{preview: PreviewState, onRemove: () => void, disabled: boolean}> = ({ preview, onRemove, disabled }) => {
  return (
    <div className="relative aspect-square glass-card rounded-xl overflow-hidden group shadow-sm transition-all duration-300">
        {preview.type.startsWith('image/') ? (
            <img src={preview.url} alt={preview.name} className="w-full h-full object-cover" />
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/50 p-2">
                <PdfFileIcon className="w-10 h-10 text-red-500" />
                <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300 text-center break-all" title={preview.name}>
                    {preview.name}
                </p>
            </div>
        )}
        {!disabled && (
            <button
                onClick={onRemove}
                className="absolute top-1.5 end-1.5 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                aria-label="إزالة الملف"
            >
                <XIcon className="w-4 h-4" />
            </button>
        )}
    </div>
  );
};


export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onFilesUpload, previews, isLoading, reset, onRemoveFile, onExtractText, maxFiles, error, hasProcessed
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFilesUpload(files);
      event.target.value = ''; // Reset input to allow re-uploading the same file
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
    relative flex flex-col items-center justify-center w-full h-full min-h-[300px] lg:min-h-[400px]
    border-2 border-dashed rounded-2xl cursor-pointer
    transition-all duration-300 ease-in-out p-6
    ${isDragging ? 'border-blue-500 bg-blue-500/10 scale-105' : 'border-slate-400/50 dark:border-slate-600/80 hover:border-blue-400'}
  `;

  if (previews.length === 0) {
    return (
      <div 
        className="glass-card p-6 rounded-3xl shadow-2xl shadow-slate-300/20 dark:shadow-black/20 h-full flex flex-col justify-center"
        onDragEnter={(e) => handleDragEvent(e, true)}
        onDragLeave={(e) => handleDragEvent(e, false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div className={dropzoneClasses} onClick={handleAddFilesClick} role="button" tabIndex={0} aria-label="منطقة تحميل الملفات">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg, image/webp, application/pdf"
                disabled={isLoading}
                multiple
            />
            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <div className="p-4 bg-blue-500/10 rounded-full mb-4"><UploadIcon className="w-12 h-12 text-blue-500" /></div>
                <p className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-200">
                اسحب ملفاتك هنا أو انقر للتحميل
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                يدعم: PNG, JPG, WEBP, PDF (حتى ${maxFiles} ملفات)
                </p>
            </div>
        </div>
        {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-500 font-semibold" role="alert">
                <WarningIcon className="w-5 h-5" />
                <span>{error}</span>
            </div>
        )}
      </div>
    );
  }

  return (
     <div className="glass-card p-6 rounded-3xl shadow-2xl shadow-slate-300/20 dark:shadow-black/20 h-full flex flex-col justify-between">
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">الملفات المحددة ({previews.length}/{maxFiles})</h2>
                {!isLoading && (
                    <button onClick={reset} className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors">
                        <TrashIcon className="w-4 h-4" />
                        <span>مسح الكل</span>
                    </button>
                )}
            </div>

            <div className="relative min-h-[150px]">
                {isLoading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex flex-col items-center justify-center rounded-xl z-20 backdrop-blur-md p-4">
                        <div className="text-center w-full max-w-sm">
                            <Spinner className="w-12 h-12 text-blue-500 mx-auto" />
                            <p className="text-slate-800 dark:text-slate-200 mt-3 mb-4 font-semibold text-lg">جاري استخراج النص...</p>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden relative">
                                <div className="absolute top-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-400 w-1/2 h-full rounded-full animate-progress-indeterminate"></div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">قد يستغرق هذا بعض الوقت حسب عدد الملفات.</p>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {previews.map((p, i) => (
                        <PreviewItem key={i} preview={p} onRemove={() => onRemoveFile(i)} disabled={isLoading || hasProcessed} />
                    ))}
                    {previews.length < maxFiles && !isLoading && !hasProcessed && (
                        <button 
                            onClick={handleAddFilesClick} 
                            className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-400/50 dark:border-slate-600/80 rounded-xl text-slate-500 hover:border-blue-500 hover:text-blue-500 transition-all duration-300"
                            aria-label="إضافة المزيد من الملفات"
                        >
                            <UploadIcon className="w-8 h-8"/>
                            <span className="text-xs mt-1 font-semibold">إضافة المزيد</span>
                        </button>
                    )}
                </div>
            </div>
        </div>

        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/png, image/jpeg, image/webp, application/pdf"
            disabled={isLoading || hasProcessed || previews.length >= maxFiles}
            multiple
        />

        {error && !isLoading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-500 font-semibold" role="alert">
                <WarningIcon className="w-5 h-5" />
                <span>{error}</span>
            </div>
        )}
        
        <div className="mt-6">
            {!hasProcessed ? (
                <button 
                    onClick={onExtractText} 
                    disabled={isLoading || previews.length === 0}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold py-3.5 px-4 rounded-lg shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-300 disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed"
                >
                    استخراج النص
                </button>
            ) : (
                <button 
                    onClick={reset}
                    className="w-full bg-gradient-to-r from-slate-600 to-slate-700 text-white font-bold py-3.5 px-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                >
                    البدء من جديد
                </button>
            )}
        </div>
     </div>
  );
};