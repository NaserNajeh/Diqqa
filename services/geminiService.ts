
import { GoogleGenAI } from "@google/genai";

interface FileInput {
  imageData: string;
  mimeType: string;
}

const getApiKey = () => {
    const manualKey = localStorage.getItem('user_gemini_api_key');
    if (manualKey && manualKey.trim() !== "") {
        return manualKey.trim();
    }
    return (process.env.API_KEY || "").trim();
};

const handleApiError = (error: unknown): Error => {
  console.error("Detailed API Error:", error);
  const errStr = String(error);
  
  let detailedMessage = "حدث خطأ أثناء الاتصال بالخادم.";
  
  if (errStr.includes('API_KEY_INVALID')) {
    detailedMessage = "مفتاح API غير صالح. يرجى التأكد من نسخه من Google AI Studio بشكل صحيح.";
  } else if (errStr.includes('429') || errStr.includes('QUOTA_EXCEEDED')) {
    detailedMessage = "تجاوزت حد الاستخدام (Free Tier). انتظر دقيقة واحدة أو استخدم مفتاحاً آخر.";
  } else if (errStr.includes('403') || errStr.includes('PERMISSION_DENIED')) {
    detailedMessage = "تم رفض الوصول. تأكد من تفعيل الموديل في حسابك.";
  } else {
    detailedMessage = `خطأ تقني: ${errStr.substring(0, 150)}...`;
  }

  return new Error(detailedMessage);
}

const DEFAULT_MODEL = 'gemini-3-flash-preview';

/**
 * دالة لاستخراج النص بنظام الدفعات لضمان معالجة عدد كبير من الصفحات
 */
export async function extractTextFromFiles(
  files: FileInput[], 
  onProgress?: (processed: number, total: number) => void
): Promise<string> {
  const key = getApiKey();
  if (!key) throw new Error("يرجى إدخل مفتاح API.");

  if (files.length === 0) return "";
  
  const ai = new GoogleGenAI({ apiKey: key });
  let fullExtractedText = "";
  
  // رفع حجم الدفعة إلى 6 صفحات لمزيد من السرعة، مع ضمان استقرار المخرجات
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

      const textPart = {
        text: `TASK: HIGH-PRECISION ARABIC OCR. 
MANDATORY: EXTRACT ALL TEXT FROM THE PROVIDED ${currentChunk.length} IMAGES/PAGES.
RULES:
1. OUTPUT THE EXTRACTED TEXT ONLY.
2. DO NOT ADD ANY COMMENTS, PAGE HEADERS, OR STATUS MESSAGES LIKE "PROCESSING PAGE X".
3. PRESERVE FULL ARABIC DIACRITICS (TASHKEEL).
4. DO NOT SUMMARIZE.`,
      };

      const response = await ai.models.generateContent({
          model: DEFAULT_MODEL,
          contents: { parts: [textPart, ...fileParts] },
          config: { thinkingConfig: { thinkingBudget: 0 } }
      });

      const extractedBatch = response.text || "";
      fullExtractedText += extractedBatch + "\n\n";
      
      processedFiles += currentChunk.length;
      if (onProgress) {
        onProgress(processedFiles, files.length);
      }
      
      // تأخير بسيط لتجنب Rate Limit
      if (chunks.length > 1 && i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    return fullExtractedText.trim();
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function formatTextForWord(rawText: string, processFootnotes: boolean): Promise<string> {
    const key = getApiKey();
    if (!key) throw new Error("يرجى إدخال مفتاح API.");

    try {
        const ai = new GoogleGenAI({ apiKey: key });

        let instructions = `
TASK: RECONSTRUCT RAW TEXT INTO PROFESSIONAL ACADEMIC HTML FOR MS WORD.
- ABSOLUTELY NO CONTENT REMOVAL.
- USE <h1>, <h2>, <p> TAGS.
`;
        if (processFootnotes) {
            instructions += `- MANDATORY: IDENTIFY FOOTNOTE MARKERS AND GROUP THEM AT THE END UNDER <h2>الحواشي</h2>.\n`;
        }

        const response = await ai.models.generateContent({
            model: DEFAULT_MODEL,
            contents: {
                parts: [
                    { text: instructions },
                    { text: "SOURCE TEXT TO FORMAT:\n\n" + rawText }
                ]
            },
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });

        return response.text || "";
    } catch (error) {
        throw handleApiError(error);
    }
}

export async function translateTextAndFormatForWord(
    originalText: string, 
    targetLanguage: string, 
    domain: string,
    processFootnotes: boolean
): Promise<string> {
    const key = getApiKey();
    if (!key) throw new Error("يرجى إدخال مفتاح API.");

    try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
            model: DEFAULT_MODEL,
            contents: {
                parts: [
                    { text: `TRANSLATE THE ENTIRE TEXT TO ${targetLanguage} (${domain} context). OUTPUT FULL TEXT FORMATTED AS HTML.` },
                    { text: originalText }
                ]
            },
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return response.text || "";
    } catch (error) {
        throw handleApiError(error);
    }
}
