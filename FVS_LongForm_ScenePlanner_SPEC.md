# FVS Long-Form Scene Planner — Technical Specification

**Project:** ForgeVoice Studio (fvs-dash.vercel.app)
**Feature:** Long-Form Video Scene Planner Module
**Author:** Chanakya Sutra / ForgeVoice Studio
**Version:** 1.0
**Status:** Ready for implementation

---

## 1. Overview

### What this feature does

The Long-Form Scene Planner is a new module inside ForgeVoice Studio that bridges the gap between a written script and a finished 10–15 minute cinematic video. It solves the core bottleneck: transforming a 1,000-word script into a structured production plan where every ~20-second visual beat is tagged, prompted, and queued for generation — without manually crafting 90+ AI video prompts.

### The problem it solves

Currently, Content Studio goes: Idea → Script → ElevenLabs Audio → Veo (one prompt, one clip). This works for Shorts (14 clips max). For long-form video it breaks down — a 12-minute video at 8 seconds/clip would need ~90 Veo clips, hours of prompting, and ~$144/video in generation costs.

**The solution:** 80% of a long-form video's visuals should NOT be Veo clips. The Scene Planner auto-classifies each script beat into one of 4 types:
- `HERO` — 8–12 cinematic Veo shots per video (the showstoppers)
- `ATMOSPHERE` — DALL-E static images + slow zoom (cheap, beautiful)
- `BROLL` — Stock footage search queries (Storyblocks/Pexels)
- `TEXT` — Animated quote callout templates

### Where it lives in the app

- New step in **Content Studio** between "Script" and "AI Video" (Step 2.5)
- Also a standalone page: `/dashboard/scene-planner`
- Accessible from **Video Editor** via "New Long-Form Project" button

---

## 2. Tech Stack Assumptions

Based on the existing FVS dashboard (React/Next.js, dark UI, Vercel deployment):

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes or existing backend (adapt to what's already there)
- **Database:** Whatever FVS currently uses (Supabase / Prisma / Firebase — adapt accordingly)
- **AI:** Google Gemini API (already used in Content Studio for script generation)
- **Image gen:** OpenAI DALL-E API (already used for thumbnails)
- **Video gen:** Veo API via Google Cloud (already wired into Content Studio)
- **State:** React state + server actions / tRPC (match existing pattern)

---

## 3. Data Models

```typescript
// types/scene-planner.ts

export type SceneType = 'HERO' | 'ATMOSPHERE' | 'BROLL' | 'TEXT';
export type SceneStatus = 'pending' | 'generating' | 'ready' | 'rejected' | 'approved';
export type ProjectStatus = 'planning' | 'generating' | 'review' | 'ready';

export interface LongFormProject {
  id: string;
  channelId: string;
  contentStudioSessionId?: string; // link back to originating studio session
  title: string;
  topic: string;
  targetAudience: string;
  toneVoice: string;
  scriptText: string;
  audioDuration: number;       // estimated seconds (words / 2.5 words per second)
  audioUrl?: string;           // ElevenLabs output URL if already generated
  anchorPrompt: string;        // visual world descriptor used as prefix for all Veo prompts
                               // e.g. "Dark ancient India, torchlight, dramatic shadows,
                               //      cinematic grain, 4K, moody atmosphere —"
  scenes: Scene[];
  status: ProjectStatus;
  estimatedVeoCredits: number; // sum of HERO scene seconds
  estimatedCostUSD: number;    // estimatedVeoCredits * 0.20
  sceneManifestUrl?: string;   // exported CSV/JSON for CapCut/DaVinci
  createdAt: string;
  updatedAt: string;
}

export interface Scene {
  id: string;
  projectId: string;
  index: number;               // 0-based order
  startTime: number;           // seconds into the audio track
  endTime: number;             // seconds into the audio track
  duration: number;            // endTime - startTime
  scriptSnippet: string;       // the narration text for this beat
  type: SceneType;
  status: SceneStatus;

  // HERO fields (Veo generation)
  veoPrompt?: string;          // full prompt sent to Veo
  veoDuration?: 4 | 6 | 8;    // clip length in seconds
  veoJobId?: string;
  veoClipUrl?: string;
  veoThumbnailUrl?: string;

  // ATMOSPHERE fields (DALL-E + Ken Burns zoom)
  dallePrompt?: string;
  dalleImageUrl?: string;
  zoomDirection?: 'in' | 'out' | 'none';
  zoomIntensity?: 'subtle' | 'medium' | 'strong';

  // BROLL fields (stock footage)
  stockSearchQuery?: string;   // search string for Storyblocks/Pexels
  stockKeywords?: string[];    // individual keywords
  stockClipUrl?: string;       // URL if user has linked a clip

  // TEXT fields (animated callout)
  quoteText?: string;          // the Chanakya quote or key phrase
  textStyle?: 'full-screen' | 'lower-third' | 'callout-box' | 'side-panel';
  textBackground?: 'dark' | 'blur' | 'transparent' | 'gradient';

  // Review
  notes?: string;
  regenerateCount: number;
}

// Export format for CapCut / DaVinci Resolve
export interface SceneManifestRow {
  scene_number: number;
  start_time: string;          // "00:01:30"
  end_time: string;            // "00:02:15"
  duration_sec: number;
  type: SceneType;
  description: string;
  asset_status: 'ready' | 'pending' | 'stock_needed';
  asset_url: string;
  veo_prompt: string;
  notes: string;
}
```

---

## 4. File Structure

Create the following new files (adapt paths to match existing FVS structure):

```
app/
  dashboard/
    scene-planner/
      page.tsx                    ← Standalone Scene Planner page
      [projectId]/
        page.tsx                  ← Individual project view

components/
  scene-planner/
    ScenePlannerEntry.tsx         ← Entry point card in Content Studio (Step 2.5)
    ScenePlannerWorkspace.tsx     ← Full workspace layout
    ScriptSegmenter.tsx           ← Left panel: script + segmentation controls
    SceneBoard.tsx                ← Main panel: grid of scene cards
    SceneCard.tsx                 ← Individual scene card with type, prompt, status
    SceneTypeSelector.tsx         ← HERO/ATMOSPHERE/BROLL/TEXT selector
    PromptEditor.tsx              ← Editable prompt field with regenerate button
    BatchGenerationPanel.tsx      ← Right panel: queue + cost estimate + launch
    ManifestExporter.tsx          ← Export to CSV/JSON modal
    AnchorPromptEditor.tsx        ← Visual world descriptor editor

lib/
  scene-planner/
    segmenter.ts                  ← AI script segmentation logic (Gemini call)
    prompt-generator.ts           ← Auto-generate Veo/DALL-E prompts per scene
    cost-estimator.ts             ← Calculate Veo credit usage
    manifest-exporter.ts          ← Build CSV/JSON scene manifest

api/
  scene-planner/
    route.ts                      ← CRUD for LongFormProject
    [projectId]/
      route.ts                    ← Get/update single project
      scenes/
        route.ts                  ← Get/update scenes
        [sceneId]/
          route.ts                ← Individual scene updates
          generate/
            route.ts              ← Trigger Veo/DALL-E generation for a scene
    segmentation/
      route.ts                    ← POST: script → segmented scenes (AI call)
    batch-generate/
      route.ts                    ← POST: launch batch generation for all scenes
    export-manifest/
      route.ts                    ← POST: generate and return scene manifest file
```

---

## 5. UI — Screen by Screen

### 5.1 Entry Point in Content Studio

In the existing Content Studio (`/dashboard/studio`), add a new collapsible **Step 2.5** between "Script" and "Assets":

```
Step 1: Idea          [✓ Complete]
Step 2: Script        [✓ Complete]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 2.5: Scene Plan  [NEW — only appears when content type = "Long-Form Video"]
  ┌─────────────────────────────────────┐
  │ 🎬  Long-Form Scene Planner         │
  │  Auto-split your script into        │
  │  visual beats for efficient         │
  │  video production.                  │
  │                                     │
  │  [→ Open Scene Planner]  [Skip →]  │
  └─────────────────────────────────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 3: Assets        [Locked until Step 2 done]
```

- Only show Step 2.5 when content type selector (if one exists) is "Long-Form Video", or when script word count > 400 words
- "Open Scene Planner" opens the workspace in a full-page view or modal, passing the script and session ID

### 5.2 Scene Planner Workspace Layout

Three-panel layout (matches the dark FVS aesthetic):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🎬 Scene Planner   ← Chanakya Sutra: [Video Title]          [Export] [Save] │
├────────────────┬───────────────────────────────────────┬─────────────────────┤
│  LEFT PANEL    │  MAIN PANEL — Scene Board              │  RIGHT PANEL        │
│  (280px)       │                                         │  (300px)            │
│                │  Filter: [ALL] [HERO] [ATMOS] [BROLL]  │                     │
│  Script        │  [TEXT]   Sort: [Timeline ▾]           │  Generation Queue   │
│  ──────────    │                                         │  ──────────────────  │
│  Full script   │  ┌────────┐ ┌────────┐ ┌────────┐     │  HERO:  8 scenes    │
│  text with     │  │ Scene 1│ │ Scene 2│ │ Scene 3│     │  ATMOS: 12 scenes   │
│  highlighted   │  │ HERO   │ │ BROLL  │ │ ATMOS  │     │  BROLL: 10 scenes   │
│  segments      │  │0:00–:30│ │:30–1:30│ │1:30–2:0│     │  TEXT:  4 scenes    │
│                │  └────────┘ └────────┘ └────────┘     │                     │
│  ──────────    │  ┌────────┐ ┌────────┐ ...            │  Est. Veo: 64s      │
│  Anchor        │  │ Scene 4│ │ Scene 5│                 │  Est. cost: $12.80  │
│  Prompt        │  │ HERO   │ │ TEXT   │                 │                     │
│  ──────────    │  └────────┘ └────────┘                 │  [▶ Generate All    │
│  [Edit anchor  │                                         │     HERO Scenes]    │
│   prompt]      │                                         │  [▶ Generate All    │
│                │                                         │     ATMOS Scenes]   │
│  ──────────    │                                         │                     │
│  Stats         │                                         │  [↓ Export Manifest]│
│  35 scenes     │                                         │                     │
│  ~12 min       │                                         │  Progress           │
│  64s Veo       │                                         │  ████░░░░  8/35     │
└────────────────┴───────────────────────────────────────┴─────────────────────┘
```

### 5.3 Scene Card

Each scene card displays:

```
┌──────────────────────────────────────────────┐
│  #04  0:03:20 – 0:04:15  [HERO ▾]  [✓ Ready]│
├──────────────────────────────────────────────┤
│  "...and Chanakya knew that the enemy who    │
│  smiles is more dangerous than the one who   │
│  attacks openly..."                          │
├──────────────────────────────────────────────┤
│  Veo Prompt:                                 │
│  ┌──────────────────────────────────────┐   │
│  │ Dark ancient India, torchlight,      │   │
│  │ dramatic shadows — Close-up of a     │   │
│  │ minister's face in candlelight,      │   │
│  │ forced smile, eyes calculating,      │   │
│  │ slow push-in, 8mm film grain         │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  [🔄 Regenerate Prompt]  [▶ Generate Clip]  │
│                                              │
│  [Preview thumbnail if clip exists]         │
└──────────────────────────────────────────────┘
```

For BROLL type:
```
┌──────────────────────────────────────────────┐
│  #07  0:05:10 – 0:06:30  [BROLL ▾]  [Pending]│
├──────────────────────────────────────────────┤
│  "...modern offices where office politics    │
│  plays out every day..."                     │
├──────────────────────────────────────────────┤
│  Stock Search:                               │
│  ┌──────────────────────────────────────┐   │
│  │ corporate office politics tension    │   │
│  │ meeting room conflict strategy       │   │
│  └──────────────────────────────────────┘   │
│  Keywords: [office] [meeting] [tension]      │
│                                              │
│  [↗ Search Storyblocks]  [↗ Search Pexels]  │
└──────────────────────────────────────────────┘
```

For TEXT type:
```
┌──────────────────────────────────────────────┐
│  #12  0:09:45 – 0:10:15  [TEXT ▾]  [Pending] │
├──────────────────────────────────────────────┤
│  Quote Text:                                 │
│  ┌──────────────────────────────────────┐   │
│  │ "Before you start some work, always  │   │
│  │  ask yourself three questions."      │   │
│  │  — Chanakya                          │   │
│  └──────────────────────────────────────┘   │
│  Style: [Full-screen ▾]  BG: [Dark ▾]       │
└──────────────────────────────────────────────┘
```

### 5.4 Anchor Prompt Editor

Located in the left panel, collapsible. This is the visual world descriptor that gets prepended to every Veo prompt:

```
┌─────────────────────────────────────────┐
│  🎨 Visual Anchor Prompt                │
│  Prefixed to every Veo generation       │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │ Dark ancient India, torchlight,   │  │
│  │ dramatic shadows, cinematic grain,│  │
│  │ 4K, moody atmosphere,             │  │
│  │ chiaroscuro lighting —            │  │
│  └───────────────────────────────────┘  │
│  [🔄 Regenerate from channel style]     │
└─────────────────────────────────────────┘
```

---

## 6. AI Calls — Prompts & Logic

### 6.1 Script Segmentation (Gemini)

**Endpoint:** `POST /api/scene-planner/segmentation`

**Input:**
```json
{
  "scriptText": "...",
  "audioDuration": 720,
  "channelTopic": "Chanakya Sutra — ancient Indian wisdom for modern life",
  "toneVoice": "Dark, strategic, cinematic",
  "anchorPrompt": "Dark ancient India, torchlight, dramatic shadows..."
}
```

**Gemini System Prompt:**
```
You are a professional video director's assistant specialising in cinematic,
faceless educational YouTube channels. Your job is to break a voiceover script
into visual production beats.

RULES:
1. Each beat covers approximately 20 seconds of narration (~50 words)
2. Assign each beat ONE type from: HERO, ATMOSPHERE, BROLL, TEXT
3. Use HERO for the most emotionally impactful, visually distinctive moments
   (max 30% of beats — usually 8–12 per 12-min video)
4. Use ATMOSPHERE for philosophical/reflective moments — single AI image
   with slow zoom works beautifully
5. Use BROLL for practical/modern examples — stock footage of offices, people,
   cities, nature
6. Use TEXT when a specific Chanakya quote or numbered list is spoken —
   animated text callout is most effective
7. Calculate startTime and endTime based on word count
   (average 2.5 words per second)

RESPONSE FORMAT: Return valid JSON array only, no markdown, no explanation.
```

**Gemini User Prompt:**
```
Script to segment:
---
{scriptText}
---
Total estimated duration: {audioDuration} seconds
Channel context: {channelTopic}
Visual style: {toneVoice}

Return a JSON array of scenes. Each scene object:
{
  "index": 0,
  "startTime": 0,
  "endTime": 22,
  "scriptSnippet": "exact words from script for this beat",
  "type": "HERO",
  "typeReason": "one sentence why this type fits"
}
```

### 6.2 Prompt Generation per Scene (Gemini)

**Endpoint:** `POST /api/scene-planner/[projectId]/scenes/[sceneId]/generate-prompt`

Run after segmentation — one call per scene (can batch with Promise.all for speed).

**For HERO scenes:**
```
System: You write precise, cinematic AI video generation prompts for Veo 3.1.

User:
Anchor prompt (always prefix): "{anchorPrompt}"
Script beat: "{scriptSnippet}"
Channel tone: "{toneVoice}"
Clip duration: 8 seconds

Write a single Veo prompt that:
- Starts with the anchor prompt
- Describes ONE specific visual scene (not multiple)
- Specifies camera movement (slow push-in, wide establishing, close-up, etc.)
- Matches the emotional tone of the narration
- Is 30–60 words total
- Does NOT include any text, subtitles, or on-screen words

Return JSON: { "veoPrompt": "..." }
```

**For ATMOSPHERE scenes:**
```
System: You write DALL-E image prompts for static atmospheric video backgrounds.

User:
Script beat: "{scriptSnippet}"
Channel visual style: "{anchorPrompt}"

Write a DALL-E prompt that creates a single atmospheric still image.
The image will be displayed for ~{duration} seconds with a slow zoom effect.
It should be:
- Cinematic, high detail, moody
- NO people's faces (faceless channel)
- Evocative of the narration's theme
- Dark tone with gold/amber accents
- 16:9 ratio implied

Return JSON: { "dallePrompt": "...", "zoomDirection": "in" | "out" }
```

**For BROLL scenes:**
```
System: You generate stock footage search queries for Storyblocks and Pexels.

User:
Script beat: "{scriptSnippet}"
Channel topic: "{channelTopic}"

Generate a stock footage search query and 3–5 individual keywords.
The footage should be:
- Modern/contemporary (office, city, nature, people)
- Generic enough to find on stock sites
- Visually matches the narration theme

Return JSON: {
  "stockSearchQuery": "primary search string",
  "stockKeywords": ["word1", "word2", "word3"]
}
```

**For TEXT scenes:**
```
System: You identify the key quote or phrase to display as animated text.

User:
Script beat: "{scriptSnippet}"

Extract the most quotable line or key phrase from this beat.
This will be displayed as an animated text callout on screen.
Return JSON: {
  "quoteText": "the quote or phrase",
  "textStyle": "full-screen" | "lower-third" | "callout-box",
  "textBackground": "dark" | "blur" | "gradient"
}
```

### 6.3 Anchor Prompt Generator

When user clicks "Generate from channel style":

```
System: You write visual world descriptors for AI video generation.

User:
Channel name: Chanakya Sutra
Channel description: {channelDescription}
Existing content style: Dark cinematic, ancient India, moody lighting, strategic/power themes
Sample thumbnail style: {thumbnailDescription if available}

Write a 20–30 word "anchor prompt" that captures the visual world of this channel.
This will be prefixed to every AI video generation prompt.
Format: short, comma-separated visual descriptors ending with " — "

Example format: "Dark ancient India, torchlight, dramatic shadows, cinematic grain, 4K, moody atmosphere —"
```

---

## 7. API Endpoints

### `POST /api/scene-planner`
Create a new LongFormProject.

**Body:**
```json
{
  "contentStudioSessionId": "session_abc123",
  "title": "The Dark Art of Identifying Enemies",
  "scriptText": "...",
  "anchorPrompt": "Dark ancient India...",
  "channelId": "chanakya-sutra"
}
```

**Response:** `{ "project": LongFormProject }`

---

### `POST /api/scene-planner/segmentation`
Run AI segmentation on a script. Returns scenes with types assigned.

**Body:** `{ "projectId": "...", "scriptText": "...", "audioDuration": 720, ... }`

**Response:** `{ "scenes": Scene[] }`

Side effect: Updates project's `scenes` array and `status` to `"planning"`.

---

### `POST /api/scene-planner/[projectId]/scenes/generate-all-prompts`
Batch generate prompts for all scenes. Runs all Gemini calls in parallel.

**Response:** `{ "updated": number, "scenes": Scene[] }`

---

### `POST /api/scene-planner/[projectId]/scenes/[sceneId]/generate`
Trigger actual asset generation for a single scene:
- HERO → call Veo API, store job ID, poll for completion
- ATMOSPHERE → call DALL-E API, store image URL
- BROLL → no generation, just return stock search URLs
- TEXT → no generation, mark as ready

**Response:** `{ "scene": Scene }`

---

### `POST /api/scene-planner/[projectId]/batch-generate`
Launch generation for all scenes of specified types.

**Body:** `{ "types": ["HERO", "ATMOSPHERE"] }`

**Response:** `{ "queued": number, "estimatedMinutes": number }`

---

### `GET /api/scene-planner/[projectId]/export-manifest`
Generate and return the scene manifest file.

**Query params:** `?format=csv` or `?format=json`

**Response:** File download (CSV or JSON)

CSV format:
```
scene_number,start_time,end_time,duration_sec,type,description,asset_status,asset_url,veo_prompt,notes
1,00:00:00,00:00:30,30,HERO,Opening cinematic shot,ready,https://...,Dark ancient India...,
2,00:00:30,00:01:30,60,BROLL,Modern office B-roll,stock_needed,,,"Search: corporate meeting strategy"
```

---

### `PATCH /api/scene-planner/[projectId]/scenes/[sceneId]`
Update a single scene (type change, prompt edit, manual clip URL, etc.).

---

## 8. Component Implementation Details

### `ScriptSegmenter.tsx`

```tsx
// Left panel component
// Props: scriptText, scenes (array), onSegmentationComplete

// Shows full script text with colour-highlighted spans corresponding
// to each scene (colour by type: gold=HERO, blue=ATMOS, purple=BROLL, green=TEXT)
// Clicking a highlighted span scrolls the scene board to that scene card

// Bottom of panel:
// - "Re-run Segmentation" button (with warning: "This will reset all prompts")
// - Stats: N scenes, ~X min, N Veo clips, $X.XX est.
```

### `SceneCard.tsx`

```tsx
// Props: scene, projectAnchorPrompt, onUpdate, onRegenerate, onGenerate

// Key interactions:
// 1. Type dropdown: changing type shows/hides the relevant prompt fields
// 2. "Regenerate Prompt" button: calls generate-prompt API for this scene only
// 3. "Generate Clip/Image": calls generation API for this scene only
// 4. Drag handle: reorder scenes (updates index and start/end times accordingly)
// 5. Delete: removes scene (recalculates subsequent timecodes)

// Visual states:
// pending → grey border, dashed
// generating → pulsing border, spinner
// ready → solid border (colour by type), thumbnail if available
// rejected → red border, "Regenerate" prominent
// approved → green checkmark badge
```

### `BatchGenerationPanel.tsx`

```tsx
// Right panel
// Shows counts and cost estimate per type
// "Generate All HERO Scenes" → POST to batch-generate with types:["HERO"]
// "Generate All ATMOSPHERE Scenes" → POST to batch-generate with types:["ATMOSPHERE"]
// Progress bar showing X/N scenes complete
// Live polling every 5 seconds while generation is running
// "Export Manifest" button → triggers CSV/JSON download
```

### `ManifestExporter.tsx`

```tsx
// Modal triggered by "Export Manifest" button
// Options:
//   Format: CSV | JSON
//   Include: [ ] Only ready scenes  [ ] All scenes
//   Columns to include (checkboxes)
// Preview of first 3 rows
// [Download] button
```

---

## 9. Integration with Existing FVS Features

### Content Studio (Step 2.5)

In the existing Content Studio component, after the "Script" section renders, add:

```tsx
{isLongForm && scriptText && scriptText.split(' ').length > 400 && (
  <ScenePlannerEntry
    scriptText={scriptText}
    sessionId={currentSessionId}
    onPlanCreated={(projectId) => {
      // Store projectId in session
      // Show green checkmark on Step 2.5
    }}
  />
)}
```

The `isLongForm` flag should be set when the user selects "Long-Form Video" as the content type, OR automatically when the script exceeds 400 words.

### Video Editor

In the Video Editor's "New Project" flow, add option:

```
What are you making?
○ Short-form video (< 3 min)
● Long-form video (10–20 min)  ← shows Scene Planner workspace

If "long-form" selected:
  → Show "Paste your script or import from Content Studio"
  → Launch Scene Planner workspace inline
```

### Pipeline Kanban

When a LongFormProject's status changes to `"ready"` (all approved/generated):
- Auto-create a Pipeline card with type badge "Long-form"
- Attach the scene manifest to the card
- Set status to "EDITING"

---

## 10. Veo API Integration Notes

The existing Content Studio already has Veo integrated. Extend that integration:

```typescript
// lib/veo-client.ts — extend existing client

export async function generateVeoClip(params: {
  prompt: string;
  durationSeconds: 4 | 6 | 8;
  aspectRatio: '16:9';
  referenceImageUrl?: string; // for consistency anchoring
}): Promise<{ jobId: string }> {
  // Use existing Veo API credentials/setup
  // Return job ID for polling
}

export async function pollVeoJob(jobId: string): Promise<{
  status: 'processing' | 'complete' | 'failed';
  clipUrl?: string;
  thumbnailUrl?: string;
}> {
  // Poll Google Cloud video generation job
}
```

**Important:** For HERO scenes, if the user has a "reference frame" image (from a previous Veo clip in the same video), pass it as `referenceImageUrl` to maintain visual consistency across clips.

---

## 11. Storyblocks/Pexels Integration (BROLL scenes)

For BROLL scenes, generate deep-link search URLs rather than calling their APIs:

```typescript
// lib/stock-search.ts

export function buildStockSearchUrls(query: string, keywords: string[]) {
  const encoded = encodeURIComponent(query);
  return {
    storyblocksUrl: `https://www.storyblocks.com/video/search/${encoded}`,
    pexelsUrl: `https://www.pexels.com/search/videos/${encoded}/`,
    pixabayUrl: `https://pixabay.com/videos/search/${encoded}/`,
  };
}
```

Display these as "Search Storyblocks →", "Search Pexels →" buttons on each BROLL card. The user clicks, finds the clip, copies the URL back into the card.

**Future enhancement:** Add Storyblocks API integration to auto-fetch clip thumbnails.

---

## 12. Scene Manifest Export Format

### CSV (for CapCut / DaVinci Resolve EDL import)

```csv
scene_number,start_timecode,end_timecode,duration_sec,type,script_beat,asset_status,asset_url,veo_prompt,dalle_prompt,stock_query,quote_text,zoom_direction,notes
1,00:00:00,00:00:30,30,HERO,"Chanakya knew that silence...",ready,https://veo-clip-url.mp4,"Dark ancient India — close-up eyes calculating...",,,,,
2,00:00:30,00:01:30,60,BROLL,"In modern offices today...",stock_needed,,,,corporate meeting strategy tension,,,Search Storyblocks
3,00:01:30,00:02:00,30,ATMOSPHERE,"The Arthashastra teaches us...",ready,https://dalle-image-url.jpg,,"Ancient scroll with gold ink...",,,in,
4,00:02:00,00:02:20,20,TEXT,"Before you start any work...",ready,,,,,,"Before you start any work, always ask yourself three questions.",,"Full-screen | Dark BG"
```

### JSON (for programmatic use / automation pipelines)

```json
{
  "project": {
    "title": "The Dark Art of Identifying Enemies",
    "channel": "Chanakya Sutra",
    "totalDuration": 720,
    "exportedAt": "2026-03-16T10:00:00Z"
  },
  "scenes": [
    {
      "scene_number": 1,
      "start_time": 0,
      "end_time": 30,
      "duration_sec": 30,
      "type": "HERO",
      "script_beat": "Chanakya knew that silence...",
      "asset_status": "ready",
      "asset_url": "https://...",
      "veo_prompt": "Dark ancient India...",
      "zoom_direction": null,
      "notes": ""
    }
  ]
}
```

---

## 13. UX States & Loading

| State | UI Behaviour |
|-------|-------------|
| No scenes yet | Empty state with "Analyse Script →" button |
| Segmentation running | Full-board skeleton loader, "Analysing script…" toast |
| Prompts generating | Each card shows a shimmer overlay while its prompt loads |
| Generation queued | Batch panel shows progress bar, "X of Y complete" |
| Single clip generating | Card border pulses gold, spinner in top-right |
| Clip ready | Card shows video thumbnail, green "✓ Ready" badge |
| Generation failed | Card border red, "Retry" button, error message |
| All ready | Banner: "All scenes ready — Export Manifest to begin assembly" |

---

## 14. Acceptance Criteria

The feature is complete when:

- [ ] Existing Content Studio shows Step 2.5 for scripts > 400 words
- [ ] Script segmentation produces ~35 scenes for a 700-word (12-min) script
- [ ] Gemini correctly assigns HERO to no more than 30% of scenes
- [ ] All 4 scene types display correct fields and prompt editor
- [ ] Anchor prompt editor is editable and re-generates correctly
- [ ] "Generate All HERO Scenes" correctly batches to Veo API
- [ ] "Generate All ATMOSPHERE Scenes" correctly batches to DALL-E API
- [ ] BROLL scenes show correct Storyblocks/Pexels search links
- [ ] TEXT scenes mark as "ready" without generation
- [ ] Scene cards are draggable to reorder (timecodes update automatically)
- [ ] Type can be changed on any card (fields update accordingly)
- [ ] Individual scene prompt can be manually edited and saved
- [ ] "Regenerate Prompt" re-calls Gemini for that scene only
- [ ] Cost estimate in right panel updates in real-time as types change
- [ ] CSV export includes all scenes with correct timecodes
- [ ] JSON export is valid and machine-readable
- [ ] Completed project auto-creates a Pipeline card in "EDITING" status
- [ ] All UI matches FVS dark theme (no white backgrounds, consistent typography)
- [ ] Mobile-responsive (cards stack vertically on < 768px)

---

## 15. Suggested Build Order

1. **Data model + API routes** (CRUD only, no AI yet) — ~2 hours
2. **Workspace layout + SceneBoard with mock data** — ~3 hours
3. **SceneCard component (all 4 types)** — ~3 hours
4. **Gemini segmentation integration** — ~2 hours
5. **Gemini prompt generation (all types)** — ~2 hours
6. **Veo generation integration** (extend existing client) — ~2 hours
7. **DALL-E generation integration** (extend existing client) — ~1 hour
8. **BatchGenerationPanel + polling** — ~2 hours
9. **ManifestExporter (CSV + JSON)** — ~1 hour
10. **Content Studio Step 2.5 entry point** — ~1 hour
11. **Pipeline integration** — ~1 hour
12. **Polish, error states, mobile** — ~2 hours

**Total estimated build time: ~22 hours (Claude Code: ~2–3 sessions)**

---

## 16. Environment Variables Required

```bash
# Already in FVS (assumed):
GOOGLE_GEMINI_API_KEY=
GOOGLE_VEO_API_KEY=
OPENAI_API_KEY=
ELEVENLABS_API_KEY=

# New (if not already present):
VEO_PROJECT_ID=          # Google Cloud project ID for Veo
VEO_LOCATION=            # e.g. us-central1
```

---

## 17. Notes for Claude Code

- **Match the existing FVS code style exactly** — inspect existing components in `/components` before writing new ones
- **Reuse existing UI primitives** — FVS has its own button, card, badge, and input components; use them rather than creating new ones
- **Dark theme only** — no white or light backgrounds anywhere in new components
- **The anchor prompt is critical** — it must be prepended to EVERY Veo prompt without fail; build this as a utility function so it can't be accidentally skipped
- **Optimistic UI** — when user changes a scene type, update the UI immediately; sync to server in background
- **Error handling** — Veo and DALL-E calls fail sometimes; always show a "Retry" option on failed scenes, never a dead end
- **Don't break existing Content Studio** — the new Step 2.5 must be additive only; test that Shorts workflow is unchanged

---

*End of specification. Questions → review with channel owner before implementation.*
