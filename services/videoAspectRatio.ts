export type VideoAspectRatio = '16:9' | '9:16';

const EXPLICIT_RATIO_REGEX = /(9\s*:\s*16|16\s*:\s*9|9x16|16x9)/i;
const VERTICAL_HINTS_REGEX = /(tiktok|reels?|shorts|story|stories|snapchat|vertical|portrait|mobile|phone|9x16|9\s*:\s*16)/i;
const HORIZONTAL_HINTS_REGEX = /(youtube|widescreen|horizontal|landscape|cinematic|desktop|tv|broadcast|16x9|16\s*:\s*9)/i;

const normalizeRatioToken = (token: string): VideoAspectRatio | undefined => {
  const cleaned = token.replace(/\s/g, '').toLowerCase();
  if (cleaned === '9:16' || cleaned === '9x16') return '9:16';
  if (cleaned === '16:9' || cleaned === '16x9') return '16:9';
  return undefined;
};

export const inferAspectRatioFromText = (text?: string | null): VideoAspectRatio | undefined => {
  if (!text) return undefined;
  const explicit = EXPLICIT_RATIO_REGEX.exec(text);
  if (explicit?.[0]) {
    return normalizeRatioToken(explicit[0]);
  }

  const wantsVertical = VERTICAL_HINTS_REGEX.test(text);
  const wantsHorizontal = HORIZONTAL_HINTS_REGEX.test(text);

  if (wantsVertical && !wantsHorizontal) return '9:16';
  if (wantsHorizontal && !wantsVertical) return '16:9';
  return undefined;
};

export const inferAspectRatioFromLongVideoPayload = (payload?: {
  aspectRatio?: string | null;
  prompt?: string | null;
  scenes?: Array<{ prompt?: string | null }> | null;
}): VideoAspectRatio | undefined => {
  if (!payload) return undefined;
  if (payload.aspectRatio === '9:16' || payload.aspectRatio === '16:9') {
    return payload.aspectRatio;
  }

  const sceneText = Array.isArray(payload.scenes)
    ? payload.scenes.map(scene => scene?.prompt).filter(Boolean).join(' ')
    : '';
  const combined = [payload.prompt, sceneText].filter(Boolean).join(' ');
  return inferAspectRatioFromText(combined);
};
