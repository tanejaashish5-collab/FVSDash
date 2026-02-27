"""Blog routes."""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from db.mongo import blog_posts_collection
from services.auth_service import get_current_user

router = APIRouter(tags=["blog"])


@router.get("/blog/posts")
async def get_blog_posts(tag: Optional[str] = None, search: Optional[str] = None):
    """
    Returns blog posts with optional filtering by tag or search query.
    """
    db = blog_posts_collection()
    query = {}
    
    if tag:
        query["tags"] = tag
    
    posts = await db.find(query, {"_id": 0}).sort("publishedAt", -1).to_list(100)
    
    if search:
        search_lower = search.lower()
        posts = [p for p in posts if search_lower in p.get("title", "").lower() or search_lower in p.get("excerpt", "").lower()]
    
    return posts


@router.get("/blog/posts/{slug}")
async def get_blog_post_by_slug(slug: str):
    """Returns a single blog post by slug."""
    db = blog_posts_collection()
    post = await db.find_one({"slug": slug}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.get("/blog/tags")
async def get_blog_tags():
    """Returns all unique blog post tags."""
    db = blog_posts_collection()
    posts = await db.find({}, {"_id": 0, "tags": 1}).to_list(1000)
    all_tags = set()
    for post in posts:
        for tag in post.get("tags", []):
            all_tags.add(tag)
    return sorted(list(all_tags))


@router.post("/blog/generate")
async def generate_blog_post(data: dict, user: dict = Depends(get_current_user)):
    """Generate a blog post using AI."""
    from services.ai_service import call_gemini
    topic = data.get("topic", "")
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    prompt = f"""Write a compelling 600-800 word blog post for an Indian entrepreneur / business audience.

Topic: {topic}

Requirements:
- Compelling headline (H1)
- Engaging intro with a hook
- 3-4 main sections with subheadings
- Practical actionable insights
- Mix of English and Hinglish where natural
- SEO-optimised (include keywords naturally)
- End with a strong takeaway

Format as clean markdown."""
    try:
        content = await call_gemini(prompt, max_tokens=2000)
        import re, uuid
        from datetime import datetime, timezone
        # Extract title from first line
        lines = content.strip().split('\n')
        title = lines[0].lstrip('# ').strip() if lines else topic
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')[:60] + '-' + str(uuid.uuid4())[:8]
        tags = ["Business", "Strategy", "Entrepreneur"]
        try:
            from db.mongo import get_db
            db = get_db()
            blog_db = db["blog_posts"]
            doc = {
                "id": str(uuid.uuid4()),
                "title": title,
                "slug": slug,
                "content": content,
                "excerpt": content[:200].replace('\n', ' '),
                "tags": tags,
                "author": "AI Generated",
                "publishedAt": datetime.now(timezone.utc).isoformat(),
                "featured": False
            }
            await blog_db.insert_one(doc)
            doc.pop("_id", None)
            return doc
        except Exception as e:
            return {"title": title, "content": content, "slug": slug, "tags": tags, "author": "AI Generated", "publishedAt": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Blog generation failed: {str(e)}")
