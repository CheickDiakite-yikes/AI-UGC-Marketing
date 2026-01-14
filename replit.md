# Predi AI

## Overview
Predi AI is an AI-powered marketing generator and automation OS built with Next.js 15, React 19, and Tailwind CSS. It uses Google's Gemini AI for intelligent marketing content generation.

## Project Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS
- **AI Integration**: Google Gemini (@google/genai)
- **Language**: TypeScript

### Directory Structure
```
app/                 # Next.js App Router pages
  actions.ts         # Server actions
  globals.css        # Global styles
  layout.tsx         # Root layout
  page.tsx           # Home page
components/          # React components
  ChatInterface.tsx  # AI chat interface
  LandingPage.tsx    # Main landing page
  Sidebar.tsx        # Navigation sidebar
  ...                # Various modal and UI components
services/
  geminiService.ts   # Gemini AI service integration
types.ts             # TypeScript type definitions
App.tsx              # Main app component
Workspace.tsx        # Workspace component
```

## Running the Project

### Development
```bash
npm run dev -- -p 5000 -H 0.0.0.0
```

### Production
```bash
npm run build
npm run start -- -p 5000 -H 0.0.0.0
```

## Environment Variables
- `GOOGLE_GEMINI_API_KEY` - Google Gemini API key for AI functionality
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `DB_API_KEY` - API key for database management endpoints

## Database

### Schema (Drizzle ORM)
Tables: `users`, `boards`, `assets`, `generated_items`, `messages`, `brand_identities`, `avatar_identities`

### Database Commands
```bash
npm run db:push       # Push schema changes to database
npm run db:studio     # Open Drizzle Studio
```

### Database Management API
All endpoints require `x-api-key` header with `DB_API_KEY` value.

**Endpoints:**
- `GET /api/db` - List all available endpoints
- `GET /api/db?action=tables` - List all tables
- `GET /api/db?action=schema&table=tablename` - Get table schema
- `POST /api/db/query` - Execute SELECT queries
- `POST /api/db/execute` - Execute INSERT/UPDATE/DELETE/DDL
- `POST /api/db/table` - Create a new table
- `DELETE /api/db/table?name=tablename` - Drop a table
- `GET /api/db/rows?table=tablename` - Get all rows
- `POST /api/db/rows` - Insert row
- `PUT /api/db/rows` - Update row
- `DELETE /api/db/rows?table=tablename&id=rowid` - Delete row

## Authentication

The app uses email/password authentication with JWT sessions stored in cookies.

### Signup Fields
- Email (required)
- Password (required, min 6 characters)
- Full Name (required)
- Job Title / Role (optional)
- Company (optional)
- How did you find us? (optional dropdown)

### Auth Flow
1. User clicks "Log In" or "Get Started" on landing page
2. Modal appears with login or signup form
3. On successful auth, session cookie is set and user enters workspace

### Files
- `components/AuthModal.tsx` - Login/Signup modal component
- `app/actions/authActions.ts` - Server actions for signup, login, logout, getSession
- `services/authService.ts` - Password hashing and JWT token utilities

## Object Storage

All media files (images, videos, carousels) are stored in Replit Object Storage for better performance and scalability.

### How It Works
- **Generated Items**: When AI generates images/videos, they're uploaded to object storage with keys like `boards/{boardId}/generated/{itemId}.{ext}`
- **Carousel Slides**: Each slide stored separately as `boards/{boardId}/generated/{itemId}_slide{N}.{ext}`
- **User Assets**: Logos and uploaded files stored as `boards/{boardId}/assets/{assetId}.{ext}`
- The database stores only `storage_key` references, not base64 data
- Assets are served via the `/api/storage/[key]` API route

### Benefits
- ~33% smaller storage (no base64 inflation)
- Faster database queries
- Video streaming support
- Better scalability for large apps

### Files
- `services/objectStorageService.ts` - Upload/download/delete helpers
- `app/api/storage/[key]/route.ts` - API route to serve stored files

## SEO & Social Sharing

### Open Graph & Twitter Cards
- OG image: `/public/og-image.png` (1200x630)
- Twitter card: `summary_large_image`
- Full meta tags in `app/layout.tsx`

### Search Engine Optimization
- Dynamic robots.txt: `app/robots.ts`
- Dynamic sitemap: `app/sitemap.ts`
- JSON-LD structured data (SoftwareApplication, Organization, FAQPage)
- AI search bot optimization (GPTBot, Claude-Web, PerplexityBot, etc.)

### Files
- `public/og-image.png` - Social share image
- `public/icon.svg` - Vector favicon
- `public/logo.png` - Logo image
- `public/manifest.json` - PWA manifest

### Environment Variables for SEO
- `NEXT_PUBLIC_SITE_URL` - Production URL for canonical links (defaults to https://predi.ai)

## AI Features

### Gemini Models Used
- **gemini-3-pro-preview** - Main chat agent for content planning and function calling
- **gemini-3-pro-image-preview** - Marketing image generation
- **veo-3.1-fast-generate-preview** - Cinematic video generation (UGC, Reels, TikTok)
- **gemini-2.5-flash** - URL Context (website scraping) and Google Search grounding

### Website Scraping (URL Context)
When users add website links, the app uses Gemini's URL Context tool to:
- Navigate and analyze the full website content
- Extract company info, products, brand voice, and marketing copy
- Handle JavaScript-rendered content that basic fetch cannot

### Google Search Grounding
The AI agent has access to real-time web search for:
- **Trend Discovery** - Finding latest viral trends, hashtags, and content formats
- **Web Research** - Competitor analysis, market research, and real-time data

### Available AI Tools
1. `generate_image` - Create high-fidelity marketing images
2. `generate_video` - Create cinematic marketing videos using Veo 3.1
3. `generate_campaign_pack` - Generate 5-10 item campaign packs (images, videos, carousels)
4. `generate_avatar_visual` - Design brand mascots/avatars
5. `discover_trends` - Search for latest trends with Google Search
6. `web_research` - General web research with citations

### Video Generation (Veo 3.1)
- Uses `veo-3.1-fast-generate-preview` model ($0.15/second)
- Supports 16:9 (landscape) and 9:16 (portrait/Reels) aspect ratios
- Videos take 1-2 minutes to generate
- Prompts should describe: scene, action, movement, camera angle, mood
- "UGC Viral Pack" requests will include 2-3 videos alongside images

## Background Job Processing

AI generation tasks (images, videos, campaign packs) run in the background, allowing users to navigate away without losing their work.

### How It Works (Autoscale-Compatible)
- When user requests content generation, a job is created in the `jobs` table
- **In Development**: A background worker (`server/jobRunner.ts`) polls for pending jobs every 5 seconds
- **In Production (Autoscale)**: Jobs are processed via API calls (`POST /api/jobs/process`)
- The frontend triggers job processing on each poll cycle, ensuring jobs complete even in Autoscale
- Results are saved directly to object storage and database
- Users can see active jobs indicator and items appear when complete
- Users can clear stuck jobs using the "Clear" button on the jobs indicator

### Job States
- `pending` - Job queued, waiting for worker
- `processing` - Worker is generating content
- `completed` - Content generated and saved
- `failed` - Generation failed (error logged)

### Key Files
- `db/schema.ts` - Jobs table schema
- `services/jobService.ts` - Job CRUD helpers
- `server/jobRunner.ts` - Background worker (development only)
- `app/api/jobs/process/route.ts` - On-demand job processor (works with Autoscale)
- `app/api/jobs/route.ts` - Job API endpoints

## Deployment

The app uses Autoscale deployment for cost efficiency.

### Production Setup
- Deployment type: Autoscale (pay per request)
- Build: `npm run build`
- Run: `npm run start -- -p 5000 -H 0.0.0.0`

Note: With Autoscale, background job processing may be interrupted. The app now includes toast notifications and retry functionality to handle failed generations gracefully.

## Recent Changes
- Added toast notification system for better error/success feedback (January 2026)
- Added retry functionality for failed generations (January 2026)
- Switched back to Autoscale deployment for cost efficiency (January 2026)
- Added mobile viewport configuration to prevent zoom (January 2026)
- Added background job processing for resilient AI generation (January 2026)
- Migrated generated items to Object Storage for better performance and scalability (January 2026)
- Fixed video generation with Veo 3.1 - UGC Viral Packs now include actual videos (January 2026)
- Upgraded website scraping to use Gemini URL Context tool for better data extraction (January 2026)
- Added Google Search grounding for trend discovery and web research (January 2026)
- Fixed data isolation - all board operations verify user ownership (January 2026)
- Fixed mobile UI chat panel blocking header buttons (January 2026)
- Added comprehensive SEO, Open Graph, Twitter Cards, and AI search optimization (January 2026)
- Fixed image persistence - now storing base64 directly in database (January 2026)
- Added Replit Object Storage for media files (January 2026)
- Added rename and delete campaign functionality (January 2026)
- Added email/password authentication with signup and login modals (January 2026)
- Added Database Management REST API with full CRUD + table management (January 2026)
- Set up PostgreSQL database with Drizzle ORM (January 2026)
- Initial import to Replit environment (January 2026)
- Configured Next.js for Replit proxy compatibility
