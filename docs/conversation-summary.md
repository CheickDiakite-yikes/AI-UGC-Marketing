# Conversation Summary

## Goals
- Improve video generation quality: reduce morphing, extra limbs, text misspellings, and improve physics.
- Enable stronger reference usage for videos, including auto-generated reference frames.
- Ensure pricing, credits, and ROI math reflect Quality Mode changes.
- Rebalance plan limits and credit pack pricing to match higher costs.

## Key Decisions
- Add prompt guardrails for video quality and shorter on-screen text.
- Introduce Quality Mode (default ON) to drive higher-fidelity video generation.
- Auto-generate a reference frame for videos (image-to-video) using Nano Banana Pro.
- Use Veo 3.1 preview when Quality Mode or references are present.
- Update credit costs for video to include the reference frame.
- Move ROI/cost calculations to item-level metadata rather than global averages.

## Changes Implemented
- Video prompt guardrails expanded with anatomy/physics constraints.
- Quality Mode toggle added to chat header (default ON).
- Auto reference frames generated via `gemini-3-pro-image-preview`.
- Reference usage allowed for vertical aspect ratios in Quality Mode with fallback.
- Video usage credits updated to 9 (8s + 1 reference image).
- Plan limits adjusted: Basic 3 videos, Pro 10 videos.
- Credit pack pricing updated: 50/$20, 100/$38, 200/$75.
- ROI/cost now uses per-item metadata (quality mode, reference count, carousel slides).

## Current Status
- Quality Mode is ON by default and active for all video jobs unless toggled off.
- Images and carousels already use Nano Banana Pro.

## Relevant Files
- Video guardrails: `services/videoPromptUtils.ts`
- Auto reference frames: `services/videoReferenceService.ts`
- Video pipeline: `server/jobRunner.ts`, `app/api/jobs/process/route.ts`, `app/actions.ts`
- Plan/credits: `services/subscriptionPlans.ts`, `services/usageLimits.ts`
- ROI/cost: `components/Sidebar.tsx`
- Chat Quality Mode UI: `components/ChatInterface.tsx`, `Workspace.tsx`
