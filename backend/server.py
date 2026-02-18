from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'forgevoice-fallback-secret')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

app = FastAPI(title="ForgeVoice Studio API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ==================== PYDANTIC MODELS ====================

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "client"
    clientId: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    clientId: Optional[str] = None

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class StatusUpdate(BaseModel):
    status: str

class SubmissionCreate(BaseModel):
    title: str
    guest: str = ""
    description: str
    contentType: str
    priority: str = "Medium"
    releaseDate: Optional[str] = None
    sourceFileUrl: Optional[str] = None

class SubmissionUpdate(BaseModel):
    status: Optional[str] = None
    releaseDate: Optional[str] = None

class AssetStatusUpdate(BaseModel):
    status: str

class AssetSubmissionUpdate(BaseModel):
    submissionId: Optional[str] = None

class SettingsUpdate(BaseModel):
    hourlyRate: Optional[float] = None
    hoursPerEpisode: Optional[float] = None
    brandVoiceDescription: Optional[str] = None
    primaryContactName: Optional[str] = None
    primaryContactEmail: Optional[str] = None

class SupportRequestCreate(BaseModel):
    subject: str
    message: str

# AI Generation Models
class AIGenerateRequest(BaseModel):
    provider: str  # "gemini" | "openai" | "anthropic"
    task: str  # "research" | "outline" | "script" | "title" | "description" | "tags" | "chapters" | "youtube_package"
    input: dict  # Contains topic, audience, tone, goal, existingContent, etc.

class VideoTaskCreate(BaseModel):
    provider: str  # "runway" | "veo" | "kling"
    prompt: str
    mode: str  # "script" | "audio" | "remix"
    scriptText: Optional[str] = None
    audioAssetId: Optional[str] = None
    sourceAssetId: Optional[str] = None
    aspectRatio: str = "16:9"
    outputProfile: str = "youtube_long"  # "youtube_long" | "shorts" | "reel"
    submissionId: Optional[str] = None


# FVS System Models
class FvsProposeIdeasRequest(BaseModel):
    format: str = "short"  # "short" | "long"
    range: str = "30d"  # "30d" | "90d"

class FvsProduceEpisodeRequest(BaseModel):
    ideaId: str
    mode: str = "full_auto_short"  # "manual" | "semi_auto" | "full_auto_short"

class FvsIdeaStatusUpdate(BaseModel):
    status: str  # "proposed" | "approved" | "rejected" | "in_progress" | "completed"

class FvsAutomationUpdate(BaseModel):
    automationLevel: str  # "manual" | "semi_auto" | "full_auto_short"


# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: str, email: str, role: str, client_id: Optional[str] = None) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "clientId": client_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_client_id_from_user(user: dict) -> Optional[str]:
    return user.get("clientId")

async def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ==================== AUTH ROUTES ====================

@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup(data: UserCreate):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    user_doc = {
        "id": user_id,
        "email": data.email,
        "passwordHash": hash_password(data.password),
        "name": data.name,
        "role": data.role,
        "clientId": data.clientId,
        "createdAt": now,
        "updatedAt": now
    }
    await db.users.insert_one(user_doc)

    token = create_token(user_id, data.email, data.role, data.clientId)
    return TokenResponse(
        token=token,
        user=UserResponse(id=user_id, email=data.email, name=data.name, role=data.role, clientId=data.clientId)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"], user["email"], user["role"], user.get("clientId"))
    return TokenResponse(
        token=token,
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"], role=user["role"], clientId=user.get("clientId"))
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(id=user["id"], email=user["email"], name=user["name"], role=user["role"], clientId=user.get("clientId"))


# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}

    submissions = await db.submissions.find(query, {"_id": 0}).to_list(1000)
    assets = await db.assets.find(query, {"_id": 0}).to_list(1000)
    analytics = await db.analytics_snapshots.find(query, {"_id": 0}).sort("date", -1).to_list(30)

    total_views = sum(a.get("views", 0) for a in analytics)
    total_downloads = sum(a.get("downloads", 0) for a in analytics)
    total_subscribers = sum(a.get("subscribersGained", 0) for a in analytics)

    return {
        "totalSubmissions": len(submissions),
        "totalAssets": len(assets),
        "totalViews": total_views,
        "totalDownloads": total_downloads,
        "subscribersGained": total_subscribers,
        "recentSubmissions": submissions[:5],
        "analyticsData": list(reversed(analytics[:14]))
    }

@api_router.get("/dashboard/overview")
async def get_dashboard_overview(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}

    client_info = None
    if client_id:
        client_info = await db.clients.find_one({"id": client_id}, {"_id": 0})

    submissions = await db.submissions.find(query, {"_id": 0}).to_list(1000)
    assets = await db.assets.find(query, {"_id": 0}).to_list(1000)

    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    analytics_query = {**query, "date": {"$gte": thirty_days_ago}}
    analytics = await db.analytics_snapshots.find(analytics_query, {"_id": 0}).to_list(1000)

    active_projects = len([s for s in submissions if s["status"] != "PUBLISHED"])
    published_30d = len([s for s in submissions if s["status"] == "PUBLISHED" and s.get("releaseDate") and s["releaseDate"] >= thirty_days_ago])
    total_assets = len(assets)
    roi_30d = sum(a.get("roiEstimate", 0) for a in analytics)

    pipeline = {}
    for st in ["INTAKE", "EDITING", "DESIGN", "SCHEDULED", "PUBLISHED"]:
        pipeline[st] = [s for s in submissions if s["status"] == st]

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    upcoming = sorted(
        [s for s in submissions if s["status"] in ("SCHEDULED", "PUBLISHED") and s.get("releaseDate") and s["releaseDate"] >= today_str],
        key=lambda x: x["releaseDate"]
    )[:5]

    video_tasks = await db.video_tasks.find(query, {"_id": 0}).to_list(100)

    activities = []
    status_verbs = {
        "INTAKE": "submitted for intake",
        "EDITING": "moved to editing",
        "DESIGN": "entered design phase",
        "SCHEDULED": "scheduled for release",
        "PUBLISHED": "published",
    }
    for s in sorted(submissions, key=lambda x: x.get("updatedAt", ""), reverse=True)[:6]:
        activities.append({
            "type": "submission",
            "message": f"'{s['title']}' {status_verbs.get(s['status'], 'updated')}",
            "timestamp": s.get("updatedAt", s.get("createdAt", "")),
            "status": s["status"],
        })
    for vt in sorted(video_tasks, key=lambda x: x.get("createdAt", ""), reverse=True)[:3]:
        activities.append({
            "type": "video_task",
            "message": f"AI Video: '{vt['prompt'][:40]}' — {vt['status']}",
            "timestamp": vt.get("createdAt", ""),
            "status": vt["status"],
        })
    activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    recent = sorted(submissions, key=lambda x: x.get("createdAt", ""), reverse=True)[:10]

    return {
        "clientName": client_info["name"] if client_info else user.get("name", "User"),
        "userName": user.get("name", "User"),
        "kpis": {
            "activeProjects": active_projects,
            "publishedLast30d": published_30d,
            "totalAssets": total_assets,
            "roiLast30d": round(roi_30d, 2),
        },
        "pipeline": pipeline,
        "upcoming": upcoming,
        "activities": activities[:10],
        "recentSubmissions": recent,
    }

@api_router.get("/submissions")
async def get_submissions(user: dict = Depends(get_current_user), status: Optional[str] = None, content_type: Optional[str] = None):
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    if status:
        query["status"] = status
    if content_type:
        query["contentType"] = content_type
    return await db.submissions.find(query, {"_id": 0}).sort("createdAt", -1).to_list(1000)

@api_router.post("/submissions")
async def create_submission(data: SubmissionCreate, user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID required to create submissions")
    submission_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": submission_id,
        "clientId": client_id,
        "title": data.title,
        "guest": data.guest,
        "description": data.description,
        "contentType": data.contentType,
        "status": "INTAKE",
        "priority": data.priority,
        "releaseDate": data.releaseDate,
        "sourceFileUrl": data.sourceFileUrl,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.submissions.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.patch("/submissions/{submission_id}/status")
async def update_submission_status(submission_id: str, data: StatusUpdate, user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"id": submission_id}
    if client_id:
        query["clientId"] = client_id
    valid_statuses = ["INTAKE", "EDITING", "DESIGN", "SCHEDULED", "PUBLISHED"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    now = datetime.now(timezone.utc).isoformat()
    result = await db.submissions.update_one(query, {"$set": {"status": data.status, "updatedAt": now}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"message": f"Status updated to {data.status}", "status": data.status}

@api_router.patch("/submissions/{submission_id}")
async def update_submission(submission_id: str, data: SubmissionUpdate, user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"id": submission_id}
    if client_id:
        query["clientId"] = client_id
    
    update_fields = {}
    if data.status:
        valid_statuses = ["INTAKE", "EDITING", "DESIGN", "SCHEDULED", "PUBLISHED"]
        if data.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        update_fields["status"] = data.status
    if data.releaseDate is not None:
        update_fields["releaseDate"] = data.releaseDate if data.releaseDate else None
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_fields["updatedAt"] = datetime.now(timezone.utc).isoformat()
    result = await db.submissions.update_one(query, {"$set": update_fields})
    if result.modified_count == 0:
        existing = await db.submissions.find_one(query, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Submission not found")
    
    updated = await db.submissions.find_one(query, {"_id": 0})
    return updated


# ==================== CALENDAR ROUTES ====================

@api_router.get("/calendar")
async def get_calendar(user: dict = Depends(get_current_user), year: Optional[int] = None, month: Optional[int] = None):
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    
    # Default to current month if not specified
    now = datetime.now(timezone.utc)
    target_year = year or now.year
    target_month = month or now.month
    
    # Calculate the first and last day of the month
    first_day = f"{target_year}-{target_month:02d}-01"
    if target_month == 12:
        last_day = f"{target_year + 1}-01-01"
    else:
        last_day = f"{target_year}-{target_month + 1:02d}-01"
    
    query["releaseDate"] = {"$gte": first_day, "$lt": last_day}
    
    submissions = await db.submissions.find(query, {"_id": 0}).to_list(1000)
    return {
        "year": target_year,
        "month": target_month,
        "submissions": submissions
    }


# ==================== DELIVERABLES ROUTES ====================

@api_router.get("/deliverables")
async def get_deliverables(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    
    assets = await db.assets.find(query, {"_id": 0}).to_list(1000)
    
    # Get all submission IDs referenced by assets
    submission_ids = list(set(a.get("submissionId") for a in assets if a.get("submissionId")))
    
    # Fetch all relevant submissions in one query
    submissions_map = {}
    if submission_ids:
        submissions = await db.submissions.find(
            {"id": {"$in": submission_ids}}, 
            {"_id": 0, "id": 1, "title": 1, "contentType": 1, "releaseDate": 1}
        ).to_list(1000)
        submissions_map = {s["id"]: s for s in submissions}
    
    # Build the deliverables response
    deliverables = []
    for asset in assets:
        sub = submissions_map.get(asset.get("submissionId"), {})
        deliverables.append({
            "assetId": asset["id"],
            "deliverableName": asset["name"],
            "deliverableType": asset["type"],
            "deliverableStatus": asset["status"],
            "url": asset.get("url"),
            "submissionId": asset.get("submissionId"),
            "episodeTitle": sub.get("title", "Unlinked"),
            "contentType": sub.get("contentType", "—"),
            "releaseDate": sub.get("releaseDate"),
            "createdAt": asset.get("createdAt"),
        })
    
    return deliverables


# ==================== ASSETS ROUTES (ENHANCED) ====================

@api_router.get("/assets/library")
async def get_assets_library(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    
    assets = await db.assets.find(query, {"_id": 0}).to_list(1000)
    
    # Get all submission IDs referenced by assets
    submission_ids = list(set(a.get("submissionId") for a in assets if a.get("submissionId")))
    
    # Fetch all relevant submissions
    submissions_map = {}
    if submission_ids:
        submissions = await db.submissions.find(
            {"id": {"$in": submission_ids}}, 
            {"_id": 0, "id": 1, "title": 1}
        ).to_list(1000)
        submissions_map = {s["id"]: s for s in submissions}
    
    # Enrich assets with episode titles
    enriched_assets = []
    for asset in assets:
        sub = submissions_map.get(asset.get("submissionId"), {})
        enriched_assets.append({
            **asset,
            "episodeTitle": sub.get("title") if asset.get("submissionId") else None
        })
    
    return enriched_assets

@api_router.patch("/assets/{asset_id}/status")
async def update_asset_status(asset_id: str, data: AssetStatusUpdate, user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"id": asset_id}
    if client_id:
        query["clientId"] = client_id
    
    valid_statuses = ["Draft", "Final"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    now = datetime.now(timezone.utc).isoformat()
    result = await db.assets.update_one(query, {"$set": {"status": data.status, "updatedAt": now}})
    if result.modified_count == 0:
        existing = await db.assets.find_one(query, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Asset not found")
    
    return {"message": f"Asset status updated to {data.status}", "status": data.status}

@api_router.patch("/assets/{asset_id}/submission")
async def update_asset_submission(asset_id: str, data: AssetSubmissionUpdate, user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"id": asset_id}
    if client_id:
        query["clientId"] = client_id
    
    # Validate submission exists and belongs to same client
    if data.submissionId:
        sub_query = {"id": data.submissionId}
        if client_id:
            sub_query["clientId"] = client_id
        submission = await db.submissions.find_one(sub_query, {"_id": 0})
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found or access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    result = await db.assets.update_one(query, {"$set": {"submissionId": data.submissionId, "updatedAt": now}})
    if result.modified_count == 0:
        existing = await db.assets.find_one(query, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Asset not found")
    
    return {"message": "Asset submission updated", "submissionId": data.submissionId}

@api_router.get("/submissions/list")
async def get_submissions_list(user: dict = Depends(get_current_user)):
    """Returns a minimal list of submissions for dropdown/linking purposes"""
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    return await db.submissions.find(query, {"_id": 0, "id": 1, "title": 1, "contentType": 1}).to_list(1000)

@api_router.get("/assets")
async def get_assets(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    return await db.assets.find(query, {"_id": 0}).to_list(1000)


# ==================== ANALYTICS PAGE ROUTES ====================

@api_router.get("/analytics/dashboard")
async def get_analytics_dashboard(
    user: dict = Depends(get_current_user),
    range: Optional[str] = "30d",
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """
    Returns analytics data for the dashboard with date range filtering.
    range: 7d, 30d, 90d, 365d
    from_date, to_date: ISO date strings for custom range (override range param)
    """
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    
    # Determine date range
    today = datetime.now(timezone.utc).date()
    if from_date and to_date:
        start_date = from_date
        end_date = to_date
    else:
        range_days = {"7d": 7, "30d": 30, "90d": 90, "365d": 365}.get(range, 30)
        start_date = (today - timedelta(days=range_days)).isoformat()
        end_date = today.isoformat()
    
    query["date"] = {"$gte": start_date, "$lte": end_date}
    
    snapshots = await db.analytics_snapshots.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    
    # Calculate summary KPIs
    total_downloads = sum(s.get("downloads", 0) for s in snapshots)
    total_views = sum(s.get("views", 0) for s in snapshots)
    total_episodes = sum(s.get("episodesPublished", 0) for s in snapshots)
    total_roi = sum(s.get("roiEstimate", 0) for s in snapshots)
    total_subscribers = sum(s.get("subscribersGained", 0) for s in snapshots)
    avg_roi_per_episode = round(total_roi / total_episodes, 2) if total_episodes > 0 else 0
    
    return {
        "snapshots": snapshots,
        "summary": {
            "totalDownloads": total_downloads,
            "totalViews": total_views,
            "totalEpisodes": total_episodes,
            "totalROI": round(total_roi, 2),
            "totalSubscribers": total_subscribers,
            "avgRoiPerEpisode": avg_roi_per_episode,
        },
        "range": {
            "from": start_date,
            "to": end_date,
            "preset": range if not (from_date and to_date) else "custom"
        }
    }


# ==================== ROI CENTER ROUTES ====================

@api_router.get("/roi/dashboard")
async def get_roi_dashboard(
    user: dict = Depends(get_current_user),
    range: Optional[str] = "30d"
):
    """
    Returns ROI calculations based on AnalyticsSnapshot + ClientSettings.
    Uses hourlyRate and hoursPerEpisode from ClientSettings.
    """
    client_id = get_client_id_from_user(user)
    
    # Get client settings for hourly rate and hours per episode
    settings = await db.client_settings.find_one({"clientId": client_id}, {"_id": 0}) if client_id else None
    hourly_rate = settings.get("hourlyRate", 100) if settings else 100
    hours_per_episode = settings.get("hoursPerEpisode", 5) if settings else 5
    
    # Get analytics data for the range
    today = datetime.now(timezone.utc).date()
    range_days = {"7d": 7, "30d": 30, "90d": 90, "365d": 365}.get(range, 30)
    start_date = (today - timedelta(days=range_days)).isoformat()
    end_date = today.isoformat()
    
    query = {"clientId": client_id} if client_id else {}
    query["date"] = {"$gte": start_date, "$lte": end_date}
    
    snapshots = await db.analytics_snapshots.find(query, {"_id": 0}).to_list(1000)
    
    # Calculate totals
    total_episodes = sum(s.get("episodesPublished", 0) for s in snapshots)
    total_roi = sum(s.get("roiEstimate", 0) for s in snapshots)
    total_downloads = sum(s.get("downloads", 0) for s in snapshots)
    total_views = sum(s.get("views", 0) for s in snapshots)
    
    # ROI calculations
    cost_per_episode = hours_per_episode * hourly_rate
    total_cost = cost_per_episode * total_episodes
    roi_multiple = round(total_roi / total_cost, 2) if total_cost > 0 else 0
    net_profit = total_roi - total_cost
    
    return {
        "totalCost": round(total_cost, 2),
        "totalROI": round(total_roi, 2),
        "roiMultiple": roi_multiple,
        "netProfit": round(net_profit, 2),
        "episodesPublished": total_episodes,
        "hoursPerEpisode": hours_per_episode,
        "hourlyRate": hourly_rate,
        "costPerEpisode": cost_per_episode,
        "totalDownloads": total_downloads,
        "totalViews": total_views,
        "range": {
            "from": start_date,
            "to": end_date,
            "preset": range,
            "days": range_days
        }
    }


# ==================== BILLING PAGE ROUTES ====================

@api_router.get("/billing/dashboard")
async def get_billing_dashboard(user: dict = Depends(get_current_user)):
    """
    Returns billing information for the current client.
    Includes plan details, status, and Stripe placeholder info.
    """
    client_id = get_client_id_from_user(user)
    
    # Get billing record
    billing = await db.billing_records.find_one({"clientId": client_id}, {"_id": 0}) if client_id else None
    
    # Get client info for additional context
    client_info = await db.clients.find_one({"id": client_id}, {"_id": 0}) if client_id else None
    
    # Define plan features (hardcoded for now)
    plan_features = {
        "Starter": {
            "price": 99,
            "features": [
                "Up to 4 episodes per month",
                "Basic editing",
                "Standard thumbnails",
                "Email support"
            ]
        },
        "Pro": {
            "price": 299,
            "features": [
                "Up to 12 episodes per month",
                "Advanced editing & mixing",
                "Custom thumbnails & graphics",
                "Priority support",
                "Analytics dashboard",
                "ROI tracking"
            ]
        },
        "Enterprise": {
            "price": 799,
            "features": [
                "Unlimited episodes",
                "Full production suite",
                "Dedicated account manager",
                "Custom integrations",
                "White-label options",
                "24/7 support"
            ]
        }
    }
    
    current_plan = billing.get("currentPlan", "Pro") if billing else "Pro"
    
    return {
        "billing": billing,
        "client": client_info,
        "currentPlan": current_plan,
        "planDetails": plan_features.get(current_plan, plan_features["Pro"]),
        "allPlans": plan_features,
        "stripeConnected": bool(billing and billing.get("stripeCustomerId"))
    }


@api_router.get("/clients")
async def get_clients(user: dict = Depends(require_admin)):
    return await db.clients.find({}, {"_id": 0}).to_list(1000)

@api_router.get("/billing")
async def get_billing(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    return await db.billing_records.find(query, {"_id": 0}).to_list(100)


# ==================== SETTINGS PAGE ROUTES ====================

@api_router.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    """
    Returns settings for the current client including ClientSettings and Client info.
    """
    client_id = get_client_id_from_user(user)
    if not client_id:
        return {}
    
    # Get client settings
    settings = await db.client_settings.find_one({"clientId": client_id}, {"_id": 0})
    
    # Get client info for contact details
    client_info = await db.clients.find_one({"id": client_id}, {"_id": 0})
    
    return {
        "hourlyRate": settings.get("hourlyRate", 100) if settings else 100,
        "hoursPerEpisode": settings.get("hoursPerEpisode", 5) if settings else 5,
        "brandVoiceDescription": settings.get("brandVoiceDescription", "") if settings else "",
        "primaryContactName": client_info.get("primaryContactName", "") if client_info else "",
        "primaryContactEmail": client_info.get("primaryContactEmail", "") if client_info else "",
        "clientName": client_info.get("name", "") if client_info else "",
    }

@api_router.put("/settings")
async def update_settings(data: SettingsUpdate, user: dict = Depends(get_current_user)):
    """
    Updates settings for the current client.
    """
    client_id = get_client_id_from_user(user)
    if not client_id:
        raise HTTPException(status_code=400, detail="No client associated with user")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Validate hourly rate
    if data.hourlyRate is not None and data.hourlyRate < 0:
        raise HTTPException(status_code=400, detail="Hourly rate must be non-negative")
    
    # Validate hours per episode
    if data.hoursPerEpisode is not None and data.hoursPerEpisode <= 0:
        raise HTTPException(status_code=400, detail="Hours per episode must be positive")
    
    # Update ClientSettings
    settings_update = {"updatedAt": now}
    if data.hourlyRate is not None:
        settings_update["hourlyRate"] = data.hourlyRate
    if data.hoursPerEpisode is not None:
        settings_update["hoursPerEpisode"] = data.hoursPerEpisode
    if data.brandVoiceDescription is not None:
        settings_update["brandVoiceDescription"] = data.brandVoiceDescription
    
    # Upsert client settings
    await db.client_settings.update_one(
        {"clientId": client_id},
        {"$set": settings_update, "$setOnInsert": {"id": str(uuid.uuid4()), "clientId": client_id, "createdAt": now}},
        upsert=True
    )
    
    # Update Client contact details if provided
    client_update = {"updatedAt": now}
    if data.primaryContactName is not None:
        client_update["primaryContactName"] = data.primaryContactName
    if data.primaryContactEmail is not None:
        client_update["primaryContactEmail"] = data.primaryContactEmail
    
    if len(client_update) > 1:  # More than just updatedAt
        await db.clients.update_one({"id": client_id}, {"$set": client_update})
    
    return {"message": "Settings saved successfully"}


# ==================== HELP & SUPPORT ROUTES ====================

@api_router.get("/help/articles")
async def get_help_articles_list():
    """Returns all help articles (no client scoping - public content)."""
    return await db.help_articles.find({}, {"_id": 0}).sort("createdAt", -1).to_list(100)

@api_router.get("/help/support")
async def get_support_requests_list(user: dict = Depends(get_current_user)):
    """Returns support requests for the current client (most recent first)."""
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    return await db.support_requests.find(query, {"_id": 0}).sort("createdAt", -1).to_list(100)

@api_router.post("/help/support")
async def create_support_request(data: SupportRequestCreate, user: dict = Depends(get_current_user)):
    """Creates a new support request for the current client."""
    # Validate required fields
    if not data.subject or not data.subject.strip():
        raise HTTPException(status_code=400, detail="Subject is required")
    if not data.message or not data.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")
    
    client_id = get_client_id_from_user(user)
    now = datetime.now(timezone.utc).isoformat()
    
    request = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "userEmail": user.get("email", ""),
        "subject": data.subject.strip(),
        "message": data.message.strip(),
        "status": "Open",
        "createdAt": now,
        "updatedAt": now
    }
    
    await db.support_requests.insert_one(request)
    if "_id" in request:
        del request["_id"]
    
    return {"message": "Support request submitted successfully", "request": request}


# ==================== BLOG ROUTES ====================

@api_router.get("/blog/posts")
async def get_blog_posts(tag: Optional[str] = None, search: Optional[str] = None):
    """
    Returns blog posts with optional filtering by tag or search query.
    """
    query = {}
    
    if tag:
        query["tags"] = tag
    
    posts = await db.blog_posts.find(query, {"_id": 0}).sort("publishedAt", -1).to_list(100)
    
    # Filter by search if provided
    if search:
        search_lower = search.lower()
        posts = [p for p in posts if search_lower in p.get("title", "").lower() or search_lower in p.get("excerpt", "").lower()]
    
    return posts

@api_router.get("/blog/posts/{slug}")
async def get_blog_post_by_slug(slug: str):
    """Returns a single blog post by slug."""
    post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@api_router.get("/blog/tags")
async def get_blog_tags():
    """Returns all unique blog post tags."""
    posts = await db.blog_posts.find({}, {"_id": 0, "tags": 1}).to_list(1000)
    all_tags = set()
    for post in posts:
        for tag in post.get("tags", []):
            all_tags.add(tag)
    return sorted(list(all_tags))


@api_router.get("/client-settings")
async def get_client_settings(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    if not client_id:
        return {}
    settings = await db.client_settings.find_one({"clientId": client_id}, {"_id": 0})
    return settings or {}

@api_router.get("/video-tasks")
async def get_video_tasks_list(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    return await db.video_tasks.find(query, {"_id": 0}).sort("createdAt", -1).to_list(100)

@api_router.get("/help-articles")
async def get_help_articles():
    return await db.help_articles.find({}, {"_id": 0}).to_list(100)

@api_router.get("/support-requests")
async def get_support_requests(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    return await db.support_requests.find(query, {"_id": 0}).to_list(100)


# ==================== AI ROUTER - MULTI-LLM SUPPORT ====================

# Provider configuration from environment
LLM_PROVIDERS = {
    "gemini": {
        "model": "gemini-2.5-flash",
        "enabled": True  # Always enabled with Emergent key
    },
    "openai": {
        "model": "gpt-4o",
        "enabled": True
    },
    "anthropic": {
        "model": "claude-sonnet-4-5-20250929",
        "enabled": True
    }
}

VIDEO_PROVIDERS = {
    "runway": {"enabled": False, "mock": True},  # Mocked for now
    "veo": {"enabled": False, "mock": True},
    "kling": {"enabled": True, "mock": True}  # Always mocked
}

async def call_llm(provider: str, task: str, input_data: dict) -> dict:
    """Universal LLM caller using emergentintegrations library."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail=f"LLM API key not configured")
    
    provider_config = LLM_PROVIDERS.get(provider)
    if not provider_config:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
    
    # Build the prompt based on task
    topic = input_data.get("topic", "")
    audience = input_data.get("audience", "")
    tone = input_data.get("tone", "")
    goal = input_data.get("goal", "")
    existing_content = input_data.get("existingContent", "")
    
    system_message = f"""You are an expert podcast content strategist and writer. 
Your target audience is: {audience or 'general podcast listeners'}
Tone/Brand voice: {tone or 'Professional and engaging'}
Content goal: {goal or 'Educate and inform'}"""

    prompts = {
        "research": f"""Research the following topic for a podcast episode. Provide comprehensive background information, key facts, statistics, expert opinions, and interesting angles to explore.

Topic: {topic}

Provide a detailed research summary that will help create compelling podcast content. Include:
- Key facts and statistics
- Expert perspectives and quotes to potentially include
- Interesting angles and subtopics
- Potential controversy or debate points
- Related trends or news""",

        "outline": f"""Create a detailed podcast episode outline for the following topic.

Topic: {topic}
{f'Research context: {existing_content[:2000]}' if existing_content else ''}

Provide a structured outline with:
- Introduction hook
- 4-6 main sections with key talking points
- Transition ideas between sections
- Conclusion and call-to-action

Format as a numbered list of sections with bullet points for each.""",

        "script": f"""Write a complete podcast script for the following topic.

Topic: {topic}
{f'Outline to follow: {existing_content[:3000]}' if existing_content else ''}

Write a conversational, engaging script that:
- Opens with a compelling hook
- Flows naturally between topics
- Includes specific examples and stories
- Has clear transitions
- Ends with a strong call-to-action

Write in a natural, conversational tone suitable for audio.""",

        "title": f"""Generate 5 compelling title ideas for a podcast episode about:

Topic: {topic}
{f'Script/Content: {existing_content[:1000]}' if existing_content else ''}

Create titles that are:
- Attention-grabbing and click-worthy
- SEO-friendly
- Clear about the value/topic
- Under 60 characters each

Return just the 5 titles, one per line.""",

        "description": f"""Write a compelling YouTube/podcast description for this episode:

Topic: {topic}
{f'Script/Content: {existing_content[:2000]}' if existing_content else ''}

Create a description that:
- Hooks viewers in the first line
- Summarizes key takeaways
- Includes timestamps placeholder
- Has a call-to-action
- Is SEO-optimized
- Is 150-300 words""",

        "tags": f"""Generate relevant tags/keywords for a podcast episode about:

Topic: {topic}
{f'Content: {existing_content[:1000]}' if existing_content else ''}

Provide 10-15 relevant tags for YouTube/podcast platforms. Include:
- Primary topic keywords
- Related subtopics
- Audience-relevant terms
- Trending related terms

Return as comma-separated list.""",

        "chapters": f"""Create YouTube chapter timestamps for this podcast content:

Topic: {topic}
{f'Script/Content: {existing_content[:3000]}' if existing_content else ''}

Create 6-10 chapters with timestamps. Format:
00:00 - Introduction
02:30 - [Section Title]
...

Make chapter titles descriptive and engaging.""",

        "youtube_package": f"""Create a complete YouTube package for this podcast episode:

Topic: {topic}
{f'Script/Content: {existing_content[:2000]}' if existing_content else ''}

Provide:
1. TITLE IDEAS (5 options)
2. DESCRIPTION (SEO-optimized, 150-300 words)
3. TAGS (10-15 comma-separated)
4. CHAPTERS (6-10 with timestamps)

Format each section clearly with headers."""
    }
    
    prompt = prompts.get(task)
    if not prompt:
        raise HTTPException(status_code=400, detail=f"Unknown task: {task}")
    
    try:
        session_id = f"strategy-{uuid.uuid4()}"
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model(provider, provider_config["model"])
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse response based on task
        return parse_llm_response(task, response)
        
    except Exception as e:
        logger.error(f"LLM call error: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

def parse_llm_response(task: str, response: str) -> dict:
    """Parse LLM response into structured format based on task."""
    if task == "research":
        return {"researchSummary": response}
    elif task == "outline":
        # Split into sections
        lines = [l.strip() for l in response.split('\n') if l.strip()]
        return {"outlineSections": lines}
    elif task == "script":
        return {"scriptText": response}
    elif task == "title":
        titles = [l.strip() for l in response.split('\n') if l.strip() and not l.startswith('#')]
        return {"titleIdeas": titles[:5]}
    elif task == "description":
        return {"descriptionText": response}
    elif task == "tags":
        # Parse comma-separated tags
        tags = [t.strip() for t in response.replace('\n', ',').split(',') if t.strip()]
        return {"tags": tags[:15]}
    elif task == "chapters":
        # Parse chapter lines
        chapters = []
        for line in response.split('\n'):
            line = line.strip()
            if line and (' - ' in line or ':' in line):
                parts = line.split(' - ', 1) if ' - ' in line else line.split(': ', 1)
                if len(parts) == 2:
                    chapters.append({"timestamp": parts[0].strip(), "title": parts[1].strip()})
        return {"chapters": chapters[:12]}
    elif task == "youtube_package":
        # Parse combined response
        result = {"titleIdeas": [], "descriptionText": "", "tags": [], "chapters": []}
        current_section = None
        current_content = []
        
        for line in response.split('\n'):
            line_lower = line.lower().strip()
            if 'title' in line_lower and ('ideas' in line_lower or '#' in line):
                if current_section:
                    _process_section(result, current_section, current_content)
                current_section = 'titles'
                current_content = []
            elif 'description' in line_lower and ('#' in line or line_lower.startswith('description')):
                if current_section:
                    _process_section(result, current_section, current_content)
                current_section = 'description'
                current_content = []
            elif 'tag' in line_lower and ('#' in line or line_lower.startswith('tag')):
                if current_section:
                    _process_section(result, current_section, current_content)
                current_section = 'tags'
                current_content = []
            elif 'chapter' in line_lower and ('#' in line or line_lower.startswith('chapter')):
                if current_section:
                    _process_section(result, current_section, current_content)
                current_section = 'chapters'
                current_content = []
            elif line.strip():
                current_content.append(line)
        
        if current_section:
            _process_section(result, current_section, current_content)
        
        return result
    return {"raw": response}

def _process_section(result: dict, section: str, content: list):
    """Helper to process YouTube package sections."""
    text = '\n'.join(content)
    if section == 'titles':
        titles = [l.strip().lstrip('0123456789.-) ') for l in content if l.strip() and not l.startswith('#')]
        result["titleIdeas"] = titles[:5]
    elif section == 'description':
        result["descriptionText"] = text
    elif section == 'tags':
        tags = [t.strip() for t in text.replace('\n', ',').split(',') if t.strip()]
        result["tags"] = tags[:15]
    elif section == 'chapters':
        chapters = []
        for line in content:
            line = line.strip()
            if ' - ' in line or ': ' in line:
                parts = line.split(' - ', 1) if ' - ' in line else line.split(': ', 1)
                if len(parts) == 2:
                    chapters.append({"timestamp": parts[0].strip(), "title": parts[1].strip()})
        result["chapters"] = chapters[:12]


@api_router.get("/ai/capabilities")
async def get_ai_capabilities():
    """Returns enabled AI providers based on configuration."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    
    llm_providers = []
    if api_key:
        llm_providers = ["gemini", "openai", "anthropic"]
    
    video_providers = []
    for name, config in VIDEO_PROVIDERS.items():
        if config.get("enabled") or config.get("mock"):
            video_providers.append(name)
    
    return {
        "llmProviders": llm_providers,
        "videoProviders": video_providers
    }


@api_router.post("/ai/generate")
async def ai_generate(data: AIGenerateRequest, user: dict = Depends(get_current_user)):
    """Universal AI generation endpoint supporting multiple LLM providers."""
    valid_providers = ["gemini", "openai", "anthropic"]
    valid_tasks = ["research", "outline", "script", "title", "description", "tags", "chapters", "youtube_package"]
    
    if data.provider not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Must be one of: {valid_providers}")
    
    if data.task not in valid_tasks:
        raise HTTPException(status_code=400, detail=f"Invalid task. Must be one of: {valid_tasks}")
    
    result = await call_llm(data.provider, data.task, data.input)
    return result


# ==================== VIDEO TASK ROUTER - MULTI-PROVIDER SUPPORT ====================

async def create_video_job(provider: str, task_data: dict) -> str:
    """Create a video generation job with the specified provider."""
    if provider == "kling":
        # Mock implementation - returns fake job ID
        return f"kling-mock-{uuid.uuid4()}"
    elif provider == "runway":
        # Mock for now - would integrate with Runway API
        return f"runway-mock-{uuid.uuid4()}"
    elif provider == "veo":
        # Mock for now - would integrate with Veo API
        return f"veo-mock-{uuid.uuid4()}"
    else:
        raise HTTPException(status_code=400, detail=f"Unknown video provider: {provider}")

async def check_video_job(provider: str, job_id: str) -> dict:
    """Check status of a video generation job."""
    # All providers are currently mocked
    # Simulate completion after ~10 seconds based on job creation
    import hashlib
    # Use job_id hash to determine if "ready"
    hash_val = int(hashlib.md5(job_id.encode()).hexdigest()[:8], 16)
    
    if provider == "kling":
        # Kling mock always returns ready with placeholder
        return {
            "status": "READY",
            "videoUrl": "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        }
    elif provider in ["runway", "veo"]:
        # Simulate processing
        if hash_val % 3 == 0:
            return {
                "status": "READY", 
                "videoUrl": "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
            }
        else:
            return {"status": "PROCESSING", "videoUrl": None}
    
    return {"status": "FAILED", "videoUrl": None}


@api_router.post("/video-tasks")
async def create_video_task(data: VideoTaskCreate, user: dict = Depends(get_current_user)):
    """Create a new video generation task."""
    client_id = get_client_id_from_user(user)
    
    valid_providers = ["runway", "veo", "kling"]
    valid_modes = ["script", "audio", "remix"]
    valid_aspects = ["16:9", "9:16", "1:1"]
    valid_profiles = ["youtube_long", "shorts", "reel"]
    
    if data.provider not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Must be one of: {valid_providers}")
    if data.mode not in valid_modes:
        raise HTTPException(status_code=400, detail=f"Invalid mode. Must be one of: {valid_modes}")
    if data.aspectRatio not in valid_aspects:
        raise HTTPException(status_code=400, detail=f"Invalid aspect ratio. Must be one of: {valid_aspects}")
    if data.outputProfile not in valid_profiles:
        raise HTTPException(status_code=400, detail=f"Invalid output profile. Must be one of: {valid_profiles}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create job with provider
    provider_job_id = await create_video_job(data.provider, {
        "prompt": data.prompt,
        "mode": data.mode,
        "scriptText": data.scriptText,
        "aspectRatio": data.aspectRatio
    })
    
    task = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "provider": data.provider,
        "providerJobId": provider_job_id,
        "prompt": data.prompt,
        "mode": data.mode,
        "scriptText": data.scriptText,
        "audioAssetId": data.audioAssetId,
        "sourceAssetId": data.sourceAssetId,
        "aspectRatio": data.aspectRatio,
        "outputProfile": data.outputProfile,
        "submissionId": data.submissionId,
        "status": "PROCESSING",
        "videoUrl": None,
        "createdAt": now,
        "updatedAt": now
    }
    
    await db.video_tasks.insert_one(task)
    if "_id" in task:
        del task["_id"]
    
    return task


@api_router.get("/video-tasks/{task_id}")
async def get_video_task(task_id: str, user: dict = Depends(get_current_user)):
    """Get a video task and refresh its status from the provider."""
    client_id = get_client_id_from_user(user)
    query = {"id": task_id}
    if client_id:
        query["clientId"] = client_id
    
    task = await db.video_tasks.find_one(query, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Video task not found")
    
    # Check status with provider if still processing
    if task.get("status") == "PROCESSING":
        provider_status = await check_video_job(task.get("provider"), task.get("providerJobId"))
        
        if provider_status["status"] != task["status"]:
            now = datetime.now(timezone.utc).isoformat()
            update = {
                "status": provider_status["status"],
                "videoUrl": provider_status.get("videoUrl"),
                "updatedAt": now
            }
            await db.video_tasks.update_one({"id": task_id}, {"$set": update})
            task.update(update)
    
    return task


@api_router.post("/video-tasks/{task_id}/save-asset")
async def save_video_as_asset(task_id: str, user: dict = Depends(get_current_user)):
    """Save a completed video task as an asset."""
    client_id = get_client_id_from_user(user)
    query = {"id": task_id}
    if client_id:
        query["clientId"] = client_id
    
    task = await db.video_tasks.find_one(query, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Video task not found")
    
    if task.get("status") != "READY" or not task.get("videoUrl"):
        raise HTTPException(status_code=400, detail="Video is not ready yet")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create asset from video
    asset = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "submissionId": task.get("submissionId"),
        "name": f"AI Video - {task.get('prompt', 'Untitled')[:50]}",
        "type": "Video",
        "url": task.get("videoUrl"),
        "status": "Draft",
        "sourceVideoTaskId": task_id,
        "createdAt": now,
        "updatedAt": now
    }
    
    await db.assets.insert_one(asset)
    if "_id" in asset:
        del asset["_id"]
    
    return {"message": "Video saved as asset", "asset": asset}


# ==================== SEED DATA ====================

async def run_seed():
    existing = await db.users.find_one({"email": "admin@forgevoice.com"}, {"_id": 0})
    if existing:
        return False

    now = datetime.now(timezone.utc).isoformat()

    admin_user = {
        "id": str(uuid.uuid4()),
        "email": "admin@forgevoice.com",
        "passwordHash": hash_password("admin123"),
        "name": "ForgeVoice Admin",
        "role": "admin",
        "clientId": None,
        "createdAt": now,
        "updatedAt": now
    }
    client_user = {
        "id": str(uuid.uuid4()),
        "email": "alex@company.com",
        "passwordHash": hash_password("client123"),
        "name": "Alex Chen",
        "role": "client",
        "clientId": "demo-client-1",
        "createdAt": now,
        "updatedAt": now
    }
    await db.users.insert_many([admin_user, client_user])

    demo_client = {
        "id": "demo-client-1",
        "name": "Alex Chen Media",
        "primaryContactName": "Alex Chen",
        "primaryContactEmail": "alex@company.com",
        "plan": "Pro",
        "createdAt": now,
        "updatedAt": now
    }
    await db.clients.insert_one(demo_client)

    submissions = [
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "The Future of AI in Content Creation", "guest": "Dr. Sarah Mitchell", "description": "Deep dive into how AI tools are transforming podcast production", "contentType": "Podcast", "status": "PUBLISHED", "priority": "High", "releaseDate": "2025-12-15", "sourceFileUrl": None, "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "Building a Personal Brand Online", "guest": "Marcus Johnson", "description": "Strategies for growing your personal brand through podcasting", "contentType": "Podcast", "status": "EDITING", "priority": "Medium", "releaseDate": "2026-01-05", "sourceFileUrl": None, "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "Quick Tips: Microphone Setup", "guest": "", "description": "Short form content on getting the best audio quality", "contentType": "Short", "status": "DESIGN", "priority": "Low", "releaseDate": "2026-01-10", "sourceFileUrl": None, "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "Monetizing Your Content: A Webinar", "guest": "Lisa Park", "description": "Expert panel on content monetization strategies", "contentType": "Webinar", "status": "SCHEDULED", "priority": "High", "releaseDate": "2026-01-20", "sourceFileUrl": None, "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "SEO for Podcasters Blog Post", "guest": "", "description": "Written guide on optimizing podcast discoverability", "contentType": "Blog", "status": "INTAKE", "priority": "Medium", "releaseDate": None, "sourceFileUrl": None, "createdAt": now, "updatedAt": now},
    ]
    await db.submissions.insert_many(submissions)

    sub_ids = [s["id"] for s in submissions]
    assets = [
        # Episode 1: "The Future of AI in Content Creation" (PUBLISHED) - 4 assets
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[0], "name": "Episode 42 - Final Mix", "type": "Audio", "url": "https://drive.google.com/example1", "status": "Final", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[0], "name": "Episode 42 - Thumbnail", "type": "Thumbnail", "url": "https://drive.google.com/example2", "status": "Final", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[0], "name": "Episode 42 - Transcript", "type": "Transcript", "url": "https://drive.google.com/example4", "status": "Final", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[0], "name": "Episode 42 - Full Video", "type": "Video", "url": "https://drive.google.com/example6", "status": "Final", "createdAt": now, "updatedAt": now},
        
        # Episode 2: "Building a Personal Brand Online" (EDITING) - 3 assets
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[1], "name": "Raw Recording - Marcus", "type": "Audio", "url": "https://drive.google.com/example3", "status": "Draft", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[1], "name": "Personal Brand - Draft Thumbnail", "type": "Thumbnail", "url": "https://drive.google.com/example7", "status": "Draft", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[1], "name": "Interview Notes - Marcus", "type": "Transcript", "url": "https://drive.google.com/example8", "status": "Draft", "createdAt": now, "updatedAt": now},
        
        # Episode 3: "Quick Tips: Microphone Setup" (DESIGN) - 2 assets
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[2], "name": "Mic Setup - Short Video", "type": "Video", "url": "https://drive.google.com/example9", "status": "Draft", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[2], "name": "Mic Tips - Thumbnail v1", "type": "Thumbnail", "url": "https://drive.google.com/example10", "status": "Draft", "createdAt": now, "updatedAt": now},
        
        # Episode 4: "Monetizing Your Content: A Webinar" (SCHEDULED) - 2 assets
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[3], "name": "Webinar - Registration Banner", "type": "Thumbnail", "url": "https://drive.google.com/example11", "status": "Final", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[3], "name": "Webinar - Promo Audio", "type": "Audio", "url": "https://drive.google.com/example12", "status": "Final", "createdAt": now, "updatedAt": now},
        
        # Unlinked assets (brand kit, general media)
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": None, "name": "Brand Kit - Logo Pack", "type": "Video", "url": "https://drive.google.com/example5", "status": "Final", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": None, "name": "Podcast Intro Animation", "type": "Video", "url": "https://drive.google.com/example13", "status": "Final", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": None, "name": "Channel Banner 2024", "type": "Thumbnail", "url": "https://drive.google.com/example14", "status": "Final", "createdAt": now, "updatedAt": now},
    ]
    await db.assets.insert_many(assets)

    analytics = []
    for i in range(90):
        d = datetime.now(timezone.utc) - timedelta(days=89 - i)
        # Vary data based on day of week and trends
        base_downloads = 100 + (i * 2)  # Gradual growth
        base_views = 500 + (i * 5)
        weekend_boost = 1.3 if d.weekday() >= 5 else 1.0
        
        analytics.append({
            "id": str(uuid.uuid4()),
            "clientId": "demo-client-1",
            "date": d.strftime("%Y-%m-%d"),
            "downloads": int(random.randint(int(base_downloads * 0.7), int(base_downloads * 1.3)) * weekend_boost),
            "views": int(random.randint(int(base_views * 0.7), int(base_views * 1.3)) * weekend_boost),
            "subscribersGained": random.randint(5, 50),
            "episodesPublished": 1 if random.random() < 0.15 else 0,  # ~15% chance per day
            "roiEstimate": round(random.uniform(800, 2500) * (1 + i/100), 2)  # Growing ROI
        })
    await db.analytics_snapshots.insert_many(analytics)

    await db.client_settings.insert_one({
        "id": str(uuid.uuid4()),
        "clientId": "demo-client-1",
        "hourlyRate": 150,
        "hoursPerEpisode": 5,
        "competitorName": "PodcastPro Media",
        "brandVoiceDescription": "Professional yet approachable. Tech-forward with human warmth. We speak to entrepreneurs and creators who value authenticity and actionable insights.",
        "airtableApiKey": None,
        "createdAt": now,
        "updatedAt": now
    })

    await db.billing_records.insert_one({
        "id": str(uuid.uuid4()),
        "clientId": "demo-client-1",
        "stripeCustomerId": None,
        "currentPlan": "Pro",
        "status": "Active",
        "nextBillingDate": "2026-02-01",
        "createdAt": now,
        "updatedAt": now
    })

    await db.video_tasks.insert_many([
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "prompt": "Create a 30-second intro animation for podcast", "model": "veo-3", "status": "READY", "videoUrl": "https://example.com/video1.mp4", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "prompt": "Generate audiogram visualization", "model": "veo-3", "status": "PROCESSING", "videoUrl": None, "createdAt": now, "updatedAt": now},
    ])

    await db.help_articles.insert_many([
        {"id": str(uuid.uuid4()), "title": "Getting Started with ForgeVoice", "content": "Welcome to ForgeVoice Studio! This guide walks you through setting up your first project.\n\n**Step 1: Create Your First Submission**\nNavigate to the Submissions page and click 'Submit New Content'. Fill in the episode details including title, guest information, and release date.\n\n**Step 2: Track Your Pipeline**\nUse the Overview dashboard to monitor your content through each production stage: Intake → Editing → Design → Scheduled → Published.\n\n**Step 3: Manage Assets**\nAll your deliverables (audio files, thumbnails, transcripts) appear in the Assets page once they're ready.", "category": "Getting Started", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "title": "Submitting Content for Production", "content": "Learn how to submit your podcast episodes, shorts, and other content for production.\n\n**Content Types Supported:**\n- Podcast episodes (full-length audio/video)\n- Shorts (clips under 60 seconds)\n- Blog posts (written content)\n- Webinars (live recordings)\n\n**Required Information:**\n- Episode title and description\n- Guest name and bio (if applicable)\n- Source file URL (Google Drive, Dropbox, etc.)\n- Target release date\n\nOnce submitted, your content enters the production pipeline and you'll receive updates at each stage.", "category": "Submissions", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "title": "How Billing Works", "content": "Understanding your ForgeVoice subscription and billing.\n\n**Plans Available:**\n- **Starter ($99/mo)**: Up to 4 episodes, basic editing\n- **Pro ($299/mo)**: Up to 12 episodes, advanced features, analytics\n- **Enterprise ($799/mo)**: Unlimited episodes, dedicated support\n\n**Billing Cycle:**\nYou're billed monthly on the same date you signed up. You can upgrade or downgrade at any time.\n\n**Payment Methods:**\nWe accept all major credit cards through Stripe. Contact support to set up invoicing for Enterprise plans.", "category": "Billing", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "title": "Understanding Your ROI Dashboard", "content": "The ROI Center helps you understand the value your content generates.\n\n**How ROI is Calculated:**\n- Content Cost = Hours per Episode × Hourly Rate × Episodes\n- Estimated ROI is based on downloads, views, and subscriber growth\n- ROI Multiple = Total ROI ÷ Total Cost\n\n**Customizing Your Calculations:**\nGo to Settings to update your hourly rate and hours per episode to get accurate cost estimates.\n\n**What's a Good ROI?**\n- 1-2x: Breaking even\n- 2-5x: Good return\n- 5x+: Excellent performance", "category": "Analytics", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "title": "Setting Up Your Content Pipeline", "content": "Optimize your production workflow with these best practices.\n\n**Production Stages:**\n1. **Intake**: Content received and queued\n2. **Editing**: Audio/video editing in progress\n3. **Design**: Graphics, thumbnails, and branding\n4. **Scheduled**: Ready for release\n5. **Published**: Live and distributed\n\n**Tips for Success:**\n- Submit content at least 2 weeks before release\n- Provide clear guest bios and episode descriptions\n- Use the Calendar view to plan your release schedule", "category": "Getting Started", "createdAt": now, "updatedAt": now},
    ])

    await db.support_requests.insert_many([
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "userEmail": "alex@company.com", "subject": "Need help with audio format", "message": "What audio formats do you accept for podcast submissions?", "status": "Resolved", "createdAt": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(), "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "userEmail": "alex@company.com", "subject": "Question about ROI calculations", "message": "How exactly is the ROI estimate calculated? I want to understand the methodology.", "status": "Open", "createdAt": now, "updatedAt": now},
    ])

    # Seed blog posts
    await db.blog_posts.insert_many([
        {
            "id": str(uuid.uuid4()),
            "title": "How to Repurpose a Single Podcast Episode into 10+ Assets",
            "slug": "repurpose-podcast-into-10-assets",
            "excerpt": "Learn how to maximize your content ROI by transforming one podcast episode into social clips, blog posts, email content, and more.",
            "content": "Creating a podcast episode takes significant time and effort. But that single recording can become the foundation for an entire content ecosystem.\n\n## The Content Multiplication Framework\n\n**1. Full Episode (Primary Asset)**\nYour complete podcast episode on YouTube and audio platforms.\n\n**2. Short-Form Video Clips (3-5 per episode)**\nExtract the most engaging 30-60 second moments for TikTok, Reels, and Shorts.\n\n**3. Audiograms**\nVisual audio snippets perfect for LinkedIn and Twitter.\n\n**4. Blog Post**\nTranscribe and edit your episode into a comprehensive blog article.\n\n**5. Email Newsletter**\nSummarize key takeaways for your subscriber list.\n\n**6. Quote Graphics**\nPull memorable quotes and turn them into shareable images.\n\n**7. Thread/Carousel**\nBreak down the main points into a Twitter thread or Instagram carousel.\n\n**8. Transcript Download**\nOffer the full transcript as a lead magnet.\n\n**9. Show Notes**\nDetailed episode summary with timestamps and links.\n\n**10. Guest Promotion Pack**\nCreate assets your guest can share with their audience.\n\n## The ROI Impact\n\nBy repurposing systematically, you can achieve 10-20x more reach from the same production investment. At ForgeVoice, we've seen clients grow their audience 3x faster using this approach.",
            "tags": ["strategy", "content", "podcast"],
            "publishedAt": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
            "createdAt": now,
            "updatedAt": now
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Using AI to Speed Up Post-Production by 50%",
            "slug": "ai-speed-up-post-production",
            "excerpt": "Discover how AI tools are revolutionizing podcast editing, transcription, and content creation workflows.",
            "content": "Artificial intelligence is transforming how we produce content. Here's how to leverage AI tools to cut your post-production time in half.\n\n## AI-Powered Transcription\n\nModern AI transcription services achieve 95%+ accuracy, eliminating hours of manual work. Tools like Whisper and specialized podcast transcription services can process an hour of audio in minutes.\n\n## Automated Editing\n\n**Noise Reduction**: AI can identify and remove background noise, room echo, and audio artifacts automatically.\n\n**Filler Word Removal**: Smart editors can detect and remove 'ums', 'ahs', and awkward pauses.\n\n**Leveling**: AI balances audio levels between speakers automatically.\n\n## Content Generation\n\n**Show Notes**: AI can generate comprehensive show notes from your transcript.\n\n**Social Clips**: Algorithms identify the most engaging moments for short-form content.\n\n**Summaries**: Get episode summaries and key takeaways generated automatically.\n\n## The Human Touch\n\nWhile AI handles the heavy lifting, human creativity and judgment remain essential for:\n- Strategic content decisions\n- Brand voice consistency\n- Final quality review\n- Guest relationship management\n\n## Getting Started\n\nAt ForgeVoice, we combine AI efficiency with human expertise to deliver the best of both worlds. Our AI Video Lab lets you generate professional video content in minutes.",
            "tags": ["AI", "production", "technology"],
            "publishedAt": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
            "createdAt": now,
            "updatedAt": now
        },
        {
            "id": str(uuid.uuid4()),
            "title": "The Ultimate Podcast Launch Checklist for 2026",
            "slug": "podcast-launch-checklist-2026",
            "excerpt": "Everything you need to know to launch a successful podcast this year, from equipment to distribution strategy.",
            "content": "Launching a podcast in 2026 is easier than ever—but standing out requires strategy. Here's your complete checklist.\n\n## Pre-Launch (4-6 weeks before)\n\n- [ ] Define your niche and ideal listener\n- [ ] Choose your format (solo, interview, panel)\n- [ ] Select equipment (microphone, headphones, interface)\n- [ ] Design cover art and branding\n- [ ] Write your show description\n- [ ] Record 3-5 episodes before launch\n\n## Technical Setup\n\n- [ ] Choose a podcast host (Buzzsprout, Transistor, etc.)\n- [ ] Set up your RSS feed\n- [ ] Submit to Apple Podcasts, Spotify, and other directories\n- [ ] Create your website or landing page\n- [ ] Set up analytics tracking\n\n## Content Strategy\n\n- [ ] Plan your first 10 episode topics\n- [ ] Create a content calendar\n- [ ] Prepare episode templates (intro, outro, segments)\n- [ ] Set your release schedule\n\n## Launch Week\n\n- [ ] Release 3 episodes at once\n- [ ] Announce on all social platforms\n- [ ] Email your existing list\n- [ ] Ask guests to share\n- [ ] Submit to podcast directories you missed\n\n## Post-Launch\n\n- [ ] Respond to all reviews\n- [ ] Analyze first month metrics\n- [ ] Gather listener feedback\n- [ ] Plan your content repurposing strategy\n\n## Key Success Metrics\n\nTrack these KPIs from day one:\n- Downloads per episode\n- Completion rate\n- Subscriber growth\n- Reviews and ratings\n- Social engagement",
            "tags": ["podcast", "strategy", "getting-started"],
            "publishedAt": (datetime.now(timezone.utc) - timedelta(days=14)).isoformat(),
            "createdAt": now,
            "updatedAt": now
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Understanding Podcast Analytics: Metrics That Actually Matter",
            "slug": "podcast-analytics-metrics-that-matter",
            "excerpt": "Cut through the noise and focus on the podcast metrics that drive real business growth.",
            "content": "Not all podcast metrics are created equal. Here's how to focus on what actually matters for growth.\n\n## Vanity Metrics vs. Value Metrics\n\n**Vanity Metrics** (nice to know):\n- Total downloads (all-time)\n- Social media followers\n- Number of episodes published\n\n**Value Metrics** (essential to track):\n- Downloads per episode (first 30 days)\n- Listener retention/completion rate\n- Subscriber conversion rate\n- Revenue per listener\n\n## The Metrics Framework\n\n### 1. Reach Metrics\n- **Downloads**: How many times your content is accessed\n- **Unique Listeners**: Individual people consuming your content\n- **Growth Rate**: Month-over-month listener increase\n\n### 2. Engagement Metrics\n- **Completion Rate**: What % listen to the end?\n- **Drop-off Points**: Where do people stop listening?\n- **Episode Popularity**: Which topics resonate?\n\n### 3. Business Metrics\n- **Conversion Rate**: Listeners who take action\n- **Sponsorship Value**: CPM rates you can command\n- **Lifetime Value**: Revenue per subscriber\n\n## Setting Benchmarks\n\n**New Podcasts (< 6 months)**:\n- 50-200 downloads per episode = Good start\n- 500+ = Strong performer\n- 1,000+ = Top 10%\n\n**Established Podcasts (> 1 year)**:\n- 1,000+ downloads = Viable for monetization\n- 5,000+ = Attractive to sponsors\n- 10,000+ = Top performer\n\n## Using ForgeVoice Analytics\n\nOur Analytics dashboard gives you all these insights in one place, with automatic ROI calculations based on your specific content costs.",
            "tags": ["analytics", "strategy", "growth"],
            "publishedAt": (datetime.now(timezone.utc) - timedelta(days=21)).isoformat(),
            "createdAt": now,
            "updatedAt": now
        },
        {
            "id": str(uuid.uuid4()),
            "title": "5 Ways to Improve Your Podcast Audio Quality Today",
            "slug": "improve-podcast-audio-quality",
            "excerpt": "Simple, actionable tips to make your podcast sound professional without expensive equipment.",
            "content": "Great audio quality keeps listeners engaged. Here are five improvements you can make right now.\n\n## 1. Optimize Your Recording Space\n\n**The Problem**: Room echo and reverb make audio sound amateur.\n\n**The Fix**:\n- Record in a small, carpeted room\n- Hang blankets or curtains to absorb sound\n- Avoid rooms with hard, parallel surfaces\n- Position your mic away from walls\n\n## 2. Master Your Microphone Technique\n\n**The Problem**: Inconsistent volume and plosives.\n\n**The Fix**:\n- Keep 4-6 inches from the mic\n- Speak across the mic, not directly into it\n- Use a pop filter\n- Maintain consistent positioning throughout\n\n## 3. Nail Your Recording Levels\n\n**The Problem**: Audio that's too quiet or distorted.\n\n**The Fix**:\n- Aim for -12dB to -6dB peaks\n- Leave headroom for post-processing\n- Test levels before every session\n- Monitor with headphones while recording\n\n## 4. Eliminate Background Noise\n\n**The Problem**: Air conditioning, computers, traffic.\n\n**The Fix**:\n- Turn off HVAC during recording\n- Use noise gates in post\n- Record at quiet times\n- Close windows and doors\n\n## 5. Process Audio Consistently\n\n**The Problem**: Episodes that sound different from each other.\n\n**The Fix**:\n- Create a processing template\n- Apply the same EQ and compression\n- Normalize to consistent LUFS (-16 for stereo)\n- Use reference tracks\n\n## Quick Wins\n\nIf you can only do three things:\n1. Get closer to your mic\n2. Treat your room with soft materials\n3. Use a noise gate\n\nThese alone will make a dramatic difference in your audio quality.",
            "tags": ["production", "audio", "podcast"],
            "publishedAt": (datetime.now(timezone.utc) - timedelta(days=28)).isoformat(),
            "createdAt": now,
            "updatedAt": now
        },
    ])

    return True


# ==================== APP SETUP ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.clients.create_index("id", unique=True)
    try:
        result = await run_seed()
        if result:
            logger.info("Demo data seeded successfully")
    except Exception as e:
        logger.error(f"Seed error: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
