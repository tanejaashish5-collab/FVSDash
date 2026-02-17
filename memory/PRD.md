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

## Prioritized Backlog

### P0 — Core Pages
- [ ] Submissions page (CRUD form, filters, detail view)
- [ ] Calendar page (visual calendar with scheduled releases)
- [ ] Assets page (file management, upload links)

### P1 — Feature Pages
- [ ] Analytics page (charts, date range filters)
- [ ] ROI Center (ROI calculations, cost tracking)
- [ ] Billing page (plan display, Stripe integration placeholder)
- [ ] Settings page (client settings, brand voice, API keys)

### P2 — Advanced Features
- [ ] Strategy Lab (AI-powered content strategy)
- [ ] AI Video Lab (video generation tasks)
- [ ] Blog page (content management)
- [ ] Deliverables page (deliverable tracking)
- [ ] Help / Support page (articles + support requests)
- [ ] Admin panel (client management, impersonation)

### P3 — Integrations
- [ ] Stripe billing integration
- [ ] AI Video generation (veo-3)
- [ ] Airtable integration
- [ ] Real activity log table (replace derived activity)
