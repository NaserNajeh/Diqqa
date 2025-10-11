import { GoogleGenAI } from "@google/genai";

interface FileInput {
  imageData: string;
  mimeType: string;
}

const handleApiError = (error: unknown): Error => {
  console.error("Error calling Gemini API:", error);
  if (error instanceof Error) {
      if (error.message.includes('API key not valid')) {
          return new Error('مفتاح API الذي أدخلته غير صالح. يرجى التحقق منه.');
      }
  }
  return new Error("فشلت معالجة المستندات بواسطة Gemini. قد يكون السبب مشكلة في الشبكة أو في المفتاح.");
}

export async function extractTextFromFiles(apiKey: string, files: FileInput[]): Promise<string> {
  if (files.length === 0) {
    return "";
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const fileParts = files.map(file => ({
      inlineData: {
        mimeType: file.mimeType,
        data: file.imageData,
      },
    }));

    const textPart = {
      text: `مهمتك هي استخراج كل النصوص من الوثائق المقدمة بأعلى دقة ممكنة، بغض النظر عن اللغة.
1.  **دعم متعدد اللغات:** تعرف على واستخرج النصوص بأي لغة كانت (العربية، الإنجليزية، الفرنسية، إلخ) بدقة.
2.  **سلامة الأحرف:** حافظ على جميع الأحرف تمامًا كما تظهر. هذا يشمل:
    *   علامات التشكيل العربية (فتحة، ضمة، كسرة، شدة).
    *   العلامات النطقية والأحرف الخاصة في اللغات الأخرى (مثل é, ü, ñ, ç).
    *   الرموز وعلامات الترقيم الخاصة.
3.  **دمج المحتوى:** ادمج النص المستخرج من جميع الملفات في نص واحد متصل. لا تضف أي فواصل مثل '--- الصفحة ---'. قدم النص النهائي كنص خام متدفق.
يجب أن يكون مخرجك هو النص المستخرج فقط دون أي مقدمات أو ملاحظات إضافية.`,
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, ...fileParts] },
    });

    return response.text;
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function formatTextForWord(apiKey: string, rawText: string): Promise<string> {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `أنت خبير في تنسيق المستندات الأكاديمية العربية. مهمتك هي تحويل النص الخام التالي إلى مستند HTML نظيف ومنظم بالكامل. اتبع هذه القواعد بدقة شديدة:

1.  **بناء الفقرات والعناوين (مهم جدًا للأحجام):**
    *   ادمج الأسطر المتتالية في فقرات متماسكة داخل وسوم \`<p>\`.
    *   حدد العناوين الرئيسية والفصول وضعها في \`<h1><strong>...</strong></h1>\` (سيتم تنسيقها بحجم 18pt).
    *   حدد العناوين الفرعية وضعها في \`<h2><strong>...</strong></h2>\` (سيتم تنسيقها بحجم 16pt).
    *   باقي النص العادي يجب أن يكون داخل وسوم \`<p>\` (سيتم تنسيقه بحجم 14pt).

2.  **إعادة هيكلة الحواشي (Endnotes):**
    *   تعامل مع النص بأكمله كوحدة واحدة.
    *   ابحث عن جميع علامات الحواشي (مثل (1), [2], إلخ) ونصوصها المقابلة.
    *   **أعد ترقيم جميع الحواشي بشكل تسلسلي ومستمر من 1 وحتى النهاية في كامل المستند.**
    *   في النص الأساسي، استبدل علامات الحواشي الأصلية بالرقم التسلسلي الجديد داخل وسم \`<sup>\`. مثال: \`<sup>[1]\</sup>\`.
    *   **اجمع كل نصوص الحواشي في قسم واحد في نهاية المستند تمامًا.**
    *   ضع هذا القسم تحت عنوان \`<h2><strong>الحواشي</strong></h2>\`.
    *   اعرض الحواشي كقائمة مرتبة \`<ol>\` داخل \`div\` له \`class="endnotes"\`.

3.  **الفهرس التلقائي (في نهاية الملف):**
    *   **بعد قسم الحواشي، في نهاية المستند تمامًا،** قم بإدراج فاصل صفحات.
    *   بعد فاصل الصفحات، قم بإدراج كود حقل Microsoft Word لإنشاء فهرس تلقائي. يجب أن يكون الكود هكذا بالضبط:
        \`\`\`html
        <br clear="all" style="mso-special-character:line-break;page-break-before:always" />
        <h1><strong>الفهرس</strong></h1>
        <p class="MsoNormal" style="margin-bottom:12.0pt"><span style="mso-element:field-begin"></span> TOC \\o "1-2" \\h \\z \\u <span style="mso-element:field-separator"></span><span style="mso-element:field-end"></span></p>
        <p style="font-size:10pt;color:#666666;font-style:italic;">ملاحظة: لتحديث أرقام الصفحات، انقر بزر الماوس الأيمن على الفهرس أعلاه واختر "تحديث الحقل".</p>
        \`\`\`
    *   هذا سيضمن أن الفهرس يظهر في صفحة منفصلة في نهاية المستند ويحتوي على أرقام الصفحات الصحيحة التي يحسبها برنامج Word.

4.  **قواعد الإخراج الصارمة:**
    *   لا تضف أي فواصل أفقية \`<hr>\`.
    *   يجب أن يكون الإخراج النهائي عبارة عن سلسلة HTML واحدة فقط تحتوي على المحتوى الذي سيوضع داخل وسم \`<body>\`.
    *   **لا تقم أبدًا بتضمين وسوم \`<html>\`, \`<head>\`, \`<body>\`, أو علامات markdown مثل \`\`\`html\` في استجابتك. الإخراج يجب أن يكون HTML خام ونظيف.**
    *   يجب أن يكون النص بأكمله داخل \`<div>\` رئيسي مع \`dir="rtl"\`.

5.  **الإكمال الإلزامي:** يجب عليك معالجة النص المُقدم بالكامل من البداية إلى النهاية. لا تقتطع المخرج أبدًا.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { text: prompt },
                { text: "النص الخام المراد تنسيقه هو:\n\n" + rawText }
            ],
            config: {
                // Set a higher output limit to handle large documents.
                maxOutputTokens: 32000, 
                // Reserve a small budget for thinking to maximize output tokens.
                thinkingConfig: { thinkingBudget: 1000 },
            }
        });

        return response.text;

    } catch (error) {
        throw handleApiError(error);
    }
}


export async function translateTextAndFormatForWord(
    apiKey: string,
    originalText: string, 
    targetLanguage: string, 
    domain: string
): Promise<string> {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `أنت مترجم وخبير تنسيق مستندات محترف للغاية، متخصص في النصوص ذات الطابع "${domain}". مهمتك المزدوجة هي:
1.  **الترجمة الدقيقة:** ترجم النص التالي إلى اللغة "${targetLanguage}" بأعلى درجات الدقة والاحترافية، مع استخدام المصطلحات الصحيحة الخاصة بمجال "${domain}".
2.  **التنسيق لبرنامج Word:** قم بتنسيق النص المترجم بالكامل إلى مستند HTML نظيف ومنظم. اتبع هذه القواعد الصارمة:

**قواعد التنسيق للمستند المترجم:**
1.  **بناء الفقرات والعناوين (مهم جدًا للأحجام):**
    *   ادمج الأسطر المتتالية في فقرات متماسكة داخل وسوم \`<p>\`.
    *   حدد العناوين الرئيسية والفصول وضعها في \`<h1><strong>...</strong></h1>\` (سيتم تنسيقها بحجم 16pt).
    *   حدد العناوين الفرعية وضعها في \`<h2><strong>...</strong></h2>\` (سيتم تنسيقها بحجم 14pt).
    *   باقي النص العادي يجب أن يكون داخل وسوم \`<p>\` (سيتم تنسيقه بحجم 12pt).

2.  **إعادة هيكلة الحواشي (Endnotes):**
    *   ابحث عن جميع علامات الحواشي ونصوصها المقابلة في النص المترجم.
    *   **أعد ترقيم جميع الحواشي بشكل تسلسلي ومستمر من 1 وحتى النهاية.**
    *   في النص الأساسي، استبدل علامات الحواشي الأصلية بالرقم التسلسلي الجديد داخل وسم \`<sup>\`. مثال: \`<sup>[1]\</sup>\`.
    *   **اجمع كل نصوص الحواشي في قسم واحد في نهاية المستند تمامًا.**
    *   ضع هذا القسم تحت عنوان \`<h2><strong>Notes</strong></h2>\` (أو ما يعادله في اللغة المستهدفة).
    *   اعرض الحواشي كقائمة مرتبة \`<ol>\` داخل \`div\` له \`class="endnotes"\`.

3.  **الفهرس التلقائي (في نهاية الملف):**
    *   **بعد قسم الحواشي، في نهاية المستند تمامًا،** قم بإدراج فاصل صفحات.
    *   بعد فاصل الصفحات، قم بإدراج كود حقل Microsoft Word لإنشاء فهرس تلقائي. يجب أن يكون الكود هكذا بالضبط:
        \`\`\`html
        <br clear="all" style="mso-special-character:line-break;page-break-before:always" />
        <h1><strong>Table of Contents</strong></h1>
        <p class="MsoNormal" style="margin-bottom:12.0pt"><span style="mso-element:field-begin"></span> TOC \\o "1-2" \\h \\z \\u <span style="mso-element:field-separator"></span><span style="mso-element:field-end"></span></p>
        <p style="font-size:10pt;color:#666666;font-style:italic;">Note: To update page numbers, right-click the table of contents and select "Update Field".</p>
        \`\`\`
    *   (استخدم الترجمة المناسبة لعنوان "الفهرس" و"الملاحظة" حسب اللغة المستهدفة).

4.  **قواعد الإخراج الصارمة:**
    *   لا تضف أي فواصل أفقية \`<hr>\`.
    *   يجب أن يكون الإخراج النهائي عبارة عن سلسلة HTML واحدة فقط.
    *   **لا تقم أبدًا بتضمين وسوم \`<html>\`, \`<head>\`, \`<body>\`, أو علامات markdown مثل \`\`\`html\` في استجابتك. الإخراج يجب أن يكون HTML خام ونظيف.**
    *   ضع النص بأكمله داخل \`<div>\` رئيسي.

5.  **الإكمال الإلزامي:** يجب عليك معالجة النص المُقدم بالكامل من البداية إلى النهاية. لا تقتطع المخرج أبدًا.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { text: prompt },
                { text: "النص الخام المراد ترجمته وتنسيقه هو:\n\n" + originalText }
            ],
            config: {
                maxOutputTokens: 32000, 
                thinkingConfig: { thinkingBudget: 1000 },
            }
        });

        return response.text;

    } catch (error) {
        throw handleApiError(error);
    }
}