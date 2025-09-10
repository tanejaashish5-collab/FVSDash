import React from 'react';
import {
    Episode,
    KPIData,
    ActivityItem,
    KanbanCard,
    SidebarItem,
    QuickAction,
    UserProfile,
    Notification,
    ToastNotification,
    OnboardingStep,
    OnboardingSettings,
    ProductionCycleData,
    PlatformPerformance,
    AudienceDemographics,
    Insight,
    SubscriptionPlan,
    PaymentMethod,
    Invoice,
    EpisodePerformanceDetails,
    BlogPost,
    Asset,
    FunnelData,
    ContentToCashData,
    AiRecommendation,
    ShareOfVoiceData,
    OpportunityMatrixTopic,
    AudienceInsightsData,
    UnscheduledItem,
    Submission,
    Deliverable,
    Settings,
// Ensured import path is relative.
} from './types';
// Ensured import path is relative.
import Icons from './components/Icons';

// --- AUTH & MULTI-TENANCY CONSTANTS ---
export const DEFAULT_USER_PROFILE: UserProfile = { id: "client-1", name: "Alex Chen", initials: "AC", email: "alex@company.com", avatar: "https://i.pravatar.cc/40?u=alex" };
export const ADMIN_PROFILE: UserProfile = { id: "admin-1", name: "ForgeVoice Admin", initials: "FV", email: "admin@forgevoice.com" };
export const DEFAULT_CLIENTS: UserProfile[] = [
    { id: "client-1", name: "Alex Chen", initials: "AC", email: "alex@company.com", avatar: "https://i.pravatar.cc/40?u=alex" },
    { id: "client-2", name: "Maria Garcia", initials: "MG", email: "maria@widgets.co", avatar: "https://i.pravatar.cc/40?u=maria" },
    { id: "client-3", name: "Sam Wilson", initials: "SW", email: "sam@innovate.io", avatar: "https://i.pravatar.cc/40?u=sam" },
];


// --- CONSOLIDATED CONSTANTS ---
export const DEFAULT_KPI_DATA: KPIData = { 
    newSubmissions: { value: 3, trend: 'up', change: '+1' }, 
    inProduction: { value: 9, trend: 'down', change: '-2' }, 
    readyForReview: { value: 2, trend: 'up', change: '+2' }, 
    published: { value: 14, trend: 'up', change: '+5' } 
};
export const DEFAULT_SIDEBAR_ITEMS: SidebarItem[] = [
    { id: "overview", name: "Overview", icon: React.createElement(Icons.Overview) },
    { id: "system", name: "The FVS System", icon: React.createElement(Icons.System) },
    { id: "submissions", name: "Submissions", icon: React.createElement(Icons.Submissions) },
    { id: "calendar", name: "Calendar", icon: React.createElement(Icons.Calendar) },
    { id: "deliverables", name: "Deliverables", icon: React.createElement(Icons.CheckCircle, { className: 'w-6 h-6' }) },
    { id: "assets", name: "Assets", icon: React.createElement(Icons.Assets) },
    { id: "blog", name: "Blog", icon: React.createElement(Icons.Blog) },
    { id: "strategy-lab", name: "Strategy Lab", icon: React.createElement(Icons.FlaskConical) },
    { id: "analytics", name: "Analytics", icon: React.createElement(Icons.Analytics) },
    { id: "roi-center", name: "ROI Center", icon: React.createElement(Icons.DollarSign) },
    { id: "billing", name: "Billing", icon: React.createElement(Icons.Billing) },
    { id: "help", name: "Help", icon: React.createElement(Icons.Help) },
    { id: "settings", name: "Settings", icon: React.createElement(Icons.Settings) }
];
export const DEFAULT_EPISODES: Episode[] = [
    { id: "1", title: "EP 024 — Dr. Mehta on Longevity", type: "Podcast", status: "In Production", dueDate: "2024-08-29", priority: "High" },
    { id: "2", title: "Shorts Set — EP 023", type: "Shorts", status: "Review", dueDate: "2024-08-26", priority: "Medium" },
    { id: "3", title: "Blog — EP 022 Highlights", type: "Blog", status: "Scheduled", dueDate: "2024-09-01", priority: "Low" },
    { id: "4", title: "EP 025 — Future of AI", type: "Podcast", status: "New", dueDate: "2024-09-05", priority: "Medium" },
    { id: "5", title: "EP 022 — Full Release", type: "Podcast", status: "Published", dueDate: "2024-08-27", priority: "Low" },
    { id: "6", title: "Thumbnail Designs for EP 024", type: "Shorts", status: "In Production", dueDate: "2024-08-28", priority: "High" },
    { id: "7", title: "EP 023 Review Notes", type: "Blog", status: "Review", dueDate: "2024-08-30", priority: "Medium" }
];
export const DEFAULT_KANBAN_CARDS: Record<string, KanbanCard[]> = {
    "INTAKE": [{ 
        id: "card-1", title: "EP 025 — Future of AI", type: "Podcast", dueDate: "2024-09-05", priority: "Medium",
        description: "Initial raw recording for the upcoming episode on the future of artificial intelligence. Needs audio cleanup, intro/outro added, and initial edit.",
        assignees: [{ name: "Alex Chen", initials: "AC", avatar: "https://i.pravatar.cc/40?u=alex" }],
        links: [{ name: "Submission Form", url: "#" }]
    }],
    "EDITING": [{ 
        id: "card-2", title: "EP 024 — Dr. Mehta on Longevity", type: "Podcast", dueDate: "2024-08-29", priority: "High",
        description: "Full audio edit in progress. Removing pauses, adding sound effects, and mixing audio levels. Target completion for review by EOD.",
        assignees: [
            { name: "Maria Garcia", initials: "MG", avatar: "https://i.pravatar.cc/40?u=maria" }, 
            { name: "Alex Chen", initials: "AC", avatar: "https://i.pravatar.cc/40?u=alex" }
        ],
        links: [{ name: "Raw Audio Files", url: "#" }]
    }],
    "DESIGN": [{ 
        id: "card-3", title: "Shorts Set — EP 023", type: "Shorts", dueDate: "2024-08-26",
        description: "Creating 5 short-form video clips from episode 23. Includes generating captions, selecting engaging clips, and designing thumbnails for YouTube, TikTok, and Instagram.",
        assignees: [{ name: "Sam Wilson", initials: "SW", avatar: "https://i.pravatar.cc/40?u=sam" }],
        links: [{ name: "Brand Assets", url: "#" }, { name: "EP 023 Final Edit", url: "#" }]
    }],
    "DISTRIBUTION": [],
    "REVIEW": [],
    "SCHEDULED": [{
        id: "card-4", title: "Blog — EP 022 Highlights", type: "Blog", dueDate: "2024-09-01", priority: "Low",
        description: "Blog post summarizing key takeaways from episode 22. SEO optimized and scheduled for publication on the company website.",
        assignees: [{ name: "Jane Doe", initials: "JD", avatar: "https://i.pravatar.cc/40?u=jane" }],
        links: [{ name: "Google Doc Draft", url: "#" }]
    }],
    "PUBLISHED": [{
        id: "card-6", title: "Podcast - EP 022 Launch", type: "Podcast", dueDate: "2024-08-27",
        description: "Episode 22 has been successfully published on all major podcasting platforms. Promotion campaign is now active.",
        assignees: [{ name: "Alex Chen", initials: "AC", avatar: "https://i.pravatar.cc/40?u=alex" }],
        links: [{ name: "Spotify Link", url: "#" }, { name: "Apple Podcasts Link", url: "#" }]
    }],
    "BLOCKED": [],
};

export const DEFAULT_UNSCHEDULED_IDEAS: UnscheduledItem[] = [
    {
        id: 'idea-1',
        title: "Podcast: The Psychology of High-Performance Teams",
        description: "Interview with a sports psychologist on teamwork.",
        type: "Podcast"
    },
    {
        id: 'idea-2',
        title: "Blog: A Deep Dive into Mitochondrial Health",
        description: "Follow-up article to the Dr. Mehta episode, focusing on a popular audience request.",
        type: "Blog"
    },
    {
        id: 'idea-3',
        title: "Podcast: The Future of Remote Work with a CEO",
        description: "Discussion on trends, tools, and culture.",
        type: "Podcast"
    },
    {
        id: 'idea-4',
        title: "Shorts: The '5-Minute Rule' Explained",
        description: "A short explainer a simple but effective procrastination-busting technique.",
        type: "Shorts"
    }
];

export const DEFAULT_SUBMISSIONS: Submission[] = [
    { id: "sub-1", submittedAt: "2024-08-28T09:00:00Z", title: "EP 025 — Future of AI", type: "Podcast", status: "New", guestName: "Dr. Eva Rostova" },
    { id: "sub-2", submittedAt: "2024-08-25T14:30:00Z", title: "EP 024 — Dr. Mehta on Longevity", type: "Podcast", status: "In Production", guestName: "Dr. Mehta" },
    { id: "sub-3", submittedAt: "2024-08-22T11:00:00Z", title: "Shorts Set — EP 023", type: "Shorts", status: "Review", guestName: "John Anderson"},
    { id: "sub-4", submittedAt: "2024-08-20T18:00:00Z", title: "Blog — EP 022 Highlights", type: "Blog", status: "Scheduled", guestName: "Isabella Rossi" },
    { id: "sub-5", submittedAt: "2024-08-19T10:00:00Z", title: "EP 022 — Full Release", type: "Podcast", status: "Published", guestName: "Isabella Rossi" },
    { id: "sub-6", submittedAt: "2024-08-18T16:20:00Z", title: "Thumbnail Designs for EP 024", type: "Shorts", status: "In Production", guestName: "Dr. Mehta" },
];

// --- BLOG DATA ---
export const DEFAULT_BLOG_POSTS: BlogPost[] = [
    {
        id: 'blog-1',
        title: "The Hidden Benefits of Longevity: Insights from Dr. Mehta",
        content: "In our latest episode, we sat down with Dr. Anya Mehta, a leading researcher in the field of gerontology, to discuss the multifaceted aspects of living a longer, healthier life. While many focus on the extended lifespan itself, Dr. Mehta argues that the true value lies in the 'healthspan'—the period of life spent in good health, free from chronic diseases and disabilities...\n\nOne of the key takeaways was the concept of 'compounding health.' Just like financial investments, small, consistent efforts in health and wellness can lead to exponential returns over time. This includes not just diet and exercise, but also cognitive training, social engagement, and stress management. Dr. Mehta emphasized that it's never too late to start, and the benefits can be seen at any age.\n\nWe also delved into the societal implications of a longer-living population, from economic shifts to changes in family structures. It was a fascinating conversation that reframed longevity not as a mere extension of years, but as an opportunity for a richer, more fulfilling human experience.",
        status: 'Needs Review',
        generatedAt: '2024-08-28T10:00:00.000Z',
        seoTitle: '',
        seoDescription: '',
    },
    {
        id: 'blog-2',
        title: "Decoding the Future of Artificial Intelligence",
        content: "Artificial intelligence is no longer the realm of science fiction; it's a tangible force reshaping our world. In this episode, we explored the current landscape and future trajectory of AI with tech ethicist and developer, Ben Carter. Ben broke down complex topics like large language models (LLMs), generative AI, and the importance of ethical frameworks in their development...\n\nBen argues that the next five years will be defined by 'AI integration' rather than 'AI replacement.' He envisions AI as a co-pilot in various professions, augmenting human capabilities and automating mundane tasks to free up time for creativity and critical thinking. From healthcare diagnostics to personalized education, the potential for positive impact is immense. However, he also cautioned against unchecked development, stressing the need for transparency, accountability, and robust regulations to mitigate risks like bias and misinformation.",
        status: 'Needs Review',
        generatedAt: '2024-08-27T14:30:00.000Z',
    },
    {
        id: 'blog-3',
        title: "EP 022 Highlights: Key Takeaways on Modern Marketing",
        content: "A quick look back at our conversation with marketing guru Isabella Rossi. We covered the shift from demographic-based targeting to psychographic profiling, the rise of authentic influencer partnerships, and the crucial role of data analytics in measuring ROI. The main theme? Value-driven content is king. Modern consumers don't just want to be sold to; they want to be educated, entertained, and engaged.",
        status: 'Published',
        generatedAt: '2024-08-25T09:00:00.000Z',
        publishedAt: '2024-08-26T12:00:00.000Z',
        seoTitle: 'Modern Marketing Essentials | EP 022 Highlights',
        seoDescription: 'Discover key marketing takeaways from our chat with Isabella Rossi. Learn about psychographic profiling, influencer partnerships, and data-driven content strategy.',
    }
];

// --- ASSET DATA ---
export const DEFAULT_ASSETS: Asset[] = [
    // Brand Kit - no episodeId
    { id: 'asset-1', name: 'Brand_Logo_Primary.png', type: 'Image', fileType: 'png', size: '1.2 MB', url: '#', thumbnailUrl: 'https://images.unsplash.com/photo-1611162616805-6a4063953de4?w=200', createdAt: '2024-08-15T10:00:00Z', category: 'Brand Kit' },
    { id: 'asset-2', name: 'Brand_Guidelines.pdf', type: 'Document', fileType: 'pdf', size: '5.8 MB', url: '#', thumbnailUrl: '', createdAt: '2024-08-15T10:05:00Z', category: 'Brand Kit' },
    { id: 'asset-9', name: 'Intro_Music_Licensed.mp3', type: 'Audio', fileType: 'mp3', size: '4.1 MB', url: '#', thumbnailUrl: '', createdAt: '2024-08-10T00:00:00Z', category: 'Brand Kit' },
    
    // Episode 24
    { id: 'asset-3', name: 'EP024_Mehta_RAW.wav', type: 'Audio', fileType: 'wav', size: '750 MB', url: '#', thumbnailUrl: '', createdAt: '2024-08-25T14:00:00Z', category: 'Source Files', episodeId: '1', episodeTitle: 'EP 024 — Dr. Mehta on Longevity' },
    
    // Episode 23
    { id: 'asset-4', name: 'EP023_Final_Audio.mp3', type: 'Audio', fileType: 'mp3', size: '56 MB', url: '#', thumbnailUrl: '', createdAt: '2024-08-26T18:00:00Z', category: 'Final Deliverables', episodeId: '2', episodeTitle: 'Shorts Set — EP 023' },
    { id: 'asset-5', name: 'EP023_Short_01.mp4', type: 'Video', fileType: 'mp4', size: '88 MB', url: '#', thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726a?w=200', createdAt: '2024-08-27T11:00:00Z', category: 'Final Deliverables', episodeId: '2', episodeTitle: 'Shorts Set — EP 023' },
    { id: 'asset-6', name: 'EP023_Thumbnail.jpg', type: 'Image', fileType: 'jpg', size: '2.1 MB', url: '#', thumbnailUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200', createdAt: '2024-08-27T11:05:00Z', category: 'Final Deliverables', episodeId: '2', episodeTitle: 'Shorts Set — EP 023' },
    
    // Episode 25
    { id: 'asset-7', name: 'EP025_AI_RAW_Video.mov', type: 'Video', fileType: 'mov', size: '4.2 GB', url: '#', thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7b61ca6dc3c9?w=200', createdAt: '2024-08-28T09:00:00Z', category: 'Source Files', episodeId: '4', episodeTitle: 'EP 025 — Future of AI' },
    { id: 'asset-8', name: 'Blog_Post_Header_AI.png', type: 'Image', fileType: 'png', size: '3.5 MB', url: '#', thumbnailUrl: 'https://images.unsplash.com/photo-1620712943543-285f726a8484?w=200', createdAt: '2024-08-28T12:00:00Z', category: 'Final Deliverables', episodeId: '4', episodeTitle: 'EP 025 — Future of AI' },
];

// --- DELIVERABLES DATA ---
export const DEFAULT_DELIVERABLES: Deliverable[] = [
    {
        id: 'del-1',
        episodeId: '2',
        episodeTitle: 'Shorts Set — EP 023',
        type: 'Shorts',
        title: 'The "5-Minute Rule" for Procrastination',
        status: 'Needs Review',
        previewUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726a?w=400',
        createdAt: '2024-08-29T10:00:00Z'
    },
    {
        id: 'del-2',
        episodeId: '2',
        episodeTitle: 'Shorts Set — EP 023',
        type: 'Shorts',
        title: 'Why Consistency Beats Intensity',
        status: 'Needs Review',
        previewUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400',
        createdAt: '2024-08-29T10:05:00Z'
    },
    {
        id: 'del-3',
        episodeId: '2',
        episodeTitle: 'Shorts Set — EP 023',
        type: 'Quote Graphic',
        title: '"The secret to getting ahead is getting started."',
        status: 'Approved',
        previewUrl: 'https://images.unsplash.com/photo-1620712943543-285f726a8484?w=400',
        createdAt: '2024-08-29T11:00:00Z'
    },
    {
        id: 'del-4',
        episodeId: '1',
        episodeTitle: 'EP 024 — Dr. Mehta on Longevity',
        type: 'Blog',
        title: 'The Hidden Benefits of Longevity: Insights from Dr. Mehta',
        status: 'Needs Review',
        content: "In our latest episode, we sat down with Dr. Anya Mehta... [content here]",
        createdAt: '2024-08-28T10:00:00Z'
    },
    {
        id: 'del-5',
        episodeId: '1',
        episodeTitle: 'EP 024 — Dr. Mehta on Longevity',
        type: 'Shorts',
        title: 'The Myth of "Good Genes"',
        status: 'Revisions Requested',
        previewUrl: 'https://images.unsplash.com/photo-1526374965328-7b61ca6dc3c9?w=400',
        createdAt: '2024-08-30T09:00:00Z'
    },
];

// Data for Analytics Page
export const DEFAULT_PRODUCTION_CYCLE_DATA: ProductionCycleData[] = [
    { stage: 'Intake', avgTimeDays: 1.5, trend: 'down' },
    { stage: 'Editing', avgTimeDays: 4.2, trend: 'down' },
    { stage: 'Design', avgTimeDays: 2.1, trend: 'up' },
    { stage: 'Review', avgTimeDays: 1.8, trend: 'neutral' },
    { stage: 'Scheduled', avgTimeDays: 3.5, trend: 'down' },
    { stage: 'Published', avgTimeDays: 0, total: 13.1 }
];

export const DEFAULT_PLATFORM_PERFORMANCE_DATA: PlatformPerformance[] = [
    { name: 'YouTube', views: 1845032, watchTime: 92251, engagementRate: 4.8, ctaClicks: 12345, subsGained: 15234 },
    { name: 'Spotify', views: 602341, watchTime: 45175, engagementRate: 2.1, ctaClicks: 3456, subsGained: 5678 },
    { name: 'Apple Podcasts', views: 450123, watchTime: 33759, engagementRate: 1.8, ctaClicks: 2109, subsGained: 4321 },
    { name: 'Website', views: 123456, watchTime: 1234, engagementRate: 6.2, ctaClicks: 8765, subsGained: 987 },
];

export const DEFAULT_FUNNEL_DATA: FunnelData = {
    published: 14,
    views: 1845032,
    engaged: 86453,
    subscribers: 15234
};

// --- NEW STRATEGIC ANALYTICS MOCK DATA ---
export const DEFAULT_CONTENT_TO_CASH_DATA: ContentToCashData = {
    ctaClicks: 26543,
    leadsGenerated: 185,
    mqlsCreated: 42,
    pipelineValue: 126000,
};

export const DEFAULT_AI_RECOMMENDATIONS: AiRecommendation[] = [
    { id: 'rec-1', type: 'Topic', suggestion: "Follow-up on 'Metabolic Health'", reasoning: "Based on the high engagement of 'EP 024,' this topic is predicted to perform in the top 10% and drive high subscriber growth.", predictedPerformance: 'Top 10%' },
    { id: 'rec-2', type: 'Title', suggestion: "A/B Test: 'The Longevity Myth' vs. 'Unlocking Your Healthspan'", reasoning: "Titles with a 'myth-busting' or 'unlocking' angle have a 15% higher click-through rate with your audience.", predictedPerformance: 'High Engagement' },
    { id: 'rec-3', type: 'Guest', suggestion: "Collaborate with a sleep expert", reasoning: "Audience comments frequently mention sleep quality. A guest like Dr. Matthew Walker would resonate strongly.", predictedPerformance: 'Top 25%' },
];

export const DEFAULT_SHARE_OF_VOICE_DATA: ShareOfVoiceData[] = [
    { name: 'Your Brand', data: [{ date: 'Jan', client: 25, competitor1: 30, competitor2: 20 }, { date: 'Feb', client: 28, competitor1: 28, competitor2: 22 }, { date: 'Mar', client: 35, competitor1: 25, competitor2: 24 }] },
    { name: 'Competitor A', data: [{ date: 'Jan', client: 25, competitor1: 30, competitor2: 20 }, { date: 'Feb', client: 28, competitor1: 28, competitor2: 22 }, { date: 'Mar', client: 35, competitor1: 25, competitor2: 24 }] },
    { name: 'Competitor B', data: [{ date: 'Jan', client: 25, competitor1: 30, competitor2: 20 }, { date: 'Feb', client: 28, competitor1: 28, competitor2: 22 }, { date: 'Mar', client: 35, competitor1: 25, competitor2: 24 }] },
];

export const DEFAULT_OPPORTUNITY_MATRIX_TOPICS: OpportunityMatrixTopic[] = [
    { name: 'Biohacking for Beginners', audienceInterest: 90, competitiveSaturation: 30 },
    { name: 'Advanced Nootropics', audienceInterest: 60, competitiveSaturation: 85 },
    { name: 'History of Medicine', audienceInterest: 20, competitiveSaturation: 25 },
    { name: 'Cold Plunge Therapy', audienceInterest: 75, competitiveSaturation: 70 },
    { name: 'The Gut-Brain Axis', audienceInterest: 85, competitiveSaturation: 45 },
];

export const DEFAULT_AUDIENCE_INSIGHTS_DATA: AudienceInsightsData = {
    topQuestions: [
        "How can I apply this with a busy schedule?",
        "What are the best budget-friendly options for this?",
        "Can you do a deep dive on mitochondrial health?",
    ],
    sentimentTrend: [
        { date: 'Jan', value: 0.6 },
        { date: 'Feb', value: 0.65 },
        { date: 'Mar', value: 0.75 },
    ],
    painPointWordCloud: [
        { text: 'Time', value: 64 },
        { text: 'Confused', value: 45 },
        { text: 'Cost', value: 38 },
        { text: 'Energy', value: 52 },
        { text: 'Motivation', value: 31 },
        { text: 'Consistency', value: 48 },
    ],
};


// --- END NEW DATA ---


export const DEFAULT_AUDIENCE_DEMOGRAPHICS: AudienceDemographics = {
    locations: [
        { country: 'United States', value: 45 },
        { country: 'United Kingdom', value: 15 },
        { country: 'Canada', value: 10 },
        { country: 'Germany', value: 8 },
        { country: 'Australia', value: 7 },
    ],
    age: [
        { range: '18-24', value: 25 },
        { range: '25-34', value: 40 },
        { range: '35-44', value: 20 },
        { range: '45-54', value: 10 },
        { range: '55+', value: 5 },
    ],
    gender: [
        { type: 'Male', value: 58 },
        { type: 'Female', value: 40 },
        { type: 'Other', value: 2 },
    ],
    devices: [
        { type: 'Mobile', value: 78 },
        { type: 'Desktop', value: 20 },
        { type: 'Other', value: 2 },
    ],
    viewers: [
        { type: 'Returning', value: 65 },
        { type: 'New', value: 35 },
    ]
};
export const DEFAULT_ACTIVITIES: ActivityItem[] = [
    { id: "1", message: "EP 023 moved to Review", timestamp: "2 hours ago", type: "moved" },
    { id: "2", message: "Thumbnails uploaded", timestamp: "4 hours ago", type: "uploaded" },
    { id: "3", message: "Blog draft generated", timestamp: "1 day ago", type: "generated" }
];
export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
    { id: "submit-content", title: "Submit Content", icon: "📝", url: "#", description: "Submit content details and upload assets" },
    { id: "book-call", title: "Book Strategy Call", icon: "📅", url: "#", description: "Schedule a consultation" },
    { id: "share-assets", title: "Share Assets Folder", icon: "📁", url: "#", description: "Access your brand assets" },
    { id: "download-kit", title: "Download Brand Kit", icon: "🎨", url: "#", description: "Get your complete brand package" }
];
export const DEFAULT_NOTIFICATIONS: Notification[] = [
    { id: "5", title: "URGENT: Deadline Tomorrow", message: "EP 024 — Dr. Mehta on Longevity is due tomorrow.", type: "deadline", timestamp: "Just now", read: false, priority: "high", actionUrl: "#", actionText: "View Episode" },
    { id: "1", title: "New Submission Received", message: "EP 025 — Future of AI has been submitted for production", type: "submission", timestamp: "5 minutes ago", read: false, priority: "medium", actionUrl: "#", actionText: "View Submission" },
    { id: "2", title: "Status Update", message: "EP 024 — Dr. Mehta on Longevity moved to Review stage", type: "status_change", timestamp: "2 hours ago", read: false, priority: "medium", actionUrl: "#", actionText: "Review Episode" },
    { id: "3", title: "Deadline Approaching", message: "Shorts Set — EP 023 is due in 2 days", type: "deadline", timestamp: "1 day ago", read: true, priority: "medium", actionUrl: "#", actionText: "View Details" },
    { id: "4", title: "Production Complete", message: "EP 022 is now published.", type: "status_change", timestamp: "2 days ago", read: true, priority: "medium", actionUrl: "#", actionText: "View" }
];
export const DEFAULT_TOAST_NOTIFICATIONS: ToastNotification[] = [{ id: "toast-1", title: "New Submission", message: "EP 025 has been received and is now in production queue", type: "success", duration: 5000, actionText: "View", actionUrl: "#" }];
export const DEFAULT_ONBOARDING_STEPS: OnboardingStep[] = [
    { id: "welcome", title: "Welcome!", description: "This is your mission control for content. Let's take a quick tour of the key features.", target: "welcome-card", position: "bottom", action: "start-tour", actionText: "Start Tour" },
    { id: "system-page-nav", title: "Understand The Value", description: "This is the most important page. It shows the strategic content engine you've invested in. We'll explore it next.", target: "sidebar-item-system", position: "right", actionText: "Awesome" },
    { id: "submit-content", title: "Submit Your Content", description: "This is the most important button! Click here to open the submission form where you'll provide episode details and confirm your file uploads to Google Drive.", target: "submit-button", position: "bottom", actionText: "Got it" },
    { id: "kpi-overview", title: "Track Your Progress", description: "These KPIs give you a high-level view of your content pipeline. Click any tile to filter the episodes table below.", target: "kpi-tiles", position: "bottom", actionText: "Next" },
    { id: "kanban-board", title: "Production Pipeline", description: "See every piece of content move through our production pipeline, from Intake to Published. Click any card for a detailed view of its status and assets.", target: "kanban-section", position: "top", actionText: "Continue" },
    { id: "task-priority", title: "Focus on What Matters", description: "The colored bar on the left of each task shows its priority (Red for High, Yellow for Medium). This helps you see what our team is focused on at a glance.", target: "high-priority-task", position: "right", actionText: "Got it" },
    { id: "customize-layout", title: "Customize Your Layout", description: "Personalize your dashboard! Watch this automated demo to see how you can drag and drop sections using the grip icon to fit your workflow.", target: "draggable-section-handle", position: "right", actionText: "Got It!" },
    { id: "schedule", title: "Stay on Schedule", description: "Your content calendar shows all upcoming deadlines and publication dates at a glance. Never miss an important milestone.", target: "calendar-view", position: "top", actionText: "Next" },
    { id: "notifications", title: "Stay Informed", description: "Stay in the loop. We'll notify you about status updates, approaching deadlines, and new deliverables right here.", target: "notification-bell", position: "left", actionText: "Almost Done" },
    { id: "command-palette", title: "Power Up Your Workflow", description: "Power user? Press Cmd/Ctrl+K to open the Command Palette. Instantly navigate, search, or perform actions with just your keyboard.", target: "search-bar", position: "bottom", actionText: "Next" },
    { id: "quick-actions", title: "Quick Actions", description: "Need something fast? Use these Quick Actions for common tasks like booking a strategy call or accessing your brand assets.", target: "quick-actions", position: "top", actionText: "Finish Tour" }
];

export const SIDEBAR_ONBOARDING_STEPS: OnboardingStep[] = [
    { id: "sidebar-intro", title: "Main Navigation", description: "Let's take a quick look at the key pages in your dashboard.", target: "sidebar-item-overview", position: "right" },
    { id: "sidebar-system", title: "The FVS System", description: "This page explains the 'why' behind our process—the strategic engine that turns your content into a multi-platform brand.", target: "sidebar-item-system", position: "right" },
    { id: "sidebar-submissions", title: "Submissions", description: "Track all your past content submissions and their current production status at a high level.", target: "sidebar-item-submissions", position: "right" },
    { id: "sidebar-calendar", title: "Calendar", description: "Visualize your entire content schedule. Drag and drop ideas from the pipeline to plan your content calendar.", target: "sidebar-item-calendar", position: "right" },
    { id: "sidebar-deliverables", title: "Deliverables", description: "This is your hub for reviewing and approving all final assets like videos, graphics, and blog posts.", target: "sidebar-item-deliverables", position: "right" },
    { id: "sidebar-analytics", title: "Analytics", description: "Dive deep into your content's performance, from high-level KPIs to strategic market intelligence.", target: "sidebar-item-analytics", position: "right" },
    { id: "sidebar-help", title: "Help & Support", description: "Access FAQs, documentation, or get in touch with our support team right from here.", target: "sidebar-item-help", position: "right" }
];


export const DEFAULT_ONBOARDING_SETTINGS: OnboardingSettings = { enableOnboarding: true, showOnFirstVisit: true, allowSkip: true, autoAdvance: false, stepDelay: 500 };

// --- BILLING DATA ---
export const DEFAULT_SUBSCRIPTION_PLAN: SubscriptionPlan = {
    name: 'Growth Plan',
    price: 499,
    billingCycle: 'monthly',
    nextBillingDate: '2024-09-15T00:00:00.000Z',
    features: [
        'Up to 4 Podcasts per month',
        'Up to 20 Shorts per month',
        'Up to 4 Blogs per month',
        'Full Analytics Suite',
        'Dedicated Account Manager'
    ],
    usage: {
        podcasts: { current: 1, limit: 4 },
        shorts: { current: 10, limit: 20 },
        blogs: { current: 1, limit: 4 }
    }
};

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = {
    type: 'Visa',
    last4: '4242',
    expiryMonth: 12,
    expiryYear: 2026
};

export const DEFAULT_INVOICES: Invoice[] = [
    { id: 'inv_12345', date: '2024-08-15T00:00:00.000Z', amount: 499.00, status: 'Paid', downloadUrl: '#' },
    { id: 'inv_12344', date: '2024-07-15T00:00:00.000Z', amount: 499.00, status: 'Paid', downloadUrl: '#' },
    { id: 'inv_12343', date: '2024-06-15T00:00:00.000Z', amount: 499.00, status: 'Paid', downloadUrl: '#' }
];

export const generateEpisodeDetails = (id: string): EpisodePerformanceDetails => {
    // Generate deterministic but unique-looking data based on ID
    let seed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (min: number, max: number) => {
        const x = Math.sin(seed++) * 10000;
        return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
    };
    
    return {
        id: id,
        audienceRetentionData: Array.from({ length: 100 }, (_, i) => ({
            timestamp: i * 15, // 15 second intervals
            retention: Math.max(0, 100 - i * (0.5 + random(0, 50) / 100) - Math.sin(i / 5) * 5),
        })),
        trafficSources: [
            { source: 'YouTube', views: random(5000, 15000), percentage: random(40, 60) },
            { source: 'Spotify', views: random(2000, 8000), percentage: random(20, 30) },
            { source: 'Instagram', views: random(1000, 5000), percentage: random(10, 20) },
            { source: 'Website', views: random(500, 2000), percentage: random(5, 10) },
        ],
        keyMoments: [
            { timestamp: "00:05:21", description: "Audience engagement peak.", type: 'engagement' },
            { timestamp: "00:12:45", description: "Notable drop-off point.", type: 'dropoff' },
            { timestamp: "00:18:10", description: "Spike in shares and comments.", type: 'share_spike' }
        ]
    };
};

// --- HELP PAGE DATA ---
export const DEFAULT_FAQS: { q: string; a: string }[] = [
    {
        q: "What's the turnaround time for a standard podcast episode?",
        a: "Our standard turnaround time for a podcast episode is 5-7 business days from the moment you submit your raw files. This includes editing, mixing, mastering, and show note creation. Expedited services are available upon request."
    },
    {
        q: "How do I submit my content and assets?",
        a: "Simply click the 'Submit Content' button on your dashboard. This will open a form where you can provide details about your episode and confirm that you have uploaded your raw audio/video files to your dedicated Google Drive folder."
    },
    {
        q: "Can I request revisions for a delivered asset?",
        a: "Yes, each deliverable includes up to two rounds of minor revisions. You can provide feedback directly on the Kanban card for the specific asset. Major revisions may require a separate scope and timeline."
    },
    {
        q: "How does billing work?",
        a: "You can manage your subscription, view your current usage, and access all past invoices directly from the 'Billing' page in your dashboard. We use a secure payment provider for all transactions."
    },
    {
        q: "What formats are the final deliverables in?",
        a: "Podcasts are delivered as high-quality MP3 files. Shorts are delivered as MP4 files optimized for social platforms. Blogs are generated directly in your dashboard for you to review and schedule."
    },
     {
        q: "How does the AI Assistant work for blog posts?",
        a: "Our AI assistant analyzes your podcast content to generate a draft blog post, including an SEO-optimized title and meta description. Our human editors then review and refine this draft to ensure it meets our quality standards and matches your brand voice before it's sent to you for final approval."
    }
];

// --- SETTINGS DATA (PHASE 3) ---
export const DEFAULT_SETTINGS: Settings = {
  integrations: [
    { id: 'googleAnalytics', name: 'Google Analytics', description: 'Track real-time content performance and traffic.', isConnected: false, icon: React.createElement(Icons.Google, { className: 'w-6 h-6' }) },
    { id: 'crm', name: 'CRM (e.g., HubSpot)', description: 'Connect content to leads and pipeline value.', isConnected: false, icon: React.createElement(Icons.Users, { className: 'w-6 h-6' }) }
  ],
  competitors: {
    name1: 'Competitor A',
    name2: 'Competitor B'
  },
  goals: [
    { id: 'goal1', description: 'Quarterly YouTube Subscriber Growth', target: 20000, current: 15234, suffix: ' subs' },
    { id: 'goal2', description: 'Content-Generated MQLs', target: 50, current: 42, suffix: ' MQLs' },
  ],
  airtable: {
    apiKey: '',
    baseId: '',
    tableName: '',
  }
};