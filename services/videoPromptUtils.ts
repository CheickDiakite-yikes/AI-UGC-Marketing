const VIDEO_CONSTRAINTS_BLOCK = [
  "[VIDEO CONSTRAINTS]",
  "- Max duration: 8 seconds total. Finish the primary action by 7s.",
  "- Single scene or at most two quick cuts; avoid long multi-scene sequences.",
  "- Hook in the first 1s, payoff by 6s, end on a complete beat (no cliffhanger).",
  "- Keep any on-screen text to 1-3 words max."
].join("\n");

const VIDEO_QUALITY_BLOCK = [
  "[VIDEO QUALITY]",
  "- Keep subject identity consistent across frames; no morphing or sudden changes.",
  "- Accurate anatomy: correct limb count, natural hands, no extra fingers/limbs.",
  "- Hands interacting with objects must be fully visible and aligned with contact points.",
  "- Physics must look real: button presses, taps, and grabs show clear contact and response.",
  "- Avoid on-screen text unless explicitly requested; if needed, keep it 1-3 words and exact.",
  "- Minimize motion blur and avoid rapid camera shakes that distort the subject."
].join("\n");

export function applyVideoDurationGuardrails(prompt: string): string {
  if (!prompt) {
    return `${VIDEO_CONSTRAINTS_BLOCK}\n\n${VIDEO_QUALITY_BLOCK}`;
  }
  const hasConstraints = prompt.includes("[VIDEO CONSTRAINTS]");
  const hasQuality = prompt.includes("[VIDEO QUALITY]");
  if (hasConstraints && hasQuality) {
    return prompt;
  }
  const blocks: string[] = [];
  if (!hasConstraints) blocks.push(VIDEO_CONSTRAINTS_BLOCK);
  if (!hasQuality) blocks.push(VIDEO_QUALITY_BLOCK);
  return `${prompt}\n\n${blocks.join("\n\n")}`;
}
