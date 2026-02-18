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

@api_router.get("/analytics")
async def get_analytics(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    return await db.analytics_snapshots.find(query, {"_id": 0}).sort("date", -1).to_list(100)

@api_router.get("/clients")
async def get_clients(user: dict = Depends(require_admin)):
    return await db.clients.find({}, {"_id": 0}).to_list(1000)

@api_router.get("/billing")
async def get_billing(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    return await db.billing_records.find(query, {"_id": 0}).to_list(100)

@api_router.get("/client-settings")
async def get_client_settings(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    if not client_id:
        return {}
    settings = await db.client_settings.find_one({"clientId": client_id}, {"_id": 0})
    return settings or {}

@api_router.get("/video-tasks")
async def get_video_tasks(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    return await db.video_tasks.find(query, {"_id": 0}).to_list(100)

@api_router.get("/help-articles")
async def get_help_articles():
    return await db.help_articles.find({}, {"_id": 0}).to_list(100)

@api_router.get("/support-requests")
async def get_support_requests(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    return await db.support_requests.find(query, {"_id": 0}).to_list(100)


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
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[0], "name": "Episode 42 - Final Mix", "type": "Audio", "url": "https://drive.google.com/example1", "status": "Final", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[0], "name": "Episode 42 - Thumbnail", "type": "Thumbnail", "url": "https://drive.google.com/example2", "status": "Final", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[1], "name": "Raw Recording - Marcus", "type": "Audio", "url": "https://drive.google.com/example3", "status": "Draft", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[0], "name": "Episode 42 - Transcript", "type": "Transcript", "url": "https://drive.google.com/example4", "status": "Final", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": None, "name": "Brand Kit - Logo Pack", "type": "Video", "url": "https://drive.google.com/example5", "status": "Final", "createdAt": now, "updatedAt": now},
    ]
    await db.assets.insert_many(assets)

    analytics = []
    for i in range(14):
        d = datetime.now(timezone.utc) - timedelta(days=13 - i)
        analytics.append({
            "id": str(uuid.uuid4()),
            "clientId": "demo-client-1",
            "date": d.strftime("%Y-%m-%d"),
            "downloads": random.randint(50, 300),
            "views": random.randint(200, 1500),
            "subscribersGained": random.randint(5, 50),
            "episodesPublished": random.randint(0, 2),
            "roiEstimate": round(random.uniform(500, 3000), 2)
        })
    await db.analytics_snapshots.insert_many(analytics)

    await db.client_settings.insert_one({
        "id": str(uuid.uuid4()),
        "clientId": "demo-client-1",
        "hourlyRate": 150,
        "competitorName": "PodcastPro Media",
        "brandVoiceDescription": "Professional yet approachable. Tech-forward with human warmth.",
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
        {"id": str(uuid.uuid4()), "title": "Getting Started with ForgeVoice", "content": "Welcome to ForgeVoice Studio. This guide walks you through setting up your first project.", "category": "Getting Started", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "title": "Submitting Content", "content": "Learn how to submit your podcast episodes, shorts, and other content for production.", "category": "Submissions", "createdAt": now, "updatedAt": now},
    ])

    await db.support_requests.insert_many([
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "userId": client_user["id"], "subject": "Need help with audio format", "message": "What audio formats do you accept?", "status": "Open", "createdAt": now, "updatedAt": now},
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
