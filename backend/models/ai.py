"""AI-related Pydantic models."""
from pydantic import BaseModel


class AIGenerateRequest(BaseModel):
    provider: str  # "gemini" | "openai" | "anthropic"
    task: str  # "research" | "outline" | "script" | "title" | "description" | "tags" | "chapters" | "youtube_package"
    input: dict  # Contains topic, audience, tone, goal, existingContent, etc.
