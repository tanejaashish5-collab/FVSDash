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
- **Multi-Provider Support**: Runway (MOCKED), Veo (REAL with VEO_API_KEY, fallback to mock), Kling (MOCKED)
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

### Image Generation (Thumbnails)
| Provider | Model | Status |
|----------|-------|--------|
| OpenAI | GPT-Image-1 | ✅ REAL via EMERGENT_LLM_KEY |

### Audio Generation (Voice)
| Provider | Status | Config |
|----------|--------|--------|
| ElevenLabs | ✅ Ready (needs API key) | Set ELEVENLABS_API_KEY |

### Video Providers (MOCKED - P2)
| Provider | Status | Behavior |

---

## Phase 9 — Backend Refactoring (Feb 18, 2026)

### Modular Backend Structure
Refactored the monolithic `server.py` (~2000 lines) into a maintainable FastAPI project structure.

#### New Directory Structure:
```
/app/backend/
├── main.py              # App entrypoint
├── server.py            # Thin wrapper (backwards compat)
├── seed.py              # Database seeding
├── db/
│   └── mongo.py         # Singleton client + collection helpers
├── models/              # Pydantic schemas (7 files)
│   ├── auth.py          # UserCreate, UserLogin, TokenResponse
│   ├── content.py       # SubmissionCreate, AssetStatusUpdate, VideoTaskCreate
│   ├── settings.py      # SettingsUpdate
│   ├── help.py          # SupportRequestCreate
│   ├── ai.py            # AIGenerateRequest
│   └── fvs.py           # FvsProposeIdeasRequest, FvsProduceEpisodeRequest
├── routers/             # API routes (15 files)
│   ├── auth.py          # /api/auth/*
│   ├── dashboard.py     # /api/dashboard/*
│   ├── submissions.py   # /api/submissions/*
│   ├── assets.py        # /api/assets/*
│   ├── calendar.py      # /api/calendar
│   ├── deliverables.py  # /api/deliverables
│   ├── analytics.py     # /api/analytics/*
│   ├── roi.py           # /api/roi/*
│   ├── billing.py       # /api/billing/*
│   ├── settings.py      # /api/settings
│   ├── help.py          # /api/help/*
│   ├── blog.py          # /api/blog/*
│   ├── ai.py            # /api/ai/*
│   ├── video_tasks.py   # /api/video-tasks/*
│   └── fvs.py           # /api/fvs/*
└── services/            # Business logic (4 files)
    ├── auth_service.py  # JWT, password hashing, user validation
    ├── ai_service.py    # LLM integration via emergentintegrations
    ├── video_task_service.py # Video task creation (mocked providers)
    └── fvs_service.py   # FVS brain + orchestrator logic
```

#### Key Changes:
- **Separation of Concerns**: Routes, models, services, and DB access in separate modules
- **Singleton DB Client**: Centralized MongoDB connection in `db/mongo.py`
- **Service Layer**: Business logic extracted from routes into dedicated services
- **Backwards Compatibility**: `server.py` is a thin wrapper importing from `main.py`

#### Test Results:
- Backend: 42/42 tests passed (100%)
- Frontend: 15/15 pages load correctly (100%)
- No API contract changes - full backwards compatibility


|----------|--------|----------|
| Runway | 🔶 Mocked | Returns PROCESSING, simulates completion |
| Veo | 🔶 Mocked | Returns PROCESSING, simulates completion |
| Kling | 🔶 Mocked | Returns READY immediately with sample video |

## Adding New Providers

### To add a new LLM provider:
1. Add to `LLM_PROVIDERS` dict in server.py

---

## Phase 10 — Admin Panel & Impersonation (Feb 18, 2026)

### Admin Dashboard (`/dashboard/admin`)
Full admin panel for client management and impersonation.

#### Features:
- **Client List**: Table showing all clients with metrics (name, plan, submissions count, last activity)
- **Client Summary**: Side panel with last 5 submissions, 30-day metrics, billing status
- **Impersonation**: Admin can "view as" any client to see their dashboard exactly as they would
- **Help Tour**: "?" icon shows multi-step toast guide for admin features

#### New Backend Endpoints:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/clients` | GET | List all clients with metrics (admin only) |
| `/api/admin/clients/{id}/summary` | GET | Client snapshot with recent activity (admin only) |
| `/api/admin/impersonate` | POST | Validate client for impersonation (admin only) |

#### Impersonation Architecture:
- **View-only mode**: No server-side session changes
- **Client-side state**: `impersonatedClientId` stored in AuthContext
- **API Support**: All routers accept `impersonateClientId` query param for admin users
- **Visual Feedback**: Yellow banner shows impersonated client name + "Return to Admin View" button
- **Toast Notifications**: Start/stop impersonation shows toast feedback

#### New Files:
- `/app/backend/routers/admin.py` - Admin API routes
- `/app/backend/services/admin_service.py` - Admin business logic
- `/app/backend/models/admin.py` - Admin Pydantic models
- `/app/frontend/src/components/ImpersonationBanner.jsx` - Yellow banner component

#### Test Results:

---

## Phase 11 — Real Media Generation (Feb 18, 2026)

### FVS Media Integration
Replaced mocked audio/thumbnail generation with real provider integrations.

#### Thumbnail Generation (REAL)
- **Provider**: OpenAI GPT-Image-1 via EMERGENT_LLM_KEY
- **Prompt Building**: Derived from idea topic + brand voice + episode title
- **Output**: Base64 data URL (~2.4MB PNG)
- **Fallback**: Placeholder image if EMERGENT_LLM_KEY missing

#### Audio Generation (Ready for API Key)
- **Provider**: ElevenLabs Text-to-Speech
- **Config**: Set `ELEVENLABS_API_KEY` in .env
- **Voice ID**: Configurable via `ELEVENLABS_VOICE_ID` (default: Rachel)
- **Fallback**: Placeholder audio URL if API key missing
- **Response**: Includes `warnings` array when fallback triggered

#### New Service Architecture
```
services/media_service.py:
├── generate_voice_for_script()     # ElevenLabs TTS
├── generate_thumbnail()            # OpenAI GPT-Image-1 (abstracted)
├── build_thumbnail_prompt()        # Prompt engineering
├── AudioGenerationResult           # Dataclass with url, provider, is_mocked
└── ThumbnailGenerationResult       # Dataclass with url, provider, is_mocked
```

#### .env Configuration
```bash
# Required for thumbnail generation (via emergentintegrations)
EMERGENT_LLM_KEY=your_key_here

# Optional for voice generation
ELEVENLABS_API_KEY=your_elevenlabs_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Optional, defaults to Rachel
```

#### Assets Now Track Provider Info
- `provider`: String identifying the service (e.g., "openai_gpt_image_1", "elevenlabs")
- `isMocked`: Boolean indicating if fallback was used
- Response includes `warnings` array when any integration falls back

#### TODO: P2 Storage
- Currently using provider-hosted URLs or base64 data URLs
- Implement `upload_to_storage()` for S3/Google Drive persistence


- Backend: 14/14 tests passed (100%)
- Frontend: All admin features working correctly


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
- [x] FVS System - Brain & Orchestrator (Feb 18, 2026)

### P1 — Remaining
- [x] Admin panel (client management, impersonation) ✅ (Feb 18, 2026)
- [ ] Real video provider integration (Runway, Veo API)
- [x] Refactor server.py into modular structure (routers/, models/, services/) ✅ (Feb 18, 2026)

### P2 — Integrations
- [ ] Stripe billing (replace placeholder)
- [ ] Google Drive file upload
- [ ] Airtable integration
- [ ] Real ElevenLabs voice generation
- [ ] Real DALL-E thumbnail generation

## Test Credentials
- **Client**: alex@company.com / client123
- **Admin**: admin@forgevoice.com / admin123

## Test Reports
- `/app/test_reports/iteration_7.json` - Strategy Lab & Video Lab tests
- `/app/test_reports/iteration_8.json` - FVS System tests (100% pass rate)

---

## Phase 8 — FVS System (Feb 18, 2026)

### FVS System (`/dashboard/system`)
The FVS (ForgeVoice System) is an autonomous "brain + orchestrator" for content creation.

#### Features Implemented:
- **Automation Controls**: Manual / Semi-Auto / Full Auto (Shorts) modes
- **Brain Snapshot**: Shows learned patterns from client's analytics
- **Idea Proposal**: Uses LLM to generate content ideas based on analytics + trends
- **Episode Production**: Orchestrates full episode creation (script → audio → video → thumbnail)
- **Activity Log**: Shows recent FVS operations
- **Stats Summary**: Proposed / In Progress / Completed / Total Actions counts

#### Backend Endpoints:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/fvs/config` | GET/PUT | Get/Set automation level |
| `/api/fvs/brain-snapshot` | GET | Get latest learned patterns |
| `/api/fvs/ideas` | GET | List proposed ideas |
| `/api/fvs/ideas/{id}/status` | PATCH | Update idea status (reject) |
| `/api/fvs/activity` | GET | Get activity log |
| `/api/fvs/propose-ideas` | POST | Generate new ideas via LLM |
| `/api/fvs/produce-episode` | POST | Produce full episode from idea |

#### Database Collections:
- `fvs_config` - Automation settings per client
- `fvs_brain_snapshots` - Learned patterns
- `fvs_ideas` - Proposed content ideas
- `fvs_activity` - Operation logs
- `fvs_scripts` - Generated scripts

#### MOCKED Components:
- Audio generation (simulates ElevenLabs)
- Video generation (uses Kling mock)
- Thumbnail generation (simulates DALL-E)

#### REAL Components:
- LLM calls for idea generation (Gemini via emergentintegrations)
- LLM calls for script generation (Gemini via emergentintegrations)
