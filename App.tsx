import React, { useState, useCallback, useEffect } from 'react';
import { extractTextFromFiles } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ResultDisplay } from './components/ResultDisplay';
import { Footer } from './components/Footer';
import { DocumentFormatter } from './components/DocumentFormatter';
import { OcrIcon, FileTextIcon, KeyIcon, XIcon } from './components/Icons';

interface PreviewState {
  url: string;
  type: string;
  name: string;
  base64: string;
  mimeType: string;
}

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [keyInput, setKeyInput] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (keyInput.trim()) {
      onSave(keyInput.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <KeyIcon className="w-6 h-6 text-blue-500" />
            إعداد مفتاح Gemini API
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          لتفعيل التطبيق، يرجى إدخال مفتاح Gemini API الخاص بك. سيتم حفظ المفتاح في متصفحك فقط.
        </p>
        <div className="mb-4">
          <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            مفتاح API الخاص بك
          </label>
          <input
            id="apiKey"
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="أدخل مفتاحك هنا"
          />
        </div>
        <p className="text-xs text-slate-500 mb-6">
          ليس لديك مفتاح؟{' '}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
            احصل على مفتاح من Google AI Studio
          </a>
        </p>
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-300 disabled:bg-slate-400"
          disabled={!keyInput.trim()}
        >
          حفظ المفتاح
        </button>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [previews, setPreviews] = useState<PreviewState[]>([]);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'extract' | 'format'>('extract');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini-api-key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini-api-key', key);
  };

  const openApiKeyModal = () => setIsApiKeyModalOpen(true);

  const MAX_FILES = 10;

  const handleFilesUpload = useCallback(async (files: FileList) => {
    if (!files || files.length === 0) return;
    
    const acceptedFiles = Array.from(files);
    if (previews.length + acceptedFiles.length > MAX_FILES) {
      setError(`لا يمكن تحميل أكثر من ${MAX_FILES} ملفات في المرة الواحدة.`);
      return;
    }
    setError(null);

    const newPreviewsPromises = acceptedFiles.map(file => 
      fileToBase64(file).then(result => ({
        url: result.dataUrl,
        type: file.type,
        name: file.name,
        base64: result.base64,
        mimeType: result.mimeType,
      }))
    );
    
    try {
        const newPreviews = await Promise.all(newPreviewsPromises);
        setPreviews(prev => [...prev, ...newPreviews]);
        setExtractedText('');
        setError(null);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'أحد الملفات غير صالح.';
        setError(errorMessage);
    }
  }, [previews.length]);

  const handleExtractText = useCallback(async () => {
    if (previews.length === 0) return;
    if (!apiKey) {
      openApiKeyModal();
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedText('');

    try {
      const filesToProcess = previews.map(p => ({ imageData: p.base64, mimeType: p.mimeType }));
      const text = await extractTextFromFiles(apiKey, filesToProcess);
      setExtractedText(text);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
      setError(`فشل استخراج النص: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [previews, apiKey]);
  
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
      <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)} onSave={handleSaveKey} />
      <Header onApiKeyClick={openApiKeyModal} hasApiKey={!!apiKey} />
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
                />
                <ResultDisplay 
                  text={extractedText} 
                  isLoading={isLoading} 
                  error={error} 
                  hasFiles={previews.length > 0}
                  apiKey={apiKey}
                  openApiKeyModal={openApiKeyModal}
                />
              </div>
            )}

            {activeTab === 'format' && (
              <DocumentFormatter apiKey={apiKey} openApiKeyModal={openApiKeyModal} />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;