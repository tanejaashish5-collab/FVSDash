import React from "react";

// --- AUTH TYPES ---
export interface UserProfile {
    id: string;
    name: string;
    initials: string;
    avatar?: string;
    email?: string;
}

export interface AuthContextType {
    user: UserProfile | null;
    isAdmin: boolean;
    isImpersonating: boolean;
    adminUser: UserProfile | null; // The admin user, even when impersonating
    login: () => void;
    loginAsAdmin: () => void;
    logout: () => void;
    impersonate: (clientProfile: UserProfile) => void;
    stopImpersonating: () => void;
}


// --- CONSOLIDATED TYPES ---
export interface Episode {
    id: string;
    title: string;
    description?: string;
    guestName?: string;
    tags?: string;
    hashtags?: string;
    // Added "Quote Graphic" to the list of valid types.
    type: "Podcast" | "Shorts" | "Blog" | "Quote Graphic";
    status: "New" | "In Production" | "Review" | "Scheduled" | "Published";
    dueDate: string;
    priority?: "High" | "Medium" | "Low";
    column?: string;
}
export interface Submission {
  id: string;
  submittedAt: string; // ISO string
  title: string;
  guestName?: string;
  type: "Podcast" | "Shorts" | "Blog";
  status: Episode['status'];
}
export interface KPIData {
    newSubmissions: { value: number, trend: 'up' | 'down', change: string };
    inProduction: { value: number, trend: 'up' | 'down', change: string };
    readyForReview: { value: number, trend: 'up' | 'down', change: string };
    published: { value: number, trend: 'up' | 'down', change: string };
}
export interface ActivityItem {
    id: string;
    message: string;
    timestamp: string;
    type: "moved" | "uploaded" | "generated" | "scheduled";
}
export interface KanbanCard {
    id:string;
    title: string;
    // Added "Quote Graphic" to the list of valid types.
    type: "Podcast" | "Shorts" | "Blog" | "Quote Graphic";
    dueDate: string;
    priority?: "High" | "Medium" | "Low";
    description: string;
    assignees: { name: string; initials: string; avatar?: string; }[];
    links: { name: string; url: string; }[];
}
export interface SidebarItem {
    id: string;
    name: string;
    icon: React.ReactNode;
}
export interface QuickAction {
    id: string;
    title: string;
    icon: string;
    url?: string;
    description?: string;
}
export interface Notification {
    id: string;
    title: string;
    message: string;
    type: "submission" | "status_change" | "deadline" | "general";
    timestamp: string;
    read: boolean;
    priority: "high" | "medium" | "low";
    actionUrl?: string;
    actionText?: string;
}
export interface ToastNotification {
    id: string;
    title: string;
    message: string;
    type: "success" | "warning" | "error" | "info";
    duration: number;
    actionText?: string;
    actionUrl?: string;
}
export interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    target: string;
    position: "top" | "bottom" | "left" | "right";
    action?: string;
    actionText?: string;
}
export interface OnboardingSettings {
    enableOnboarding: boolean;
    showOnFirstVisit: boolean;
    allowSkip: boolean;
    autoAdvance: boolean;
    stepDelay: number;
}
export interface Command {
    id: string;
    name: string;
    category: 'Navigation' | 'Actions' | 'Theme';
    icon: React.ReactNode;
    action: () => void;
}
export interface ContentPerformanceData {
  id: string;
  title: string;
  // Added "Quote Graphic" to the list of valid types.
  type: 'Podcast' | 'Shorts' | 'Blog' | 'Quote Graphic';
  publishDate: string; // ISO string
  dueDate: string; // ISO string
  views: number;
  watchTimeHours: number;
  audienceRetention: number;
  viewTrend: number[]; // Array of numbers for the sparkline
  // Added for new dashboard
  subscribersGained: number;
  engagementRate: number;
  avgViewDurationSeconds: number;
  // Added for new analytics page
  completionRate: number;
  onTime: boolean;
  ctaClicks: number;
  status: Episode['status'];
}

export interface AudienceDemographics {
    locations: { country: string; value: number }[];
    age: { range: string; value: number }[];
    gender: { type: string; value: number }[];
    devices: { type: string; value: number }[];
    viewers: { type: string; value: number }[];
}

export interface PlatformData {
    name: 'YouTube' | 'Spotify' | 'Apple Podcasts' | 'Website';
    views: number;
}

export interface PlatformPerformance {
    name: PlatformData['name'];
    views: number;
    watchTime: number;
    engagementRate: number;
    ctaClicks: number;
    subsGained: number;
}

export interface Insight {
    id: string;
    text: string;
    icon: React.ReactNode;
}

export interface FunnelData {
    published: number;
    views: number;
    engaged: number;
    subscribers: number;
}

export interface ProductionCycleData {
    stage: string;
    avgTimeDays: number;
    trend?: 'up' | 'down' | 'neutral';
    total?: number;
}

// --- NEW STRATEGIC ANALYTICS TYPES ---

export interface ContentToCashData {
    ctaClicks: number;
    leadsGenerated: number;
    mqlsCreated: number;
    pipelineValue: number;
}

export interface AiRecommendation {
    id: string;
    type: 'Topic' | 'Title' | 'Guest';
    suggestion: string;
    reasoning: string;
    predictedPerformance: 'Top 10%' | 'Top 25%' | 'High Engagement';
}

export interface ShareOfVoiceDataPoint {
    date: string; // e.g., 'Jan', 'Feb', 'Mar'
    client: number;
    competitor1: number;
    competitor2: number;
}
export interface ShareOfVoiceData {
    name: string;
    data: ShareOfVoiceDataPoint[];
}

export interface OpportunityMatrixTopic {
    name: string;
    audienceInterest: number; // 0-100
    competitiveSaturation: number; // 0-100
}

export interface AudienceInsightsData {
    topQuestions: string[];
    sentimentTrend: { date: string; value: number }[]; // value from -1 to 1
    painPointWordCloud: { text: string; value: number }[];
}

// --- ROI Center Types ---
export interface ROIPillar {
    id: 'time' | 'staff' | 'content' | 'brand' | 'analytics';
    title: string;
    icon: React.ReactNode;
    description: string;
    value: number;
    valuePrefix?: string;
    valueSuffix?: string;
    breakdown: {
        without: string;
        with: string;
    };
    calculation: string;
}

export interface ROIData {
    time: ROIPillar & { yearlySavingsRange: [number, number] };
    staff: ROIPillar & { savingsRange: [number, number] };
    content: ROIPillar;
    brand: ROIPillar;
    analytics: ROIPillar & { pipelineValue: number };
}

// --- BILLING TYPES ---
export interface SubscriptionPlan {
    name: string;
    price: number;
    billingCycle: 'monthly' | 'yearly';
    nextBillingDate: string; // ISO string
    features: string[];
    usage: {
        podcasts: { current: number; limit: number };
        shorts: { current: number; limit: number };
        blogs: { current: number; limit: number };
    };
}

export interface PaymentMethod {
    type: 'Visa' | 'Mastercard' | 'Amex';
    last4: string;
    expiryMonth: number;
    expiryYear: number;
}

export interface Invoice {
    id: string;
    date: string; // ISO string
    amount: number;
    status: 'Paid' | 'Due' | 'Overdue';
    downloadUrl: string;
}

// --- EPISODE DETAIL TYPES ---
export interface AudienceRetentionPoint {
    timestamp: number; // in seconds
    retention: number; // percentage
}

export interface TrafficSource {
    source: 'YouTube' | 'Spotify' | 'Instagram' | 'Website' | 'Other';
    views: number;
    percentage: number;
}

export interface KeyMoment {
    timestamp: string; // e.g., "00:15:32"
    description: string;
    type: 'engagement' | 'share_spike' | 'dropoff';
}

export interface EpisodePerformanceDetails {
    id: string;
    audienceRetentionData: AudienceRetentionPoint[];
    trafficSources: TrafficSource[];
    keyMoments: KeyMoment[];
}

// --- BLOG TYPES ---
export interface BlogPost {
  id: string;
  title: string;
  content: string;
  status: 'Needs Review' | 'Scheduled' | 'Published';
  generatedAt: string; // ISO string
  publishedAt?: string; // ISO string
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
}

// --- ASSET TYPES ---
export interface Asset {
    id: string;
    name: string;
    type: 'Image' | 'Video' | 'Audio' | 'Document';
    fileType: string; // e.g., 'jpg', 'mp4', 'pdf'
    size: string; // e.g., '2.5 MB'
    url: string; // Direct download/preview URL
    thumbnailUrl: string; // URL for the preview image
    createdAt: string; // ISO string
    category: 'Brand Kit' | 'Source Files' | 'Final Deliverables';
    episodeId?: string;
    episodeTitle?: string;
}

// --- CALENDAR TYPES ---
export interface UnscheduledItem {
    id: string;
    title: string;
    description: string;
    // Added "Quote Graphic" to the list of valid types.
    type: "Podcast" | "Shorts" | "Blog" | "Quote Graphic";
}

export interface SuggestedSchedule {
  itemId: string;
  suggestedDate: string;
  reasoning: string;
}

// --- DELIVERABLES HUB TYPES ---
export interface Deliverable {
  id: string;
  episodeId: string;
  episodeTitle: string;
  type: "Blog" | "Shorts" | "Quote Graphic";
  title: string;
  status: 'Needs Review' | 'Approved' | 'Revisions Requested';
  previewUrl?: string; // for image/video
  content?: string; // for blog
  createdAt: string; // ISO string
}

// --- SETTINGS TYPES (PHASE 3) ---
export interface Goal {
  id: string;
  description: string;
  target: number;
  current: number;
  suffix?: string;
}

export interface Integration {
  id: 'googleAnalytics' | 'crm';
  name: string;
  description: string;
  isConnected: boolean;
  icon: React.ReactNode;
}

export interface Settings {
  integrations: Integration[];
  competitors: { name1: string; name2: string; };
  goals: Goal[];
  airtable: {
    apiKey: string;
    baseId: string;
    tableName: string;
  }
}

// --- STRATEGY LAB TYPES ---
export interface StrategyLabResult {
    score: number;
    quadrant: 'Goldmine' | 'Tough Competition' | 'Niche Down' | 'Explore Cautiously';
    pros: string[];
    cons: string[];
    recommendation: string;
}
