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

## Recent Changes
- Added Database Management REST API with full CRUD + table management (January 2026)
- Set up PostgreSQL database with Drizzle ORM (January 2026)
- Initial import to Replit environment (January 2026)
- Configured Next.js for Replit proxy compatibility
