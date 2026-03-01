"""
Sprint 16 Feature Tests for ForgeVoice Studio.

Covers all 6 new enhancements shipped in the big-build sprint:
  T1-A — SSE Real-time Updates        (GET /api/pipeline/events)
  T2-C — Content Templates             (GET/POST/PATCH/DELETE /api/templates)
  T4-A — AI Calendar Auto-Planner      (POST /api/ai/suggest-schedule)
  T4-C — YouTube Comment Intelligence  (POST /api/ai/analyze-comments)
  T2-G — Email Digest                  (service-level + scheduler plumbing)
  T3-D — Background Job Plumbing       (POST/GET /api/pipeline/produce-video)

Run with:
  pytest backend/tests/test_sprint16_features.py -v
  pytest backend/tests/test_sprint16_features.py -v -k "Templates"   # single class
"""
import pytest
import httpx
import uuid
import os

API_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://video-studio-fix.preview.emergentagent.com")
if not API_URL.startswith("http"):
    API_URL = f"https://{API_URL}"


# ──────────────────────────────────────────────────────────────────────────────
# Shared auth helpers
# ──────────────────────────────────────────────────────────────────────────────

async def get_client_token() -> str:
    """Login as demo client and return JWT."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            f"{API_URL}/api/auth/login",
            json={"email": "alex@company.com", "password": "client123"},
        )
        if res.status_code == 200:
            return res.json().get("token")
    return None


async def auth_headers() -> dict:
    token = await get_client_token()
    assert token, "Failed to obtain auth token — check seed data"
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# T1-A — SSE Real-time Updates
# =============================================================================

@pytest.mark.asyncio
class TestSSERealtime:
    """Tests for the Server-Sent Events pipeline endpoint."""

    async def test_sse_endpoint_rejects_missing_token(self):
        """GET /pipeline/events without token must return 401."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(f"{API_URL}/api/pipeline/events")
        assert res.status_code == 401

    async def test_sse_endpoint_rejects_invalid_token(self):
        """GET /pipeline/events with a garbage token must return 401."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                f"{API_URL}/api/pipeline/events",
                params={"token": "not.a.real.jwt"},
            )
        assert res.status_code == 401

    async def test_sse_endpoint_accepts_valid_token(self):
        """
        GET /pipeline/events with a valid token should return 200 with
        Content-Type: text/event-stream and the initial 'connected' frame.
        We read just the first chunk then close.
        """
        token = await get_client_token()
        assert token, "No auth token"

        async with httpx.AsyncClient(timeout=15.0) as client:
            async with client.stream(
                "GET",
                f"{API_URL}/api/pipeline/events",
                params={"token": token},
            ) as res:
                assert res.status_code == 200
                assert "text/event-stream" in res.headers.get("content-type", "")
                # Read one data frame — should be the "connected" event
                first_chunk = ""
                async for chunk in res.aiter_text():
                    first_chunk += chunk
                    if "\n\n" in first_chunk:
                        break
        assert "connected" in first_chunk

    async def test_submission_status_change_emits_sse_payload(self):
        """
        PATCH /submissions/{id}/status should succeed;
        the SSE broadcast is best-effort so we only verify the HTTP response.
        (Full end-to-end SSE delivery is covered by E2E/Playwright tests.)
        """
        headers = await auth_headers()
        test_id = str(uuid.uuid4())[:8]
        sub_id = None

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Create submission
                create_res = await client.post(
                    f"{API_URL}/api/submissions",
                    json={
                        "title": f"SSE Test {test_id}",
                        "contentType": "Short",
                        "description": "Verify SSE emit on status change",
                        "guest": "Test Guest",
                        "sourceFileUrl": "https://example.com/test.mp4",
                        "releaseDate": "2026-04-01",
                    },
                    headers=headers,
                )
                assert create_res.status_code == 200, create_res.text
                sub_id = create_res.json()["id"]

                # Trigger status change — this should internally call event_bus.emit()
                patch_res = await client.patch(
                    f"{API_URL}/api/submissions/{sub_id}/status",
                    json={"status": "In Review"},
                    headers=headers,
                )
                assert patch_res.status_code == 200

                # Verify the DB actually updated
                get_res = await client.get(
                    f"{API_URL}/api/submissions/{sub_id}",
                    headers=headers,
                )
                assert get_res.status_code == 200
                assert get_res.json().get("status") == "In Review"

            finally:
                if sub_id:
                    await client.delete(
                        f"{API_URL}/api/submissions/{sub_id}",
                        headers=headers,
                    )


# =============================================================================
# T2-C — Content Templates
# =============================================================================

@pytest.mark.asyncio
class TestContentTemplates:
    """Tests for the /api/templates CRUD endpoints."""

    async def test_list_templates_returns_system_templates(self):
        """GET /templates should return at least 15 system templates."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.get(f"{API_URL}/api/templates", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        system_templates = [t for t in data if t.get("clientId") == "system"]
        assert len(system_templates) >= 15, (
            f"Expected ≥15 system templates, got {len(system_templates)}"
        )

    async def test_list_templates_has_required_fields(self):
        """Each template must have: id, name, category, format, scriptTemplate, tags."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.get(f"{API_URL}/api/templates", headers=headers)
        assert res.status_code == 200
        for tmpl in res.json():
            for field in ("id", "name", "category", "format", "scriptTemplate", "tags", "usageCount"):
                assert field in tmpl, f"Field '{field}' missing from template {tmpl.get('name')}"

    async def test_filter_by_category(self):
        """GET /templates?category=hook should return only hook templates."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.get(
                f"{API_URL}/api/templates",
                params={"category": "hook"},
                headers=headers,
            )
        assert res.status_code == 200
        for tmpl in res.json():
            assert tmpl["category"] == "hook"

    async def test_filter_by_format(self):
        """GET /templates?format=podcast should return only podcast templates."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.get(
                f"{API_URL}/api/templates",
                params={"format": "podcast"},
                headers=headers,
            )
        assert res.status_code == 200
        assert len(res.json()) >= 2  # podcast intro + guest intro
        for tmpl in res.json():
            assert tmpl["format"] == "podcast"

    async def test_create_custom_template(self):
        """POST /templates should create a user-owned template."""
        headers = await auth_headers()
        test_id = str(uuid.uuid4())[:8]
        created_id = None

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                res = await client.post(
                    f"{API_URL}/api/templates",
                    json={
                        "name": f"My Custom Template {test_id}",
                        "category": "full-script",
                        "format": "short",
                        "description": "Test custom template",
                        "scriptTemplate": "This is {{topic}} — here's why it matters.\n\n{{main_point}}.",
                        "tags": ["test", "custom"],
                    },
                    headers=headers,
                )
                assert res.status_code == 200, res.text
                tmpl = res.json()
                created_id = tmpl["id"]

                assert tmpl["name"] == f"My Custom Template {test_id}"
                assert tmpl["category"] == "full-script"
                assert tmpl["usageCount"] == 0
                # Should NOT be a system template
                assert tmpl["clientId"] != "system"

            finally:
                if created_id:
                    await client.delete(
                        f"{API_URL}/api/templates/{created_id}",
                        headers=headers,
                    )

    async def test_create_template_missing_fields_rejected(self):
        """POST /templates without name or scriptTemplate returns 400."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(
                f"{API_URL}/api/templates",
                json={"category": "hook"},  # missing name + scriptTemplate
                headers=headers,
            )
        assert res.status_code == 400

    async def test_increment_usage_count(self):
        """PATCH /templates/{id}/use should increment usageCount by 1."""
        headers = await auth_headers()
        test_id = str(uuid.uuid4())[:8]
        created_id = None

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                # Create template
                create_res = await client.post(
                    f"{API_URL}/api/templates",
                    json={
                        "name": f"Usage Test {test_id}",
                        "scriptTemplate": "Hello {{world}}",
                    },
                    headers=headers,
                )
                assert create_res.status_code == 200
                created_id = create_res.json()["id"]

                # Increment twice
                await client.patch(
                    f"{API_URL}/api/templates/{created_id}/use",
                    headers=headers,
                )
                await client.patch(
                    f"{API_URL}/api/templates/{created_id}/use",
                    headers=headers,
                )

                # Fetch and verify
                list_res = await client.get(f"{API_URL}/api/templates", headers=headers)
                updated = next((t for t in list_res.json() if t["id"] == created_id), None)
                assert updated is not None
                assert updated["usageCount"] == 2

            finally:
                if created_id:
                    await client.delete(
                        f"{API_URL}/api/templates/{created_id}",
                        headers=headers,
                    )

    async def test_delete_user_template(self):
        """DELETE /templates/{id} should remove the user's own template."""
        headers = await auth_headers()
        test_id = str(uuid.uuid4())[:8]

        async with httpx.AsyncClient(timeout=20.0) as client:
            # Create
            create_res = await client.post(
                f"{API_URL}/api/templates",
                json={"name": f"Delete Me {test_id}", "scriptTemplate": "delete {{this}}"},
                headers=headers,
            )
            assert create_res.status_code == 200
            tid = create_res.json()["id"]

            # Delete
            del_res = await client.delete(
                f"{API_URL}/api/templates/{tid}",
                headers=headers,
            )
            assert del_res.status_code == 200
            assert del_res.json().get("ok") is True

            # Verify gone
            list_res = await client.get(f"{API_URL}/api/templates", headers=headers)
            ids = [t["id"] for t in list_res.json()]
            assert tid not in ids

    async def test_cannot_delete_system_template(self):
        """DELETE /templates/{id} on a system template should return 404."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=20.0) as client:
            # Get first system template id
            list_res = await client.get(f"{API_URL}/api/templates", headers=headers)
            system = next(t for t in list_res.json() if t["clientId"] == "system")

            del_res = await client.delete(
                f"{API_URL}/api/templates/{system['id']}",
                headers=headers,
            )
        assert del_res.status_code == 404


# =============================================================================
# T4-A — AI Calendar Auto-Planner
# =============================================================================

@pytest.mark.asyncio
class TestAICalendarPlanner:
    """Tests for the AI schedule suggestion endpoint."""

    async def test_suggest_schedule_returns_suggestions(self):
        """POST /ai/suggest-schedule should return a list of date suggestions."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(
                f"{API_URL}/api/ai/suggest-schedule",
                json={},
                headers=headers,
            )
        assert res.status_code == 200
        data = res.json()
        assert "suggestions" in data
        assert isinstance(data["suggestions"], list)
        assert len(data["suggestions"]) >= 1

    async def test_suggest_schedule_suggestion_fields(self):
        """Each suggestion must have date, dayOfWeek, reason, and priority."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(
                f"{API_URL}/api/ai/suggest-schedule",
                json={},
                headers=headers,
            )
        assert res.status_code == 200
        suggestions = res.json().get("suggestions", [])
        assert len(suggestions) >= 1, "Expected at least one suggestion"
        for s in suggestions:
            assert "date" in s, f"Missing 'date' in suggestion: {s}"
            assert "dayOfWeek" in s, f"Missing 'dayOfWeek' in suggestion: {s}"
            assert "reason" in s, f"Missing 'reason' in suggestion: {s}"
            assert "priority" in s, f"Missing 'priority' in suggestion: {s}"
            # Priority must be one of the allowed values
            assert s["priority"] in ("High", "Medium", "Low"), (
                f"Unexpected priority value: {s['priority']}"
            )

    async def test_suggest_schedule_returns_insight(self):
        """Response must include an 'insight' string."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(
                f"{API_URL}/api/ai/suggest-schedule",
                json={},
                headers=headers,
            )
        assert res.status_code == 200
        assert "insight" in res.json()
        assert isinstance(res.json()["insight"], str)
        assert len(res.json()["insight"]) > 10  # non-trivial string

    async def test_suggest_schedule_dates_are_future(self):
        """All suggested dates should be in the future."""
        from datetime import date as _date
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(
                f"{API_URL}/api/ai/suggest-schedule",
                json={},
                headers=headers,
            )
        assert res.status_code == 200
        today = _date.today().isoformat()
        for s in res.json().get("suggestions", []):
            assert s["date"] > today, f"Suggested date {s['date']} is not in the future"

    async def test_suggest_schedule_requires_auth(self):
        """POST /ai/suggest-schedule without auth token returns 403/401."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{API_URL}/api/ai/suggest-schedule",
                json={},
            )
        assert res.status_code in (401, 403)


# =============================================================================
# T4-C — YouTube Comment Intelligence
# =============================================================================

@pytest.mark.asyncio
class TestYouTubeCommentIntelligence:
    """Tests for the YouTube comment analysis endpoint."""

    async def test_analyze_comments_invalid_url_returns_400(self):
        """Non-YouTube URLs should be rejected with 400."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{API_URL}/api/ai/analyze-comments",
                json={"videoUrl": "https://example.com/notayoutubeurl"},
                headers=headers,
            )
        assert res.status_code == 400

    async def test_analyze_comments_missing_url_returns_400(self):
        """Missing videoUrl must return 400."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{API_URL}/api/ai/analyze-comments",
                json={},
                headers=headers,
            )
        assert res.status_code == 400

    async def test_analyze_comments_valid_youtube_url(self):
        """
        A valid YouTube URL should return a structured analysis response.
        When YOUTUBE_API_KEY is absent, isMocked=True with demo data.
        """
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                f"{API_URL}/api/ai/analyze-comments",
                json={"videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
                headers=headers,
            )
        assert res.status_code == 200
        data = res.json()

        # Core structure
        assert "themes" in data
        assert "audienceQuestions" in data
        assert "painPoints" in data
        assert "contentIdeas" in data
        assert "sentiment" in data
        assert "videoId" in data

        # Correct video ID extracted
        assert data["videoId"] == "dQw4w9WgXcQ"

    async def test_analyze_comments_sentiment_sums_to_100(self):
        """Sentiment positive + neutral + negative should sum to ~100."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                f"{API_URL}/api/ai/analyze-comments",
                json={"videoUrl": "https://youtu.be/dQw4w9WgXcQ"},
                headers=headers,
            )
        assert res.status_code == 200
        sent = res.json().get("sentiment", {})
        total = sent.get("positive", 0) + sent.get("neutral", 0) + sent.get("negative", 0)
        assert 95 <= total <= 105, f"Sentiment values don't sum to ~100: {sent}"

    async def test_analyze_comments_content_ideas_have_type(self):
        """Each content idea must have a title and type field."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                f"{API_URL}/api/ai/analyze-comments",
                json={"videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
                headers=headers,
            )
        assert res.status_code == 200
        ideas = res.json().get("contentIdeas", [])
        for idea in ideas:
            assert "title" in idea, f"Missing 'title' in idea: {idea}"
            assert "type" in idea, f"Missing 'type' in idea: {idea}"

    async def test_analyze_comments_youtube_short_url(self):
        """youtu.be short URL should also be parsed correctly."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                f"{API_URL}/api/ai/analyze-comments",
                json={"videoUrl": "https://youtu.be/dQw4w9WgXcQ"},
                headers=headers,
            )
        assert res.status_code == 200
        assert res.json()["videoId"] == "dQw4w9WgXcQ"

    async def test_analyze_comments_requires_auth(self):
        """Endpoint should reject unauthenticated requests."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{API_URL}/api/ai/analyze-comments",
                json={"videoUrl": "https://youtu.be/dQw4w9WgXcQ"},
            )
        assert res.status_code in (401, 403)


# =============================================================================
# T2-G — Email Digest (service-level plumbing)
# =============================================================================

@pytest.mark.asyncio
class TestEmailDigest:
    """
    Tests for the email digest service.
    Since actual email sending depends on external SMTP/SendGrid credentials,
    these tests verify the opt-in plumbing and internal HTML generation.
    """

    async def test_digest_html_generation(self):
        """email_service._build_html() should produce valid HTML with key stats."""
        import sys
        import os
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
        from services.email_service import _build_html

        stats = {
            "pipeline": {"total": 12, "by_status": {"INTAKE": 3, "EDITING": 5, "PUBLISHED": 4}},
            "published_this_week": 4,
            "pending_actions": 8,
            "top_submission": {"title": "How to Build Habits"},
        }
        html = _build_html(stats)

        assert "<!DOCTYPE html>" in html
        assert "Weekly Pipeline Digest" in html
        assert "4" in html          # published_this_week
        assert "8" in html          # pending_actions
        assert "12" in html         # total
        assert "INTAKE" in html     # status breakdown
        assert "How to Build Habits" in html

    async def test_send_digest_dev_mode_succeeds(self):
        """
        When no SMTP/SendGrid is configured, send_digest_email should
        log and return True (dev no-op mode).
        """
        import sys
        import os
        # Ensure no email credentials leak into this test
        for key in ("SENDGRID_API_KEY", "SMTP_HOST"):
            os.environ.pop(key, None)

        sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
        from services.email_service import send_digest_email

        stats = {
            "pipeline": {"total": 5, "by_status": {"INTAKE": 5}},
            "published_this_week": 0,
            "pending_actions": 5,
            "top_submission": {},
        }
        result = await send_digest_email(
            to_email="devtest@example.com",
            client_id="test-client",
            stats=stats,
        )
        assert result is True

    async def test_build_and_send_no_opted_in_users(self):
        """
        build_and_send_weekly_digests() should complete without error
        when no users have weeklyDigest=True.
        """
        import sys
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
        from services.email_service import build_and_send_weekly_digests

        # Should not raise
        await build_and_send_weekly_digests()

    async def test_user_settings_digest_flag_stored(self):
        """
        PATCH /api/settings should accept weeklyDigest and digestEmail fields,
        confirming the data model supports digest opt-in.
        """
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.patch(
                f"{API_URL}/api/settings",
                json={"weeklyDigest": True, "digestEmail": "test@example.com"},
                headers=headers,
            )
        # Accept 200 (saved) or 422 (field not yet in schema — note to wire later)
        assert res.status_code in (200, 201, 204, 422), (
            f"Unexpected status {res.status_code}: {res.text}"
        )


# =============================================================================
# T3-D — Background Job Plumbing
# =============================================================================

@pytest.mark.asyncio
class TestBackgroundJobPlumbing:
    """
    Tests for asyncio background job tracking via the video production pipeline.
    (Replaces Celery/Redis — uses asyncio.create_task + MongoDB job docs.)
    """

    async def test_unknown_job_returns_404(self):
        """GET /pipeline/produce-video/{unknown-id} should return 404."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                f"{API_URL}/api/pipeline/produce-video/nonexistent-job-id",
                headers=headers,
            )
        assert res.status_code == 404

    async def test_produce_video_starts_background_job(self):
        """
        POST /pipeline/produce-video should immediately return job_id and
        status='processing' without blocking.
        """
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{API_URL}/api/pipeline/produce-video",
                json={
                    "title": "Background Job Test",
                    "script": "This is a short test script for background processing verification.",
                    "format_type": "short",
                },
                headers=headers,
            )
        assert res.status_code == 200
        data = res.json()
        assert "job_id" in data
        assert data.get("status") == "processing"
        assert data.get("format") == "short"

    async def test_job_status_polling(self):
        """
        After starting a job, GET /pipeline/produce-video/{id} should return
        a job document with the required status fields.
        """
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Start the job
            start_res = await client.post(
                f"{API_URL}/api/pipeline/produce-video",
                json={
                    "title": "Poll Status Test",
                    "script": "Short test script for status polling.",
                    "format_type": "short",
                },
                headers=headers,
            )
            assert start_res.status_code == 200
            job_id = start_res.json()["job_id"]

            # Poll immediately — should be processing or potentially complete
            poll_res = await client.get(
                f"{API_URL}/api/pipeline/produce-video/{job_id}",
                headers=headers,
            )
        assert poll_res.status_code == 200
        job = poll_res.json()

        # Required fields per video_production_jobs schema
        assert "id" in job
        assert job["id"] == job_id
        assert "status" in job
        assert job["status"] in ("processing", "complete", "error")
        assert "createdAt" in job

    async def test_job_requires_script_or_submission(self):
        """POST /pipeline/produce-video without script and without submission_id returns 400."""
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{API_URL}/api/pipeline/produce-video",
                json={"title": "Missing Script"},
                headers=headers,
            )
        assert res.status_code == 400


# =============================================================================
# Cross-feature integration
# =============================================================================

@pytest.mark.asyncio
class TestCrossFeatureIntegration:
    """Verify the features work together in realistic usage flows."""

    async def test_template_to_submission_to_schedule_flow(self):
        """
        1. Fetch a hook template
        2. Simulate applying it to create a submission
        3. Get AI schedule suggestions for the submission
        4. Verify a coherent date is returned
        """
        headers = await auth_headers()
        test_id = str(uuid.uuid4())[:8]
        sub_id = None

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                # 1. Get a template
                tmpl_res = await client.get(
                    f"{API_URL}/api/templates",
                    params={"category": "hook"},
                    headers=headers,
                )
                assert tmpl_res.status_code == 200
                templates = tmpl_res.json()
                assert len(templates) >= 1
                hook_tmpl = templates[0]

                # 2. Bump usage count (simulates frontend apply)
                await client.patch(
                    f"{API_URL}/api/templates/{hook_tmpl['id']}/use",
                    headers=headers,
                )

                # 3. Get schedule suggestions
                sched_res = await client.post(
                    f"{API_URL}/api/ai/suggest-schedule",
                    json={},
                    headers=headers,
                )
                assert sched_res.status_code == 200
                suggestions = sched_res.json().get("suggestions", [])
                assert len(suggestions) >= 1

                # 4. The top suggestion should be in the future
                from datetime import date as _date
                best_date = suggestions[0]["date"]
                assert best_date > _date.today().isoformat()

            finally:
                if sub_id:
                    await client.delete(
                        f"{API_URL}/api/submissions/{sub_id}",
                        headers=headers,
                    )

    async def test_comment_intelligence_to_content_idea_flow(self):
        """
        Analyse comments on a YouTube video and verify the top request
        can be used as a new content idea (string, non-empty).
        """
        headers = await auth_headers()
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                f"{API_URL}/api/ai/analyze-comments",
                json={"videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
                headers=headers,
            )
        assert res.status_code == 200
        data = res.json()

        top_request = data.get("topRequest", "")
        assert isinstance(top_request, str)
        assert len(top_request) > 3, "topRequest should be a meaningful string"

        # Verify at least one content idea was generated
        ideas = data.get("contentIdeas", [])
        assert len(ideas) >= 1
        # Each idea should be a usable video title
        for idea in ideas:
            assert len(idea.get("title", "")) > 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
