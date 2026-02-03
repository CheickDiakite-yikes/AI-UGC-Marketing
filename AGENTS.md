# Predi AI Agent Context

## Product Summary
Predi AI is an AI-native marketing OS that generates campaigns, images, videos, and carousels. It uses Gemini models for text/image generation and Veo for video generation, grounded by brand identity, avatar identity, and product catalogs.
It includes a long-video pipeline with storyboard approval, a Reference Kit for continuity, and a public Showcase page curated from admin favorites.

## Models and Defaults
- Images: `gemini-3-pro-image-preview` (Nano Banana Pro).
- Video:
  - `veo-3.1-generate-preview` when Quality Mode or references are used.
  - `veo-3.1-fast-generate-preview` otherwise.
- Video reference frames (auto): `gemini-3-pro-image-preview`.
- Reference slots: up to 3 ordered slots with roles `avatar`, `item`, `setting`.
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

## Reference Kit and Continuity
- Reference Kit UI: `components/StoryboardReferenceKit.tsx` (roles: avatar, item, setting).
- Reference inputs flow through `referenceSelections` + `referenceMode` (manual, hybrid, auto).
- Resolution lives in `services/videoIngredientService.ts`:
  - Manual selections are honored.
  - Hybrid/auto can fill missing slots and inject avatar identity references.
- Long-video pipeline uses continuity references even when avatar assets exist.

## Long Video (15-30s)
- Tool: `generate_long_video` (multi-scene, 4/6/8s per scene, total <= 30s).
- Pipeline: `services/longVideoPipeline.ts` generates scenes, extracts continuity frames, and stitches via `services/videoStitchService.ts`.
- Storyboard approval required: chat proposes storyboard first and only queues generation after user approval.
- Storyboards are persisted in the `storyboards` table with status and payload; chat shows approve/cancel/edit actions.
- Chat shows a small in-chat tracker pill for long-video rendering during active jobs.
- 1080p long-video scenes must be 8s each; otherwise resolution auto-falls back to 720p.
- Each scene is stored as a `video` item with `meta.isScene` + `sceneIndex`.
- Final stitched video is a `video` item with `meta.isLongVideo`, `sceneItemIds`, `sceneCount`, `totalDurationSeconds`.
- Video usage/credits are charged per scene (sceneCount).
- Long video is a paid feature (locked on Free plan).

## Pricing, Credits, ROI
- Credits (see `services/usageLimits.ts`):
  - Images: 1 credit.
  - Videos: derived from target margin and credit pack price floor; do not hardcode.
- Credit pricing helpers: `services/pricing.ts`.
- Plans (see `services/subscriptionPlans.ts`):
  - Basic: 50 images, 3 videos.
  - Pro: 150 images, 10 videos.
  - Credit packs: 50/$20, 100/$38, 200/$75.
- ROI/Cost in `components/Sidebar.tsx` uses per-item metadata:
  - `qualityMode`, `referenceCount`, `autoReferenceUsed`, `slideCount`.

## Research Ideas UX
- Research outputs include an "IDEA OPTIONS" block with clickable ideas in chat.
- Idea parsing lives in `components/ChatInterface.tsx`.

## Generation Progress UX
- Chat shows a Generation Queue with per-item ETA/progress for image/video jobs.
- Progress metadata is stored in pending items as `meta.queuedAt`.

## Showcase Page
- Public showcase view aggregates admin favorites (`zorovt18@gmail.com`).
- Data: `app/actions/showcaseActions.ts`.
- UI: `components/ShowcasePage.tsx`, routed in `App.tsx`.

## Aha Pack (Freebie)
- One-time free pack for free users: 1 image, 1 two-slide carousel, 1 HQ video.
- Redeemed via `app/api/aha-pack/route.ts` with `freebie: true` on jobs.
- Quota/usage is bypassed when `payload.freebie === true` in:
  - `server/jobRunner.ts`
  - `app/api/jobs/process/route.ts`
- User flags: `users.ahaPackUsed`, `users.ahaPackUsedAt`.

## Dashboard Calendar
- New dashboard tab at `/profile/dashboard`.
- Calendar supports multi-asset scheduling per day, edit/reschedule, and removal.
- Drag-and-drop rescheduling on pointer-fine devices; edit flow for mobile.
- Bulk actions: clear a day, duplicate a day to next week.
- Undo toasts for bulk and move actions.
- Data/actions: `app/actions/calendarActions.ts`.
- UI: `components/DashboardCalendar.tsx`.
- Table: `calendar_items`.

## Key Files
- Chat + tools: `services/geminiService.ts`
- Video API: `app/actions.ts`
- Video jobs: `server/jobRunner.ts`, `app/api/jobs/process/route.ts`
- Video guardrails: `services/videoPromptUtils.ts`
- Auto references: `services/videoReferenceService.ts`
- Long video pipeline: `services/longVideoPipeline.ts`, `services/videoStitchService.ts`
- Pricing/limits: `services/subscriptionPlans.ts`, `services/usageLimits.ts`
- Pricing helpers: `services/pricing.ts`
- ROI display: `components/Sidebar.tsx`
- Calendar actions: `app/actions/calendarActions.ts`
- Calendar UI: `components/DashboardCalendar.tsx`
- Showcase UI: `components/ShowcasePage.tsx`
- Showcase data: `app/actions/showcaseActions.ts`
- Reference Kit: `components/StoryboardReferenceKit.tsx`

## Current Work / Handoff (January 31, 2026)
Focus: improve agentic use of real brand assets (logos, UI screenshots, product images) for images + short videos.

### Recent Changes (uncommitted)
- **Short video grounding**
  - Video generation now supports **initial frame (image-to-video)** from real assets with safe fallback (retry without frame).
  - Stronger video guardrails to reduce spelling mistakes, morphing, and bad UI taps.
  - Logo refs are injected when prompt implies branding; warnings when logo missing.
  - Files: `services/videoIngredientService.ts`, `server/jobRunner.ts`, `app/api/jobs/process/route.ts`, `app/actions.ts`, `services/videoPromptUtils.ts`.

- **Prompt-aware asset selection**
  - Brand images are now scored by prompt intent (UI/demo vs packaging vs lifestyle vs product vs setting) using metadata + filename.
  - Ensures logo is included when prompts mention logo/brand unless user says “no logo”.
  - Works for **images + carousels** in both job runner and API processor.
  - Files: `services/brandAssetService.ts`, `server/jobRunner.ts`, `app/api/jobs/process/route.ts`.

- **Asset metadata improvements**
  - Profile asset uploads now record `metadata.imageType` (inferred from filename or optional form input).
  - Profile assets return `imageType` in API; asset catalog now includes `category` + `imageType` so the chat agent can select better assets.
  - Files: `app/actions/profileLibraryActions.ts`, `app/actions/boardActions.ts`, `types.ts`.

### Known To‑Dos / Next Steps
- Add UI control to let users explicitly label brand images (UI / Product / Lifestyle / Packaging / Setting) instead of filename inference.
- Consider auto‑tagging existing profile assets to backfill `imageType` (optional).
- Restart job runner after build to pick up new selection logic.

### Testing (January 31, 2026)
- `npm run build` fails with “Build failed because of webpack errors” but Next doesn’t surface the specific error in this environment.
- Attempted DB lookup for `zorovt18@gmail.com` via `psql` failed (host `helium` not resolvable; localhost connect also failed).

### Notes
- Long video pipeline is intentionally deferred for now (user wants focus on short videos).
- Reference limit: 3 for Veo; image refs: 14 for Gemini image.
