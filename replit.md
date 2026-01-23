# Predi AI

## Overview
Predi AI is an AI-powered marketing generator and automation OS. Its primary purpose is to help users create high-quality marketing content efficiently using advanced AI models. Key capabilities include generating marketing images, videos, and campaign packs, along with tools for trend discovery and web research. The project aims to provide an intuitive platform for marketing professionals to streamline their content creation workflows.

## User Preferences
I prefer clear, concise instructions and explanations. I value iterative development and want to be informed before any major architectural changes or significant code refactoring. For code, I appreciate well-structured, readable TypeScript. Ensure that all generated content and features align with modern marketing best practices and user-centric design principles.

## System Architecture

### Core Technologies
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS
- **AI Integration**: Google Gemini (@google/genai)
- **Language**: TypeScript

### UI/UX Decisions
The application features a clean, simplified interface focused on content generation:
- **Main Workspace**: Minimalist layout with just the chat interface and content canvas. No sidebar - all brand context is managed separately.
- **Profile Section**: Three-tab navigation at `/profile`, `/profile/dashboard`, and `/profile/company`:
  - **Profile Tab**: Account details, password management, billing controls, favorites
  - **Dashboard Tab**: Marketing calendar with scheduled content
  - **Company Tab**: Brand context management - logos, avatars/spokespersons, products, and source documents
- **Navigation**: Profile menu dropdown in workspace header (both mobile and desktop) for quick access to profile pages
- **Authentication**: Email/password using JWT sessions, presented through `AuthModal` component
- **Media Storage**: All media files served via `/api/storage` route after being stored in Object Storage
- **SEO**: Dynamic `robots.txt`, `sitemap.ts`, JSON-LD structured data, Open Graph and Twitter Card support

### Technical Implementations
- **Database**: PostgreSQL with Drizzle ORM, managing tables for `users`, `boards`, `assets`, `generated_items`, `messages`, `brand_identities`, and `avatar_identities`.
- **Object Storage**: Replit Object Storage is used for all media files (images, videos, carousels) to improve performance, scalability, and reduce database load by storing only `storage_key` references.
- **AI Features**: Utilizes Google Gemini models:
    - `gemini-3-pro-preview` for content planning and function calling.
    - `gemini-3-pro-image-preview` for image generation.
    - `veo-3.1-fast-generate-preview` for cinematic video generation.
    - `gemini-2.5-flash` for URL context (website scraping) and Google Search grounding.
- **Background Job Processing**: AI generation tasks run as background jobs to ensure responsiveness. Jobs are managed in a `jobs` table with `pending`, `processing`, `completed`, and `failed` states. The system is designed to be Autoscale-compatible, processing jobs via API calls in production environments.
- **Deployment**: Autoscale deployment is used for cost efficiency, with a build command `npm run build` and start command `npm run start -- -p 5000 -H 0.0.0.0`.

### Feature Specifications
- **Authentication**: Email/password authentication with JWT sessions and user signup fields for email, password, full name, job title, and company.
- **AI Tools**:
    - `generate_image`: High-fidelity marketing images.
    - `generate_video`: Cinematic marketing videos (Veo 3.1).
    - `generate_campaign_pack`: 5-10 item campaign packs.
    - `generate_avatar_visual`: Brand mascots/avatars.
    - `discover_trends`: Search for latest trends.
    - `web_research`: General web research.
- **Usage Quota & Billing**: Subscription management and credit pack purchases are handled via Stripe. The system enforces per-plan usage limits and manages credit deductions, tracking `imagesGenerated`, `videosGenerated`, `creditBalance`, and `planTier` in the user database.

## External Dependencies

- **Google Gemini API**: Used for all AI-powered content generation and intelligent services.
- **PostgreSQL**: The primary database for storing application data.
- **Replit Object Storage**: Used for scalable and performant storage of all media assets.
- **Stripe**: Integrated for subscription management, one-time credit pack purchases, and customer billing portal functionality. This includes webhook handling for various payment events.
- **Replit Stripe Connector**: Securely manages Stripe API keys and credentials across development and production environments.

## Admin Account
- **Admin Email**: `zorovt18@gmail.com` - Automatically assigned Enterprise tier on signup/login
- **Enterprise Tier**: Unlimited image/video generations, full access to all features
- **Migration 0006**: Automatically upgrades admin to Enterprise tier on deployment
- **Migration Backfill**: The migrate.ts script auto-detects migrations applied via db:push and records them to prevent conflicts