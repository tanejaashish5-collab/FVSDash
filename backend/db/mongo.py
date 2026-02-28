"""
MongoDB client and collection helpers.
Singleton-style connection management for the entire application.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# Singleton client
_client: AsyncIOMotorClient = None
_db: AsyncIOMotorDatabase = None


def get_client() -> AsyncIOMotorClient:
    """Get or create the MongoDB client."""
    global _client
    if _client is None:
        mongo_url = os.environ['MONGO_URL']
        _client = AsyncIOMotorClient(mongo_url)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    """Get the database instance."""
    global _db
    if _db is None:
        client = get_client()
        _db = client[os.environ['DB_NAME']]
    return _db


def close_client():
    """Close the MongoDB client connection."""
    global _client
    if _client:
        _client.close()
        _client = None


# Collection accessors
def users_collection():
    return get_db().users

def clients_collection():
    return get_db().clients

def submissions_collection():
    return get_db().submissions

def assets_collection():
    return get_db().assets

def analytics_snapshots_collection():
    return get_db().analytics_snapshots

def billing_records_collection():
    return get_db().billing_records

def client_settings_collection():
    return get_db().client_settings

def video_tasks_collection():
    return get_db().video_tasks

def help_articles_collection():
    return get_db().help_articles

def support_requests_collection():
    return get_db().support_requests

def blog_posts_collection():
    return get_db().blog_posts

def fvs_ideas_collection():
    return get_db().fvs_ideas

def fvs_brain_snapshots_collection():
    return get_db().fvs_brain_snapshots

def fvs_activity_collection():
    return get_db().fvs_activity

def fvs_config_collection():
    return get_db().fvs_config

def fvs_scripts_collection():
    return get_db().fvs_scripts

def channel_profiles_collection():
    return get_db().channel_profiles

def publishing_tasks_collection():
    return get_db().publishing_tasks

def platform_connections_collection():
    return get_db().platform_connections

def strategy_sessions_collection():
    return get_db().strategy_sessions

def notifications_collection():
    return get_db().notifications

def oauth_tokens_collection():
    return get_db().oauth_tokens

def publish_jobs_collection():
    return get_db().publish_jobs

def channel_snapshots_collection():
    return get_db().channel_snapshots

def brain_scores_collection():
    return get_db().brain_scores

def calendar_suggestions_collection():
    return get_db().calendar_suggestions

def fvs_recommendations_collection():
    return get_db().fvs_recommendations

def video_tasks_collection_v2():
    return get_db().video_tasks

def video_editor_projects_collection():
    return get_db().video_editor_projects
