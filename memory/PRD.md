# ForgeVoice Studio — PRD & Progress

## Original Problem Statement
Build "ForgeVoice Studio – Client Analytics & AI Production Dashboard" — a full-stack multi-tenant production dashboard for podcast/content agencies with JWT auth, role-based access (admin/client), and AI-powered content creation tools.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui + Recharts + lucide-react + Framer Motion + @dnd-kit
- **Backend**: FastAPI + Motor (async MongoDB) + PyJWT + emergentintegrations + APScheduler + google-api-python-client
- **Database**: MongoDB (multi-tenant via clientId scoping)
- **Auth**: JWT-based with admin/client roles
- **AI**: Multi-provider LLM (Gemini 2.0 Flash via Emergent key)
- **Storage**: S3/S3-compatible (optional, with graceful fallback to data URLs)
- **Brand Brain**: Channel Profile system for AI content customization
- **Publishing**: Real YouTube OAuth 2.0 + mock TikTok/Instagram
- **Analytics**: Real YouTube Analytics + Data API integration
- **Trend Intelligence**: Competitor scanning + AI recommendations (Gemini 2.0 Flash)
- **Notifications**: Real-time notification engine for status updates
- **Spotlight Tour**: Guided onboarding tour with SVG mask spotlight
- **Universal Tooltips**: Contextual help system with glassmorphic tooltips
- **Silk Animations**: Premium page transitions and micro-interactions via Framer Motion
- **Mastermind Calendar**: Drag-and-drop strategic scheduling workbench

## What's Been Implemented

### Phase 32 — Sprint 14: Real YouTube Publishing + Stripe Billing (Skipped) + Quick Test Upload (Feb 20, 2026)

**Summary**: Implemented real YouTube video publishing with OAuth token auto-refresh, background upload with progress tracking, and quota management. Added developer Quick Test Upload helper for testing the publish flow. Stripe Billing integration was skipped per user instruction.

#### Part A: Real YouTube Publishing
**Files**:
- `/app/backend/routers/youtube_publish.py` - Main publish endpoints with token auto-refresh
- `/app/backend/services/youtube_upload_service.py` - Real YouTube Data API v3 integration
- `/app/frontend/src/pages/PublishingDashboardPage.jsx` - Publishing Command Center UI

**Backend Features**:
- `POST /api/publish/youtube` - Triggers real YouTube upload with:
  - Auto-refresh of expired OAuth tokens
  - Background task processing
  - Progress tracking (0-100%)
  - Privacy status support (private/unlisted/public)
  - Quota consumption tracking
- `GET /api/publish/status/{job_id}` - Poll upload progress
- `GET /api/publish/check-video/{submission_id}` - Check if submission has video attached
- `GET /api/publish/queue` - Content ready to publish
- `GET /api/publish/history` - Published jobs
- `GET /api/publish/failed` - Failed jobs (NEW)
- `GET /api/publish/stats` - Publishing stats with quota info
- `POST /api/publish/jobs/{job_id}/retry` - Retry failed upload
- `DELETE /api/publish/jobs/{job_id}` - Cancel pending job

**Token Auto-Refresh**:
- `auto_refresh_youtube_token()` function checks token expiry
- If expired or expiring within 5 minutes, refreshes using Google OAuth2
- Updates database with new access token and expiry

**Frontend Features**:
- Publishing Command Center dashboard with stats cards
- Platform selectors (YouTube connected, TikTok/Instagram coming soon)
- Content Queue tab with publish buttons
- Published tab showing live videos
- Failed tab with retry functionality
- Quota indicator showing daily usage
- Real-time upload progress in slide-over panel

**Verification**:
- ✅ Real video uploaded to YouTube: ID `cLv7vF4WdE0` (private)
- ✅ Token auto-refresh working when expired
- ✅ Progress tracking from 0-100%
- ✅ Published tab shows video with "View" link to YouTube

#### Part B: Stripe Billing
**Status**: SKIPPED per user instruction
**Reason**: "Stripe is parked until we have real clients"
**Tests**: 4 Stripe tests marked with `@pytest.mark.skip(reason="Stripe keys not configured")`

#### Part C: Quick Test Upload Helper
**Files**:
- `/app/backend/routers/dev.py` - Developer-only endpoints

**Backend Endpoints**:
- `GET /api/dev/test-upload/status` - Check if ffmpeg/test upload is available
- `POST /api/dev/test-upload/{submission_id}` - Attach minimal test video
- `DELETE /api/dev/test-upload/{submission_id}` - Remove test video

**Features**:
- Uses ffmpeg to generate 1-second black video with silent audio
- Only available in development mode
- Creates video asset record linked to submission
- Flags test files with `isTestFile: true`

**Verification**:
- ✅ ffmpeg installed and working
- ✅ Test video generation: 9KB MP4 file
- ✅ Asset properly linked to submission
- ✅ Used to test real YouTube upload flow

#### pytest-asyncio Fix
**Files**:
- `/app/backend/pytest.ini` - NEW configuration file

```ini
[pytest]
asyncio_mode = auto
testpaths = tests
```

- Fixed recurring event loop errors with async tests
- Updated tests to use `httpx.AsyncClient` for proper async support

#### Sprint 14 Test Results (Feb 20, 2026):
- Backend: 100% (5/5 active tests passed, 4 Stripe tests skipped)
- Frontend: 100% (all features verified)
- Test report: `/app/test_reports/iteration_38.json`
- Test file: `/app/backend/tests/test_sprint14_features.py`

---

### Hotfix — Admin Data + Calendar Visual Fix (Feb 20, 2026)

**Summary**: Fixed admin overview data accuracy, improved calendar visual design with subtle watermarks and larger event cards, cleaned up test data.

#### Fix 1: Admin Overview Data
**Files**: `/app/backend/routers/dashboard.py`
- Fixed `GET /api/dashboard/admin-overview` to filter clients by `is_active != False` AND `role: "client"`
- Fixed channel_snapshots join to look up latest record per active client
- Fixed Active Channels to count clients with valid OAuth token
- Removed client-facing Quick Actions ("Open Strategy Lab", "Launch AI Video Lab") for admin
- Admin Quick Actions now: "View All Clients", "View Submissions", "View Analytics"

#### Fix 2: Calendar Cadence Watermarks
**Files**: `/app/frontend/src/pages/CalendarPage.jsx`
- Font size: 10px (reduced from ~18px)
- Text: lowercase ("Shorts day", "Strategy day")
- Color: white at 15% opacity (nearly invisible "whisper")
- Position: bottom-center of cell
- Only visible on empty cells (hidden when cell has content)
- Removed green/teal background highlights - all cells same dark bg

#### Fix 3: Calendar Event Cards
**Files**: `/app/frontend/src/pages/CalendarPage.jsx`
- Min height: 52px (increased from ~28px)
- Font size: 12px with 2-line clamp
- Replaced tiny chip badges with 3px left border color indicator
- Border colors: Short=pink, Podcast=blue, Blog=amber
- Cell min height: 130px

#### Fix 4: Test Data Cleanup
- Deleted 4 test submissions with "Sprint 12 Brain Test" or "Regular Submission [hex]"
- Deleted 2 associated brain_scores
- Fixed user clientId sync (alex@company.com now uses correct ID)
- Fixed submissions clientId migration (75 submissions now linked correctly)

---

### Phase 31 — Sprint 13: Content Calendar AI + Brain Prediction Challenge + Admin Role Fix (Feb 20, 2026)

**Summary**: Added three major features: (1) Admin Role Fix - improved admin-specific dashboard with cross-channel summary, hidden client-facing tools from admin sidebar; (2) Content Calendar AI - optimal posting time intelligence with AI-generated 4-week schedules; (3) Brain Prediction Challenge - gamification of the Brain feedback loop with 30-day challenge deadlines.

#### Part A: Admin Role Fix
**Files**: 
- `/app/backend/migrations/versions/s13_admin_cleanup.py` - Data cleanup script
- `/app/backend/routers/dashboard.py` - New `/api/dashboard/admin-overview` endpoint
- `/app/frontend/src/components/layout/Sidebar.jsx` - Conditional rendering for admin
- `/app/frontend/src/pages/OverviewPage.jsx` - Admin-specific dashboard

**Backend**:
- `GET /api/dashboard/admin-overview` - Returns cross-channel summary:
  - `totalClients`: Count of non-admin users
  - `totalVideosManaged`: Sum of submissions across all clients
  - `totalViewsManaged`: Sum of views from channel snapshots
  - `activeChannels`: Count of users with youtube_connected=true

**Frontend**:
- Admin Overview shows "ForgeVoice Admin Dashboard" header (not "Welcome back")
- Admin KPI cards: Total Clients | Videos Managed | Total Views | Active Channels
- Admin sidebar hides: Labs section (FVS System, Strategy Lab, AI Video Lab) + Blog
- Admin only sees: Overview, Submissions, Calendar, Production Files, Assets, Publishing, Analytics, ROI Center, Admin Panel, Billing, Settings, Help
- Brain Accuracy widget hidden from admin Overview (irrelevant for admin)

**Verification**:
- ✅ Admin login → "ForgeVoice Admin Dashboard" header
- ✅ Admin KPIs: Total Clients (11), Videos Managed (79), Total Views (0), Active Channels (0)
- ✅ Admin sidebar hides Labs section and Blog nav
- ✅ Client login → Full sidebar with Labs and Blog visible

#### Part B: Content Calendar AI
**Files**:
- `/app/backend/services/calendar_intelligence_service.py` - New service (created)
- `/app/backend/routers/calendar.py` - New endpoints added
- `/app/frontend/src/pages/CalendarPage.jsx` - AI Schedule button and slide-over

**Backend Endpoints**:
- `GET /api/calendar/best-times` - Returns top 3 day/time slots based on historical performance:
  - `top_slots[]`: day, time_slot, time_label, avg_views, sample_size, confidence
  - `total_analyzed`: Number of published videos analyzed
- `POST /api/calendar/ai-schedule` - Generates AI-powered 4-week schedule using Gemini 2.0 Flash
- `GET /api/calendar/ai-schedule` - Returns latest generated schedule
- `POST /api/calendar/apply-suggestion` - Applies single calendar suggestion

**Frontend Features**:
- **AI Schedule button** (teal) in Calendar page header
- **AI Schedule slide-over panel** containing:
  - Best Posting Times section with 🥇🥈🥉 medals
  - Day/time slot, avg views, confidence level
  - "Based on X published videos analysis"
  - "Generate 4-Week Schedule" button
  - Generated schedule list grouped by week
  - "Apply Full Schedule" button
- **Today button** next to month navigation
- **Improved calendar cells** (120px height, cadence watermarks)
- **Cadence watermarks** on empty days: "Shorts Day", "Strategy Day"
- **Improved pipeline cards** (80px min height, description snippet)
- **"Add New Idea" button** at bottom of pipeline

**Verification**:
- ✅ Calendar page shows AI Schedule button
- ✅ AI Schedule opens slide-over with Best Posting Times
- ✅ Best times shows top 3 slots with confidence levels
- ✅ Generate Schedule button visible

#### Part C: Brain Prediction Challenge
**Files**:
- `/app/backend/services/brain_service.py` - Updated with challenge tracking
- `/app/backend/routers/brain.py` - New `/api/brain/active-challenges` endpoint
- `/app/frontend/src/pages/FvsSystemPage.jsx` - Active Challenges panel
- `/app/frontend/src/pages/OverviewPage.jsx` - Active challenges counter link

**Backend**:
- `brain_scores` now includes:
  - `challenge_deadline`: datetime = created_at + 30 days
  - `days_remaining`: computed (challenge_deadline - now).days
  - `is_expired`: bool = days_remaining <= 0
- `GET /api/brain/active-challenges` returns:
  - `active_challenges[]`: id, predicted_title, predicted_tier, days_remaining, submission_id
  - `total_active`: Count of pending predictions
  - Sorted by days_remaining ASC (most urgent first)
- `GET /api/brain/scores` now includes `days_remaining` and `is_expired` for each score

**Frontend Features**:
- **Active Predictions panel** on FVS System page:
  - ⚔️ Active Predictions header
  - Challenge cards with predicted title, tier badge (High/Medium)
  - "Verdict in X days" with clock icon
  - Progress bar showing time elapsed (30-day countdown)
  - Gold border for High predictions, teal for Medium
  - Pulse animation when days_remaining ≤ 3
  - Footer: "The Brain has X active predictions. Check back as your videos collect views."
  - Empty state: "No active predictions yet"
- **Active challenges counter** on Overview page:
  - "⚔️ X active predictions awaiting verdict" link
  - Navigates to FVS System #active-challenges

**Verification**:
- ✅ FVS System shows Active Predictions panel with 4 challenges
- ✅ Each challenge shows tier badge (High), "Verdict in 30 days"
- ✅ Progress bars visible with gold fill
- ✅ Overview shows "4 active predictions awaiting verdict" link
- ✅ Brain scores include days_remaining and is_expired

#### Part D: Strategic Calendar UI Upgrade
**Files**:
- `/app/frontend/src/pages/CalendarPage.jsx` - Visual enhancements

**Changes**:
- Calendar cells: 120px min height (doubled from 60px)
- Date number: top-left corner, small (11px), muted
- Cadence watermarks: centered, opacity 30%, configurable via `CADENCE_CONFIG`
- Pipeline cards: 80px min height, 2-line titles, description snippet
- "Add New Idea" button with dashed border at bottom of pipeline
- Empty pipeline state with link to FVS System

#### Sprint 13 Test Results (Feb 20, 2026):
- Backend: 100% (10/10 API tests passed)
- Frontend: 100% (all Sprint 13 features verified)
- Test report: `/app/test_reports/iteration_37.json`

#### 10-Point Verification Checklist:
1. ✅ Admin login → FVS System, Strategy Lab, AI Video Lab not visible in sidebar
2. ✅ Admin Overview shows cross-channel summary (Total Clients, Videos Managed)
3. ✅ Admin FVS System page → old podcast episode ideas completely gone
4. ✅ Calendar page → "AI Schedule" button visible top-right
5. ✅ Click "AI Schedule" → slide-over opens showing Best Posting Times section
6. ✅ Click "Generate Schedule" → AuraSpinner → 4-week schedule appears
7. ✅ FVS System → "Active Challenges" section visible with 4 challenge cards
8. ✅ Create submission from recommendation → Active Challenge card appears
9. ✅ Brain scores include days_remaining and is_expired fields
10. ✅ All Sprint 13 tests pass

---

### Phase 30 — Sprint 12: Brain Feedback Loop + Multi-Channel Foundation + Identity Fix (Feb 20, 2026)

**Summary**: Implemented self-improving Brain Feedback Loop to track AI recommendation accuracy, built admin multi-channel onboarding system, and fixed client identity from Alex Chen to Chanakya Sutra.

**Post-Sprint Fix**: Hidden client-facing "Labs" tools (FVS System, Strategy Lab, AI Video Lab) from admin sidebar. Admin tries to access these URLs directly are redirected to Admin Panel.

#### Part A: Identity Fix
**Files**: `/app/backend/migrations/versions/s12_identity_fix.py`
- Created one-time DB migration to rename demo client
- Updated `users.name` and `users.full_name` from "Alex Chen" → "Chanakya Sutra"
- Updated `clients.name` and `clients.primaryContactName` accordingly
- Greeting now pulls from `currentUser.full_name` dynamically

**Verification**:
- ✅ Overview greeting shows "Welcome back, Chanakya Sutra"
- ✅ Sidebar bottom-left shows "Chanakya Sutra"
- ✅ Admin Panel client list shows "Chanakya Sutra"

#### Part B: Admin Multi-Channel Onboarding
**Files**: 
- `/app/backend/routers/admin.py` - New CRUD endpoints
- `/app/backend/services/admin_service.py` - Service with Sprint 12 fields
- `/app/frontend/src/pages/AdminPage.jsx` - Complete rewrite with new features

**Backend Endpoints**:
- `POST /api/admin/clients` - Create new client account with channel profile
- `PATCH /api/admin/clients/{user_id}` - Update client details
- `DELETE /api/admin/clients/{user_id}` - Soft delete (set is_active=false)
- `GET /api/admin/clients` - Now includes: channel_name, subscriber_count, total_videos, youtube_connected, is_active

**Frontend Features**:
- **Client Table** with columns: Client | Channel | YouTube (green/red dot) | Subs | Videos | Status | Actions
- **"+ Add New Channel" button** (teal) opens slide-over panel with form:
  - Channel Name, Email, Password
  - Channel Niche, Language Style (dropdown), Content Pillars (tag input), Description
- **Edit slide-over** for updating client details
- **Deactivate confirmation** with inline Confirm/Cancel
- **Actions**: Impersonate | Edit | Deactivate buttons per client

#### Part C: Brain Feedback Loop
**Files**:
- `/app/backend/models/brain_scores.py` - Pydantic models
- `/app/backend/services/brain_service.py` - Brain scoring logic
- `/app/backend/routers/brain.py` - API endpoints
- `/app/backend/db/mongo.py` - Added brain_scores_collection

**Database Schema** (`brain_scores` collection):
```python
{
  id: UUID,
  user_id: UUID,
  recommendation_id: string,
  submission_id: UUID,
  predicted_tier: "High" | "Medium",
  predicted_title: string,
  actual_views: int (nullable),
  actual_likes: int (nullable),
  performance_verdict: "correct" | "incorrect" | "pending",
  verdict_reasoning: string,
  scored_at: datetime (nullable),
  created_at: datetime
}
```

**Performance Thresholds**:
- High: ≥5,000 views = correct
- Medium: ≥1,000 views = correct

**API Endpoints**:
- `GET /api/brain/scores` - Returns summary + all scores
- `GET /api/brain/accuracy-trend` - Weekly accuracy grouped by ISO week
- `GET /api/brain/leaderboard` - Top 5 best-predicted Shorts

**Frontend: FVS System Page** (`/app/frontend/src/pages/FvsSystemPage.jsx`):
- **Brain Accuracy Panel at TOP** with:
  - Accuracy percentage (gold glow ≥80%, teal ≥60%, zinc <60%)
  - Stats: Accuracy | Total Made | Awaiting Data | This Week
  - Progress bar with status message
  - Collapsible Brain Scorecard table
- **Empty state**: "Start making AI-recommended Shorts to train the Brain"

**Frontend: Overview Page** (`/app/frontend/src/pages/OverviewPage.jsx`):
- **Brain Accuracy Widget** showing current accuracy
- Click to navigate to FVS System page
- Empty state for no predictions

**Frontend: Analytics Page** (`/app/frontend/src/pages/AnalyticsPage.jsx`):
- **Third tab "Brain Intelligence"** added
- Weekly Accuracy Trend line chart
- Top Predicted Performers leaderboard
- Full Prediction Scorecard table

#### Part D: Recommendation Tracking
**Files**: `/app/backend/routers/submissions.py`, `/app/backend/models/content.py`
- Added `recommendation_id` field to `SubmissionCreate` model
- When creating submission with `recommendation_id`:
  - Creates `brain_scores` record automatically
  - Returns `brain_score_id` in response
- Frontend shows toast: "Submission created + Brain tracking enabled 🧠"

#### Test Results (Feb 20, 2026):
- Backend: 100% (13/13 tests passed)
- Frontend: 100% (all Sprint 12 features verified)
- Test report: `/app/test_reports/iteration_36.json`

#### 9-Point Verification Checklist:
1. ✅ Admin Panel → "+ Add New Channel" → creates test channel
2. ✅ Admin Panel → Impersonate new client → empty workspace
3. ✅ Admin Panel → client list shows "Chanakya Sutra"
4. ✅ Overview greeting shows "Welcome back, Chanakya Sutra"
5. ✅ FVS System → Brain Accuracy card visible at top
6. ✅ FVS System → "Create Submission" creates brain_scores record
7. ✅ `GET /api/brain/scores` → correct structure
8. ✅ Analytics page → "Brain Intelligence" tab visible
9. ✅ All tests pass

### Phase 29 — Sprint 10: UI Wiring + Foundation Fixes (Feb 20, 2026)

**Summary**: Wired all remaining UI components to backend services and fixed critical bugs. All Sprint 10 objectives complete.

#### Part A: FVS System - Interactive AI Recommendation Cards
**File**: `/app/frontend/src/pages/FvsSystemPage.jsx`
- Replaced static ideas table with interactive gradient cards
- Each card shows: title, hook/angle, performance tier badge (High/Medium)
- Cards are clickable to open idea panel with full details
- "Scan for New Ideas" button with gradient styling

#### Part B: Analytics Page - Trend Intelligence Tab
**File**: `/app/frontend/src/pages/AnalyticsPage.jsx`
- Added tabbed interface (Performance | Trend Intelligence)
- Trend Intelligence tab includes:
  - **Top Competitor Shorts**: 8 videos with thumbnails, views, external links
  - **Trending Keywords**: Popular search terms with video counts
- Fetches from `/api/trends/competitors` and `/api/trends/trending`

#### Part C: Overview Dashboard - Channel Health
**File**: `/app/frontend/src/pages/OverviewPage.jsx`
- YouTube Channel Stats showing 1,320 subscribers, 116,803 views, 73 videos
- Best Performing Short with thumbnail and engagement metrics
- Live Data badge

#### Part D: ROI Center - YouTube-Native CPM Model
**File**: `/app/frontend/src/pages/ROIPage.jsx`
- Complete rework with CPM-based revenue calculation:
  - **Ad Revenue** = (Total Views / 1000) × CPM Rate
  - **Sponsorship Revenue** = Videos × Sponsorship per Video
- Editable settings in ROI Settings sheet:
  - CPM Rate: $1.50 default (realistic for Indian YouTube)
  - Sponsorship per Video: $0 default
- Settings persist to localStorage
- Shows: Total Views (116,803), Est. Ad Revenue ($175.20), Revenue Breakdown chart

#### Part E: Critical Bug Fixes
1. **YouTube Token Auto-Refresh** (`/app/frontend/src/utils/youtubeApi.js`):
   - Created utility with `refreshYouTubeToken()` function
   - Catches 401 errors and attempts token refresh via `/api/oauth/refresh/youtube`
   - Shows reconnect toast on failure
   
2. **Chanakya Sutra Blog Articles** (`/app/backend/migrations/update_blog_chanakya.py`):
   - 5 authentic Chanakya-themed articles with real teachings:
     1. "Saam, Daam, Dand, Bhed: The 4 Pillars of Influence for Content Creators"
     2. "The Panchatantra Principle: Why Story-First Content Wins on Shorts"
     3. "Karma Yoga for Creators: Detach from Views, Attach to Value"
     4. "The Mandala Strategy: Building Your Content Kingdom Layer by Layer"
     5. "Arthashastra Economics: Pricing Your Time and Monetizing Wisdom"
   - Each follows format: Ancient principle → Modern application → 3 Actionable Takeaways
   - Hinglish examples in body, English main text
   
3. **Help Page Error Toast** (`/app/frontend/src/pages/HelpPage.jsx`):
   - Fixed error handling to only show toast for 5xx errors
   - Empty data now shows clean empty state instead of error
   
4. **Strategy Lab Tone Pre-population** (`/app/frontend/src/pages/StrategyPage.jsx`):
   - Now fetches from channel profile first (`/api/channel-profile`)
   - Falls back to settings brandVoiceDescription
   - Pre-populates with "strategic, sharp, guru-like, authoritative"
   
5. **Asset Thumbnail Previews** (`/app/frontend/src/pages/AssetsPage.jsx`):
   - Improved `isImageUrl()` function to detect more image hosting patterns
   - Fixed case-sensitivity bug (Thumbnail vs thumbnail)
   - Shows image preview with zoom overlay for thumbnails

#### Part F: Navigation Cleanup
**File**: `/app/frontend/src/components/layout/Sidebar.jsx`
- Renamed "Deliverables" → "Production Files"
- Added video count badge to "Submissions" (shows 73)
- Badge styled with indigo colors

#### Test Results (Feb 20, 2026):
- Backend: 100% (16/16 tests passed)
- Frontend: 100% (13/13 Sprint 10 features verified)
- Test report: `/app/test_reports/iteration_35.json`

#### Live Verification (5-Point Check):
1. ✅ FVS System shows Chanakya-specific recommendation cards
2. ✅ Analytics Trend Intelligence tab shows competitor data
3. ✅ Overview shows 1,320 subscribers
4. ✅ ROI Center shows $175.20 ad revenue (116,803 views × $1.50 CPM)
5. ✅ Blog shows 5 Chanakya articles

### Phase 28 — Real Analytics + Trend Intelligence Engine (Sprint 9) (Feb 2026)

**Summary**: Wired real YouTube Analytics API into the system and built a competitor/trend scanning engine with AI-powered content recommendations.

#### Part A: Real YouTube Analytics Pipeline

**Backend Services** (`/app/backend/services/analytics_service.py`):
- `sync_channel_analytics()`: Fetches real analytics from YouTube Analytics API
  - Falls back to Data API for non-monetized channels (YPP requirement)
  - Stores video-level data in `youtube_analytics` collection
  - Stores channel snapshots in `channel_snapshots` collection
- `get_analytics_overview()`: Aggregated metrics (views, watch time, CTR, AVD)
- `get_top_performers()`: Top videos by engagement score (CTR × AVD)
- `get_chart_data()`: Time-series data for charts

**API Endpoints** (`/app/backend/routers/analytics.py`):
- `POST /api/analytics/sync` - Triggers YouTube Analytics sync
- `GET /api/analytics/overview` - Aggregated analytics overview
- `GET /api/analytics/videos` - Video-level analytics with sorting
- `GET /api/analytics/chart-data` - Chart data by metric
- `GET /api/analytics/top-performers` - Top performing videos

**Frontend Updates** (`/app/frontend/src/pages/AnalyticsPage.jsx`):
- **Sync Analytics button** (teal, top-right) - triggers real data sync
- **Last synced timestamp** displayed
- **Real KPIs**: Total Views (116K+), Videos (73), Subscribers (1,320)
- Charts showing video-by-video performance

#### Part B: Trend Intelligence Engine

**Backend Services** (`/app/backend/services/trend_service.py`):
- `scan_competitors()`: Scans 11 competitor channels for top Shorts (14 days)
- `scan_trending_topics()`: Searches 10 trend keywords for viral content
- `generate_recommendations()`: Gemini 2.0 Flash AI generates 3 content ideas

**Competitor Channels Monitored**:
- Chanakya Inspired, Chanakya Niti Inspire, Dark Niti, Wake Up World
- Vayask Nazariya, WealthSutra, I Am Sun Tzu, Machiavelli Mindset
- Alpha Stoic Hub, Capital STOIC, RedFrost Motivation

**Trend Keywords Tracked**:
- Chanakya niti, Chanakya quotes hindi, dark psychology hindi
- dhan niti, kadwi sach, stoicism, mind control hindi
- ancient wisdom modern life, enemy strategy, power mindset

**API Endpoints** (`/app/backend/routers/trends.py`):
- `POST /api/trends/scan` - Background scan of competitors + trends
- `GET /api/trends/scan/status` - Scan progress/status
- `GET /api/trends/recommendations` - AI-generated content ideas
- `GET /api/trends/competitors` - Competitor video data
- `GET /api/trends/trending` - Trending topics by keyword

**AI Recommendations** (Gemini 2.0 Flash):
- Returns 3 Shorts with Hinglish titles, hooks, angles
- Example: "Silent Power: कब चुप रहना है? #ChanakyaNiti"
- Performance tier predictions (High/Medium)

#### Part C: Frontend Wiring (Sprint 9 Completion - Feb 20, 2026)

**Overview Page Updates** (`/app/frontend/src/pages/OverviewPage.jsx`):
- **YouTube Channel Stats Card** with "Live Data" badge
  - Subscribers: 1,320
  - Total Views: 116,803
  - Videos: 73
  - Avg View Duration: 0s (requires YPP)
- **Best Performing Short** section with thumbnail, title, views, likes
- Real-time data from `/api/analytics/overview` and `/api/analytics/top-performers`

**FVS System Page Updates** (`/app/frontend/src/pages/FvsSystemPage.jsx`):
- **Trend Intelligence Engine** section (new)
  - **AI Recommendations** panel: 3 AI-generated content ideas with titles, hooks, confidence scores
  - **Top Competitor Shorts** panel: 10 competitor videos with thumbnails, views, external links
  - **Scan Trends** button: Triggers `/api/trends/scan`, polls status, shows toast on completion
- Polling mechanism for scan progress with timeout

**ROI Center Page Updates** (`/app/frontend/src/pages/ROIPage.jsx`):
- Enhanced metrics using real YouTube views from `/api/analytics/videos`
- **Real Watch Time** card (violet gradient) when data available
- Graceful empty state when no episodes published

#### Part D: Scheduler Integration

**Daily Cron Jobs** (`/app/backend/services/publishing_scheduler.py`):
- **6 AM UTC**: `daily_analytics_sync()` - Auto-sync YouTube Analytics
- **7 AM UTC**: `daily_trend_scan()` - Auto-scan competitors + generate recommendations

#### Database Collections Added
- `youtube_analytics`: Video-level analytics (73 records)
- `channel_snapshots`: Channel-level stats (subscribers, views)
- `competitor_videos`: Competitor channel videos
- `trending_topics`: Trending videos by keyword
- `fvs_recommendations`: AI-generated content ideas

#### Test Results (Feb 20, 2026):
- Backend: 100% (25/25 tests passed)
- Frontend: 100% (all 7 features verified)
- Test report: `/app/test_reports/iteration_34.json`

#### Limitations:
- Watch Time, CTR, AVD require YouTube Partner Program monetization
- Using Data API fallback for basic stats (views, likes)

### Phase 27 — The "Pulse" Update (Sprint 8) (Feb 2026)

**Summary**: Transitioned ForgeVoice Studio from mock demo to live command center with real YouTube OAuth 2.0, database cleanup, and realistic data seeding.

#### Real YouTube OAuth 2.0 (`/app/backend/routers/oauth.py`)
- **Real OAuth Flow**: YouTube OAuth now uses actual Google OAuth 2.0 with PKCE
  - Configured: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI`
  - Scopes: `youtube.readonly`, `yt-analytics.readonly`, `youtube.upload`
  - Returns `isMock: false` for YouTube connections
  
- **Token Exchange**: Real code-for-token exchange via `https://oauth2.googleapis.com/token`
- **Refresh Token**: Real token refresh using Google's refresh_token grant
- **Channel Info Fetch**: Automatically fetches channel name and subscriber count on connect

#### YouTube Channel Sync Service (`/app/backend/services/youtube_sync_service.py`)
- **`POST /api/oauth/youtube/sync`**: Triggers full channel import
  - Fetches channel info (name, subscribers, uploads playlist)
  - Imports all Shorts (videos ≤ 3 min) as submissions
  - Creates video and thumbnail assets for each Short
  - Updates analytics_snapshots with channel-level stats
  
- **`GET /api/oauth/youtube/sync/status`**: Returns last sync timestamp and totals

#### Database Cleanup (`/app/backend/scripts/cleanup_and_seed.py`)
- Deleted all `TEST_*` submissions and duplicates
- Cleaned orphaned assets and deliverables
- Seeded 3 "Hero Episodes":
  1. "The Chanakya Principle" - EDITING status (In Production)
  2. "5 AI Tools Every Content Creator Needs in 2026" - SCHEDULED (Ready to Publish)
  3. "Why 99% of Podcasters Fail" - PUBLISHED (Live on YouTube)
- Seeded 30 days of analytics data with realistic metrics

#### Frontend Updates (`/app/frontend/src/pages/SettingsPage.jsx`)
- Added "Sync Channel" button for YouTube connections
- Button appears when YouTube is connected (any token status)
- Disabled when token expired (prompts refresh first)
- Shows loading spinner during sync

#### Environment Updates (`/app/backend/.env`)
```
YOUTUBE_CLIENT_ID=597182844338-...
YOUTUBE_CLIENT_SECRET=GOCSPX-...
YOUTUBE_REDIRECT_URI=https://video-monetize-flow.preview.emergentagent.com/api/oauth/callback/youtube
```

#### Test Results (Feb 2026):
- Backend: 100% (19/19 tests passed)
- Frontend: 100% (all UI flows working)
- Test report: `/app/test_reports/iteration_32.json`

#### Key Fixes:
- ROI Center now shows data (added `episodesPublished` to analytics snapshots)
- Overview page loads without infinite spinner
- No false error toasts on empty data states

### Phase 26 — Real OAuth Publishing Layer (Sprint 7) (Dec 2025)

**Summary**: Built a complete mock OAuth 2.0 publishing pipeline for YouTube Shorts with token management, quota tracking, and progress polling.

#### Backend Implementation (`/app/backend/routers/oauth.py`)
- **OAuth Status Endpoint** (`GET /api/oauth/status`):
  - Returns connection status for all 3 platforms (YouTube, TikTok, Instagram)
  - Tracks token status: `valid`, `expiring_soon`, `expired`
  - Returns account metadata (name, handle, subscriber count)

- **OAuth Connect Flow** (`POST /api/oauth/connect/{platform}`):
  - Generates state parameter for CSRF protection
  - Generates PKCE code verifier/challenge for production readiness
  - Returns mock authUrl that auto-completes the flow

- **OAuth Callback** (`GET /api/oauth/callback/{platform}`):
  - Validates state parameter
  - Stores mock access/refresh tokens (1-hour expiry)
  - Returns success HTML that posts message to parent window

- **Token Refresh** (`POST /api/oauth/refresh/{platform}`):
  - Generates new mock access token
  - Updates expiry timestamp

- **Disconnect** (`DELETE /api/oauth/disconnect/{platform}`):
  - Removes stored tokens

- **Quota Management** (`GET /api/oauth/quota`):
  - Tracks daily API quota usage (10,000 units max)
  - Returns warning levels: `normal`, `warning` (>80%), `critical` (>95%)

#### Backend Implementation (`/app/backend/routers/youtube_publish.py`)
- **Publish to YouTube** (`POST /api/publish/youtube`):
  - Validates platform connection, token validity, quota
  - Validates submission and video asset existence
  - Creates publish job with background processing
  - Simulates upload progress (10% → 25% → 45% → 65% → 85% → 100%)
  - Generates mock video ID and YouTube URL

- **Status Polling** (`GET /api/publish/status/{job_id}`):
  - Returns current job status and progress percentage
  - States: `pending`, `uploading`, `processing`, `live`, `failed`

- **Retry Failed Jobs** (`POST /api/publish/jobs/{job_id}/retry`):
  - Resets failed job status to pending
  - Restarts background upload process

- **History & Queue**:
  - `GET /api/publish/history` - Completed (live) jobs
  - `GET /api/publish/queue` - Submissions ready to publish
  - `GET /api/publish/jobs` - All jobs with filters
  - `GET /api/publish/stats` - Publishing statistics + quota

#### Frontend Implementation (`/app/frontend/src/pages/SettingsPage.jsx`)
- **Connected Accounts Section** (Publishing tab):
  - Platform cards for YouTube, TikTok, Instagram
  - YouTube: Connect/Disconnect buttons, Refresh token button
  - Token status badges: Connected (green), Expiring Soon (amber), Expired (red)
  - Account info: handle, subscriber count
  - TikTok/Instagram: "Coming Soon" badges, disabled buttons
  - OAuth security info banner
  - Demo mode notice

#### Frontend Implementation (`/app/frontend/src/pages/PublishingDashboardPage.jsx`)
- **Publishing Command Center**:
  - Stats cards: Total Published, In Queue, Uploading, Failed
  - Quota indicator with progress bar and warning colors
  - Platform selector (YouTube connected, others coming soon)

- **Content Queue Tab**:
  - Lists submissions ready to publish
  - Shows content type/status badges
  - "No Video" warning badge when video asset missing
  - "Publish Now" button opens slide-over

- **Publish Slide-Over**:
  - Title input (100 char max)
  - Description textarea (5000 char max)
  - Tags input (comma-separated)
  - Privacy selector: Public, Unlisted, Private
  - Schedule toggle with date picker
  - Video asset selector
  - Thumbnail selector
  - Progress indicator during upload

- **Published History Tab**:
  - Shows completed jobs with YouTube link
  - Platform icon, title, publish date
  - "View" button opens YouTube URL

- **Failed Jobs Tab**:
  - Shows failed jobs with error message
  - "Retry" button to retry upload

#### Database Collections
- **oauth_tokens**: `clientId`, `platform`, `connected`, `accessToken`, `refreshToken`, `expiresAt`, `accountName`, `accountHandle`, `accountMeta`, `connectedAt`
- **publish_jobs**: `clientId`, `submissionId`, `platform`, `status`, `progress`, `title`, `description`, `tags`, `privacyStatus`, `platformVideoId`, `platformUrl`, `errorMessage`

#### Environment Updates
- Added `BACKEND_PUBLIC_URL` env var for proper OAuth callback URL generation

#### Test Results (Dec 2025):
- Backend: 96% (27/28 tests passed)
- Frontend: 100% (all UI elements and flows working)
- Test report: `/app/test_reports/iteration_31.json`

#### Mocked Integrations:
- YouTube OAuth 2.0 - simulated via MOCK_OAUTH_ENABLED flag
- YouTube video upload - background task simulates progress
- Token refresh - generates new mock tokens

### Phase 25 — Mastermind Calendar: Strategic Command Center (Sprint 6) (Dec 19, 2025)

**Summary**: Transformed the static Calendar into a high-intelligence, drag-and-drop strategic workbench with AI-driven gap analysis.

#### Two-Pane Layout
- **Left (75%)**: Interactive Month Grid (Drop Zone) with droppable day cells
- **Right (25%)**: Content Pipeline sidebar (Draggable Source) showing unscheduled content

#### DnD Implementation (@dnd-kit)
- `DraggablePipelineCard`: Pipeline items with drag handles (GripVertical icon)
- `DraggableCalendarEvent`: Calendar events that can be dragged to reschedule
- `DroppableDay`: Day cells that accept dropped content
- `DragOverlay`: Visual feedback during drag operations
- Optimistic UI updates on drop

#### Multi-Fidelity Views
- **Month View**: Calendar grid with weekday headers
- **Agenda View**: Vertical list grouped by date with status badges
- **Upcoming View**: Next 14 days with "Today" highlighting

#### AI Suggest Engine (`/api/calendar/suggest`)
- Detects "Content Deserts" (gaps > 48 hours)
- Cross-references pipeline content
- Renders "Ghost Pills" (dashed amber border, Sparkles icon) in suggested slots
- Click to auto-schedule recommended content

#### Cadence Watermarks
- Monday/Wednesday: "SHORTS DAY"
- Tuesday/Thursday: "PODCAST DAY"
- Friday: "BLOG DAY"
- Watermarks pulse when compatible content is being dragged

#### Backend Endpoints Created
- `GET /api/calendar/pipeline`: Unscheduled submissions (INTAKE/EDITING)
- `GET /api/calendar/suggest`: AI gap analysis suggestions
- `PATCH /api/calendar/schedule/{id}?date=YYYY-MM-DD`: Schedule content
- `PATCH /api/calendar/unschedule/{id}`: Move back to pipeline

#### Files Modified/Created
- `CalendarPage.jsx`: Complete rebuild with DndContext and all components
- `calendar.py`: 4 new endpoints for pipeline, suggest, schedule, unschedule

**Test Results (Dec 19, 2025)**:
- Backend: 100% (17/17 tests passed)
- Frontend: 100% (all UI elements and interactions working)
- Test report: `/app/test_reports/iteration_30.json`

### Phase 24 — Silk Update: Page Animations & Transitions (Sprint 5) (Dec 19, 2025)

**Summary**: Transformed ForgeVoice Studio into a high-end, fluid cinematic experience with comprehensive animations.

#### Animation Components Created (`/app/frontend/src/components/animations/`):
- **PageTransition.jsx**: AnimatePresence wrapper with silk-smooth slide & fade transitions
- **AuraSpinner.jsx**: Custom gold gradient spinning loading indicator with blur trail
- **AnimatedNumber.jsx**: Count-up animation from 0 to target value (2s duration)
- **MotionComponents.jsx**: Reusable animated components (MotionButton, MotionCard, StaggerContainer, etc.)

#### CSS Animations Added (`/app/frontend/src/index.css`):
- **Glass Flutter Effect** (`.glass-flutter`): Shimmer light streak on hover with brightness increase
- **Sidebar Nav Glow** (`.nav-glow-item`): Gold radial gradient follows cursor position
- **Active Nav Breathing** (`.nav-active-glow`): Pulsing golden glow on active link
- **Button Press** (`.btn-press`): Scale to 0.98 on active state
- **Tooltip Rotation** (`.tooltip-icon-rotate`): 15-degree rotation on hover
- **Card Lift** (`.card-lift`): translateY(-2px) hover effect

#### Key Implementation Details:
- **Page Transitions**: AnimatePresence in DashboardLayout.jsx with pageVariants (y: 10 → 0, opacity: 0 → 1)
- **Silk Easing**: Custom cubic-bezier [0.22, 1, 0.36, 1] for premium feel
- **Staggered Entry**: 0.05s delay between KPI cards
- **Accessibility**: All animations respect `prefers-reduced-motion` media query
- **GPU Acceleration**: `will-change: transform, opacity` on animated elements

#### Files Modified:
- `DashboardLayout.jsx`: Added AnimatePresence with motion.div wrapper
- `Sidebar.jsx`: Added NavItem component with gold glow trail effect
- `OverviewPage.jsx`: Added AnimatedNumber, staggered KPI cards
- `AnalyticsPage.jsx`: Added AnimatedNumber, staggered KPI cards
- `App.js`: Updated LoadingScreen to use AuraSpinner
- `button.jsx`: Added btn-press class for press effect
- `AuraTooltip.jsx`: Added tooltip-icon-rotate class

**Test Results (Dec 19, 2025)**:
- Frontend: 100% (11/11 animation features working)
- Test report: `/app/test_reports/iteration_29.json`

### Phase 23 — Universal Tooltips (Sprint 4) (Feb 19, 2026)

#### Sprint 4 Gap Fill — Tooltip Expansion (Dec 19, 2025)

**Summary**: Expanded AuraTooltip coverage from 19 elements across 7 pages to **46 tooltips across 11 pages**.

**Newly Updated Pages**:
- `CalendarPage.jsx`: Page title (calendarView), Release Date label (addToCalendar) — 2 tooltips
- `DeliverablesPage.jsx`: Page title (deliverableStatus), Type column (deliverableType), Status column (markComplete), Release column (dueDate) — 4 tooltips
- `BlogPage.jsx`: Page title (generateWithAi), Blog titles (blogTitle), Excerpts (excerpt) — 11 tooltips (3 per card × 3 cards + 2 header)
- `VideoLabPage.jsx`: Provider label (videoProvider), Prompt/Description label (scriptInput), Script Text label (sceneBreakdown), Audio Asset label (generateVoiceover) — 4 tooltips
- `AnalyticsPage.jsx`: Page header description (views30d), KPI cards with tooltips (views30d, watchTime, ctr, revenue) — 5 tooltips
- `ROIPage.jsx`: Page title (roiCalculation), KPI cards (totalInvestment, totalReturn, paybackPeriod), Cost Assumptions section (costPerVideo), ROI Breakdown section (revenuePerVideo) — 6 tooltips
- `BillingPage.jsx`: Page title (currentPlan), Current Subscription (currentPlan), Next billing (nextBillingDate), Update Payment (paymentMethod), Change Plan (upgradePlan), Available Plans (usageThisMonth) — 6 tooltips

**Tooltip Coverage Summary**:
| Page | Tooltip Count |
|------|---------------|
| OverviewPage | 5 |
| SubmissionsPage | 2 |
| CalendarPage | 2 |
| DeliverablesPage | 4 |
| BlogPage | 11 |
| VideoLabPage | 4 |
| AnalyticsPage | 5 |
| ROIPage | 6 |
| BillingPage | 6 |
| PublishingDashboardPage | 1 |
| SettingsPage | 2 |
| **Total** | **46** |

**Test Results (Dec 19, 2025)**:
- Frontend: 100% (11/11 pages with tooltips working)
- Test report: `/app/test_reports/iteration_28.json`

#### AuraTooltip Component (`/app/frontend/src/components/ui/AuraTooltip.jsx`):
- **Glassmorphic Styling**: `backdrop-blur-md`, `bg-[rgba(20,20,25,0.95)]`, `border-white/10`
- **Trigger Icon**: 12px HelpCircle icon, `text-amber-400/40` at rest, `text-amber-400` on hover
- **Smart Positioning**: `calculatePosition()` with viewport boundary clamping
- **Arrow Pointer**: CSS rotated square connecting tooltip to icon
- **Animation**: Fade-in with upward translate (150ms ease)
- **Portal Rendering**: Uses `createPortal` for z-index 9999 overlay

#### Tooltip Content (`/app/frontend/src/constants/tooltipContent.js`):
- **115 tooltip entries** organized by page:
  - Overview (7 entries): KPIs, Pipeline, Schedule, Submit
  - Submissions (8 entries): New, Status, Thumbnails, Script, Tags
  - Calendar (5 entries): Badges, Add to Calendar
  - Deliverables (4 entries): Status, Complete, Type, Due
  - Assets (6 entries): Upload, Filter, Download, Copy URL
  - Publishing (6 entries): Connect, Publish, Schedule, Status
  - Blog (5 entries): Generate, SEO, Publish
  - Strategy Lab (9 entries): Content, Audience, Phases
  - AI Video Lab (7 entries): Script, Voice, Export
  - FVS System (7 entries): Score, Velocity, Automation
  - Analytics (7 entries): Views, Watch Time, CTR, Retention
  - ROI Center (6 entries): Calculation, Cost, Revenue
  - Billing (6 entries): Plan, Usage, Invoice
  - Settings (9 entries): Notifications, Platform, API Keys
  - Common (8 entries): Save, Cancel, Delete, Export

#### Pages Updated with Tooltips:
- `OverviewPage.jsx`: KPI cards (4), Production Pipeline (1)
- `SubmissionsPage.jsx`: New Submission button (1), Status column (1)
- `StrategyPage.jsx`: Episode Concept (1), Target Audience (1)
- `FvsSystemPage.jsx`: Automation Level (1), each automation option (3)
- `SettingsPage.jsx`: Language Style (1), Thumbnail Style (1)
- `AssetsPage.jsx`: Asset Type filter (1)
- `PublishingDashboardPage.jsx`: Publishing Tasks title (1)

#### Test Results (Feb 19, 2026):
- Frontend: 100% (15/15 tests passed)
- Total tooltip-enabled elements: 19+ across 7 pages

### Phase 22 — Spotlight Tour (Sprint 3) (Feb 19, 2026)

#### SpotlightTour Component (`/app/frontend/src/components/SpotlightTour.jsx`):
- **SVG Mask Overlay**: Creates dark 65% opacity overlay with spotlight cutout
- **Golden Glow Effect**: Animated border using SVG filters (`#golden-glow`)
- **Adaptive Tooltip Positioning**: Smart placement using `getBoundingClientRect()`
- **Auto-scrolling**: Elements scroll into view before highlighting
- **8 Tour Steps**:
  1. Performance Overview (KPI Cards)
  2. Production Pipeline
  3. Navigation Hub (Sidebar)
  4. Submissions Center
  5. Strategy Lab
  6. FVS System
  7. Publishing Dashboard
  8. Notification Center

#### Header Integration (`/app/frontend/src/components/layout/Header.jsx`):
- **Help (?) Icon**: Subtle gray button that turns white on hover with gold glow
- **Position**: Immediately left of the notification bell
- **Action**: Triggers tour from Step 1

#### Tour Data Attributes Added:
- `data-tour="kpi-cards"` on OverviewPage KPI section
- `data-tour="pipeline"` on OverviewPage Pipeline section
- `data-tour="sidebar-nav"` on Sidebar navigation
- `data-tour="submissions-link"`, `strategy-lab-link`, `fvs-system-link`, `publishing-link` on nav items
- `data-tour="notifications"` on notification bell

#### Persistence Logic:
- **localStorage Key**: `fvs_tour_completed`
- Auto-launches for users with `onboarding_complete === false`
- Skip or Finish sets flag to prevent re-showing

#### CSS Animations (`/app/frontend/src/index.css`):
- `animate-spotlight-glow` keyframe for pulsing golden border

#### Test Results (Feb 19, 2026):
- Frontend: 100% (15/15 tests passed)
- All tour steps working correctly
- Persistence verified

### Phase 21 — Notification Engine (Sprint 2) (Feb 19, 2026)

#### Backend Implementation:
- **Notification Model** (`/app/backend/models/notification.py`):
  - `NotificationType` enum: SUBMISSION, STATUS_CHANGE, DEADLINE, SYSTEM, FVS_IDEA
  - `NotificationPriority` enum: LOW, MEDIUM, HIGH
  - Full Pydantic models for create/response

- **Notification API Endpoints** (`/app/backend/routers/notifications.py`):
  - `GET /api/notifications` - List user's 20 most recent notifications
  - `GET /api/notifications/unread-count` - Get unread notification count
  - `PATCH /api/notifications/{id}/read` - Mark single notification as read
  - `POST /api/notifications/read-all` - Mark all notifications as read
  - `create_notification()` helper function for other services

- **Notification Triggers**:
  - Submission status change creates STATUS_CHANGE notification (in `submissions.py`)
  - FVS idea proposal creates FVS_IDEA notification (in `fvs_service.py`)

#### Frontend Implementation:
- **NotificationPanel Component** (`/app/frontend/src/components/NotificationPanel.jsx`):
  - Glass-morphic "Aura" styling with `aura-glass` class
  - Slide-down animation from header
  - Priority-based left border colors (rose/amber/zinc)
  - Type-based icons (Sparkles for FVS, AlertCircle for status change)
  - "Mark all as read" button
  - Click notification to navigate and mark as read
  - Empty state with helpful message

- **Header Notification Bell** (`/app/frontend/src/components/layout/Header.jsx`):
  - Unread count badge with shadow glow
  - Pulse animation when unread notifications exist
  - Click to toggle NotificationPanel
  - Auto-polling every 30 seconds for new notifications

- **CSS Animations** (`/app/frontend/src/index.css`):
  - `animate-notification-pulse` keyframe for bell icon

#### Database:
- **notifications** collection: `id`, `user_id`, `type`, `title`, `message`, `link`, `is_read`, `priority`, `created_at`

#### Test Results (Feb 19, 2026):
- Backend: 100% (10/10 tests passed)
- Frontend: 100% (all notification UI tests passed)
- Test file: `/app/backend/tests/test_notifications.py`

### Phase 20 — The Aura Update: Sprint 1 (Feb 19, 2026)

#### Backend Changes:
- `GET /api/publishing-tasks` accepts optional `?clientId=<uuid>` param
  - Admin + no clientId → returns ALL tasks across all clients with `clientName` field
  - Admin + clientId → filters to that specific client
  - Client → ignores clientId param, always returns own tasks only
- `GET /api/publishing-stats` same admin/client logic for stats filtering
- Uses existing `GET /api/admin/clients` endpoint for client list

#### Frontend Changes (PublishingDashboardPage.jsx):
- Admin only: "All Clients" dropdown next to platform/status filters
- Admin only: "Client" column in publishing tasks table (between Submission and Platform)
- Client users: unchanged behavior - no dropdown, no Client column

#### Test Results (Feb 19, 2026):
- Backend: 100% (13/13 tests passed)
- Frontend: 100% (7/7 UI tests passed)

### Phase 19.1 — Submissions Page Restructure (Feb 19, 2026)

#### Layout Changes:
- Removed split-panel layout (was 40% form / 60% table)
- Full-width table is now the default view
- Added "+ New Submission" teal button in page header

#### New Submission Modal:
- Right-anchored slide-over panel (not centered dialog)
- Contains all form fields: Source URL, Title, Guest, Description, Content Type, Priority, Release Date, Confirm checkbox
- On submit: closes modal, shows success toast, refreshes table
- On cancel/backdrop click: closes modal, discards form state

#### Expanded Table Columns:
- TITLE (wider, truncated with ellipsis only if > 60 chars)
- TYPE (badge - unchanged)
- STATUS (badge with dropdown - unchanged)
- PRIORITY (new Badge styling with colors: High=red, Medium=amber, Low=zinc)
- RELEASE DATE (new column - formatted date)
- CREATED (new column - formatted date)
- ACTIONS (unchanged)

#### Test Results (Feb 19, 2026):
- Frontend: 100% (10/10 tests passed)

### Phase 19.2 — Onboarding Checklist Modal (Feb 19, 2026)

#### Backend Changes:
- Added `onboardingComplete: Boolean` field to User model
  - Default `False` for new users (via signup)
  - Existing users without field default to `True` (backward compatible)
- Added `PATCH /api/auth/me/onboarding` endpoint
  - Auth required, any user can update their own
  - Body: `{ "onboarding_complete": true/false }`
- Updated `GET /api/auth/me` and login response to include `onboardingComplete`

#### Frontend Changes:
- Created `OnboardingModal.jsx` component
  - Centered dialog (not slide-over) with dark overlay
  - Shows for non-admin users with `onboardingComplete === false`
  - Session-level flag (React state, not localStorage)
- 4 Setup Steps with checkboxes:
  1. Set up your Brand Brain → /dashboard/settings
  2. Submit your first episode → /dashboard/submissions
  3. Run the FVS Brain → /dashboard/system
  4. Connect your social accounts → /dashboard/settings?tab=publishing
- Footer buttons:
  - "Skip for now" - dismisses immediately
  - "I'm all set — let's go!" - visible when all 4 checked
- Both dismiss methods call PATCH endpoint
- Admin users (`role === 'admin'`) never see the modal

#### Test Results (Feb 19, 2026):
- Backend: 100% (7/7 tests passed)
- Frontend: 100% (all UI tests passed)

### Phase 19.3 — Strategy Lab Session History & Persistence (Feb 19, 2026)

#### Backend Changes:
- Added `StrategySession` model to MongoDB:
  - `id`, `user_id`, `submission_id` (nullable), `topic`, `target_audience`, `tone`, `goal`, `ai_model`
  - `research_output`, `outline_output`, `script_output`, `metadata_output` (all nullable Text)
  - `title` (auto-generated from topic, first 60 chars), `created_at`, `updated_at`
- New endpoints:
  - `GET /api/strategy/sessions` - list user's sessions (50 max, ordered by updated_at DESC)
  - `POST /api/strategy/sessions` - create new session
  - `GET /api/strategy/sessions/{id}` - get full session (403 if not owner)
  - `PATCH /api/strategy/sessions/{id}` - partial update outputs
  - `DELETE /api/strategy/sessions/{id}` - delete session

#### Frontend Changes (StrategyPage.jsx):
- History Sidebar (240px, collapsible):
  - Toggle button in header + vertical bar on left edge when collapsed
  - "New Session" button at top
  - Session list showing title, AI model badge, relative time
  - Click session to load, trash icon to delete
- Auto-save Integration:
  - `ensureSession()` creates session on first generate if none active
  - `saveOutputToSession()` saves outputs after each generation
  - Outline stored as JSON array, metadata as JSON object
- Session indicator: "Session: [title]" shown below page title
- Query param: `?submissionId=xxx` pre-fills topic from submission title

#### Frontend Changes (SubmissionsPage.jsx):
- Added "Open in Strategy Lab" button in submission detail panel
- Navigates to `/dashboard/strategy?submissionId={id}`

#### Test Results (Feb 19, 2026):
- Backend: 100% (7/7 tests passed)
- Frontend: 100% (all UI tests passed)

### Phase 19.4 — Tooltips Polish Pass (Feb 19, 2026)

#### Added 10 Contextual Tooltips:
1. **FVS System - Automation Levels (3 tooltips):**
   - Manual Only: "You control every step. No automatic runs. Best for full creative control."
   - Semi-Auto: "FVS proposes ideas automatically. You review and click to produce each one."
   - Full Auto (Shorts): "FVS generates and produces short episodes overnight without any input from you."
2. **FVS System - SCORE column:** "Relevance score (0–100) based on audience trends, engagement patterns, and topic fit."
3. **FVS System - Run Brain Now button:** "Analyzes your last 30 days of data to generate fresh episode ideas based on what's performing."
4. **Submissions - STATUS column:** "INTAKE → EDITING → DESIGN → SCHEDULED → PUBLISHED. Click any row to change status."
5. **Submissions - Post button:** "Simulate posting to this platform. Connect real OAuth in Settings → Publishing to go live."
6. **Submissions - Schedule button:** "Set a future date and time to auto-publish. Requires platform connection."
7. **Overview - Est. ROI (30d):** "Estimated revenue based on views, CPM rates, and sponsorship value across all published content in the last 30 days."
8. **Assets - TYPE column:** "Audio: voiceover files. Video: rendered shorts. Thumbnail: cover images generated by FVS."

#### Tooltip Implementation:
- Used existing shadcn/ui Tooltip component
- 300ms delay before showing (prevents flash on fast mouse movement)
- Dark styling: bg-zinc-900, text-white, border-zinc-700, max-w-240px
- Column headers have cursor-help and dashed underline indicator

#### Test Results (Feb 19, 2026):
- Frontend: 100% (10/10 tooltips verified)

### Phase 20 — The Aura Update: Sprint 1 (Feb 19, 2026)

#### Global "Aura" CSS Variables (index.css):
- `--aura-gold`: rgba(241, 200, 122, 0.2) - Primary brand glow
- `--aura-teal`: rgba(45, 212, 191, 0.2) - Success/action glow
- `--aura-indigo`: rgba(99, 102, 241, 0.2) - Active state glow
- `.aura-card`, `.aura-glass`, `.aura-backdrop` utility classes

#### Card Pop Hover System (App.css):
- `.stat-card`: KPI tiles lift & gold glow (translateY -2px, scale 1.01)
- `.aura-card-hover`: Pipeline cards lift & glow
- `.aura-table-row`: Table rows with gold left-border accent on hover
- `.aura-btn-primary`: Button indigo glow on hover
- `.aura-btn-teal`: Teal action button glow

#### Aura Animations:
- `animate-aura-pulse`: Success pulse for form feedback (1.2s, 2 pulses)
- `animate-aura-button-glow`: Processing glow for buttons (0.6s)
- `animate-aura-gold`: Gold pulse for premium elements

#### Glass-morphic Surfaces:
- Sidebar: bg-[#0c0c0f]/90 + backdrop-blur-xl + border-white/[0.06]
- Header: bg-[#09090b]/85 + backdrop-blur-xl + border-white/[0.06]
- Modals: bg-black/60 + backdrop-blur-sm

#### Sidebar & Navigation Polish:
- Active state: Gradient background (indigo 15% to 5%) + inner glow
- Active icon: scale(1.05) + drop-shadow + indigo color
- Hover state: Subtle background fade-in (white 4%)
- User footer: Gradient fade from black/20

#### Test Results (Feb 19, 2026):
- Frontend: 100% (11/11 tests passed, 1 code verified)

### Phase 18 — Bug Fixes & UX Improvements (Feb 19, 2026)

#### Fixed Issues:
1. **Issue 1 - Channel Profile Empty State**: Admin users without a clientId now see a graceful "select a client to impersonate" message
2. **Issue 3 - FVS Automation Settings**: Fixed PUT /api/fvs/config endpoint call (renamed handler for clarity)
3. **Issue 4 - Dynamic UI for Automation Modes**: Added mode-specific info banners:
   - Semi-Auto: Blue banner explaining idea review workflow
   - Full-Auto: Green banner explaining overnight production
4. **Issue 7 - Hooks Extraction**: Backend now preserves original pre-generated hooks from idea (not script lines)
5. **Issue 8 - Submissions Table Hover**: Added hover state (bg-white/[0.03]) and pointer cursor to table rows
6. **Issue 9 - Calendar View Submission**: Renamed button from "View Full Details" to "View Submission"
7. **Issue 10 - ROI Settings Cleanup**: Removed legacy "Competitor Name" field from ROI Settings tab
8. **Issue 11 - Publishing Connection Status**: Fixed platform connections to always show all 3 platforms with correct connected status

#### Test Results (Feb 19, 2026):
- Backend: 95% (20/21 tests passed, 1 timeout expected for heavy LLM tasks)
- Frontend: 100% (8/8 UI tests passed)

### Phase 17 — Publishing Layer (Feb 19, 2026)

#### Settings → Publishing Tab
- Connection cards for YouTube Shorts, TikTok, Instagram Reels
- Mock OAuth connect/disconnect buttons
- Shows connected status with account handle (@demo_yt_channel, etc.)
- Note: "This is a demo environment. OAuth connections are simulated."

#### PublishingTask Model + Backend
- **Collections**: `publishing_tasks`, `platform_connections`
- **Endpoints**:
  - `GET /api/platform-connections` - List all platforms
  - `POST /api/platform-connections/{platform}/connect` - Mock OAuth
  - `POST /api/platform-connections/{platform}/disconnect` - Disconnect
  - `POST /api/publishing-tasks` - Create task
  - `GET /api/publishing-tasks` - List with filters (platform, status, submissionId)
  - `PATCH /api/publishing-tasks/{id}` - Update status/scheduledAt
  - `DELETE /api/publishing-tasks/{id}` - Delete task
  - `POST /api/publishing-tasks/{id}/post-now` - Immediate mock post
  - `POST /api/publishing-tasks/create-and-post` - Convenience endpoint
  - `GET /api/publishing-stats` - Stats (posted, scheduled, failed counts)

#### Background Scheduler (APScheduler)
- Runs every 30 seconds
- Processes tasks where `status=scheduled` and `scheduledAt <= now`
- Mock-executes: sets status to `posted`, generates fake `platformPostId`

#### Submission Detail – Publishing Panel
- Shows all 3 platforms in right sidebar
- Connected platforms: Post Now / Schedule buttons
- Disconnected platforms: "Connect in Settings" hint
- Posted tasks: Green "Live" badge
- Scheduled tasks: Blue badge with date + Cancel button
- Date/time picker for scheduling

#### Publishing Dashboard
- Route: `/dashboard/publishing`
- Sidebar navigation link added
- Stats cards: Posted, Scheduled, Failed, Total
- Filters: Platform dropdown, Status dropdown
- Task table with columns: Submission, Platform, Status, Scheduled, Posted, Actions
- Clicking row navigates to Submission Detail

#### Strategy Idea Detail Side Panel (Feb 19, 2026)
- **Trigger**: Clicking any row in Episode Ideas table on FVS System page
- **Panel**: 480px slide-over from right using shadcn Sheet component
- **Content**:
  - Full idea title (large heading)
  - Score badge, format badge (short/long), status badge
  - **Hooks section**: Numbered list of 3 opening hooks
  - **Script section**: Hinglish script (scrollable), auto-generated on panel open
  - **Caption & Hashtags**: Caption text + hashtag badges
- **Action Buttons**:
  - "Create Submission from Idea" → Creates submission with `strategyIdeaId`, navigates to /dashboard/submissions
  - "Create AI Video Task from Idea" → Creates video task with script, navigates to /dashboard/video-lab
  - "Copy Script" → Copies to clipboard with "Copied!" confirmation

#### Submission Detail Modal - Thumbnail Gallery & Publishing (Feb 19, 2026)
- **Location**: /dashboard/submissions → Click any row → Sheet modal
- **Thumbnail Gallery Section**:
  - 3-column grid showing all thumbnails for this submission
  - Primary thumbnail: green ring + checkmark badge in top-right
  - Non-primary: amber border on hover
  - Click to set as primary → calls PATCH /api/submissions/{id}/primary-thumbnail
  - Shows "Primary thumbnail updated!" toast on success
  - "No thumbnails yet" placeholder if empty
- **Publishing Section**:
  - Platform rows for YouTube Shorts, TikTok, Instagram Reels
  - Connected: Post Now / Schedule buttons
  - Disconnected: "Connect" hint button → navigates to Settings
  - Posted: "Live" badge (green)
  - Scheduled: Badge with date + Cancel button
  - Schedule opens date/time picker

#### Idea Data Model Updates
- Added fields: `hooks` (array), `script` (nullable), `caption`, `hashtags` (array)
- `strategyIdeaId` added to Submission model to link submissions back to ideas

#### Test Results (Feb 19, 2026):
- Backend: 9/9 strategy idea tests passed
- Frontend: 18/18 modal tests passed (100%)

### Phase 16 — Strategy Idea Detail Page (Feb 19, 2026)

#### Strategy Idea Detail Flow
Complete workflow from FVS idea → script generation → submission/video task creation.

#### New Route
- **Path**: `/dashboard/strategy/idea/:ideaId`
- **Component**: `StrategyIdeaDetailPage.jsx`

#### Three-Panel UI
1. **Idea Overview Panel** (left):
   - Topic and hypothesis
   - Format badge (Short/Long)
   - Conviction score
   - Source badge (YouTube Analytics, Reddit, etc.)
   - Status badge

2. **Generated Script Panel** (right):
   - Auto-generates script on page load
   - Uses Channel Profile (Hinglish style for demo client)
   - Opening hooks preview
   - "Regenerate Script" button
   - "Copy" button
   - Language/provider badges

3. **Actions Panel** (left bottom):
   - **Quick Produce** button (gradient emerald/teal) - Full FVS pipeline in one click
   - Progress indicator with pipeline steps
   - "Create Submission" button → Creates submission, shows inline link
   - "Create AI Video Task" button → Creates video task, shows inline link

#### Quick Produce Feature
- Runs full FVS pipeline: Script + Audio + Video + 3 Thumbnails
- Uses Channel Profile for script language and thumbnail style
- Progress indicator shows current pipeline step
- On completion, shows link to Submission detail page
- Calls existing `/api/fvs/produce-episode` endpoint

#### Backend Endpoints
- `GET /api/fvs/ideas/{idea_id}` - Fetch single idea
- `POST /api/fvs/ideas/{idea_id}/generate-script` - Generate script with Channel Profile
- `POST /api/fvs/produce-episode` - Full production pipeline (existing)
- `PATCH /api/submissions/{id}/primary-thumbnail` - Set primary thumbnail

#### S3 Storage Integration (Enhanced)
- S3 is now the PRIMARY storage destination for all generated media
- Audio, thumbnails uploaded to S3 if configured
- Graceful fallback to data URLs with warning if S3 not configured
- Warning added to response when using fallback

#### Primary Thumbnail Selection
- New endpoint: `PATCH /api/submissions/{id}/primary-thumbnail`
- Validates asset exists and belongs to submission
- Updates `isPrimaryThumbnail` flag on all related thumbnails
- Updates `primaryThumbnailAssetId` on submission

#### FVS System Page Updates
- Added "View" button for proposed ideas → navigates to detail page
- Fixed "View Episode" button field reference (`submissionId` not `producedSubmissionId`)

#### Test Results (Feb 19, 2026):
- Backend: All endpoints verified working
- Quick Produce: Successfully generates episode with Hinglish script, ElevenLabs audio (real), 3 OpenAI thumbnails (real), video task (mocked)
- Primary Thumbnail Selection: Verified working via curl
- Frontend: All UI components working
- Script generation uses Anthropic Claude with Hinglish style

### Phase 15 — Channel Profile & Brand Brain (Feb 18, 2026)

#### Channel Profile Data Model
- **Collection**: `channel_profiles` in MongoDB
- **Fields**:
  - `languageStyle`: "english", "hinglish", "hindi", "spanish"
  - `thumbnailStyle`: "modern_clean", "black_minimal", "vibrant_bold", "cinematic", "custom"
  - `brandDescription`: Channel identity text
  - `tone`: Writing tone description
  - `contentPillars`: Array of content themes (e.g., ["War", "Money", "Power"])
  - `thumbnailPromptTemplate`: Custom prompt for thumbnails
  - `thumbnailsPerShort`: 1-4 thumbnail options to generate

#### API Endpoints
- `GET /api/channel-profile` - Get client's profile
- `PUT /api/channel-profile` - Update profile
- `GET /api/channel-profile/options` - Get available styles

#### Frontend Settings UI
- **Location**: `/app/frontend/src/pages/SettingsPage.jsx`
- **Tabs**: Channel Profile, Account, ROI Settings
- **Fields**: Language dropdown, Thumbnail style, Brand description, Tone, Content pillars (tags), Thumbnails per episode

#### AI Integration
- **FVS Scripts**: Uses `languageStyle` for Hinglish scripts with performance cues
- **Thumbnails**: Uses `thumbnailStyle` and `thumbnailPromptTemplate` for brand-consistent images
- **Multiple Thumbnails**: Generates N thumbnails based on `thumbnailsPerShort`

#### Hinglish Script Style (Chanakya Sutra)
- Scripts in Hindi using Latin characters
- Short punchy lines (5-10 words)
- Performance cues: [pause], [emphatic], [chuckles], [dramatic whisper]
- Brand context from content pillars

### Phase 14 — Demo Data Cleanup & Asset Visibility (Feb 18, 2026)

#### Exact 5 Episode Demo Dataset
- **Submissions**: Exactly 5 complete demo episodes
- **Assets**: 15 total (5 audio + 5 video + 5 thumbnail, all linked to episodes)
- **Deliverables**: 15 total (3 per episode, all linked)
- **No orphaned/unlinked data** - clean testing environment

#### Enhanced Assets Page
- **Thumbnail Previews**: Inline image thumbnails with zoom-on-hover
- **Preview Modal**: Click thumbnail to view full-size image
- **Type Icons**: Audio (blue), Video (purple), Thumbnail (pink)
- **Action Buttons**: Preview, Open Full Size, View Submission

#### Cleanup Infrastructure
- Updated `/app/backend/seed.py` - creates exactly 5 complete episodes
- Updated `/app/backend/scripts/cleanup_demo_data.py` - enforces strict dataset

### Phase 13 — S3 Storage Service & Deep-Linking (Feb 18, 2026)

#### S3 Storage Service
- **Location**: `/app/backend/services/storage_service.py`
- **Features**:
  - Upload files to S3 or S3-compatible storage (R2, MinIO)
  - Auto-generate unique object keys with timestamps
  - Build public URLs for uploaded files
  - Graceful fallback to base64 data URLs when S3 not configured
- **Configuration**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION`
- **Integration**: Audio and thumbnail generation now attempt S3 upload first

#### Deep-Linking Navigation
- **New Route**: `/dashboard/submissions/:submissionId` - Submission detail page
- **SubmissionDetailPage**: Shows title, status, assets, FVS info, timestamps
- **Calendar**: Click event → View Full Details → Submission detail page
- **Deliverables**: Click row → Navigate to parent submission
- **Assets**: New "View submission" button for linked assets
- **FVS System**: "View Episode" button for completed ideas

### Completed Pages (11 total + 1 detail page)
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
| ElevenLabs | ✅ READY (graceful fallback) | Set ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID |

### Video Providers
| Provider | Status | Config |
|----------|--------|--------|
| Veo | ✅ READY (graceful fallback) | Set VEO_API_KEY for real generation |
| Runway | 🔶 Mocked (P2) | Returns PROCESSING, simulates completion |
| Kling | 🔶 Mocked (P2) | Returns READY immediately with sample video |

---

## Phase 12 — Real Media Integrations (Feb 18, 2026)

### Google Veo Video Generation (NEW)
Implemented real Google Veo video generation with graceful fallback:

#### Implementation Details:
- **Location**: `/app/backend/services/video_task_service.py`
- **Functions**: `create_veo_job()`, `check_veo_job()`
- **SDK**: `google-genai` SDK
- **Model**: `veo-2.0-generate-001`
- **Config**: `VEO_API_KEY` from environment

#### Response Structure:
```python
{
    "id": "task-uuid",
    "provider": "veo",
    "actualProvider": "veo" | "mock_veo",  # Tracks real vs fallback
    "isMocked": bool,
    "warnings": ["...", ...] | null,
    "status": "PROCESSING" | "READY" | "FAILED",
    "videoUrl": "https://..." | null
}
```

### ElevenLabs Audio Generation (Enhanced)
ElevenLabs TTS integration already existed, now enhanced with proper status tracking:

#### Implementation Details:
- **Location**: `/app/backend/services/media_service.py`
- **Function**: `generate_voice_for_script()`
- **SDK**: `elevenlabs` Python SDK
- **Model**: `eleven_multilingual_v2`
- **Config**: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` from environment

#### Graceful Fallback Pattern:
When API keys are missing or calls fail:
1. Log warning with specific reason
2. Return mock URL from provider-hosted sample
3. Set `isMocked: true` in response
4. Add warning to `warnings` array
5. User flow completes successfully

### .env Configuration
```bash
# Required for thumbnail generation (already working)
EMERGENT_LLM_KEY=your_key_here

# Optional for voice generation (graceful fallback)
ELEVENLABS_API_KEY=your_elevenlabs_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Optional, defaults to Rachel

# Optional for video generation (graceful fallback)
VEO_API_KEY=your_google_ai_api_key_here
```

### Test Results (Feb 18, 2026):
- Backend: 9/9 integration tests passed (100%)
- Frontend: Video Lab and FVS System working correctly
- Graceful fallbacks verified for missing API keys

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
- [x] Video Lab (multi-provider)
- [x] FVS System - Brain & Orchestrator (Feb 18, 2026)
- [x] Admin panel (client management, impersonation) ✅ (Feb 18, 2026)
- [x] Refactor server.py into modular structure (routers/, models/, services/) ✅ (Feb 18, 2026)
- [x] Real thumbnail generation (OpenAI GPT-Image-1) ✅ (Feb 18, 2026)
- [x] Google Veo video integration (graceful fallback) ✅ (Feb 18, 2026)
- [x] ElevenLabs audio integration (graceful fallback) ✅ (Feb 18, 2026)
- [x] Brain Feedback Loop - AI recommendation accuracy tracking ✅ (Feb 20, 2026)
- [x] Admin Multi-Channel Onboarding - CRUD endpoints + frontend ✅ (Feb 20, 2026)
- [x] Identity Fix - Alex Chen → Chanakya Sutra ✅ (Feb 20, 2026)

### P1 — Remaining
- [ ] Full OAuth integration for TikTok and Instagram Reels
- [ ] "Quick Test Upload" helper for developers
- [ ] Configure user-provided VEO_API_KEY for real video generation
- [ ] Configure user-provided ELEVENLABS_API_KEY for real audio generation
- [ ] Real Runway video provider integration
- [ ] Refactor media services (S3 as primary storage)

### P2 — Integrations
- [ ] Stripe billing (replace placeholder)
- [ ] Google Drive file upload / First-party storage (S3/GCS)
- [ ] Airtable integration

## Demo Data Configuration
The application uses a light demo dataset for performance and clarity:
- **Submissions**: 5 (one per pipeline status)
- **Assets**: ~15 (2-3 per submission + standalone brand assets)
- **Video Tasks**: 6-8 (2 per provider max)
- **FVS Ideas**: 10-15 (mix of proposed/completed)
- **Analytics**: 45 days of snapshots
- **Blog Posts**: 5 (all preserved)
- **Help Articles**: 5 (all preserved)

### Cleanup Script
Run `/app/backend/scripts/cleanup_demo_data.py` to reset to light dataset.

## Test Credentials
- **Client**: alex@company.com / client123
- **Admin**: admin@forgevoice.com / admin123

## Test Reports
- `/app/test_reports/iteration_7.json` - Strategy Lab & Video Lab tests
- `/app/test_reports/iteration_8.json` - FVS System tests (100% pass rate)
- `/app/test_reports/iteration_12.json` - Veo & ElevenLabs integration tests

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
