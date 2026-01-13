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
The project may require a Google Gemini API key for full AI functionality.

## Recent Changes
- Initial import to Replit environment (January 2026)
- Configured Next.js for Replit proxy compatibility
