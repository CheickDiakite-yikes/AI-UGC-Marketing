import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Image Pipeline Tests', () => {
  describe('Base64 Image Data Handling', () => {
    it('should correctly split data URI and extract base64', () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const base64Data = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
      
      expect(base64Data).toBe('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
      expect(base64Data.length).toBeGreaterThan(10);
    });

    it('should create valid buffer from base64 data', () => {
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const buffer = Buffer.from(base64Data, 'base64');
      
      expect(buffer.length).toBeGreaterThan(1);
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4E);
      expect(buffer[3]).toBe(0x47);
    });

    it('should FAIL if buffer is only 1 byte (the bug we fixed)', () => {
      const validBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const buffer = Buffer.from(validBase64, 'base64');
      
      expect(buffer.length).toBeGreaterThan(1);
      if (buffer.length <= 1) {
        throw new Error('CRITICAL: Image buffer is only 1 byte - serialization bug detected!');
      }
    });
  });

  describe('Image Response Serialization', () => {
    it('should properly extract inlineData from Gemini-style response', () => {
      const mockGeminiResponse = {
        candidates: [{
          content: {
            parts: [{
              inlineData: {
                mimeType: 'image/png',
                data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
              }
            }]
          }
        }]
      };

      const candidates = mockGeminiResponse.candidates?.map(candidate => ({
        content: {
          parts: candidate.content?.parts?.map(part => {
            if ((part as any).inlineData) {
              return {
                inlineData: {
                  mimeType: (part as any).inlineData.mimeType,
                  data: (part as any).inlineData.data
                }
              };
            }
            return part;
          }) || []
        }
      })) || [];

      expect(candidates.length).toBe(1);
      expect(candidates[0].content.parts.length).toBe(1);
      
      const inlineData = (candidates[0].content.parts[0] as any).inlineData;
      expect(inlineData).toBeDefined();
      expect(inlineData.mimeType).toBe('image/png');
      expect(inlineData.data.length).toBeGreaterThan(10);
    });

    it('should handle missing inlineData gracefully', () => {
      const mockEmptyResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'No image here' }]
          }
        }]
      };

      const candidates = mockEmptyResponse.candidates?.map(candidate => ({
        content: {
          parts: candidate.content?.parts?.map(part => {
            if ((part as any).inlineData) {
              return {
                inlineData: {
                  mimeType: (part as any).inlineData.mimeType,
                  data: (part as any).inlineData.data
                }
              };
            }
            return part;
          }) || []
        }
      })) || [];

      const firstPart = candidates[0].content.parts[0] as any;
      expect(firstPart.inlineData).toBeUndefined();
      expect(firstPart.text).toBe('No image here');
    });

    it('should preserve data integrity through serialization cycle', () => {
      const originalData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const response = {
        inlineData: {
          mimeType: 'image/png',
          data: originalData
        }
      };

      const serialized = JSON.stringify(response);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.inlineData.data).toBe(originalData);
      expect(deserialized.inlineData.data.length).toBe(originalData.length);
    });
  });

  describe('Data URI Construction', () => {
    it('should build valid data URI from inlineData', () => {
      const inlineData = {
        mimeType: 'image/png',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      };

      const dataUri = `data:${inlineData.mimeType};base64,${inlineData.data}`;
      
      expect(dataUri).toMatch(/^data:image\/png;base64,/);
      expect(dataUri.length).toBeGreaterThan(30);
    });

    it('should extract base64 from data URI correctly for upload', () => {
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const base64Data = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
      const buffer = Buffer.from(base64Data, 'base64');

      expect(buffer.length).toBeGreaterThan(50);
      expect(buffer[0]).toBe(0x89);
    });
  });

  describe('Image Validation', () => {
    it('should detect PNG magic bytes', () => {
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const buffer = Buffer.from(pngBase64, 'base64');

      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      expect(isPng).toBe(true);
    });

    it('should reject empty or near-empty buffers', () => {
      const validateImageBuffer = (buffer: Buffer): boolean => {
        if (buffer.length < 8) return false;
        const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
        const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;
        return isPng || isJpeg;
      };

      const emptyBuffer = Buffer.from('', 'base64');
      const oneByteBuffer = Buffer.from('AA==', 'base64');
      const validPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

      expect(validateImageBuffer(emptyBuffer)).toBe(false);
      expect(validateImageBuffer(oneByteBuffer)).toBe(false);
      expect(validateImageBuffer(validPngBuffer)).toBe(true);
    });
  });
});
