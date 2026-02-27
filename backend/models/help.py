"""Help/Support-related Pydantic models."""
from pydantic import BaseModel


class SupportRequestCreate(BaseModel):
    subject: str
    message: str
