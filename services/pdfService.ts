export async function extractTextFromPDF(base64Content: string): Promise<string> {
  try {
    const pdfParse = require('pdf-parse');
    const base64Data = base64Content.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '';
  }
}
