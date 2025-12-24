
import React, { useState, useCallback, useRef } from 'react';
import { extractTextFromFiles } from './services/geminiService';
import { fileToBase64, splitPdfIntoPages } from './utils/fileUtils';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { Footer } from './components/Footer';
import { DocumentFormatter } from './components/DocumentFormatter';
import { OcrIcon, FileTextIcon, WarningIcon, KeyIcon } from './components/Icons';

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
  
  // حالة لإدارة نقص المفاتيح
  const [showKeyNeededModal, setShowKeyNeededModal] = useState(false);
  const [newKeys, setNewKeys] = useState('');
  const resumeActionRef = useRef<(() => void) | null>(null);

  const MAX_FILES = 200;

  const handleFilesUpload = useCallback(async (files: FileList) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
        const acceptedFiles = Array.from(files);
        const newPreviews: PreviewState[] = [];
        for (const file of acceptedFiles) {
            if (file.type === 'application/pdf') {
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
        setPreviews(prev => [...prev, ...newPreviews]);
        setExtractedText('');
    } catch (err) {
        setError(err instanceof Error ? err.message : 'أحد الملفات غير صالح.');
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleExtractText = useCallback(async () => {
    if (previews.length === 0) return;
    setIsLoading(true);
    setError(null);
    setProgress({current: 0, total: previews.length});

    try {
      const filesToProcess = previews.map(p => ({ imageData: p.base64, mimeType: p.mimeType }));
      const text = await extractTextFromFiles(filesToProcess, (current, total) => {
          setProgress({current, total});
      });
      setExtractedText(text);
    } catch (err: any) {
      if (err.message === "EXHAUSTED_KEYS") {
          resumeActionRef.current = handleExtractText;
          setShowKeyNeededModal(true);
      } else {
          setError(`فشل استخراج النص: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [previews]);

  const handleResume = () => {
      const savedKeys = localStorage.getItem('user_gemini_api_key') || "";
      localStorage.setItem('user_gemini_api_key', savedKeys + (savedKeys ? '\n' : '') + newKeys);
      setNewKeys('');
      setShowKeyNeededModal(false);
      if (resumeActionRef.current) resumeActionRef.current();
  };
  
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
      className={`relative flex items-center gap-2.5 px-4 sm:px-6 py-2.5 text-sm sm:text-base font-bold rounded-full transition-all duration-300 ${
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

      {/* نافذة طلب مفاتيح إضافية */}
      {showKeyNeededModal && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
              <div className="glass-card max-w-lg w-full p-8 rounded-[2.5rem] border-2 border-amber-500 shadow-2xl">
                  <div className="flex flex-col items-center text-center">
                      <div className="p-5 bg-amber-100 dark:bg-amber-900/30 rounded-3xl mb-6">
                          <WarningIcon className="w-12 h-12 text-amber-600" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">انتهى "وقود" المعالجة!</h3>
                      <p className="text-slate-600 dark:text-slate-400 font-bold mb-6">
                          لقد استهلكت جميع المفاتيح الحالية. لا تقلق، التقدم محفوظ! أضف مفتاحاً أو أكثر وسنكمل من حيث توقفنا.
                      </p>
                      
                      <div className="relative w-full mb-6">
                          <div className="absolute top-3 start-4"><KeyIcon className="w-5 h-5 text-slate-400" /></div>
                          <textarea 
                              value={newKeys}
                              onChange={e => setNewKeys(e.target.value)}
                              placeholder="أضف مفاتيح إضافية هنا (كل مفتاح في سطر)..."
                              className="w-full h-32 p-3 ps-12 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-amber-500 transition-all font-mono text-sm"
                          />
                      </div>
                      
                      <button 
                          onClick={handleResume}
                          disabled={!newKeys.trim()}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-4 rounded-xl shadow-lg transition-all disabled:opacity-50"
                      >
                          إكمال المعالجة الآن
                      </button>
                      <button onClick={() => setShowKeyNeededModal(false)} className="mt-4 text-slate-400 hover:text-slate-600 text-xs font-bold">إلغاء المعالجة حالياً</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
