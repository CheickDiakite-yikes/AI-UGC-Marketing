import { describe, it, expect } from 'vitest';
import { inferAspectRatioFromLongVideoPayload, inferAspectRatioFromText } from '../services/videoAspectRatio';

describe('Video Aspect Ratio Inference', () => {
  it('infers explicit ratios from text', () => {
    expect(inferAspectRatioFromText('Render in 9:16 for TikTok')).toBe('9:16');
    expect(inferAspectRatioFromText('Make it 16:9 cinematic')).toBe('16:9');
    expect(inferAspectRatioFromText('Deliver 9x16 vertical')).toBe('9:16');
  });

  it('infers vertical platforms as 9:16', () => {
    expect(inferAspectRatioFromText('A viral TikTok reel')).toBe('9:16');
    expect(inferAspectRatioFromText('Instagram Stories format')).toBe('9:16');
  });

  it('infers horizontal platforms as 16:9', () => {
    expect(inferAspectRatioFromText('YouTube pre-roll ad')).toBe('16:9');
    expect(inferAspectRatioFromText('cinematic landscape shot')).toBe('16:9');
  });

  it('returns undefined when signals conflict', () => {
    expect(inferAspectRatioFromText('YouTube short and TikTok')).toBeUndefined();
  });

  it('respects explicit payload aspectRatio', () => {
    expect(inferAspectRatioFromLongVideoPayload({ aspectRatio: '9:16', prompt: 'cinematic landscape' })).toBe('9:16');
  });

  it('uses scene prompts when main prompt is empty', () => {
    const aspect = inferAspectRatioFromLongVideoPayload({
      scenes: [{ prompt: 'vertical tiktok story vibe' }]
    });
    expect(aspect).toBe('9:16');
  });
});
