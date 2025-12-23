
interface Base64File {
  base64: string;
  mimeType: string;
  dataUrl: string;
}

declare const PDFLib: any;

export const fileToBase64 = (file: File): Promise<Base64File> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        return reject(new Error('الملف المحدد ليس صورة أو ملف PDF.'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, mimeType: file.type, dataUrl });
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * وظيفة لتقسيم ملف PDF إلى صفحات متعددة (Base64 لكل صفحة)
 */
export const splitPdfIntoPages = async (file: File): Promise<Base64File[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pageCount = pdfDoc.getPageCount();
    const pages: Base64File[] = [];

    for (let i = 0; i < pageCount; i++) {
        const newDoc = await PDFLib.PDFDocument.create();
        const [copiedPage] = await newDoc.copyPages(pdfDoc, [i]);
        newDoc.addPage(copiedPage);
        const pdfBytes = await newDoc.save();
        const base64 = btoa(
            new Uint8Array(pdfBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        pages.push({
            base64,
            mimeType: 'application/pdf',
            dataUrl: `data:application/pdf;base64,${base64}`,
            name: `${file.name} (الصفحة ${i + 1})`
        } as any);
    }
    return pages;
};
