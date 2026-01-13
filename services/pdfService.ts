import { generateContentServer } from '../app/actions';

export async function extractTextFromPDF(base64Content: string): Promise<string> {
  try {
    const base64Data = base64Content.replace(/^data:application\/pdf;base64,/, '');
    
    const extractionPrompt = `You are a document extraction specialist. Extract ALL text content from this PDF document.

INSTRUCTIONS:
1. Extract every word, number, heading, paragraph, bullet point, and table
2. Preserve the document structure (headings, sections, lists)
3. Include all details - company names, features, statistics, dates, names
4. Do NOT summarize - extract the COMPLETE raw text
5. Format tables as readable text
6. Include any captions, footnotes, or small print

OUTPUT: Return ONLY the extracted text content, nothing else. No commentary, no "Here is the text:", just the raw document content.`;

    const response = await generateContentServer(
      'gemini-2.5-flash',
      {
        parts: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data
            }
          },
          { text: extractionPrompt }
        ]
      },
      {}
    );

    const extractedText = response?.text || '';
    
    if (!extractedText || extractedText.length < 50) {
      console.error('PDF extraction returned insufficient content');
      return '';
    }
    
    return extractedText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '';
  }
}
