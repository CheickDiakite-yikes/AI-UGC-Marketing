export const IMAGE_LIMIT = Number(process.env.NEXT_PUBLIC_IMAGE_LIMIT || 20);
export const VIDEO_LIMIT = Number(process.env.NEXT_PUBLIC_VIDEO_LIMIT || 5);

export const getRemainingImages = (used: number) => Math.max(0, IMAGE_LIMIT - used);
export const getRemainingVideos = (used: number) => Math.max(0, VIDEO_LIMIT - used);
