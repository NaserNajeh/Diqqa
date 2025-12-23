
import React, { useState, useCallback } from 'react';
import { extractTextFromFiles } from './services/geminiService';
import { fileToBase64, splitPdfIntoPages } from './utils/fileUtils';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { Footer } from './components/Footer';
import { DocumentFormatter } from './components/DocumentFormatter';
import { OcrIcon, FileTextIcon } from './components/Icons';

interface PreviewState {
  url: string;
  type: string;
  name: string;
  base64: string;
  mimeType: string;
}

const App: React.FC = () => {
  const [previews, setPreviews] = useState<PreviewState[]>([]);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<{current: number, total: number}>({current: 0, total: 0});
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'extract' | 'format'>('extract');

  const MAX_FILES = 200; // زيادة الحد لدعم الكتب المقسمة

  const handleFilesUpload = useCallback(async (files: FileList) => {
    if (!files || files.length === 0) return;
    
    setIsLoading(true); // إظهار حالة التحميل أثناء التقسيم
    setError(null);

    try {
        const acceptedFiles = Array.from(files);
        const newPreviews: PreviewState[] = [];

        for (const file of acceptedFiles) {
            if (file.type === 'application/pdf') {
                // تقسيم ملف PDF إلى صفحات منفصلة
                const pdfPages = await splitPdfIntoPages(file);
                newPreviews.push(...pdfPages.map(p => ({
                    url: p.dataUrl,
                    type: p.mimeType,
                    name: (p as any).name || file.name,
                    base64: p.base64,
                    mimeType: p.mimeType
                })));
            } else {
                const res = await fileToBase64(file);
                newPreviews.push({
                    url: res.dataUrl,
                    type: file.type,
                    name: file.name,
                    base64: res.base64,
                    mimeType: res.mimeType
                });
            }
        }

        if (previews.length + newPreviews.length > MAX_FILES) {
            setError(`لا يمكن تحميل أكثر من ${MAX_FILES} صفحة في المرة الواحدة.`);
            setIsLoading(false);
            return;
        }

        setPreviews(prev => [...prev, ...newPreviews]);
        setExtractedText('');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'أحد الملفات غير صالح.';
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  }, [previews.length]);

  const handleExtractText = useCallback(async () => {
    if (previews.length === 0) return;

    setIsLoading(true);
    setError(null);
    setExtractedText('');
    setProgress({current: 0, total: previews.length});

    try {
      const filesToProcess = previews.map(p => ({ imageData: p.base64, mimeType: p.mimeType }));
      const text = await extractTextFromFiles(filesToProcess, (current, total) => {
          setProgress({current, total});
      });
      setExtractedText(text);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
      setError(`فشل استخراج النص: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [previews]);
  
  const handleRemoveFile = useCallback((indexToRemove: number) => {
    setPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
    setExtractedText('');
    setError(null);
  }, []);

  const resetState = useCallback(() => {
    setPreviews([]);
    setExtractedText('');
    setIsLoading(false);
    setError(null);
    setProgress({current: 0, total: 0});
  }, []);

  const TabButton = ({ isActive, onClick, icon, label }: { isActive: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2.5 px-4 sm:px-6 py-2.5 text-sm sm:text-base font-bold rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-offset-slate-900 ${
        isActive
          ? 'bg-white dark:bg-slate-800 shadow-md text-blue-600 dark:text-blue-400'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
            <div className="p-1.5 bg-slate-200/50 dark:bg-slate-800/50 rounded-full shadow-inner">
                <nav className="flex gap-2" aria-label="Tabs">
                  <TabButton 
                    isActive={activeTab === 'extract'}
                    onClick={() => setActiveTab('extract')}
                    icon={<OcrIcon className="w-5 h-5" />}
                    label="استخراج من الصور"
                  />
                  <TabButton 
                    isActive={activeTab === 'format'}
                    onClick={() => setActiveTab('format')}
                    icon={<FileTextIcon className="w-5 h-5" />}
                    label="تنسيق مستند جاهز"
                  />
                </nav>
            </div>
          
          <div className="mt-6 sm:mt-8 w-full">
            {activeTab === 'extract' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ImageUploader 
                  onFilesUpload={handleFilesUpload} 
                  previews={previews} 
                  isLoading={isLoading} 
                  reset={resetState}
                  onRemoveFile={handleRemoveFile}
                  onExtractText={handleExtractText}
                  maxFiles={MAX_FILES}
                  error={error}
                  hasProcessed={!!extractedText || (!!error && !isLoading)}
                  progress={progress}
                />
                <ResultDisplay 
                  text={extractedText} 
                  isLoading={isLoading} 
                  error={error} 
                  hasFiles={previews.length > 0}
                />
              </div>
            )}

            {activeTab === 'format' && (
              <DocumentFormatter />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
