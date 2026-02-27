"""
Migration script to update blog posts with authentic Chanakya Sutra-themed content.
Format: Ancient principle, modern application, 3 actionable takeaways.
"""
from datetime import datetime, timezone, timedelta
import uuid
from db.mongo import blog_posts_collection

CHANAKYA_ARTICLES = [
    {
        "id": str(uuid.uuid4()),
        "title": "Saam, Daam, Dand, Bhed: The 4 Pillars of Influence for Content Creators",
        "slug": "saam-daam-dand-bhed-content-creators",
        "excerpt": "Master Chanakya's timeless framework for negotiation and influence to grow your content empire.",
        "coverImage": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&h=720&fit=crop",
        "tags": ["strategy", "growth", "chanakya"],
        "content": """# Saam, Daam, Dand, Bhed: The 4 Pillars of Influence for Content Creators

## The Ancient Principle

In the Arthashastra, Chanakya laid out four methods of achieving objectives: **Saam** (persuasion), **Daam** (incentive), **Dand** (punishment/consequence), and **Bhed** (division/differentiation). These weren't just political tools—they're universal principles of influence that apply to any arena where you need to move people to action.

As Chanakya wrote: *"Before you start any work, always ask yourself three questions – Why am I doing it? What might the results be? Will I be successful?"*

## Modern Application for Content Creators

In the creator economy, you're constantly influencing: convincing viewers to subscribe, brands to sponsor, and algorithms to favor your content. Here's how each pillar applies:

**Saam (Persuasion):** Your content itself is Saam. When you educate, entertain, or inspire without asking for anything, you're building goodwill. A viewer who learns something valuable from your Short is naturally inclined to follow. Think of it as *"Pehle value do, phir ask karo"* (Give value first, then ask).

**Daam (Incentive):** This is your call-to-action with benefits. "Subscribe and get early access," "Comment your niche for a shoutout," or "Join the community for exclusive content." You're offering something in exchange for the action you want.

**Dand (Consequence):** Creating FOMO is Dand in action. "This offer expires tonight," "Limited seats in my cohort," or simply the urgency of trending content that won't be relevant tomorrow. The consequence of inaction motivates action.

**Bhed (Differentiation):** Why should someone follow you over the 10 other creators in your niche? Your unique angle, your specific perspective, your authentic voice—that's Bhed. It divides the market and carves out your territory.

## 3 Actionable Takeaways

1. **Audit your content for all four pillars.** If you're only doing Saam (pure value, no asks), you're leaving growth on the table. If you're only doing Daam (constant CTAs), you'll burn out your audience. Balance is key. Review your last 10 videos—which pillars are missing?

2. **Use Bhed as your foundation.** Before worrying about growth tactics, lock in your differentiation. Write down in one sentence why someone should watch YOUR Chanakya content instead of anyone else's. If you can't articulate it, neither can your audience.

3. **Layer Dand strategically, not desperately.** False urgency destroys trust. Real consequences—like genuinely limited opportunities or time-sensitive trends—create authentic motivation. Save Dand for when it's true.""",
        "publishedAt": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
        "author": "ForgeVoice Studio",
        "readTime": "6 min read"
    },
    {
        "id": str(uuid.uuid4()),
        "title": "The Panchatantra Principle: Why Story-First Content Wins on Shorts",
        "slug": "panchatantra-principle-story-first-content",
        "excerpt": "Ancient storytelling wisdom meets modern algorithm psychology. Learn why narrative hooks outperform info-dumps.",
        "coverImage": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1280&h=720&fit=crop",
        "tags": ["content", "strategy", "storytelling"],
        "content": """# The Panchatantra Principle: Why Story-First Content Wins on Shorts

## The Ancient Principle

The Panchatantra, a collection of ancient Indian fables, has influenced storytelling across cultures for over 2,000 years. Its genius wasn't in the morals it taught—it was in how it taught them. Every lesson was wrapped in an engaging story, often featuring relatable characters (animals) in dramatic situations.

Chanakya understood this deeply: *"A man is born alone and dies alone; and he experiences the good and bad consequences of his karma alone."* But notice—even this philosophical truth is framed as a story structure (birth → life → death).

## Modern Application for YouTube Shorts

The algorithm and human psychology both reward the same thing: **retention**. And nothing retains attention like a story.

Consider two hooks for the same Chanakya teaching:

❌ Info-dump: "Today I'll share 3 principles from Chanakya on decision-making."

✅ Story-first: "A king once made a decision that cost him his entire kingdom. Here's what Chanakya told him the next morning..."

The second hook creates an open loop. The viewer's brain literally cannot rest until that loop is closed. This is called the Zeigarnik Effect—we remember incomplete tasks better than completed ones.

**The Panchatantra Structure for Shorts:**
- **0-3 seconds:** Open a loop (the dramatic situation)
- **3-20 seconds:** Build tension (the stakes, the conflict)  
- **20-40 seconds:** The twist or insight (the resolution)
- **40-60 seconds:** The meta-lesson (what it means for the viewer)

## 3 Actionable Takeaways

1. **Convert every teaching into a character-driven scenario.** Instead of "Chanakya says to save money," try "A merchant spent 10 years building wealth. Then his servant taught him something that changed everything..." The character creates investment, the scenario creates curiosity.

2. **Use the "monkey and the crocodile" technique.** This famous Panchatantra story works because the monkey is clever and the crocodile is threatening but ultimately outwitted. Your Shorts should have this dynamic: a relatable protagonist (your audience), a threat or challenge (their pain point), and a clever solution (your insight). *Audience ko hero banaao, problem ko villain.*

3. **End with transformation, not information.** A Panchatantra story doesn't end with "and the moral is..." It ends with the character changed—wiser, richer, or having narrowly escaped disaster. Your viewer should feel transformed by the end of 60 seconds, not just informed.""",
        "publishedAt": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
        "author": "ForgeVoice Studio",
        "readTime": "7 min read"
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Karma Yoga for Creators: Detach from Views, Attach to Value",
        "slug": "karma-yoga-creators-detach-views-attach-value",
        "excerpt": "How the Bhagavad Gita's most misunderstood principle can cure your analytics anxiety and actually boost growth.",
        "coverImage": "https://images.unsplash.com/photo-1545389336-cf090694435e?w=1280&h=720&fit=crop",
        "tags": ["strategy", "growth", "mindset"],
        "content": """# Karma Yoga for Creators: Detach from Views, Attach to Value

## The Ancient Principle

*"Karmanye vadhikaraste ma phaleshu kadachana"* — You have the right to action, but not to the fruits of action.

This verse from the Bhagavad Gita is often misquoted to mean "don't care about results." That's not what it says. It says you don't have a *right* to results—meaning results aren't guaranteed, and attaching your peace of mind to them is foolish because they're outside your control.

Chanakya understood this practically: *"Once you start working on something, don't be afraid of failure and don't abandon it. People who work sincerely are the happiest."*

## Modern Application for Content Creators

Every creator knows this torture: you pour your soul into a video, and it gets 200 views. Meanwhile, some random clip you made in 5 minutes goes viral. The algorithm is *phaleshu*—the fruit—and you have zero control over it.

But here's what you DO control:
- The depth of your research
- The quality of your hooks
- The clarity of your delivery  
- Your posting consistency
- How you respond to comments

When you obsess over views (the fruit), you start making desperate decisions: clickbait that destroys trust, trend-hopping that dilutes your brand, burnout from chasing an ever-moving target.

When you focus on craft (the action), something interesting happens: your work gets better. And better work, over time, wins. As Chanakya noted: *"The world's biggest power is the youth and beauty of a woman. But the power of knowledge is the greatest power of all."* Knowledge (your improving craft) compounds.

## 3 Actionable Takeaways

1. **Create a "Process Scorecard" alongside your analytics dashboard.** Track things you control: Did I hook in under 3 seconds? Did I provide genuine value? Did I respond to comments within 24 hours? When these process metrics are green, you've done your karma. The views are *phaleshu*.

2. **Implement "Analytics Fasting" one day per week.** Seriously. Don't check your stats on Sundays. The numbers will be the same whether you check them or not—but your mental state will be dramatically different. Use that day to consume content that inspires you, not to doom-scroll your own performance.

3. **Redefine "success" for each video before you post.** Instead of "I hope this gets 10K views," try "I will consider this successful if: I explained the concept clearly, I used a strong hook, and I left viewers with one actionable insight." Now you can evaluate success *immediately* after posting, not days later when the algorithm has rendered its verdict.""",
        "publishedAt": (datetime.now(timezone.utc) - timedelta(days=14)).isoformat(),
        "author": "ForgeVoice Studio",
        "readTime": "8 min read"
    },
    {
        "id": str(uuid.uuid4()),
        "title": "The Mandala Strategy: Building Your Content Kingdom Layer by Layer",
        "slug": "mandala-strategy-content-kingdom",
        "excerpt": "Chanakya's geopolitical framework applied to content strategy. Why your 'enemy' creators might be your greatest assets.",
        "coverImage": "https://images.unsplash.com/photo-1493612276216-ee3925520721?w=1280&h=720&fit=crop",
        "tags": ["strategy", "growth", "analytics"],
        "content": """# The Mandala Strategy: Building Your Content Kingdom Layer by Layer

## The Ancient Principle

The Mandala Theory is Chanakya's framework for foreign policy: your immediate neighbor is likely your rival, but your neighbor's neighbor is your natural ally. Picture concentric circles—each ring alternates between potential threats and potential friends.

*"Your neighbor is your natural enemy, and the neighbor's neighbor is your friend."* — Arthashastra

This wasn't cynicism; it was strategic realism. Chanakya wasn't saying to hate your neighbors—he was saying to understand the geometry of competition and cooperation.

## Modern Application for Content Creators

In the creator economy, your Mandala looks like this:

**The Inner Circle (You):** Your core content, your authentic voice, your unique perspective on Chanakya's teachings.

**First Ring (Direct Competitors):** Other Chanakya/Indian philosophy Shorts creators. You're competing for the same viewer attention. But here's the twist—in content, competition isn't zero-sum.

**Second Ring (Adjacent Niches):** Self-improvement creators, history channels, business strategy accounts. They're not competing for your exact audience, and collaborations can expose you to entirely new viewers.

**Third Ring (Distant but Powerful):** Major educational platforms, news aggregators, podcast networks. They're so big that featuring you costs them nothing but could change your trajectory entirely.

**The Strategic Insight:** Most creators waste energy attacking their First Ring when they should be courting their Second Ring. *"The enemy of my enemy is my friend"* becomes "The audience of my adjacent niche is my growth opportunity."

## 3 Actionable Takeaways

1. **Map your actual Mandala.** Write down 5 creators in each ring. For Ring 1, note what makes you different. For Ring 2, brainstorm 3 collaboration ideas each. For Ring 3, identify what you'd need to offer to get their attention (a viral video? a unique angle? a valuable connection?). *Apna raj samjho—understand your kingdom.*

2. **Practice strategic non-competition with Ring 1.** Comment genuinely on their videos. Share their best content. Join their communities. In traditional business, this would be insane. In creator economy, it's genius—audiences follow abundance mindset creators. When you're not threatened by peers, viewers trust you more.

3. **Create "bridge content" for Ring 2.** If you do Chanakya wisdom and someone in Ring 2 does startup advice, create content that bridges both: "What Chanakya Would Tell Every Startup Founder." This content serves as an introduction to viewers from adjacent niches. It's not your core content, but it's your expansion content.""",
        "publishedAt": (datetime.now(timezone.utc) - timedelta(days=21)).isoformat(),
        "author": "ForgeVoice Studio",
        "readTime": "7 min read"
    },
    {
        "id": str(uuid.uuid4()),
        "title": "Arthashastra Economics: Pricing Your Time and Monetizing Wisdom",
        "slug": "arthashastra-economics-pricing-monetizing-wisdom",
        "excerpt": "Chanakya's principles on wealth creation applied to the creator economy. From free content to paid communities.",
        "coverImage": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1280&h=720&fit=crop",
        "tags": ["strategy", "growth", "content"],
        "content": """# Arthashastra Economics: Pricing Your Time and Monetizing Wisdom

## The Ancient Principle

The Arthashastra isn't just political theory—it's one of the world's first comprehensive economics textbooks. Chanakya wrote extensively on trade, taxation, and the proper valuation of goods and labor.

*"Wealth will slip away from that foolish person who continuously consults the stars; for wealth is the star for wealth. What will the stars do?"* — Arthashastra

Translation: Stop waiting for perfect conditions. Wealth comes from *action*, not prediction. Applied to creators: stop waiting until you have 100K followers to monetize. Start now, start small, but start.

Chanakya also noted: *"The fragrance of flowers spreads only in the direction of the wind. But the goodness of a person spreads in all directions."* Your reputation—which determines your pricing power—compounds in all directions.

## Modern Application for the Creator Economy

Most creators fall into two traps:
1. **The Monk Trap:** "I shouldn't monetize, it'll corrupt my content!" (Noble but unsustainable)
2. **The Merchant Trap:** "Every video should sell something!" (Profitable but reputation-destroying)

Chanakya's balance: *"He who is overly attached to his family members experiences fear and sorrow, for the root of all grief is attachment."* Similarly, being overly attached to either purity OR profit leads to suffering.

**The Arthashastra Monetization Model:**
- **Free Content (Your Taxation):** Shorts, regular videos. This is how you "tax" attention from the platform and build your treasury of followers.
- **Premium Content (Your Trade):** Courses, communities, exclusive content. This is trade—fair exchange of value for payment.
- **Partnerships (Your Alliances):** Brand deals, sponsorships. These are strategic alliances that benefit both parties.

Each category should be distinct. Don't shill in your free content. Don't give away your premium insights for free.

## 3 Actionable Takeaways

1. **Apply the "Half-Truth" Pricing Principle.** Chanakya advised revealing half of what you know—enough to establish expertise, not enough to eliminate the need for your guidance. Your free Shorts should give complete, actionable value but leave viewers wanting *more depth, more context, more examples*. The course gives them that depth. *Itna batao ki bhuukh bani rahe* (Share enough to keep them hungry).

2. **Create your personal "Kosh" (Treasury) plan.** Chanakya emphasized maintaining state reserves. Your creator Kosh: 6 months of expenses saved before you quit your job, 3 months of content pre-produced before you take a vacation, multiple revenue streams before any single one dominates. Diversification is survival.

3. **Value your time using the "Mukhya Amatya" (Chief Minister) test.** The Chief Minister's time was the most valuable in the kingdom—every meeting had to justify interrupting him. Similarly, price your 1:1 offerings (coaching, consulting) at a rate that makes you genuinely *excited* to show up. If you dread the call, you've priced too low. Your enthusiasm is part of the value you deliver.""",
        "publishedAt": (datetime.now(timezone.utc) - timedelta(days=28)).isoformat(),
        "author": "ForgeVoice Studio",
        "readTime": "8 min read"
    }
]


async def migrate_blog_posts():
    """Replace existing blog posts with Chanakya Sutra-themed articles."""
    db = blog_posts_collection()
    
    # Clear existing blog posts
    await db.delete_many({})
    
    # Insert Chanakya articles
    now = datetime.now(timezone.utc).isoformat()
    for article in CHANAKYA_ARTICLES:
        article["createdAt"] = now
        article["updatedAt"] = now
    
    await db.insert_many(CHANAKYA_ARTICLES)
    
    print(f"✓ Inserted {len(CHANAKYA_ARTICLES)} Chanakya Sutra-themed blog posts")
    return True


if __name__ == "__main__":
    import asyncio
    asyncio.run(migrate_blog_posts())
