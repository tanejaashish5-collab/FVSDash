"""
Chanakya Sutra Content Calendar
Based on the strategic playbook PowerPoint
"""

# Content Pillars from your PowerPoint
CONTENT_PILLARS = [
    {
        "name": "Chanakya Niti — Modern Life",
        "topics": [
            "Power & Enemies",
            "Office Warfare",
            "Relationships"
        ],
        "status": "ACTIVE"
    },
    {
        "name": "Arthashastra — Business",
        "topics": [
            "Startup strategy",
            "Negotiation",
            "Money & wealth"
        ],
        "status": "ACTIVE"
    },
    {
        "name": "Dark Psychology",
        "topics": [
            "Manipulation",
            "Persuasion",
            "Reading people"
        ],
        "status": "ACTIVE"
    },
    {
        "name": "Vedas — Cosmic Framework",
        "topics": [
            "Purpose & dharma",
            "Laws of nature",
            "Ancient science"
        ],
        "status": "NEW"
    },
    {
        "name": "Upanishads — Self-Mastery",
        "topics": [
            "Consciousness",
            "Identity & ego",
            "Inner power"
        ],
        "status": "NEW"
    },
    {
        "name": "Chanakya vs. World",
        "topics": [
            "vs. Machiavelli",
            "vs. Sun Tzu",
            "vs. Stoicism"
        ],
        "status": "EXPAND"
    },
    {
        "name": "Chanakya AI Mastery",
        "topics": [
            "AI for business",
            "Modern power tools",
            "Future strategy"
        ],
        "status": "NEW"
    }
]

# High-Priority Topics from Missed Opportunities
HIGH_PRIORITY_TOPICS = [
    "Arthashastra for Startups - Deep dives into Chanakya's economic model",
    "Chanakya vs. Machiavelli vs. Sun Tzu - Comparative series",
    "108 Sutras Signature Series - Definitive numbered series",
    "Upanishads for Self-Mastery - Ancient neuroscience, not devotional",
    "Chanakya in English - For Indian diaspora (30M+ globally)"
]

# Medium-Priority Topics
MEDIUM_PRIORITY_TOPICS = [
    "What Chanakya Would Say About [Current Event]",
    "Vedas × Modern Science - Ancient physics, consciousness",
    "Ancient Indian Psychology - Manas, Chitta, Gunas",
    "Chanakya for Students Series - UPSC, IIT, MBA strategy",
    "Chanakya AI Mastery - Ancient strategy + AI tools"
]

# Weekly rotation of pillars for balanced content
WEEKLY_PILLAR_ROTATION = [
    "Chanakya Niti — Modern Life",      # Monday
    "Arthashastra — Business",          # Tuesday
    "Dark Psychology",                  # Wednesday
    "Vedas — Cosmic Framework",         # Thursday
    "Upanishads — Self-Mastery",       # Friday
    "Chanakya vs. World",              # Saturday
    "Chanakya AI Mastery"              # Sunday
]

def get_topic_for_day(day_of_week: int) -> dict:
    """
    Get content topic based on day of week (0=Monday, 6=Sunday)
    Returns a structured topic for video generation
    """
    import random

    pillar_name = WEEKLY_PILLAR_ROTATION[day_of_week % 7]

    # Find the pillar
    pillar = next((p for p in CONTENT_PILLARS if p["name"] == pillar_name), None)

    if not pillar:
        # Fallback to first pillar
        pillar = CONTENT_PILLARS[0]

    # Select a specific topic from the pillar
    topic = random.choice(pillar["topics"])

    # Add high-priority angle if applicable
    if pillar["name"] == "Arthashastra — Business":
        topic = f"{topic} - {random.choice(['Startup founders', 'Modern entrepreneurs', '21st century business'])}"
    elif pillar["name"] == "Chanakya vs. World":
        topic = f"Chanakya vs. {random.choice(['Machiavelli', 'Sun Tzu', 'Marcus Aurelius'])} on {random.choice(['Power', 'War', 'Leadership'])}"

    return {
        "pillar": pillar["name"],
        "topic": topic,
        "priority": "HIGH" if pillar["status"] in ["ACTIVE", "EXPAND"] else "MEDIUM",
        "hypothesis": f"Ancient wisdom from {pillar_name} applied to modern {topic.lower()}"
    }

def get_next_high_priority_topic() -> str:
    """
    Get the next high-priority topic that hasn't been used recently
    """
    import random
    return random.choice(HIGH_PRIORITY_TOPICS)

# Chanakya Character Consistency - MUST be same across all content
CHANAKYA_CHARACTER = {
    "appearance": "bald head, sharp defined jawline, long white beard, saffron-orange robe, intense piercing eyes, calm but commanding expression, ancient Indian strategist aesthetic, age ~55, lean build, photorealistic",
    "voice": "Authoritative storyteller, dramatic and wise, strategic thinker, speaks with gravitas and conviction",
    "setting": "Mauryan palace courtyard, dimly lit study, war council chamber, ornate treasury, throne room with stone pillars",
    "props": "Ancient scrolls, palm leaf manuscripts, oil lamps, gold coins, chess board, ornate carvings"
}