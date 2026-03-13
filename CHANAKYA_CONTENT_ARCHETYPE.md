# Chanakya Sutra Content Archetype — Brand Setup Guide

## Overview

The FVS system has a **Channel Profile** database that controls ALL AI-generated content:
- Script language style (Hinglish/English/etc.)
- Thumbnail visual style
- Brand voice/tone
- Content themes/pillars
- Visual prompts for video clips

This guide shows you how to configure the "Chanakya Sutra" archetype.

---

## 1. Channel Profile Structure

**Database:** `channel_profiles_collection`
**Client ID:** `"chanakya-sutra"`

### Current Fields:

```javascript
{
  "id": "uuid",
  "clientId": "chanakya-sutra",

  // Language & Script
  "languageStyle": "hinglish",  // english | hinglish | hindi | spanish

  // Visual Style
  "thumbnailStyle": "black_minimal",  // modern_clean | black_minimal | vibrant_bold | cinematic | custom
  "thumbnailPromptTemplate": "Custom prompt template here...",

  // Brand Voice
  "brandDescription": "Channel focused on Chanakya Niti wisdom for modern business leaders",
  "tone": "authoritative storyteller, dramatic, wise, strategic",

  // Content Focus
  "contentPillars": [
    "Leadership Strategy",
    "Business Wisdom",
    "Ancient Philosophy",
    "Chanakya Niti",
    "Success Principles"
  ],

  // Production Settings
  "scriptsPerIdea": 1,
  "thumbnailsPerShort": 1,  // Set to 3 to generate 3 options per video
  "voiceId": ""  // ElevenLabs voice ID (leave blank for default)
}
```

---

## 2. Recommended Chanakya Sutra Configuration

### A. Language Style: `"hinglish"`

**What it does:**
- Scripts written in Hindi using Latin characters (Roman script)
- Natural spoken rhythm, short punchy lines
- Includes performance cues: `[short pause]`, `[emphatic]`, `[dramatic whisper]`

**Example output:**
```
Dekho bhai [short pause] ye cheez bahut important hai.
[emphatic] Money ka matlab samjho.
[soft] Chanakya ne kaha tha...
Agar aap ye 3 cheezein follow karte ho [raises voice]
To success pakki hai!
```

### B. Thumbnail Style: `"black_minimal"`

**Visual style:**
- Pure black background
- Bold white text
- Single gold accent line or element
- No faces
- Extremely high contrast
- Dramatic lighting
- 9:16 aspect ratio (for Shorts)

**Why this works for Chanakya:**
- Ancient wisdom aesthetic
- Premium, mysterious vibe
- High CTR on dark feeds (YouTube Shorts, TikTok)
- Text is the hero (not clickbait faces)

### C. Brand Description

```
"Channel delivering ancient Chanakya Niti wisdom for modern business leaders, entrepreneurs, and strategists. Content blends Indian philosophy with practical business strategy, told through cinematic storytelling in Hinglish."
```

### D. Tone

```
"Authoritative storyteller, dramatic and wise, strategic thinker, speaks with gravitas and conviction. Like a business guru sharing hard-earned lessons. Occasionally provocative to challenge conventional thinking."
```

### E. Content Pillars

```javascript
[
  "Chanakya Niti Principles",
  "Leadership & Strategy",
  "Business Warfare Tactics",
  "Ancient Indian Philosophy",
  "Entrepreneurship Wisdom",
  "Power Dynamics",
  "Negotiation Mastery",
  "Decision-Making Frameworks"
]
```

---

## 3. Visual Prompt Templates (for Video Clips)

### Shorts (9:16 Vertical)

**Base prompt structure:**
```
"Ancient Indian sage with white beard and saffron dhoti, standing in [CONTEXT], golden hour lighting, dramatic shadows, cinematic 4K quality, Bollywood epic cinematography, Indian aesthetic, [ACTION/MOTION]"
```

**Context variations:**
- "Mauryan palace courtyard with pillars"
- "dimly lit study with ancient scrolls"
- "outdoor garden with stone sculptures"
- "grand throne room with ornate carvings"

**Action/Motion variations:**
- "camera slowly zooms in on his wise eyes"
- "walking forward with confident stride"
- "hand gesturing dramatically while speaking"
- "turning to face camera with knowing expression"

### Long-form (16:9 Horizontal)

**For video clips (hero moments):**
```
"Epic wide-angle shot of ancient India, [SCENE DESCRIPTION], cinematic color grading, dramatic lighting, high production value, Indian historical epic style"
```

**Scene examples:**
- "Bustling marketplace in ancient Pataliputra, merchants trading"
- "War council in royal court, generals planning strategy"
- "Philosopher teaching students under banyan tree"

**For AI images (b-roll):**
```
"Minimalist illustration, [CONCEPT], dark moody aesthetic, gold and black color scheme, Indian artistic motifs, clean modern design"
```

**Concept examples:**
- "Three coins representing wealth principles"
- "Chess pieces on ancient board symbolizing strategy"
- "Scales of justice with gold weights"
- "Lotus flower emerging from darkness"

---

## 4. How To Set This Up

### Option A: Via API (Programmatic)

```python
from services.channel_profile_service import update_channel_profile

profile_data = {
    "languageStyle": "hinglish",
    "thumbnailStyle": "black_minimal",
    "brandDescription": "Channel delivering ancient Chanakya Niti wisdom for modern business leaders...",
    "tone": "Authoritative storyteller, dramatic and wise, strategic thinker",
    "contentPillars": [
        "Chanakya Niti Principles",
        "Leadership & Strategy",
        "Business Warfare Tactics",
        "Ancient Indian Philosophy",
        "Entrepreneurship Wisdom"
    ],
    "thumbnailsPerShort": 1,  # Or 3 to generate multiple options
    "voiceId": ""  # Leave blank or add ElevenLabs voice ID
}

updated_profile = await update_channel_profile("chanakya-sutra", profile_data)
```

### Option B: Via MongoDB (Manual)

```javascript
use forgevoice_prod;

db.channel_profiles_collection.updateOne(
  { clientId: "chanakya-sutra" },
  {
    $set: {
      languageStyle: "hinglish",
      thumbnailStyle: "black_minimal",
      brandDescription: "Channel delivering ancient Chanakya Niti wisdom for modern business leaders...",
      tone: "Authoritative storyteller, dramatic and wise, strategic thinker",
      contentPillars: [
        "Chanakya Niti Principles",
        "Leadership & Strategy",
        "Business Warfare Tactics",
        "Ancient Indian Philosophy",
        "Entrepreneurship Wisdom"
      ],
      thumbnailsPerShort: 1,
      updatedAt: new Date().toISOString()
    }
  },
  { upsert: true }
);
```

### Option C: Via Dashboard UI (If Exists)

1. Navigate to Settings → Channel Profile
2. Set Language Style: **Hinglish**
3. Set Thumbnail Style: **Black Minimal (Chanakya Style)**
4. Fill in Brand Description, Tone, Content Pillars
5. Click Save

---

## 5. How It Affects Content Generation

### Script Generation

**Before (generic):**
```
"Today we'll talk about the 5 principles of business success. Let's dive in..."
```

**After (Chanakya archetype):**
```
"Dekho bhai [short pause] Chanakya ne 2300 saal pehle jo bola tha [emphatic]
Wo aaj bhi kaam karta hai!
[dramatic] Business mein success ki 5 cheezein hain.
Agar ye nahi pata [raises voice] to failure pakka hai!"
```

### Video Clip Prompts

**Before (generic):**
```
"Professional business meeting in modern office"
```

**After (Chanakya archetype):**
```
"Ancient Indian sage with white beard, saffron dhoti, standing in Mauryan palace courtyard with stone pillars, golden hour lighting, dramatic shadows, cinematic 4K, Bollywood epic style, camera slowly zooms in on his wise eyes"
```

### Thumbnail Generation

**Before (generic):**
```
"Professional YouTube thumbnail, high contrast, bold text, clean design"
```

**After (Chanakya archetype):**
```
"Pure black background, bold white text saying 'CHANAKYA'S SECRET', single gold accent line, no faces, extremely high contrast, dramatic lighting, 9:16 aspect ratio"
```

---

## 6. Advanced: Multi-Thumbnail Selection

Set `thumbnailsPerShort: 3` to generate 3 different thumbnail options per video:

**Variation 1:** Text-focused
```
"Black background, large bold white text 'LEADERSHIP SECRET', gold underline"
```

**Variation 2:** Symbol-focused
```
"Black background, gold lotus flower icon, small white text 'Ancient Wisdom'"
```

**Variation 3:** Hybrid
```
"Black background, half screen gold geometric pattern, half screen bold white text"
```

**Workflow:**
1. System generates 3 thumbnails
2. Saves all 3 to assets_collection
3. You pick the best one (or A/B test on YouTube)

---

## 7. Voice Selection (ElevenLabs)

### Current: Default Voice

System uses ElevenLabs default voice unless you specify `voiceId`.

### Recommended for Chanakya:

**Option A: Test existing voices** (free)
1. Go to ElevenLabs: https://elevenlabs.io/voice-library
2. Filter for: **Male, Deep, Authoritative, Indian English**
3. Test voices like:
   - **Adam** (authoritative male)
   - **Antoni** (well-rounded male)
   - **Clyde** (deep male voice)
4. Copy the Voice ID (e.g., `21m00Tcm4TlvDq8ikWAM`)
5. Add to channel profile: `"voiceId": "21m00Tcm4TlvDq8ikWAM"`

**Option B: Clone your own voice** ($30 one-time)
1. Record 30 minutes of your voice speaking in Hinglish
2. Upload to ElevenLabs Professional Voice Cloning
3. Get custom voice ID
4. Add to channel profile

**Option C: Use AI voice design** (free on Growth plan)
1. Describe voice: "Deep male Indian accent, authoritative, wise storyteller"
2. ElevenLabs generates custom voice
3. Get voice ID, add to profile

---

## 8. Testing the Archetype

### Quick Test (No Cost)

```python
from services.channel_profile_service import get_channel_profile, get_script_instructions

# Get profile
profile = await get_channel_profile("chanakya-sutra")

# See script instructions that will be sent to Gemini
instructions = get_script_instructions(profile)
print(instructions)
```

**Expected output:**
```
LANGUAGE & STYLE:
Write the script in Hinglish: Hindi sentences written in Latin characters...
Include performance cues in square brackets like [short pause], [emphatic]...

BRAND CONTEXT:
Channel delivering ancient Chanakya Niti wisdom for modern business leaders...

TONE:
Write with a authoritative storyteller, dramatic and wise, strategic thinker tone.

CONTENT THEMES:
Focus on themes related to: Chanakya Niti Principles, Leadership & Strategy, Business Warfare Tactics...
```

### Full Test (With Cost)

```bash
cd ~/Desktop/FVS-audit/backend
python test_chanakya_automation.py
# Choose "1" for Short
# Will use Chanakya archetype automatically
```

---

## 9. Content Calendar Integration

The archetype affects ALL auto-generated content:

**Tuesday 8 AM UTC:**
- Generates idea → Gemini uses content pillars to pick topic
- Generates script → Uses Hinglish + Chanakya tone
- Generates video clips → Uses ancient India visual prompts
- Generates thumbnail → Black minimal style

**Results in:**
- Consistent brand voice across all 24 videos/month
- No need to manually review prompts
- AI "knows" what Chanakya Sutra content should look/sound like

---

## 10. Iteration & Refinement

### After First 10 Videos:

**Track metrics:**
- Which content pillars get highest views?
- Which thumbnail variations get highest CTR?
- Which script styles get highest retention?

**Refine archetype:**
```python
# If "Business Warfare Tactics" videos perform 2x better:
updated_profile = await update_channel_profile("chanakya-sutra", {
    "contentPillars": [
        "Business Warfare Tactics",  # Move to top priority
        "Leadership & Strategy",
        "Chanakya Niti Principles",
        "Power Dynamics",
        "Negotiation Mastery"
    ]
})
```

**System adapts:**
- Gemini will generate more "warfare tactics" ideas
- Visual prompts will include more "strategy board" imagery
- Thumbnails will use more "battle/chess" metaphors

---

## ✅ Quick Setup Checklist

- [ ] Set `languageStyle: "hinglish"`
- [ ] Set `thumbnailStyle: "black_minimal"`
- [ ] Write brand description (Chanakya focus)
- [ ] Define tone (authoritative storyteller)
- [ ] Add 5+ content pillars
- [ ] Test voice options (optional but recommended)
- [ ] Generate 1 test Short to verify style
- [ ] Review output, refine archetype if needed
- [ ] Enable automation (Tue/Thu/Sun cron)

---

## 🎯 Expected Results

**With proper archetype setup:**

✅ Scripts sound authentically "Chanakya"
✅ Videos have consistent ancient India aesthetic
✅ Thumbnails follow black/gold premium style
✅ Voice matches authoritative tone
✅ Content themes align with channel niche
✅ No manual prompt engineering needed

**Without archetype setup:**

❌ Generic business advice scripts
❌ Random modern office footage
❌ Colorful clickbait thumbnails
❌ Inconsistent brand identity
❌ Manual fixing required for every video

---

## 📞 Need Help?

**Check current profile:**
```bash
cd ~/Desktop/FVS-audit/backend
python -c "
import asyncio
from services.channel_profile_service import get_channel_profile

async def check():
    profile = await get_channel_profile('chanakya-sutra')
    print(profile)

asyncio.run(check())
"
```

**Update profile:**
See "How To Set This Up" section above.

**Test archetype:**
Run `python test_chanakya_automation.py` and review the generated script/video style.
