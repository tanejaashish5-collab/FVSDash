"""
ForgeVoice Studio API - Legacy Server Entry Point

This file is a thin wrapper for backwards compatibility.
All functionality has been refactored into the modular structure:
- /routers: API route handlers
- /models: Pydantic schemas
- /services: Business logic
- /db: Database utilities

The actual app is now in main.py
"""
from main import app

# Re-export app for backwards compatibility with existing deployment scripts
__all__ = ["app"]
