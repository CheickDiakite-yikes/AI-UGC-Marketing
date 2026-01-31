# Predi AI: The AI-Native Marketing OS

Predi AI is a marketing operating system that generates campaigns, images, videos, and carousels grounded in brand, avatar, and product identity. It blends structured prompting with production pipelines so teams can ship creative faster, with consistent output quality.

---

## What Predi AI Does
- Generates images, videos, and carousels with grounded brand identity.
- Supports long-form video (15-30s) via multi-scene storyboards and stitching.
- Uses reference frames (avatar, product, setting) to lock continuity.
- Tracks ROI/cost math per asset in the workspace sidebar.
- Curates a public Showcase page from admin favorites.

---

## Core Workflow
1. Upload brand, avatar, product, and source documents.
2. Chat agent compiles identity-grounded prompts.
3. Generation jobs are queued and processed in the background.
4. Long videos require storyboard approval before rendering.
5. Outputs land on the canvas with metadata for ROI math.

---

## Architecture (High Level)
- Frontend: React/TypeScript app with a central `Workspace` orchestrating chat + jobs.
- Backend: Next.js server actions and background job processing.
- Storage: Object storage for media with DB `storageKey` references.
- Identity: Brand/avatar/product constraints compiled into prompts before generation.

---

## Models
- Image: `gemini-3-pro-image-preview` (Nano Banana Pro)
- Video:
  - `veo-3.1-generate-preview` when Quality Mode or references are used
  - `veo-3.1-fast-generate-preview` otherwise
- Video reference frames: `gemini-3-pro-image-preview`

---

## Credits, Plans, and Usage
- Images cost 1 credit.
- Video credits are derived from compute cost, target margin, and credit pack price floor. See `services/usageLimits.ts`.
- Long video usage is charged per scene.
- Free plan: images only (video locked).
- Basic: 50 images, 3 videos.
- Pro: 150 images, 10 videos.

---

## Showcase Page
The public Showcase page is curated from admin favorites (email: `zorovt18@gmail.com`).
- Data: `app/actions/showcaseActions.ts`
- UI: `components/ShowcasePage.tsx`

---

## Development

### Requirements
- Node 18+
- Postgres available
- Google Gemini API key

### Environment
Set one of:
- `GOOGLE_GEMINI_API_KEY`
- `GEMINI_API_KEY`

### Run Locally
```bash
npm install
npm run dev
```
Note: `npm install` configures shared git hooks from `.githooks/` (blocks `.next` and files >10MB). If hooks aren't enabled, run `git config core.hooksPath .githooks`.

---

## Documentation
- Agent context: `AGENTS.md`
- App context: `docs/APP_CONTEXT.md`
- DB API: `docs/DB-API.md`
- Roadmap: `docs/ROADMAP.md`
- SEO Strategy: `docs/SEO_STRATEGY.md`

---

## Positioning (GTM)
Predi AI is the AI-native marketing OS for lean teams who need real campaigns fast. It combines brand grounding, structured prompts, and media pipelines so outputs stay consistent and production-ready. The edge is speed + consistency + continuity, not just generation.

---

## Roadmap Ideas (Planning Only)
1. Autopilot campaign testing: batch A/B variations with automatic winners.
2. Platform-specific creator personas (TikTok, IG, LinkedIn) with tone shifts.
3. Brand memory vault: long-term identity and creative learnings per board.
4. Creative QA agent: checks compliance, claims, and visual consistency.
5. Performance-driven iteration: connect analytics to drive new prompt variants.
6. Multi-user collaboration: shared boards with comment + approval flow.
7. Product feed connectors: Shopify/WooCommerce ingestion for live ads.
8. Creator marketplace: invite human creators to remix AI assets.
9. Realtime storyboard editing UI for long video.
10. Automatic localization for multi-region campaigns.

---

## License
MIT
