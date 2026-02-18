# ForgeVoice Studio — PRD & Progress

## Original Problem Statement
Build "ForgeVoice Studio – Client Analytics & AI Production Dashboard" — a full-stack multi-tenant production dashboard for podcast/content agencies with JWT auth, role-based access (admin/client), and comprehensive database schema.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui + Recharts + lucide-react
- **Backend**: FastAPI + Motor (async MongoDB) + PyJWT + passlib/bcrypt
- **Database**: MongoDB (multi-tenant via clientId scoping)
- **Auth**: JWT-based with admin/client roles
- **Fonts**: Manrope (headings), IBM Plex Sans (body), JetBrains Mono (mono)

## User Personas
1. **Client** (alex@company.com): Content creator/agency owner. Sees own data scoped by clientId.
2. **Admin** (admin@forgevoice.com): Platform admin. Sees all client data, admin panel.

## Core Requirements
- Dark theme (#020617 bg, #0B1120 cards, #6366F1 indigo accent)
- Fixed left sidebar (280px) with grouped navigation
- Top header with breadcrumb, search, notifications, user avatar
- Multi-tenant data scoping via clientId
- 13 dashboard routes + admin route

## What's Been Implemented

### Phase 1 — Global Shell, Auth, Schema (Feb 17, 2026)
- App shell: sidebar + header + dashboard layout
- JWT auth: login/signup/logout with role guards
- Database schema: User, Client, Submission, Asset, ClientSettings, VideoTask, AnalyticsSnapshot, BillingRecord, HelpArticle, SupportRequest, BlogPost
- All routes created (placeholders for unbuilt pages)
- Demo data seeded (2 users, 1 client)

### Phase 2 — Overview Dashboard Page (Feb 17, 2026)
- Welcome header with client name
- 4 KPI cards (Active Projects, Published 30d, Total Assets, Est ROI)
- Production Pipeline board (5 columns, Move-to dropdown per card)
- Upcoming Schedule panel
- Quick Actions panel (Submit Content, Strategy Lab, Video Lab)
- Recent Activity feed (derived from submissions + video tasks)
- Episodes & Deliverables table (10 rows)
- PATCH /api/submissions/{id}/status endpoint

### Phase 3 — Submissions Page (Feb 17, 2026)
- Submit New Content form with all fields
- Source file URL, title, guest, description
- Content type, priority dropdowns, release date picker
- Filterable submissions list table
- Detail sheet panel with inline status editing

### Phase 4 — Calendar, Deliverables, Assets Pages (Feb 18, 2026)
- **Calendar**: Month view with navigation, events on release dates, detail panel with editable status/date
- **Deliverables**: Joined Assets+Submissions table with filters, inline status editing
- **Assets**: Browse-only library with filters, Mark Final button, link/unlink episodes

### Phase 5 — Analytics, ROI, Billing Pages (Feb 18, 2026)
- **Analytics**: Date range selector, 4 KPI cards, 4 Recharts (Downloads, Views, Episodes, ROI)
- **ROI Center**: Cost vs ROI breakdown, cost assumptions panel, comparison chart
- **Billing**: Current plan card, Stripe placeholder, plan comparison cards

### Phase 6 — Settings, Help, Blog Pages (Feb 18, 2026)

#### Settings Page (`/dashboard/settings`)
- **Business & ROI Settings card**:
  - Hourly Rate input (used in ROI calculations)
  - Hours per Episode input (used in ROI calculations)
  - Live Cost per Episode calculation
- **Brand & Contact Details card**:
  - Brand Voice Description textarea
  - Primary Contact Name input
  - Primary Contact Email input
- Save Changes button with loading state and toast notifications
- ROI endpoint now reads hourlyRate and hoursPerEpisode from ClientSettings

#### Help & Support Page (`/dashboard/help`)
- **Help Articles section** (left column):
  - Search bar to filter articles
  - Articles grouped by category in accordions
  - Categories: Getting Started, Submissions, Billing, Analytics
- **Contact Support section** (right column):
  - Subject and Message inputs
  - Submit Request button with validation
  - Server-side validation for empty fields
- **Recent Requests section**:
  - List of support requests with status badges (Open, In Progress, Resolved)
  - Most recent first

#### Blog/Insights Page (`/dashboard/blog`)
- **Search and filter bar**:
  - Text search by title/excerpt
  - Tag filter buttons (10 unique tags)
  - Post count display
- **Post cards grid**:
  - Title, excerpt, tags, published date
  - Hover effects and "Read more" indicator
- **Detail Sheet**:
  - Full content with markdown rendering
  - Tags and publication date
  - Proper heading, bold, list rendering

#### New Backend Endpoints
- `GET /api/settings` - Returns client settings (hourlyRate, hoursPerEpisode, brandVoice, contacts)
- `PUT /api/settings` - Updates client settings with validation
- `GET /api/help/articles` - Returns all help articles (public)
- `GET /api/help/support` - Returns client's support requests (scoped)
- `POST /api/help/support` - Creates new support request with validation
- `GET /api/blog/posts` - Returns blog posts with optional tag/search filters
- `GET /api/blog/posts/{slug}` - Returns single post by slug
- `GET /api/blog/tags` - Returns all unique tags

#### Updated ROI Endpoint
- `/api/roi/dashboard` now reads `hourlyRate` and `hoursPerEpisode` from `ClientSettings` instead of hardcoded values

#### Seed Data
- 5 help articles (Getting Started x2, Submissions x1, Billing x1, Analytics x1)
- 2 support requests (1 Open, 1 Resolved)
- 5 blog posts with comprehensive content about podcasting, AI, and analytics

## Prioritized Backlog

### P0 — Completed ✅
- [x] Overview page
- [x] Submissions page
- [x] Calendar page
- [x] Deliverables page
- [x] Assets page

### P1 — Completed ✅
- [x] Analytics page
- [x] ROI Center
- [x] Billing page (Stripe PLACEHOLDER)

### P2 — Completed ✅
- [x] Settings page
- [x] Help & Support page
- [x] Blog/Insights page

### P3 — Remaining Feature Pages
- [ ] Strategy Lab (AI-powered content strategy)
- [ ] AI Video Lab (video generation tasks)
- [ ] Admin panel (client management, impersonation)

### P4 — Integrations
- [ ] Stripe billing integration (replace placeholder)
- [ ] AI Video generation (veo-3)
- [ ] Airtable integration
- [ ] Google Drive integration for file upload

## Mocked/Placeholder Features
- **Stripe Integration**: Billing buttons show toast "Stripe integration is not yet connected"

## Test Credentials
- **Client**: alex@company.com / client123
- **Admin**: admin@forgevoice.com / admin123

## Test Reports
- `/app/test_reports/iteration_1.json` - Phase 2 tests
- `/app/test_reports/iteration_2.json` - Phase 3 tests
- `/app/test_reports/iteration_3.json` - Phase 3 regression
- `/app/test_reports/iteration_4.json` - Phase 4 tests (Calendar, Deliverables, Assets)
- `/app/test_reports/iteration_5.json` - Phase 5 tests (Analytics, ROI, Billing)
- `/app/test_reports/iteration_6.json` - Phase 6 tests (Settings, Help, Blog)
