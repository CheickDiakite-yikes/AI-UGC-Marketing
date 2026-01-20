# Conversation Summary

## Goals
- Improve video generation quality and continuity across scenes.
- Add reference kits for video continuity (avatar/item/setting).
- Add a long-video pipeline with storyboard approval.
- Add a showcase page for admin-favorited content.
- Improve research UX with idea selection.
- Add chat-side progress tracking for image/video generation.
- Keep pricing/credits aligned to target margin with clear ROI display.

## Key Decisions
- Reference kits use ordered roles (avatar, item, setting) with manual/hybrid/auto modes.
- Long video uses continuity references and supports storyboard editing before approval.
- Showcase page pulls admin favorites (`zorovt18@gmail.com`) as a curated gallery.
- Research responses include "IDEA OPTIONS" parsed into clickable actions.
- Credits for video are computed from target margin and credit pack price floor.

## Changes Implemented
- Added Reference Kit with role-based selections and auto/hybrid fill logic.
- Added avatar-aware continuity references for long video scenes.
- Added in-chat Generation Queue for images/videos with ETA/progress.
- Added research idea selection UI parsed from "IDEA OPTIONS".
- Added About, How It Works, and Showcase pages to landing navigation.
- Showcase pulls admin favorites and renders modal viewer for video/image/carousel.
- Credits now derive from margin target; pricing helpers moved to `services/pricing.ts`.

## Current Status
- Quality Mode is ON by default and active for all video jobs unless toggled off.
- Images and carousels already use Nano Banana Pro.
- Free users can redeem the Aha Pack once, even when out of quota.
- Dashboard calendar supports add/remove scheduling per day.
- Long video remains a paid feature (locked for Free plan).
- Showcase page is populated via admin favorites.

## Relevant Files
- Video guardrails: `services/videoPromptUtils.ts`
- Auto reference frames: `services/videoReferenceService.ts`
- Video pipeline: `server/jobRunner.ts`, `app/api/jobs/process/route.ts`, `app/actions.ts`
- Storyboard approval UI: `components/ChatInterface.tsx`, `Workspace.tsx`
- Plan/credits: `services/subscriptionPlans.ts`, `services/usageLimits.ts`
- ROI/cost: `components/Sidebar.tsx`
- Chat Quality Mode UI: `components/ChatInterface.tsx`, `Workspace.tsx`
- Aha Pack: `app/api/aha-pack/route.ts`
- Calendar actions: `app/actions/calendarActions.ts`
- Calendar UI: `components/DashboardCalendar.tsx`
- Dashboard page: `app/profile/dashboard/page.tsx`
- Showcase: `components/ShowcasePage.tsx`, `app/actions/showcaseActions.ts`
- Reference Kit: `components/StoryboardReferenceKit.tsx`
