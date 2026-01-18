const VIDEO_CONSTRAINTS_BLOCK = [
  "[VIDEO CONSTRAINTS]",
  "- Max duration: 8 seconds total. Finish the primary action by 7s.",
  "- Single scene or at most two quick cuts; avoid long multi-scene sequences.",
  "- Hook in the first 1s, payoff by 6s, end on a complete beat (no cliffhanger).",
  "- Keep any on-screen text to 3-6 words max."
].join("\n");

export function applyVideoDurationGuardrails(prompt: string): string {
  if (!prompt) {
    return VIDEO_CONSTRAINTS_BLOCK;
  }
  if (prompt.includes("[VIDEO CONSTRAINTS]")) {
    return prompt;
  }
  return `${prompt}\n\n${VIDEO_CONSTRAINTS_BLOCK}`;
}
