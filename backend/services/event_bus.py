"""
Simple in-process Server-Sent Events broadcast bus.

Stores one asyncio.Queue per SSE connection keyed by client_id.
Works perfectly in a single-process deployment; upgrade to Redis pub/sub
for multi-worker / multi-instance setups by swapping emit() and subscribe().
"""
import asyncio
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

# client_id → list of open SSE queues (one per browser tab / connection)
_subscribers: Dict[str, List[asyncio.Queue]] = {}


def subscribe(client_id: str) -> asyncio.Queue:
    """Register a new SSE listener and return its dedicated event queue."""
    q: asyncio.Queue = asyncio.Queue(maxsize=200)
    _subscribers.setdefault(client_id, []).append(q)
    logger.debug("SSE subscribe: client=%s connections=%d", client_id, len(_subscribers[client_id]))
    return q


def unsubscribe(client_id: str, q: asyncio.Queue) -> None:
    """Remove an SSE listener's queue when it disconnects."""
    if client_id in _subscribers:
        _subscribers[client_id] = [x for x in _subscribers[client_id] if x is not q]
        if not _subscribers[client_id]:
            del _subscribers[client_id]
    logger.debug("SSE unsubscribe: client=%s", client_id)


async def emit(client_id: str, event_type: str, payload: dict) -> None:
    """Broadcast an event to every open SSE connection for a client."""
    queues = _subscribers.get(client_id, [])
    if not queues:
        return
    message = {"type": event_type, "data": payload}
    for q in list(queues):
        try:
            q.put_nowait(message)
        except asyncio.QueueFull:
            logger.warning("SSE queue full for client=%s — dropping event", client_id)
