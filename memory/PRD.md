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
- Expanded seed: 10 submissions, 8 assets, 30 days analytics, 4 video tasks
- PATCH /api/submissions/{id}/status endpoint

### Phase 3 — Submissions Page (Feb 17, 2026)
- Submit New Content form with all fields
- Source file URL input
- Episode title, guest, description
- Content type and priority dropdowns
- Release date picker
- Confirmation checkbox
- Filterable submissions list table
- Detail sheet panel
- Inline status editing via dropdown

### Phase 4 — Calendar, Deliverables, Assets Pages (Feb 18, 2026)
#### Calendar Page (`/dashboard/calendar`)
- Full month calendar view with navigation (prev/next month)
- Submissions displayed on release dates as clickable events
- Content type badges (Podcast, Short, Blog, Webinar)
- Status indicator dots
- Filters: Content Type, Status
- Detail panel (Sheet) with:
  - Title, guest, description (read-only)
  - Editable status buttons
  - Editable release date picker
  - "Open in Submissions" link

#### Deliverables Page (`/dashboard/deliverables`)
- Joined view of Assets + Submissions
- Table columns: Episode, Deliverable, Type, Status, Content Type, Release Date
- Filters: Deliverable Type, Status, Content Type
- Search by episode title or asset name
- Inline status editing (Draft/Final)
- Episode name links to Submissions page
- External link to asset URL

#### Assets Page (`/dashboard/assets`)
- Browse-only asset library (no upload)
- Table with colored type icons
- Type badges (Video, Audio, Thumbnail, Transcript)
- Filters: Type, Status
- Search by asset name or linked episode
- Inline status editing (Draft/Final)
- "Mark Final" quick action for Draft assets
- Link/unlink to episode dropdown
- External link to asset URL

#### New Backend Endpoints
- `GET /api/calendar?year=&month=` - Calendar submissions
- `GET /api/deliverables` - Joined assets+submissions view
- `GET /api/assets/library` - Enriched assets with episode titles
- `PATCH /api/assets/{id}/status` - Update asset status
- `PATCH /api/assets/{id}/submission` - Link/unlink asset to submission
- `PATCH /api/submissions/{id}` - Update submission status/release date
- `GET /api/submissions/list` - Minimal submission list for dropdowns

#### Enhanced Seed Data
- 14 assets total (previously 5)
- Assets linked to 4 different submissions
- 3 unlinked brand/general assets

## Prioritized Backlog

### P0 — Completed
- [x] Submissions page (CRUD form, filters, detail view)
- [x] Calendar page (visual calendar with scheduled releases)
- [x] Assets page (file management)
- [x] Deliverables page (deliverables tracking)

### P1 — Feature Pages
- [ ] Analytics page (charts, date range filters)
- [ ] ROI Center (ROI calculations, cost tracking)
- [ ] Billing page (plan display, Stripe integration placeholder)
- [ ] Settings page (client settings, brand voice, API keys)

### P2 — Advanced Features
- [ ] Strategy Lab (AI-powered content strategy)
- [ ] AI Video Lab (video generation tasks)
- [ ] Blog page (content management)
- [ ] Help / Support page (articles + support requests)
- [ ] Admin panel (client management, impersonation)

### P3 — Integrations
- [ ] Stripe billing integration
- [ ] AI Video generation (veo-3)
- [ ] Airtable integration
- [ ] Google Drive integration for file upload
- [ ] Real activity log table (replace derived activity)

## Test Credentials
- **Client**: alex@company.com / client123
- **Admin**: admin@forgevoice.com / admin123

## Test Reports
- `/app/test_reports/iteration_1.json` - Phase 2 tests
- `/app/test_reports/iteration_2.json` - Phase 3 tests  
- `/app/test_reports/iteration_3.json` - Phase 3 regression
- `/app/test_reports/iteration_4.json` - Phase 4 tests (Calendar, Deliverables, Assets)
