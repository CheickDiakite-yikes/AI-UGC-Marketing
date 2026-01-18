# Predi AI Agent Context

## Product Summary
Predi AI is an AI-native marketing OS that generates campaigns, images, videos, and carousels. It uses Gemini models for text/image generation and Veo for video generation, grounded by brand identity, avatar identity, and product catalogs.

## Models and Defaults
- Images: `gemini-3-pro-image-preview` (Nano Banana Pro).
- Video:
  - `veo-3.1-generate-preview` when Quality Mode or references are used.
  - `veo-3.1-fast-generate-preview` otherwise.
- Video reference frames (auto): `gemini-3-pro-image-preview`.
- Default video aspect ratio: 16:9 (use 9:16 for vertical/Reels/TikTok).
- On-screen text in videos: avoid unless explicitly requested; keep 1-3 words max.

## Generation Pipeline (High Level)
1. Chat agent decides tool calls in `services/geminiService.ts`.
2. Jobs created via `/api/jobs` and processed in:
   - `server/jobRunner.ts` (background worker)
   - `app/api/jobs/process/route.ts` (API processor)
3. Prompts are compiled with brand/product/avatar identity in:
   - `services/identityPromptService.ts`
   - `services/identityPromptUtils.ts`
4. Media is generated and stored with metadata; usage and credits are consumed.

## Video Quality Mode (Default ON)
- UI toggle in `components/ChatInterface.tsx`, state in `Workspace.tsx`.
- Adds guardrails in `services/videoPromptUtils.ts`.
- Uses ingredient assets when available (`services/videoIngredientService.ts`).
- If no ingredient assets, auto reference frame is generated in
  `services/videoReferenceService.ts` and passed to Veo (image-to-video).
- Vertical references are attempted in Quality Mode with safe fallback.

## Pricing, Credits, ROI
- Credits (see `services/usageLimits.ts`):
  - Images: 1 credit.
  - Videos: 9 credits (8s + 1 reference frame).
- Plans (see `services/subscriptionPlans.ts`):
  - Basic: 50 images, 3 videos.
  - Pro: 150 images, 10 videos.
  - Credit packs: 50/$20, 100/$38, 200/$75.
- ROI/Cost in `components/Sidebar.tsx` uses per-item metadata:
  - `qualityMode`, `referenceCount`, `autoReferenceUsed`, `slideCount`.

## Key Files
- Chat + tools: `services/geminiService.ts`
- Video API: `app/actions.ts`
- Video jobs: `server/jobRunner.ts`, `app/api/jobs/process/route.ts`
- Video guardrails: `services/videoPromptUtils.ts`
- Auto references: `services/videoReferenceService.ts`
- Pricing/limits: `services/subscriptionPlans.ts`, `services/usageLimits.ts`
- ROI display: `components/Sidebar.tsx`
