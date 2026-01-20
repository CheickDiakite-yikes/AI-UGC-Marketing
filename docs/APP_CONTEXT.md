# Predi AI App Context

## Product Summary
Predi AI is an AI-native marketing OS that generates campaigns, images, videos, and carousels. It uses Gemini models for text/image generation and Veo for video generation, grounded by brand identity, avatar identity, and product catalogs.
It includes a multi-scene long-video pipeline, a Reference Kit for continuity, and a Showcase page curated from admin favorites.

## Core Architecture
- Frontend: React/TypeScript app with a central `Workspace` orchestrating chat and generation jobs.
- Backend: Next.js server actions + job queue stored in Postgres (Drizzle ORM).
- Storage: Media is uploaded to object storage; DB stores `storageKey` references.
- Identity grounding: Brand, avatar, and product constraints are appended to prompts before generation.

## Key Models
- Image generation: `gemini-3-pro-image-preview` (Nano Banana Pro).
- Video generation:
  - `veo-3.1-generate-preview` when Quality Mode or references are used.
  - `veo-3.1-fast-generate-preview` otherwise.
- Reference frames for videos: `gemini-3-pro-image-preview`.

## Generation Pipeline (High Level)
1. User prompt -> `chatWithMarketingAgent` decides tool calls.
2. Jobs are created via `/api/jobs` and processed by:
   - `server/jobRunner.ts` (background worker) and/or
   - `app/api/jobs/process/route.ts` (API processor).
3. Prompts are compiled with brand/product/avatar identity in:
   - `services/identityPromptService.ts`
   - `services/identityPromptUtils.ts`
4. Media is generated and stored with metadata; usage and credits are consumed.

## Video Generation Details
- Prompt guardrails are applied in `services/videoPromptUtils.ts`:
  - Duration and pacing constraints.
  - Quality constraints (anatomy, physics, text limits).
- Reference images:
  - If ingredient assets are available, they are used (`services/videoIngredientService.ts`).
  - If none and Quality Mode is ON, a reference frame is generated from the prompt
    using Nano Banana Pro (`services/videoReferenceService.ts`) and passed to Veo.
  - Vertical references are attempted in Quality Mode with a safe fallback.
- Quality Mode:
  - Default ON in UI.
  - Uses Veo preview model and auto reference frames by default.
- Reference Kit:
  - Roles: avatar, item, setting.
  - Inputs: `referenceSelections` + `referenceMode` (manual, hybrid, auto).
  - Resolution happens in `services/videoIngredientService.ts`.

## Long Video (15-30s)
- Tool: `generate_long_video` (multi-scene, 4/6/8s per scene, total <= 30s).
- Scenes are generated individually and stitched with ffmpeg.
- Pipeline code: `services/longVideoPipeline.ts` + `services/videoStitchService.ts`.
- Storyboard approval required: `Workspace.tsx` stores pending storyboards and only queues jobs after user approval.
- Storyboards are persisted in the `storyboards` table (payload + status) and mapped onto chat messages for approval/edit.
- In-chat tracker pill shows long-video rendering while jobs run.
- 1080p long-video scenes must be 8s each; otherwise resolution falls back to 720p.
- Each scene is stored as a video item with `meta.isScene`.
- Final stitched video is a video item with `meta.isLongVideo` and `sceneItemIds`.
- Usage/credits are charged per scene (sceneCount).
- Long video is locked for Free users (paid plans only).

## Image and Carousel Generation
- All images use Nano Banana Pro via `generateMarketingImage` in `services/geminiService.ts`.
- Carousels generate slides with the same image pipeline and store slide count metadata.

## Aha Pack (Freebie)
- One-time free pack for free users: 1 image, 1 two-slide carousel, 1 HQ video.
- Redeemed via `app/api/aha-pack/route.ts` and flagged on `users.ahaPackUsed`.
- Jobs include `freebie: true` to bypass quota checks and usage consumption.

## Dashboard Calendar
- New dashboard route: `/profile/dashboard`.
- Users can schedule multiple assets per day, edit/reschedule, and remove scheduled items.
- Drag-and-drop rescheduling on pointer-fine devices; edit UI for mobile.
- Bulk actions: clear a day, duplicate a day to next week.
- Undo toasts for bulk and move actions.
- Data/actions live in `app/actions/calendarActions.ts`.
- UI lives in `components/DashboardCalendar.tsx`.
- Table: `calendar_items` (user, board, item, scheduled date, note).

## Pricing, Credits, and ROI
- Credits:
  - Images: 1 credit.
  - Videos: derived from target margin and the lowest credit pack price (see `services/usageLimits.ts`).
  - Logic in `services/usageLimits.ts` and `services/usageConsumption.ts`.
- Plans:
  - Free: images only.
  - Basic: 50 images, 3 videos.
  - Pro: 150 images, 10 videos.
  - Defined in `services/subscriptionPlans.ts`.
- Credit packs:
  - 50/$20, 100/$38, 200/$75.
- ROI/cost math:
  - Computed per item using metadata in `components/Sidebar.tsx`.
  - Video cost uses quality mode, reference usage, and 8s baseline.
  - Carousel cost/value scales by slide count.

## Research Ideas UX
- Research outputs include an "IDEA OPTIONS" block for click-to-run ideas.
- Parsing and UI lives in `components/ChatInterface.tsx`.

## Generation Progress UX
- Chat shows a Generation Queue with per-item ETA/progress for image/video jobs.
- Queue data is derived from pending items and `meta.queuedAt`.

## Showcase Page
- Uses admin favorites (email: zorovt18@gmail.com).
- Data: `app/actions/showcaseActions.ts`.
- UI: `components/ShowcasePage.tsx` (routed in `App.tsx`).

## Important Files
- Chat and tools: `services/geminiService.ts`
- Video API: `app/actions.ts`
- Video job processing: `server/jobRunner.ts`, `app/api/jobs/process/route.ts`
- Reference images: `services/videoReferenceService.ts`
- Video guardrails: `services/videoPromptUtils.ts`
- Identity grounding: `services/identityPromptService.ts`, `services/identityPromptUtils.ts`
- Plans and usage: `services/subscriptionPlans.ts`, `services/usageLimits.ts`
- Pricing helpers: `services/pricing.ts`
- Sidebar ROI: `components/Sidebar.tsx`
- Calendar actions: `app/actions/calendarActions.ts`
- Calendar UI: `components/DashboardCalendar.tsx`
- Showcase data: `app/actions/showcaseActions.ts`
- Showcase UI: `components/ShowcasePage.tsx`
- Reference Kit UI: `components/StoryboardReferenceKit.tsx`

## Defaults and Toggles
- Quality Mode is ON by default in the chat header.
- On-screen text in videos is discouraged unless explicitly requested; keep 1-3 words max.
- Aspect ratio defaults:
  - Video: 16:9 unless specified.
  - Image: 1:1 unless specified.

## Open Considerations
- Persist Quality Mode per user/board if needed.
- Revisit plan limits or credit pack pricing based on observed costs.
