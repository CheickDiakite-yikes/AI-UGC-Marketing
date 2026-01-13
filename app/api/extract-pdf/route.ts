import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/services/pdfService';

export async function POST(request: NextRequest) {
  try {
    const { base64Content } = await request.json();
    
    if (!base64Content) {
      return NextResponse.json(
        { error: 'No PDF content provided' },
        { status: 400 }
      );
    }
    
    const extractedText = await extractTextFromPDF(base64Content);
    
    return NextResponse.json({ text: extractedText });
  } catch (error) {
    console.error('PDF extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from PDF' },
      { status: 500 }
    );
  }
}
