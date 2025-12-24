
import { GoogleGenAI } from "@google/genai";

interface FileInput {
  imageData: string;
  mimeType: string;
}

// دالة لجلب قائمة المفاتيح من التخزين المحلي
const getApiKeys = (): string[] => {
    const rawKeys = localStorage.getItem('user_gemini_api_key') || "";
    return rawKeys.split('\n').map(k => k.trim()).filter(k => k !== "");
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class AllKeysExhaustedError extends Error {
    constructor() {
        super("EXHAUSTED_KEYS");
        this.name = "AllKeysExhaustedError";
    }
}

const handleApiError = (error: unknown): Error => {
  const errStr = String(error);
  if (errStr.includes("EXHAUSTED_KEYS")) return error as Error;

  let detailedMessage = "حدث خطأ أثناء الاتصال بالخادم.";
  if (errStr.includes('API_KEY_INVALID')) {
    detailedMessage = "أحد المفاتيح غير صالح. يرجى مراجعة القائمة.";
  } else if (errStr.includes('429') || errStr.includes('QUOTA_EXCEEDED')) {
    detailedMessage = "انتهى حد الاستخدام لجميع المفاتيح المتوفرة حالياً.";
  } else {
    detailedMessage = `خطأ تقني: ${errStr.substring(0, 150)}...`;
  }
  return new Error(detailedMessage);
}

const DEFAULT_MODEL = 'gemini-3-flash-preview';

/**
 * دالة ذكية لإجراء الطلب مع تدوير المفاتيح تلقائياً
 */
async function callApiWithRotation(params: any): Promise<any> {
    const keys = getApiKeys();
    const finalKeys = keys.length > 0 ? keys : [(process.env.API_KEY || "").trim()];
    
    if (finalKeys.length === 0 || !finalKeys[0]) {
        throw new Error("يرجى إدخال مفتاح API واحد على الأقل.");
    }

    for (const key of finalKeys) {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            const response = await ai.models.generateContent(params);
            return response;
        } catch (error: any) {
            const errStr = String(error);
            // إذا كان الخطأ متعلق بحد الاستخدام (429) أو مشكلة مؤقتة في الخادم (503)، ننتقل للمفتاح التالي
            if (errStr.includes('429') || errStr.includes('QUOTA_EXCEEDED') || errStr.includes('503') || errStr.includes('500')) {
                console.warn(`Key starting with ${key.substring(0, 5)}... reached limit or had error, rotating...`);
                continue;
            }
            throw error; // الأخطاء الأخرى مثل مفتاح خاطئ تماماً يتم رميها فوراً
        }
    }
    throw new AllKeysExhaustedError();
}

export async function extractTextFromFiles(
  files: FileInput[], 
  onProgress?: (processed: number, total: number) => void
): Promise<string> {
  if (files.length === 0) return "";
  
  let fullExtractedText = "";
  const BATCH_SIZE = 6;
  const chunks = [];
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    chunks.push(files.slice(i, i + BATCH_SIZE));
  }

  try {
    let processedFiles = 0;
    for (let i = 0; i < chunks.length; i++) {
      const currentChunk = chunks[i];
      const fileParts = currentChunk.map(file => ({
        inlineData: { mimeType: file.mimeType, data: file.imageData },
      }));

      const response = await callApiWithRotation({
          model: DEFAULT_MODEL,
          contents: { parts: [
              { text: "TASK: HIGH-PRECISION ARABIC OCR. EXTRACT ALL TEXT WITH DIACRITICS. PRESERVE EVERY WORD." },
              ...fileParts
          ] },
          config: { thinkingConfig: { thinkingBudget: 0 } }
      });

      fullExtractedText += (response.text || "") + "\n\n";
      processedFiles += currentChunk.length;
      if (onProgress) onProgress(processedFiles, files.length);
      await delay(800);
    }
    return fullExtractedText.trim();
  } catch (error) {
    throw handleApiError(error);
  }
}

function splitTextIntoChunks(text: string, maxChars: number = 7000): string[] {
    const chunks: string[] = [];
    let currentPos = 0;
    while (currentPos < text.length) {
        let endPos = currentPos + maxChars;
        if (endPos < text.length) {
            const nextNewline = text.lastIndexOf('\n', endPos);
            if (nextNewline > currentPos + (maxChars * 0.6)) {
                endPos = nextNewline;
            }
        }
        chunks.push(text.substring(currentPos, endPos));
        currentPos = endPos;
    }
    return chunks;
}

export async function formatTextForWord(
    rawText: string, 
    processFootnotes: boolean,
    onProgress?: (current: number, total: number) => void,
    startIndex: number = 0
): Promise<string> {
    try {
        const textChunks = splitTextIntoChunks(rawText);
        let fullHtml = "";

        for (let i = startIndex; i < textChunks.length; i++) {
            if (onProgress) onProgress(i + 1, textChunks.length);
            
            const response = await callApiWithRotation({
                model: DEFAULT_MODEL,
                contents: {
                    parts: [
                        { text: `TASK: CONVERT TEXT CHUNK TO ACADEMIC HTML FOR MS WORD. CHUNK ${i+1}/${textChunks.length}. PRESERVE DIACRITICS AND FOOTNOTES.` },
                        { text: textChunks[i] }
                    ]
                },
                config: { thinkingConfig: { thinkingBudget: 0 } }
            });

            fullHtml += (response.text || "").replace(/`{3}(html)?/g, '').trim() + "\n";
            await delay(1000);
        }
        return fullHtml;
    } catch (error) {
        throw handleApiError(error);
    }
}

export async function translateTextAndFormatForWord(
    originalText: string, 
    targetLanguage: string, 
    domain: string,
    processFootnotes: boolean,
    onProgress?: (current: number, total: number) => void
): Promise<string> {
    try {
        const textChunks = splitTextIntoChunks(originalText, 4500); 
        let fullHtml = "";

        for (let i = 0; i < textChunks.length; i++) {
            if (onProgress) onProgress(i + 1, textChunks.length);

            const response = await callApiWithRotation({
                model: DEFAULT_MODEL,
                contents: {
                    parts: [
                        { text: `TASK: TRANSLATE TO ${targetLanguage} (${domain}). OUTPUT HTML ONLY. DO NOT REMOVE CONTENT.` },
                        { text: textChunks[i] }
                    ]
                },
                config: { thinkingConfig: { thinkingBudget: 0 } }
            });

            fullHtml += (response.text || "").replace(/`{3}(html)?/g, '').trim() + "\n";
            await delay(1200);
        }
        return fullHtml;
    } catch (error) {
        throw handleApiError(error);
    }
}
