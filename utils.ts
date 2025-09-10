
import { Episode, KanbanCard, ContentPerformanceData, BlogPost } from './types';
import React from 'react';

export const getDueDateInfo = (dueDate: string): { status: 'past' | 'approaching' | 'safe'; relativeTime: string } => {
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) return { status: 'safe', relativeTime: `Due ${dueDate}` };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDateNormalized = new Date(date);
    dueDateNormalized.setHours(0, 0, 0, 0);

    const diffTime = dueDateNormalized.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let relativeTime = '';
    if (diffDays < -1) relativeTime = `${Math.abs(diffDays)} days overdue`;
    else if (diffDays === -1) relativeTime = 'Due yesterday';
    else if (diffDays === 0) relativeTime = 'Due today';
    else if (diffDays === 1) relativeTime = 'Due tomorrow';
    else relativeTime = `Due in ${diffDays} days`;

    if (diffDays < 0) return { status: 'past', relativeTime };
    if (diffDays <= 2) return { status: 'approaching', relativeTime };
    
    return { status: 'safe', relativeTime: `Due on ${date.toLocaleDateString()}` };
};


export const parseDueDate = (dueDateStr: string): Date | null => {
    const date = new Date(dueDateStr);
    return isNaN(date.getTime()) ? null : date;
};

export const getStatusStyle = (status: Episode['status'] | KanbanCard['type']) => {
    switch (status) {
        case "In Production": return `bg-yellow-500/10 text-yellow-400`;
        case "Review": return `bg-orange-500/10 text-orange-400`;
        case "Scheduled":
        case "Published": return `bg-green-500/10 text-green-400`;
        case "Podcast": return `bg-purple-500/10 text-purple-400`;
        case "Shorts": return `bg-blue-500/10 text-blue-400`;
        case "Blog": return `bg-teal-500/10 text-teal-400`;
        // Added a case for "Quote Graphic" to handle the new type.
        case "Quote Graphic": return `bg-pink-500/10 text-pink-400`;
        default: return `bg-gray-500/10 text-gray-400`;
    }
};

export const getBlogStatusPillStyle = (status: BlogPost['status']) => {
    switch (status) {
        case 'Needs Review':
            return 'bg-yellow-500/10 text-yellow-400 animate-pulse';
        case 'Scheduled':
            return 'bg-blue-500/10 text-blue-400';
        case 'Published':
            return 'bg-green-500/10 text-green-400';
        default:
            return 'bg-gray-500/10 text-gray-400';
    }
};

export const getPriorityStyle = (priority?: "High" | "Medium" | "Low") => {
    switch (priority) {
        case "High": return `border-red-500 text-red-400`;
        case "Medium": return `border-yellow-500 text-yellow-400`;
        case "Low": return `border-green-500 text-green-400`;
        default: return `border-gray-500 text-gray-400`;
    }
};

export const getPriorityIndicatorStyle = (priority?: "High" | "Medium" | "Low") => {
    switch (priority) {
        case "High": return `bg-red-500`;
        case "Medium": return `bg-yellow-500`;
        case "Low": return `bg-green-400`;
        default: return `bg-transparent`;
    }
};

export const getPriorityBadgeStyle = (priority?: "High" | "Medium" | "Low") => {
    switch (priority) {
        case "High": return `bg-red-500/10 text-red-400`;
        case "Medium": return `bg-yellow-500/10 text-yellow-400`;
        case "Low": return `bg-green-500/10 text-green-400`;
        default: return `bg-gray-500/10 text-gray-400`;
    }
};

export const formatNumber = (num: number): string => {
    if (Math.abs(num) >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (Math.abs(num) >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
    });
};

export const generatePerformanceData = (episodes: Episode[], timeRangeInDays: number): ContentPerformanceData[] => {
    const publishedEpisodes = episodes.filter(e => e.status === 'Published');
    
    return publishedEpisodes.map(episode => {
        const seed = episode.id + episode.title;
        let h = 1779033703 ^ seed.length;
        for (let i = 0; i < seed.length; i++) {
            h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
            h = (h << 13) | (h >>> 19);
        }
        const rand = () => {
            h = Math.imul(h ^ (h >>> 16), 2246822507);
            h = Math.imul(h ^ (h >>> 13), 3266489909);
            return ((h = h ^ (h >>> 16)) >>> 0) / 4294967296;
        };
        
        const today = new Date();
        const randomPastDays = Math.floor(rand() * 90) + 1;
        const publishDate = new Date();
        publishDate.setDate(today.getDate() - randomPastDays);
        
        const scale = timeRangeInDays / 90;
        const views = Math.floor((rand() * 245000 + 5000) * scale);
        const onTime = new Date(publishDate) <= new Date(episode.dueDate);
        
        return {
            id: episode.id,
            title: episode.title,
            type: episode.type,
            publishDate: publishDate.toISOString().split('T')[0],
            dueDate: episode.dueDate,
            status: episode.status,
            views,
            watchTimeHours: Math.round(views / (100 + rand() * 100)),
            audienceRetention: Math.floor(rand() * 65) + 20,
            viewTrend: Array.from({length: 30}, (_, i) => Math.floor(rand() * (i + 1) * (views / 1000))),
            subscribersGained: Math.floor(views / (80 + rand() * 40)),
            engagementRate: parseFloat((rand() * 4 + 1).toFixed(2)),
            avgViewDurationSeconds: Math.floor(rand() * 300) + 60,
            completionRate: Math.floor(rand() * 65) + 20,
            onTime: onTime,
            ctaClicks: Math.floor(views * (rand() * 0.05)),
        };
    }).filter(item => {
        const publishDate = new Date(item.publishDate);
        const now = new Date();
        const diffDays = (now.getTime() - publishDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= timeRangeInDays;
    });
};

export const safeToString = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
};

export const mapRecordToBlogPost = (record: { id: string; fields: Record<string, any> } | null | undefined): BlogPost | null => {
    if (!record || !record.fields || !safeToString(record.fields['Title'])) {
        console.warn('Skipping malformed or empty Airtable record:', record?.id);
        return null;
    }

    const { fields } = record;
    const tagsRaw = fields['Tags'];
    let tags: string[] = [];

    if (typeof tagsRaw === 'string' && tagsRaw.trim()) {
        tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    }
    
    const statusValue = safeToString(fields['Status']);
    const validStatuses: BlogPost['status'][] = ['Needs Review', 'Scheduled', 'Published'];
    const status: BlogPost['status'] = validStatuses.includes(statusValue as BlogPost['status']) ? (statusValue as BlogPost['status']) : 'Needs Review';

    return {
        id: record.id,
        title: safeToString(fields['Title']),
        content: safeToString(fields['Content']),
        status: status,
        generatedAt: safeToString(fields['Generated At']) || new Date().toISOString(),
        publishedAt: safeToString(fields['Published At']) || undefined,
        seoTitle: safeToString(fields['SEO Title']) || undefined,
        seoDescription: safeToString(fields['SEO Description']) || undefined,
        tags: tags,
    };
};

export const mapBlogPostToFields = (post: Partial<BlogPost>): Record<string, any> => {
    const fields: Record<string, any> = {};
    if (post.title !== undefined) fields['Title'] = post.title;
    if (post.content !== undefined) fields['Content'] = post.content;
    if (post.status !== undefined) fields['Status'] = post.status;
    if (post.publishedAt !== undefined) fields['Published At'] = post.publishedAt;
    if (post.seoTitle !== undefined) fields['SEO Title'] = post.seoTitle;
    if (post.seoDescription !== undefined) fields['SEO Description'] = post.seoDescription;
    if (post.tags !== undefined) fields['Tags'] = post.tags.join(', ');
    return fields;
};

export function mergeRefs<T>(...refs: (React.MutableRefObject<T> | React.LegacyRef<T>)[]): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}
