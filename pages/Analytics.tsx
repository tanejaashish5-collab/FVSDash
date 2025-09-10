

import React, { useMemo, useState } from 'react';
import { Episode, ContentPerformanceData, ToastNotification, AiRecommendation } from '../types';
import {
    DEFAULT_EPISODES,
    DEFAULT_FUNNEL_DATA,
    DEFAULT_PRODUCTION_CYCLE_DATA,
    DEFAULT_CONTENT_TO_CASH_DATA,
    DEFAULT_AI_RECOMMENDATIONS,
    DEFAULT_SHARE_OF_VOICE_DATA,
    DEFAULT_OPPORTUNITY_MATRIX_TOPICS,
    DEFAULT_AUDIENCE_INSIGHTS_DATA
} from '../constants';
import AnalyticsWidget from '../components/analytics/AnalyticsWidget';
import PerformanceTable from '../components/analytics/PerformanceTable';
import Icons from '../components/Icons';
import useIntersectionObserver from '../hooks/useIntersectionObserver';
import { formatNumber, generatePerformanceData } from '../utils';
import Sparkline from '../components/analytics/Sparkline';
import PerformanceFunnel from '../components/analytics/PerformanceFunnel';
import CycleTimeChart from '../components/analytics/CycleTimeChart';
import LeverageReport from '../components/analytics/LeverageReport';
import ContentToCashFunnel from '../components/analytics/ContentToCashFunnel';
import AiCoPilot from '../components/analytics/AiCoPilot';
import ShareOfVoiceChart from '../components/analytics/ShareOfVoiceChart';
import OpportunityMatrix from '../components/analytics/OpportunityMatrix';
import AudienceInsightMiner from '../components/analytics/AudienceInsightMiner';
import { useSettings } from '../lib/SettingsProvider';
import GoalProgressWidget from '../components/analytics/GoalProgressWidget';

const HOURLY_RATE = 75;

const TimeRangeButton: React.FC<{
    label: string;
    value: number;
    isActive: boolean;
    onClick: (value: number) => void;
}> = ({ label, value, isActive, onClick }) => (
    <button
        onClick={() => onClick(value)}
        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${
            isActive
                ? 'bg-[#F1C87A] text-black'
                : 'text-gray-400 bg-transparent hover:bg-[#2A2A2A] hover:text-white'
        }`}
    >
        {label}
    </button>
);

const KPICard: React.FC<{
    title: string;
    value: string;
    trend: number;
    sparklineData: number[];
}> = ({ title, value, trend, sparklineData }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isVisible = useIntersectionObserver(ref, { threshold: 0.2, triggerOnce: true });
    const isPositive = trend >= 0;

    return (
        <div ref={ref} className={`p-5 rounded-lg border flex flex-col justify-between transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} bg-[#1A1A1A] border-[#2A2A2A]`}>
            <div>
                 <p className="text-sm text-gray-400">{title}</p>
                 <div className="flex items-baseline justify-between mt-2">
                     <p className="font-bold text-white text-3xl">{value}</p>
                     <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? <Icons.TrendUp/> : <Icons.TrendDown/>}
                        <span>{Math.abs(trend).toFixed(1)}%</span>
                    </div>
                 </div>
            </div>
            <div className="mt-4 -mb-2 -mx-2">
                 <Sparkline data={sparklineData} strokeColor={isPositive ? '#4ADE80' : '#F87171'} />
            </div>
        </div>
    );
};

const AnalyticsPage: React.FC<{ 
    episodes: Episode[]; 
    onViewEpisodeDetails: (episode: ContentPerformanceData) => void;
    addToast: (toast: Omit<ToastNotification, 'id' | 'duration'>) => void; 
}> = ({ episodes, onViewEpisodeDetails, addToast }) => {
    const [timeRange, setTimeRange] = useState(30);
    const { settings } = useSettings();
    
    const performanceData = useMemo(() => generatePerformanceData(episodes, timeRange), [episodes, timeRange]);
    
    const summaryKPIs = useMemo(() => {
        if (performanceData.length === 0) return { totalViews: 0, totalSubscribersGained: 0, ctaClicks: 0, hoursSaved: 0, costSavings: 0 };
        const totalViews = performanceData.reduce((sum, item) => sum + item.views, 0);
        const totalSubscribersGained = performanceData.reduce((sum, item) => sum + item.subscribersGained, 0);
        const ctaClicks = performanceData.reduce((sum, item) => sum + item.ctaClicks, 0);
        const podcastsCount = performanceData.filter(p => p.type === 'Podcast').length;
        const shortsCount = performanceData.filter(p => p.type === 'Shorts').length;
        const hoursSaved = (podcastsCount * 15) + (shortsCount * 0.5);
        const costSavings = hoursSaved * HOURLY_RATE;
        return { totalViews, totalSubscribersGained, ctaClicks, hoursSaved, costSavings };
    }, [performanceData]);

    const handleAddToPipeline = (rec: AiRecommendation) => {
        // In a real app, this would dispatch an action to update global state.
        // For this phase, we'll simulate the action with a toast.
        addToast({
            title: "Added to Pipeline",
            message: `"${rec.suggestion}" has been added to your content ideas.`,
            type: "success"
        });
    };

    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-[#0B0B0B]">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-start mb-10">
                <div>
                    <p className="text-lg font-semibold text-[#F1C87A]">BUSINESS INTELLIGENCE</p>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mt-1">Performance Analytics</h1>
                </div>
                <div className="flex items-center gap-2 mt-4 md:mt-0 bg-[#121212] p-1.5 rounded-lg border border-[#2A2A2A]">
                    <TimeRangeButton label="7D" value={7} isActive={timeRange === 7} onClick={setTimeRange} />
                    <TimeRangeButton label="30D" value={30} isActive={timeRange === 30} onClick={setTimeRange} />
                    <TimeRangeButton label="90D" value={90} isActive={timeRange === 90} onClick={setTimeRange} />
                </div>
            </div>

            <div className="space-y-12">
                {settings.goals.length > 0 && (
                    <AnalyticsWidget title="Quarterly Goal Progress" subtitle="Tracking against your key business objectives.">
                        <GoalProgressWidget goals={settings.goals} />
                    </AnalyticsWidget>
                )}

                {/* Tier 1: The Snapshot */}
                <AnalyticsWidget title="Performance Snapshot" subtitle={`Key business outcomes for the last ${timeRange} days.`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <KPICard title="Total Views" value={formatNumber(summaryKPIs.totalViews)} trend={5.2} sparklineData={[...Array(30)].map(() => Math.random() * 100)} />
                        <KPICard title="Subs Gained" value={formatNumber(summaryKPIs.totalSubscribersGained)} trend={12.1} sparklineData={[...Array(30)].map(() => Math.random() * 100)} />
                        <KPICard title="Total CTA Clicks" value={formatNumber(summaryKPIs.ctaClicks)} trend={8.5} sparklineData={[...Array(30)].map(() => Math.random() * 100)} />
                    </div>
                </AnalyticsWidget>

                <LeverageReport hours={summaryKPIs.hoursSaved} cost={summaryKPIs.costSavings} hourlyRate={HOURLY_RATE} />

                {/* Tier 2: The Core Story */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <AnalyticsWidget 
                        title="Performance Funnel" 
                        subtitle="From publication to growth."
                        tooltipText="This funnel visualizes your content's journey from publication to audience growth. It tracks how many pieces of content you published, the total views they generated, how many people engaged (likes/comments), and how many new subscribers you gained as a result."
                    >
                        <PerformanceFunnel data={DEFAULT_FUNNEL_DATA} />
                    </AnalyticsWidget>
                    <AnalyticsWidget 
                        title="Content-to-Cash Funnel" 
                        subtitle="Connecting content to revenue."
                        tooltipText="This funnel connects your content directly to business outcomes. It tracks CTA clicks from your content, how many leads were generated in your CRM, how many became Marketing Qualified Leads (MQLs), and the estimated pipeline value added."
                    >
                        <ContentToCashFunnel data={DEFAULT_CONTENT_TO_CASH_DATA} />
                    </AnalyticsWidget>
                </div>
                
                <AnalyticsWidget 
                    title="Production Cycle" 
                    subtitle="Average time from intake to publish."
                    tooltipText="This chart shows the average number of days each piece of content spends in a production stage. Lower numbers indicate greater efficiency. The total production time is the average from initial intake to final publication."
                >
                    <CycleTimeChart data={DEFAULT_PRODUCTION_CYCLE_DATA} />
                </AnalyticsWidget>

                {/* Tier 3: The Deep Dive */}
                <AnalyticsWidget 
                    title="Top Content" 
                    subtitle={`Best performing content over the last ${timeRange} days.`}
                    tooltipText="This table ranks your individual pieces of content by performance. Use it to identify what topics, formats, and styles are resonating most with your audience so you can create more of what works."
                >
                    <PerformanceTable data={performanceData} onRowClick={onViewEpisodeDetails} />
                </AnalyticsWidget>
                
                {/* Tier 4: Strategic Intelligence */}
                 <div className="pt-8 border-t border-[#2A2A2A]/50">
                    <div className="text-center mb-12">
                        <p className="text-lg font-semibold text-[#F1C87A]">STRATEGIC INTELLIGENCE</p>
                        <h1 className="text-4xl font-bold text-white mt-1">From Data to Decisions</h1>
                        <p className="text-gray-400 mt-2 max-w-2xl mx-auto">Forward-looking insights to guide your next move and win your market.</p>
                    </div>
                    <div className="space-y-12">
                        <AnalyticsWidget 
                            title="AI Co-Pilot Recommendations" 
                            subtitle="Your next winning content ideas, powered by data."
                            tooltipText="Our AI analyzes your past content performance to suggest new topics, titles, and guests that are statistically likely to perform well with your audience. Use these data-driven ideas to de-risk future content creation."
                        >
                            <AiCoPilot recommendations={DEFAULT_AI_RECOMMENDATIONS} onActionClick={handleAddToPipeline} />
                        </AnalyticsWidget>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <AnalyticsWidget 
                                title="Market Intelligence: Share of Voice" 
                                subtitle="Your content's performance vs. competitors."
                                tooltipText="This chart compares your brand's content engagement on key topics against your main competitors. It helps you understand your market position and identify areas where you are leading or lagging."
                            >
                                <ShareOfVoiceChart data={DEFAULT_SHARE_OF_VOICE_DATA} competitors={settings.competitors} />
                            </AnalyticsWidget>
                            <AnalyticsWidget 
                                title="Market Intelligence: Opportunity Matrix" 
                                subtitle="Find your next content goldmine."
                                tooltipText="This 2x2 matrix helps you find content 'goldmines.' Topics in the top-left quadrant have high audience interest but low competition, making them strategic opportunities for growth. Click any point for detailed analysis."
                            >
                                <OpportunityMatrix data={DEFAULT_OPPORTUNITY_MATRIX_TOPICS} />
                            </AnalyticsWidget>
                        </div>
                        
                        <AnalyticsWidget 
                            title="Audience Insight Miner" 
                            subtitle="Uncover what your audience truly wants."
                            tooltipText="This tool analyzes comments from your audience across platforms to extract qualitative data. 'Top Questions' are direct content ideas, 'Sentiment' tracks audience happiness, and 'Pain Points' reveals what problems your audience wants you to solve."
                        >
                            <AudienceInsightMiner data={DEFAULT_AUDIENCE_INSIGHTS_DATA} />
                        </AnalyticsWidget>
                    </div>
                </div>

            </div>
        </main>
    );
};

export default AnalyticsPage;