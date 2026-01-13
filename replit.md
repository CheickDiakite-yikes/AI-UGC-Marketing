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

Media files (logos, images, avatars) are stored in Replit Object Storage instead of base64 in the database for better performance and scalability.

### How It Works
- When uploading media assets, files are stored in object storage with a key like `boards/{boardId}/assets/{assetId}.{ext}`
- The `assets` table stores a `storage_key` column referencing the object storage location
- Assets are served via the `/api/storage/[key]` API route

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

## Recent Changes
- Added comprehensive SEO, Open Graph, Twitter Cards, and AI search optimization (January 2026)
- Fixed image persistence - now storing base64 directly in database (January 2026)
- Added Replit Object Storage for media files (January 2026)
- Added rename and delete campaign functionality (January 2026)
- Added email/password authentication with signup and login modals (January 2026)
- Added Database Management REST API with full CRUD + table management (January 2026)
- Set up PostgreSQL database with Drizzle ORM (January 2026)
- Initial import to Replit environment (January 2026)
- Configured Next.js for Replit proxy compatibility
