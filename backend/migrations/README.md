# Backend Migrations

This folder contains database migration scripts for ForgeVoice Studio.

## Overview

Migrations are Python scripts that modify the MongoDB database schema or data. They are typically run once during deployment or when setting up a new environment.

## Migration Files

### Root Level Migrations

| File | Purpose | When to Run |
|------|---------|-------------|
| `update_blog_chanakya.py` | Replaces demo blog posts with Chanakya Sutra-themed articles (5 articles about content strategy using ancient Indian wisdom) | Run once to seed production blog content |

### Versioned Migrations (`versions/`)

| File | Sprint | Purpose | Dependencies |
|------|--------|---------|--------------|
| `s12_identity_fix.py` | Sprint 12 | Renames demo client from "Alex Chen" to "Chanakya Sutra" (updates both `users` and `clients` collections) | None |
| `s13_admin_cleanup.py` | Sprint 13 | Removes FVS-related data (ideas, recommendations, brain snapshots) for admin user who has no YouTube channel | Run after s12 |

## Running Migrations

### Running a Single Migration

```bash
cd /app/backend
python3 -m migrations.update_blog_chanakya
python3 -m migrations.versions.s12_identity_fix
python3 -m migrations.versions.s13_admin_cleanup
```

### Recommended Order

1. **s12_identity_fix.py** - Identity migration (client name change)
2. **s13_admin_cleanup.py** - Admin data cleanup
3. **update_blog_chanakya.py** - Blog content seeding

### From Python Code

```python
import asyncio
from migrations.update_blog_chanakya import migrate_blog_posts
from migrations.versions.s12_identity_fix import run_identity_migration
from migrations.versions.s13_admin_cleanup import cleanup_admin_data

# Run blog migration
asyncio.run(migrate_blog_posts())

# Run identity fix (needs db instance)
from db.mongo import get_db
db = get_db()
asyncio.run(run_identity_migration(db))

# Run admin cleanup
asyncio.run(cleanup_admin_data())
```

## Environment Requirements

All migrations require:
- `MONGO_URL` environment variable
- `DB_NAME` environment variable

These are typically set in `/app/backend/.env`

## Notes

- **Idempotent**: Migrations are generally safe to run multiple times
- **Backup**: Always backup data before running migrations in production
- **Order matters**: Run versioned migrations in sprint order (s12 before s13)
- **No rollback**: These are one-way migrations without automatic rollback scripts
