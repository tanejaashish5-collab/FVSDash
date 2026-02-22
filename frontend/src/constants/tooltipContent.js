/**
 * Centralized Tooltip Content Map
 * All tooltip strings for the Aura Contextual Help System
 * 40+ entries across all pages
 */

export const tooltipContent = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OVERVIEW PAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  overview: {
    activeProjects: "Total episodes currently moving through your production pipeline across all stages.",
    publishedLast30d: "Content successfully published to YouTube, TikTok, or other platforms in the last 30 days.",
    totalAssets: "All media files stored — video, audio, thumbnails, scripts, and design files.",
    estRoi: "Estimated return on investment calculated from ad revenue, sponsorships, and content value over the last 30 days.",
    productionPipeline: "Drag cards between columns to update episode status. Click any card for full details.",
    upcomingSchedule: "Episodes queued and scheduled for publishing. Dates are pulled from your calendar.",
    submitNewContent: "Start a new episode submission — upload files, add metadata, and enter the production queue.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SUBMISSIONS PAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  submissions: {
    newSubmission: "Upload a new video file or podcast episode to begin the production workflow.",
    statusFilter: "Filter submissions by their current stage: Intake, Editing, Design, or Published.",
    thumbnailGallery: "Select the primary thumbnail that will be used when publishing. Green ring = active selection.",
    uploadThumbnail: "Add custom thumbnail images. Supports JPG, PNG, WebP up to 10MB.",
    scriptField: "The full episode script or show notes. Used by editors and the AI tools for context.",
    tagsField: "Add searchable tags to organise and find this episode later.",
    submissionTitle: "The display title for this episode. Used in publishing and internal tracking.",
    description: "A brief summary of the episode content. Shows in your dashboard and publishing previews.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CALENDAR PAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  calendar: {
    scheduledBadge: "This episode is confirmed and queued in your publishing schedule.",
    publishedBadge: "This episode has already gone live on its connected platform.",
    draftBadge: "This episode is not yet scheduled — still in production.",
    addToCalendar: "Set a specific publish date and time for this episode.",
    calendarView: "Visual overview of your content schedule. Click any date to see scheduled items.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DELIVERABLES PAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  deliverables: {
    deliverableStatus: "Track whether each promised deliverable (video, short, blog) has been completed and handed off.",
    markComplete: "Confirms this deliverable has been finished and is ready for client review or publishing.",
    deliverableType: "The format of this deliverable: full video, short clip, blog post, or social graphic.",
    dueDate: "The deadline for completing this deliverable. Overdue items are highlighted in red.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ASSETS PAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  assets: {
    uploadAsset: "Add any media file to your asset library: video, audio, image, or document.",
    assetTypeFilter: "Filter your library by file type to find what you need faster.",
    download: "Download this asset file to your local device.",
    copyUrl: "Copy the direct file URL for use in scripts, embeds, or sharing with editors.",
    assetPreview: "Quick preview of the asset. Click to open full-size view.",
    fileSize: "The storage size of this file. Large files may take longer to load.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PUBLISHING PAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  publishing: {
    connectPlatform: "Link your YouTube, TikTok, or Instagram account to enable one-click publishing.",
    publishNow: "Immediately push this episode live to the connected platform.",
    schedulePublish: "Set a future date/time for this episode to automatically go live.",
    platformStatus: "Shows whether your OAuth connection to this platform is active and healthy.",
    publishingQueue: "Episodes waiting to be published. Ordered by scheduled time.",
    retryPublish: "Attempt to publish again if the previous attempt failed.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BLOG PAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  blog: {
    generateWithAi: "Use the AI to automatically draft a blog post from your episode script or transcript.",
    seoScore: "An AI-calculated score estimating how well this post will rank in search engines.",
    publishToBlog: "Push this post live to your connected blog platform (WordPress, Ghost, etc.).",
    blogTitle: "The headline for your blog post. Keep it under 60 characters for best SEO.",
    excerpt: "A short summary shown in search results and social shares. Aim for 150-160 characters.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STRATEGY LAB
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  strategyLab: {
    contentAngle: "The unique hook or angle for this piece of content. Defines how it stands out from competitors.",
    targetAudience: "Describe who this content is made for. The AI uses this to personalise strategy suggestions.",
    generateStrategy: "Runs an AI analysis of your topic and audience to produce a full content strategy brief.",
    competitorAnalysis: "Enter competitor channels to see what content is performing well in your niche.",
    hookVariants: "AI-generated alternative hooks for your title or thumbnail text. Test multiple options.",
    researchPhase: "Deep-dive research into your topic. The AI gathers data, trends, and talking points.",
    outlinePhase: "Structured outline for your content. Defines sections, key points, and flow.",
    scriptPhase: "Full script generation based on your outline. Ready for recording or teleprompter.",
    metadataPhase: "SEO-optimized title, description, and tags generated by AI for maximum discoverability.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AI VIDEO LAB
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  videoLab: {
    scriptInput: "Paste your full episode script here. The AI will use it to generate voiceover, visuals, and edits.",
    voiceSelection: "Choose the AI voice model for your narration. Powered by ElevenLabs.",
    generateVoiceover: "Creates a full AI-narrated audio track from your script in the selected voice.",
    sceneBreakdown: "The AI splits your script into individual scenes, each matched to a visual or B-roll suggestion.",
    exportPackage: "Downloads all generated assets — audio, scenes, and captions — as a ready-to-edit package.",
    videoProvider: "Select the AI video generation model: Google Veo for high-quality video.",
    imageProvider: "Choose the AI image model for thumbnails and graphics: OpenAI GPT-Image or Gemini.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FVS SYSTEM
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  fvsSystem: {
    fvsScore: "ForgeVoice Score: a composite rating of your channel's content consistency, quality, and growth trajectory.",
    velocityMetric: "How fast your content production is moving compared to your set targets.",
    leverageIndex: "Measures how much output you're generating relative to the time and resources invested.",
    automationLevel: "Controls how much the FVS Brain operates autonomously vs. requiring your approval.",
    proposeIdeas: "Triggers the AI to generate new content ideas based on your channel profile and trends.",
    ideaQueue: "Backlog of AI-proposed ideas waiting for your review and approval.",
    channelProfile: "Your brand's voice, style, and content preferences. Guides all AI-generated suggestions.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ANALYTICS PAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  analytics: {
    views30d: "Total video views across all connected platforms in the last 30 days.",
    watchTime: "Cumulative minutes watched across all episodes. Higher = stronger algorithm signals.",
    ctr: "Click-Through Rate: the percentage of people who clicked your thumbnail after seeing it in their feed.",
    retention: "Average percentage of each video that viewers watch before leaving. 50%+ is strong.",
    revenue: "Estimated ad revenue and sponsorship income attributed to this period.",
    subscribers: "Net new subscribers gained in the selected time period.",
    engagementRate: "Likes, comments, and shares relative to total views. Higher = more engaged audience.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ROI CENTER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  roiCenter: {
    roiCalculation: "Compares your content production costs against revenue generated to show true return.",
    costPerVideo: "Total spend (editing, design, tools) divided by number of videos published.",
    revenuePerVideo: "Average income generated per published video over the selected period.",
    paybackPeriod: "Estimated time until your content investment recoups its production cost.",
    totalInvestment: "Cumulative spend on content production, tools, and services.",
    totalReturn: "Cumulative revenue attributed to your published content.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BILLING PAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  billing: {
    currentPlan: "Your active ForgeVoice Studio subscription tier and its included features.",
    usageThisMonth: "Credits or API calls consumed so far in the current billing cycle.",
    upgradePlan: "Move to a higher tier for more projects, storage, AI credits, and connected platforms.",
    invoiceHistory: "Download PDF invoices for any previous billing period.",
    paymentMethod: "The card or payment source used for your subscription.",
    nextBillingDate: "When your next subscription payment will be processed.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SETTINGS PAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  settings: {
    notificationPreferences: "Control which events trigger email or in-app alerts (new submissions, publish confirmations, etc.).",
    defaultPlatform: "Set which publishing platform is pre-selected when you schedule new episodes.",
    brandKit: "Upload your logo, brand colours, and fonts so AI-generated assets stay on-brand.",
    apiKeys: "Connect third-party services like ElevenLabs or Make.com using their API credentials.",
    timezone: "All scheduled publish times use this timezone. Keep it synced with your target audience.",
    channelName: "Your channel or brand name. Used in AI-generated content and publishing metadata.",
    channelDescription: "A brief description of your channel's focus and style. Helps AI understand your brand.",
    llmProvider: "Choose which AI model powers text generation: Gemini, OpenAI GPT, or Anthropic Claude.",
    voiceProvider: "Select the voice synthesis service for AI narration: ElevenLabs or OpenAI TTS.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COMMON / SHARED
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  common: {
    save: "Save your changes to the server. Changes are not persisted until you click Save.",
    cancel: "Discard changes and return to the previous view.",
    delete: "Permanently remove this item. This action cannot be undone.",
    edit: "Modify this item's details.",
    refresh: "Reload the latest data from the server.",
    export: "Download this data as a file for external use.",
    search: "Filter the list by searching titles, tags, or descriptions.",
    sortBy: "Change the order items are displayed in the list.",
  },
};

export default tooltipContent;
