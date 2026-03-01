"""
conftest.py — Sprint 16 test infrastructure.

Sets up:
  1. mongomock_motor  — in-memory async MongoDB (no real Mongo needed)
  2. ASGI test client — httpx.AsyncClient(app=app) — no network needed
  3. Seeded user      — alex@company.com / client123

All tests in test_sprint16_features.py are patched via the module-level
API_URL override + a shared ASGI transport so httpx calls hit the local app.
"""
import asyncio
import os
import sys
import uuid
import pytest
import pytest_asyncio
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock

# ── Point API at the local ASGI app ─────────────────────────────────────────
os.environ.setdefault("MONGO_URL",   "mongodb://localhost:27017")  # will be mocked
os.environ.setdefault("DB_NAME",     "fvs_test")
os.environ.setdefault("JWT_SECRET",  "test-secret-for-sprint16-tests")
os.environ.setdefault("REACT_APP_BACKEND_URL", "http://testserver")

# Silence noisy startup logs
import logging
logging.disable(logging.CRITICAL)

# ── Patch motor with mongomock_motor BEFORE importing the app ────────────────
from mongomock_motor import AsyncMongoMockClient

_mock_client = AsyncMongoMockClient()
_mock_db     = _mock_client["fvs_test"]

import db.mongo as _mongo_module
_mongo_module._client = _mock_client
_mongo_module._db     = _mock_db


# ── Now safe to import the app ───────────────────────────────────────────────
# Suppress the publishing scheduler (needs real Mongo / APScheduler)
with patch("services.publishing_scheduler.start_scheduler"), \
     patch("services.publishing_scheduler.stop_scheduler"):
    from main import app


# ── Seed minimal test data ───────────────────────────────────────────────────
async def _seed():
    from services.auth_service import hash_password
    db = _mock_db
    await db.users.delete_many({})

    now = datetime.now(timezone.utc).isoformat()
    await db.users.insert_one({
        "id":           "test-user-alex",
        "email":        "alex@company.com",
        "passwordHash": hash_password("client123"),
        "role":         "client",
        "clientId":     "demo-client-1",
        "name":         "Alex Demo",
        "createdAt":    now,
    })
    await db.users.insert_one({
        "id":           "test-user-admin",
        "email":        "admin@forgevoice.com",
        "passwordHash": hash_password("admin123"),
        "role":         "admin",
        "clientId":     "admin-client",
        "name":         "Admin",
        "createdAt":    now,
    })


# ── Pytest session setup ─────────────────────────────────────────────────────
def pytest_configure(config):
    """Seed the mock DB synchronously before any test runs."""
    asyncio.get_event_loop_policy().new_event_loop()
    loop = asyncio.new_event_loop()
    loop.run_until_complete(_seed())
    loop.close()


# ── Override API_URL in test module and inject ASGI transport ────────────────
import httpx
from httpx import AsyncClient, ASGITransport

_transport = ASGITransport(app=app)


@pytest.fixture(autouse=True)
def patch_api_url(monkeypatch):
    """Override API_URL in the test module so all httpx calls use the ASGI transport."""
    import tests.test_sprint16_features as t
    monkeypatch.setattr(t, "API_URL", "http://testserver")


@pytest.fixture(autouse=True)
def patch_httpx_client(monkeypatch):
    """
    Replace httpx.AsyncClient with a version that always uses the ASGI transport.
    This means ALL `async with httpx.AsyncClient(...) as client:` calls in the
    test module transparently talk to the local FastAPI app.
    """
    original_init = httpx.AsyncClient.__init__

    def patched_init(self, *args, **kwargs):
        kwargs.pop("transport", None)          # remove any existing transport
        kwargs["transport"] = _transport
        kwargs["base_url"]  = "http://testserver"
        original_init(self, *args, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "__init__", patched_init)
