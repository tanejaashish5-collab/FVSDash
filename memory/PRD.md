# ForgeVoice Studio — PRD & Progress

## Original Problem Statement
Build "ForgeVoice Studio – Client Analytics & AI Production Dashboard" — a full-stack multi-tenant production dashboard for podcast/content agencies with JWT auth, role-based access (admin/client), and AI-powered content creation tools.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui + Recharts + lucide-react
- **Backend**: FastAPI + Motor (async MongoDB) + PyJWT + emergentintegrations
- **Database**: MongoDB (multi-tenant via clientId scoping)
- **Auth**: JWT-based with admin/client roles
- **AI**: Multi-provider LLM (Gemini/OpenAI/Anthropic via Emergent key)

## What's Been Implemented

### Completed Pages (11 total)
1. **Overview** - KPIs, pipeline, schedule, activity
2. **Submissions** - Content submission form and list
3. **Calendar** - Month view with editable events
4. **Deliverables** - Assets+Submissions joined table
5. **Assets** - Browse-only asset library
6. **Analytics** - Charts and KPIs with date range
7. **ROI Center** - Cost vs value calculations
8. **Billing** - Plan display (Stripe placeholder)
9. **Settings** - Hourly rate, brand voice, contacts
10. **Help & Support** - Articles + support requests
11. **Blog** - Content insights articles

### Phase 7 — Strategy Lab & Video Lab (Feb 18, 2026)

#### Strategy Lab (`/dashboard/strategy`)
- **Multi-LLM Support**: Gemini, OpenAI, Anthropic via dropdown
- **Uses REAL LLM calls** via emergentintegrations library
- **Generation Tasks**:
  - Research: Topic research with facts/stats
  - Outline: Structured episode outline
  - Script: Full podcast script
  - YouTube Package: Titles + Description + Tags + Chapters
- **Episode Concept Form**: Topic, audience, tone, goal
- **Tabbed Outputs**: Research, Outline, Script, Metadata
- **Create Submission**: Modal to create submission from generated content

#### Video Lab (`/dashboard/video-lab`)
- **Multi-Provider Support**: Runway, Veo, Kling (all MOCKED)
- **Generation Modes**:
  - Script → Video: Generate from text prompt
  - Audio → Video: Sync visuals to audio asset
  - Remix: Transform existing video with new style
- **Output Settings**: Aspect ratio (16:9/9:16/1:1), Profile (YouTube/Shorts/Reel)
- **Task Management**: 
  - Tasks table with status badges (PENDING/PROCESSING/READY/FAILED)
  - Refresh button to poll provider
  - Preview modal with video player
  - Save to Assets functionality

#### New Backend Endpoints
- `GET /api/ai/capabilities` - Returns enabled LLM/video providers
- `POST /api/ai/generate` - Universal LLM endpoint with provider routing
- `GET /api/video-tasks` - List video tasks for client
- `POST /api/video-tasks` - Create video generation task
- `GET /api/video-tasks/{id}` - Get task and poll provider status
- `POST /api/video-tasks/{id}/save-asset` - Save completed video as asset

## Provider Configuration

### LLM Providers (REAL)
| Provider | Model | Status |
|----------|-------|--------|
| Gemini | gemini-2.5-flash | ✅ Working |
| OpenAI | gpt-4o | ✅ Working |
| Anthropic | claude-sonnet-4-5 | ✅ Working |

### Video Providers (MOCKED)
| Provider | Status | Behavior |
|----------|--------|----------|
| Runway | 🔶 Mocked | Returns PROCESSING, simulates completion |
| Veo | 🔶 Mocked | Returns PROCESSING, simulates completion |
| Kling | 🔶 Mocked | Returns READY immediately with sample video |

## Adding New Providers

### To add a new LLM provider:
1. Add to `LLM_PROVIDERS` dict in server.py
2. emergentintegrations library handles the routing

### To add a new Video provider:
1. Add to `VIDEO_PROVIDERS` dict in server.py
2. Implement `create_{provider}_job()` function
3. Implement `check_{provider}_job()` function

## Prioritized Backlog

### Completed ✅
- [x] All 11 dashboard pages
- [x] Strategy Lab (multi-LLM)
- [x] Video Lab (multi-provider, mocked)

### P1 — Remaining
- [ ] Admin panel (client management, impersonation)
- [ ] Real video provider integration (Runway, Veo API)

### P2 — Integrations
- [ ] Stripe billing (replace placeholder)
- [ ] Google Drive file upload
- [ ] Airtable integration

## Test Credentials
- **Client**: alex@company.com / client123
- **Admin**: admin@forgevoice.com / admin123

## Test Reports
- `/app/test_reports/iteration_7.json` - Strategy Lab & Video Lab tests
