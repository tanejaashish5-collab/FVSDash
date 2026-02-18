"""Blog routes."""
from fastapi import APIRouter, HTTPException
from typing import Optional

from db.mongo import blog_posts_collection

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
