# Scene Splitting Fix - Quick Reference

## What Was Fixed
Scene splitting now generates **36 scenes** (not 1) for 6-minute long-form videos.

## Key Changes

### 1. Retry Logic (3 attempts)
- Attempt 1 fails → wait 2s → Attempt 2
- Attempt 2 fails → wait 2s → Attempt 3
- All attempts fail → intelligent fallback

### 2. JSON Parsing Improvements
```python
# Handles:
- Markdown code blocks (```json ... ```)
- Smart quotes (" " ' ')
- Newlines in text
- Extra text before/after JSON
- Unescaped quotes
```

### 3. Validation
```python
# Checks:
- Valid JSON array ✓
- Not empty ✓
- Expected scene count (36 for longform) ✓
- Required fields present ✓
```

### 4. Intelligent Fallback
If Gemini fails after 3 attempts:
- Splits script into 36 equal parts
- Assigns 3 veo + 33 image scenes
- Returns valid scene array (never fails)

### 5. Increased Token Limit
- Short: 3000 tokens (5 scenes)
- Longform: **8000 tokens** (36 scenes) ← was 3000

## How to Verify Fix Working

### Check Logs
```bash
# Good - scene splitting worked
"Scene splitting successful: 36 scenes generated (expected 36)"

# Warning - retrying
"Expected 36 scenes, got 12. Attempt 2/3"

# Fallback activated (still works)
"Using fallback scene generation"
"Generated 36 fallback scenes"
```

### Check Video Output
- Duration: ~360 seconds (6 minutes) ← was 10-30 seconds
- Scenes: 3 Veo + 33 images ← was 1 scene
- No "Unterminated string" errors

## File Changed
`/Users/ashishtaneja/Desktop/FVS/backend/services/video_production_service.py`
- Function: `split_script_into_scenes()`
- Lines: 74-297

## Test
```bash
cd /Users/ashishtaneja/Desktop/FVS/backend
python3 test_scene_splitting_fix.py
```

## Common Errors Fixed

| Error | Fix |
|-------|-----|
| "Unterminated string" | Remove quotes from prompts, fix smart quotes |
| "Expecting ',' delimiter" | Clean newlines, extract JSON properly |
| Only 1 scene | Fallback generates 36 scenes |
| Token limit exceeded | Increased to 8000 for longform |
| Transient failures | 3 retry attempts |

## Monitoring

Watch Railway logs for:
1. Scene count: should be 36 for longform
2. No JSON parsing errors
3. Video duration: ~6 minutes
4. Retry attempts (occasional is fine)

---
**Status**: ✓ Ready for production
**Next Test**: Chanakya automation (Mon/Wed/Fri 8 AM AEDT)
