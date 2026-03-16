# FVS Automation Status & Next Steps

## Current Situation

### ✅ What's Done:
1. **Veo 3.1 Integration in Manual Mode**
   - Content Studio can generate videos with Veo 3.1
   - API key configured and tested
   - 70% cheaper than Kling

2. **Scheduling System Active**
   - 7 videos/week scheduled (4 Shorts, 3 Long-form)
   - Runs at 8 PM IST daily
   - APScheduler configured in `publishing_scheduler.py`

### ❌ What's NOT Done:

1. **Automated Production Still Uses Kling**
   - `video_production_service.py` still calls `generate_kling_clip()`
   - Scheduled automation would fail or use wrong provider
   - Needs update to use Veo

2. **Scene Planner NOT Implemented**
   - The `FVS_LongForm_ScenePlanner_SPEC.md` is just a specification
   - No actual code written for Scene Planner
   - Would take 22+ hours to implement (per spec)

## The Problem

When the scheduler runs (daily at 8 PM IST), it will:
1. Call `produce_short()` or `produce_longform()`
2. These functions call `generate_kling_clip()`
3. Kling would be used instead of Veo
4. You'd pay $0.70/clip instead of $0.20/clip

## Immediate Fix Required

### Option 1: Quick Fix (30 minutes)
Update `video_production_service.py` to replace Kling with Veo:

```python
# Replace this:
async def generate_kling_clip(prompt, duration, aspect, quality):
    # Current Kling implementation

# With this:
async def generate_veo_clip(prompt, duration, aspect, quality):
    from services.video_task_service import create_veo_job

    # Use Veo 3.1 instead
    job_result = await create_veo_job({
        "prompt": prompt,
        "aspectRatio": aspect,
        "quality": "fast" if quality == "standard" else "standard"
    })

    # Wait for video to be ready
    # Download and return local path
```

### Option 2: Disable Automation (5 minutes)
Stop the scheduler until we fix it:

```python
# In main.py, comment out:
# start_scheduler()
```

### Option 3: Full Rewrite (2-3 days)
1. Implement Scene Planner from spec
2. Integrate Veo throughout pipeline
3. Add cost optimization logic
4. Test thoroughly

## My Recommendation

**Do Option 1 NOW** - Quick fix to use Veo in automation

This ensures:
- Your 7x/week automation uses Veo (cheaper)
- Videos generate with Chanakya aesthetic
- You save 70% on costs immediately

## Cost Impact

| Current (Kling) | With Veo Fix | Monthly Savings |
|----------------|--------------|-----------------|
| 4 Shorts × $3.50 = $14/week | 4 Shorts × $1.00 = $4/week | $40/month |
| 3 Long-form × $2.25 = $6.75/week | 3 Long-form × $0.65 = $1.95/week | $19/month |
| **Total: $20.75/week** | **Total: $5.95/week** | **$59/month saved** |

## Next Commands

To implement the fix:

```bash
# 1. Update video_production_service.py
# (I can do this for you)

# 2. Test automation manually
cd backend
python3 test_chanakya_automation.py

# 3. Check scheduler is running
python3 -c "from services.publishing_scheduler import _scheduler; print(_scheduler.get_jobs())"
```

## Questions for You

1. **Should I implement the quick Veo fix now?** (30 min)
2. **Or disable automation until full rewrite?** (5 min)
3. **Is Scene Planner urgent or can wait?** (22+ hours)

The automation will run today at 8 PM IST - we should decide before then!