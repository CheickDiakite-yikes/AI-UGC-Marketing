# Conversation Summary

## Goals
- Improve video generation quality: reduce morphing, extra limbs, text misspellings, and improve physics.
- Enable stronger reference usage for videos, including auto-generated reference frames.
- Ensure pricing, credits, and ROI math reflect Quality Mode changes.
- Rebalance plan limits and credit pack pricing to match higher costs.
- Add a one-time free Aha Pack for free users with high-value outputs.
- Build a profile dashboard calendar for scheduling assets across boards.
- Add edit/reschedule, drag-and-drop, and bulk day actions for the calendar.

## Key Decisions
- Add prompt guardrails for video quality and shorter on-screen text.
- Introduce Quality Mode (default ON) to drive higher-fidelity video generation.
- Auto-generate a reference frame for videos (image-to-video) using Nano Banana Pro.
- Use Veo 3.1 preview when Quality Mode or references are present.
- Update credit costs for video to include the reference frame.
- Move ROI/cost calculations to item-level metadata rather than global averages.
- Aha Pack includes 1 image, 1 two-slide carousel, 1 HQ video, and is redeemable once.
- Aha Pack jobs bypass quota checks and usage consumption.
- Dashboard centers on a monthly calendar and weekly report, with per-day multi-asset scheduling.

## Changes Implemented
- Video prompt guardrails expanded with anatomy/physics constraints.
- Quality Mode toggle added to chat header (default ON).
- Auto reference frames generated via `gemini-3-pro-image-preview`.
- Reference usage allowed for vertical aspect ratios in Quality Mode with fallback.
- Video usage credits updated to 9 (8s + 1 reference image).
- Plan limits adjusted: Basic 3 videos, Pro 10 videos.
- Credit pack pricing updated: 50/$20, 100/$38, 200/$75.
- ROI/cost now uses per-item metadata (quality mode, reference count, carousel slides).
- Added Aha Pack redemption flow and server-side checks.
- Added calendar scheduling UI with weekly report and per-day asset lists.
- Added new dashboard tab at `/profile/dashboard`.
- Added calendar entry edit/reschedule flow with date + note updates.
- Added drag-and-drop rescheduling for pointer-fine devices.
- Added bulk clear-day and duplicate-to-next-week actions.
- Added undo toasts for move and bulk calendar actions.

## Current Status
- Quality Mode is ON by default and active for all video jobs unless toggled off.
- Images and carousels already use Nano Banana Pro.
- Free users can redeem the Aha Pack once, even when out of quota.
- Dashboard calendar supports add/remove scheduling per day.

## Relevant Files
- Video guardrails: `services/videoPromptUtils.ts`
- Auto reference frames: `services/videoReferenceService.ts`
- Video pipeline: `server/jobRunner.ts`, `app/api/jobs/process/route.ts`, `app/actions.ts`
- Plan/credits: `services/subscriptionPlans.ts`, `services/usageLimits.ts`
- ROI/cost: `components/Sidebar.tsx`
- Chat Quality Mode UI: `components/ChatInterface.tsx`, `Workspace.tsx`
- Aha Pack: `app/api/aha-pack/route.ts`
- Calendar actions: `app/actions/calendarActions.ts`
- Calendar UI: `components/DashboardCalendar.tsx`
- Dashboard page: `app/profile/dashboard/page.tsx`
