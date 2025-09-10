import React from 'react';
import { ContentPerformanceData, EpisodePerformanceDetails } from '../types';
import { generateEpisodeDetails } from '../constants';
import Icons from '../components/Icons';
import { formatNumber, getStatusStyle } from '../utils';
import AnalyticsWidget from '../components/analytics/AnalyticsWidget';
import AudienceRetentionChart from '../components/analytics/AudienceRetentionChart';

const DetailKPICard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]">
        <div className="flex items-center gap-3">
            <div className="text-[#F1C87A]">{icon}</div>
            <div>
                <p className="text-sm text-gray-400">{title}</p>
                <p className="text-xl font-bold text-white">{value}</p>
            </div>
        </div>
    </div>
);

const TrafficSourceItem: React.FC<{ source: string, views: number, percentage: number, maxPercentage: number }> = ({ source, views, percentage, maxPercentage }) => (
    <div>
        <div className="flex justify-between items-center mb-1 text-sm">
            <span className="font-medium text-gray-300">{source}</span>
            <span className="text-gray-400">{formatNumber(views)}</span>
        </div>
        <div className="h-2 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
            <div
                className="h-full bg-[#F1C87A] rounded-full"
                style={{ width: `${(percentage / maxPercentage) * 100}%` }}
            />
        </div>
    </div>
);

const KeyMomentItem: React.FC<{ type: string; timestamp: string; description: string; }> = ({ type, timestamp, description }) => {
    const iconMap = {
        engagement: <Icons.Heart className="text-pink-400" />,
        share_spike: <Icons.Users className="text-blue-400" />,
        dropoff: <Icons.TrendDown className="text-red-400" />
    };
    return (
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#2A2A2A] flex items-center justify-center mt-1">
                {iconMap[type as keyof typeof iconMap] || <Icons.Star />}
            </div>
            <div>
                <p className="font-semibold text-white">
                    <span className="font-mono bg-[#2A2A2A] px-2 py-0.5 rounded-md text-xs mr-2">{timestamp}</span>
                    {description}
                </p>
            </div>
        </div>
    );
}

const EpisodeDetailPage: React.FC<{ 
    episodePerformance: ContentPerformanceData;
    onBack: () => void;
}> = ({ episodePerformance, onBack }) => {
    const details = generateEpisodeDetails(episodePerformance.id);
    
    const maxTrafficPercentage = Math.max(...details.trafficSources.map(s => s.percentage), 0);
    
    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-[#0B0B0B]">
             {/* Header */}
            <div className="mb-8">
                <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-4">
                    <Icons.ChevronLeft /> Back to Analytics
                </button>
                <div className="flex items-start gap-4">
                    <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyle(episodePerformance.type)}`}>{episodePerformance.type}</span>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mt-2">{episodePerformance.title}</h1>
                        <p className="text-gray-400 mt-1">Published on {new Date(episodePerformance.publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <DetailKPICard title="Total Views" value={formatNumber(episodePerformance.views)} icon={<Icons.Overview />} />
                <DetailKPICard title="Watch Time (hrs)" value={formatNumber(episodePerformance.watchTimeHours)} icon={<Icons.ClockSolid />} />
                <DetailKPICard title="Subs Gained" value={`+${formatNumber(episodePerformance.subscribersGained)}`} icon={<Icons.Users />} />
                <DetailKPICard title="Engagement Rate" value={`${episodePerformance.engagementRate.toFixed(1)}%`} icon={<Icons.Heart />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <AnalyticsWidget title="Audience Retention" subtitle="How well this episode held viewers' attention.">
                        <AudienceRetentionChart data={details.audienceRetentionData} />
                    </AnalyticsWidget>
                </div>
                <div className="space-y-8">
                    <AnalyticsWidget title="Traffic Sources" subtitle="Where your audience came from.">
                        <div className="space-y-4">
                            {details.trafficSources.map(source => (
                                <TrafficSourceItem key={source.source} {...source} maxPercentage={maxTrafficPercentage}/>
                            ))}
                        </div>
                    </AnalyticsWidget>
                    <AnalyticsWidget title="Key Moments" subtitle="Highlights of audience engagement.">
                        <div className="space-y-5">
                            {details.keyMoments.map(moment => <KeyMomentItem key={moment.timestamp} {...moment} />)}
                        </div>
                    </AnalyticsWidget>
                     <AnalyticsWidget title="Conversion / ROI" subtitle="Connecting content to conversions.">
                           <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                                <Icons.Target className="w-12 h-12 text-[#F1C87A] mb-3"/>
                                <p className="text-4xl font-bold text-white">{formatNumber(episodePerformance.ctaClicks)}</p>
                                <p className="text-gray-400">Total CTA Clicks</p>
                           </div>
                        </AnalyticsWidget>
                </div>
            </div>

        </main>
    );
};

export default EpisodeDetailPage;