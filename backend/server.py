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

@api_router.get("/submissions")
async def get_submissions(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    query = {"clientId": client_id} if client_id else {}
    return await db.submissions.find(query, {"_id": 0}).to_list(1000)

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
