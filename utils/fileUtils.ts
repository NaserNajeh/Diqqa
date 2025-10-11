
interface Base64File {
  base64: string;
  mimeType: string;
  dataUrl: string;
}

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
