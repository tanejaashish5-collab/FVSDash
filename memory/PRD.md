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
- Database schema: User, Client, Submission, Asset, ClientSettings, VideoTask, AnalyticsSnapshot, BillingRecord, HelpArticle, SupportRequest
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

#### Analytics Page (`/dashboard/analytics`)
- Date range selector: 7d, 30d, 90d, 365d presets + custom date pickers
- 4 KPI cards: Total Downloads, Total Views, Episodes Published, Avg ROI/Episode
- 4 Recharts visualizations:
  - Line chart: Downloads over time
  - Line chart: Views over time
  - Bar chart: Episodes published per day
  - Area chart: Estimated ROI over time
- Empty state when no data in range

#### ROI Center (`/dashboard/roi`)
- Time period selector: 30d, 90d, 365d
- 4 KPI cards: Total Cost, Total ROI, ROI Multiple, Episodes
- Cost Assumptions panel (read-only): Hourly Rate ($150), Hours per Episode (5), Cost per Episode ($750)
- ROI Breakdown: Text explanation + horizontal bar chart comparing Cost vs ROI
- Net Profit card showing profit/loss
- Additional metrics: Total Downloads, Total Views

#### Billing Page (`/dashboard/billing`)
- Current Subscription card: Plan name, status badge, price, next billing date
- Plan Features list with checkmarks
- Stripe Integration placeholder: "Coming Soon" message with feature badges
- Available Plans section: Starter ($99), Pro ($299), Enterprise ($799) cards
- Stripe buttons show toast: "Stripe integration is not yet connected"
- Account Information card with client details

#### New Backend Endpoints
- `GET /api/analytics/dashboard?range=&from_date=&to_date=` - Analytics with date filtering
- `GET /api/roi/dashboard?range=` - ROI calculations with clientSettings.hourlyRate
- `GET /api/billing/dashboard` - Billing info with plan details and all plans

#### Enhanced Seed Data
- 90 days of analytics snapshots (was 14)
- Gradual growth trends in downloads/views
- Variable episodesPublished (~15% probability per day)

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

### P2 — Feature Pages
- [ ] Settings page (client settings, brand voice, API keys, hourly rate config)
- [ ] Strategy Lab (AI-powered content strategy)
- [ ] AI Video Lab (video generation tasks)
- [ ] Blog page (content management)
- [ ] Help / Support page (articles + support requests)
- [ ] Admin panel (client management, impersonation)

### P3 — Integrations
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
