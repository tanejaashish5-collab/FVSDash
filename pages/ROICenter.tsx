

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Icons from '../components/Icons';
import { DEFAULT_CONTENT_TO_CASH_DATA, DEFAULT_AUDIENCE_INSIGHTS_DATA } from '../constants';
import { ToastNotification } from '../types';
import AnimatedNumber from '../components/analytics/AnimatedNumber';
import useIntersectionObserver from '../hooks/useIntersectionObserver';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { useSettings } from '../lib/SettingsProvider';
import SentimentTrendChart from '../components/analytics/SentimentTrendChart';

interface ROIPillarCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    value: number;
    prefix?: string;
    suffix?: string;
    kDecimalPlaces?: number;
    withoutText: string;
    withText: string;
    calculationText: string;
    isLive?: boolean;
    children?: React.ReactNode;
}

const ROIPillarCard: React.FC<ROIPillarCardProps> = ({ icon, title, description, value, prefix, suffix, kDecimalPlaces, withoutText, withText, calculationText, isLive, children }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isVisible = useIntersectionObserver(ref, { threshold: 0.2, triggerOnce: true });
    
    const numberFormatter = useCallback((val: number) => {
        if (typeof kDecimalPlaces === 'number') {
            if (Math.abs(val) >= 1000) {
                return (val / 1000).toFixed(kDecimalPlaces) + 'K';
            }
        }
        return Math.round(val).toLocaleString();
    }, [kDecimalPlaces]);


    return (
        <div ref={ref} className={`bg-[#121212] rounded-xl border border-[#2A2A2A] p-6 transition-all duration-700 ease-out flex flex-col ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#2A2A2A] flex items-center justify-center text-[#F1C87A] flex-shrink-0">
                    {icon}
                </div>
                <div>
                     <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-white">{title}</h3>
                        {isLive && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-300">Live Data</span>}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{description}</p>
                </div>
            </div>
            <div className="mt-6 text-center bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50">
                <p className="text-4xl font-extrabold text-[#F1C87A]">
                    {prefix}
                    <AnimatedNumber value={value} isIntersecting={isVisible} formatter={numberFormatter} />
                    {suffix}
                </p>
                <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">{calculationText}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm flex-grow">
                <div className="bg-red-900/20 p-3 rounded-md">
                    <p className="font-semibold text-red-300">Without FVS</p>
                    <p className="text-gray-400 mt-1">{withoutText}</p>
                </div>
                <div className="bg-green-900/20 p-3 rounded-md">
                    <p className="font-semibold text-green-300">With FVS</p>
                    <p className="text-gray-400 mt-1">{withText}</p>
                </div>
            </div>
            {children && <div className="pt-4">{children}</div>}
        </div>
    );
};

// A mock toast provider for standalone use in Storybook etc.
const useDummyToasts = () => ({
    addToast: (toast: Omit<ToastNotification, 'id' | 'duration'>) => console.info('Toast:', toast)
});

const ROICenterPage: React.FC = () => {
    const { settings } = useSettings();
    const [hourlyRate, setHourlyRate] = useState<number>(200);
    const [rateInput, setRateInput] = useState<string>('200');
    const [narrative, setNarrative] = useState('');
    const [isNarrativeLoading, setIsNarrativeLoading] = useState(false);
    
    // In a real app, this would be imported from a context provider
    const { addToast } = useDummyToasts(); 
    
    useEffect(() => {
        const savedRate = localStorage.getItem('fvs_hourly_rate');
        const initialRate = savedRate ? parseInt(savedRate, 10) : 200;
        setHourlyRate(initialRate);
        setRateInput(initialRate.toString());
    }, []);

    const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setRateInput(val); // Keep the input state separate for display
        const newRate = parseInt(val, 10);
        if (!isNaN(newRate) && newRate >= 0) {
            setHourlyRate(newRate);
            localStorage.setItem('fvs_hourly_rate', newRate.toString());
        }
    };
    
    const isCrmConnected = settings.integrations.find(i => i.id === 'crm')?.isConnected;
    
    const MOCK_DATA = useMemo(() => ({
        podcastsPerMonth: 4,
        hoursSavedPerPodcast: 6.5,
        staffCostAvoidance: 115000,
        baseReachPerEpisode: 1000,
        reachMultiplier: 10,
        newClientsFromAuthority: 2,
        valuePerClient: 10000,
        pipelineValue: isCrmConnected ? 157500 : DEFAULT_CONTENT_TO_CASH_DATA.pipelineValue, // Use "live" data if connected
    }), [isCrmConnected]);
    
    const roiValues = useMemo(() => {
        const timeROI = MOCK_DATA.podcastsPerMonth * 12 * MOCK_DATA.hoursSavedPerPodcast * hourlyRate;
        const staffROI = MOCK_DATA.staffCostAvoidance;
        const contentROI = MOCK_DATA.podcastsPerMonth * 12 * MOCK_DATA.baseReachPerEpisode * MOCK_DATA.reachMultiplier;
        const brandROI = MOCK_DATA.newClientsFromAuthority * MOCK_DATA.valuePerClient;
        const analyticsROI = MOCK_DATA.pipelineValue;
        const total = timeROI + staffROI + brandROI + analyticsROI;
        return { timeROI, staffROI, contentROI, brandROI, analyticsROI, total };
    }, [hourlyRate, MOCK_DATA]);

    const generateNarrative = useCallback(async () => {
        setIsNarrativeLoading(true);
        setNarrative('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `
                You are an expert business consultant writing a concise, impactful ROI summary for a client's dashboard.
                The client is using "ForgeVoice Studio" (FVS), a content production service.
                Use the following data points to craft a compelling narrative storyline.
                The tone should be confident, professional, and value-driven.
                Keep the summary to a single, powerful paragraph.
                Start the summary with "Based on your current usage...".
                
                **Data Points:**
                - Time ROI (Annualized Value): $${roiValues.timeROI.toLocaleString()}
                - Staff ROI (Annual Cost Avoidance): $${roiValues.staffROI.toLocaleString()}
                - Content ROI (Annual Impressions): ${roiValues.contentROI.toLocaleString()}
                - Brand ROI (Value from new clients/authority): $${roiValues.brandROI.toLocaleString()}
                - Analytics ROI (Pipeline Value from content): $${roiValues.analyticsROI.toLocaleString()}
    
                **Example Structure (adapt as needed):**
                "Based on your current usage, each episode saves you X hours, equating to $Y in your time annually. This system replaces over $Z in staff costs and grows your reach by over [Impressions] annually. The authority built has already driven an estimated $[Brand ROI Value] in new business, and your content is directly fueling a sales pipeline worth $[Analytics ROI]. The real question is—can you afford not to have FVS?"
                
                Your response must be a single string of plain text. Do not include JSON formatting, markdown, or any other characters. Just the paragraph.
            `;
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
            });

            const narrativeText = response.text;
            if (!narrativeText || narrativeText.trim() === '') {
                 throw new Error('The AI model returned an empty response.');
            }
            setNarrative(narrativeText);

        } catch (error: any) {
            addToast({
                title: 'Error',
                message: error.message || 'Could not generate AI summary. Please try again.',
                type: 'error',
            });
        } finally {
            setIsNarrativeLoading(false);
        }
    }, [addToast, roiValues]);


    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-[#0B0B0B] space-y-12">
            {/* Header */}
            <div className="text-center">
                <p className="text-lg font-semibold text-[#F1C87A]">FORGEVOICE STUDIO ROI FRAMEWORK</p>
                <h1 className="text-4xl md:text-5xl font-bold text-white mt-1">The $100K+ Value Case</h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">This is a live look at the tangible business value generated by your investment in the FVS system.</p>
            </div>
            
            {/* ROI Pillars Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ROIPillarCard
                    icon={<Icons.Clock />}
                    title="Time ROI"
                    description="Hard, Bankable Savings"
                    value={roiValues.timeROI}
                    prefix="$"
                    kDecimalPlaces={1}
                    withoutText="5–10 hrs/episode on manual editing, uploads, and fixes."
                    withText="Workflow compresses to 20–30 mins for review & approval."
                    calculationText="Annualized Value"
                >
                     <div className="mt-4">
                        <label htmlFor="hourly-rate" className="block text-sm font-medium text-gray-300 mb-2">Your Estimated Hourly Rate:</label>
                         <div className="relative">
                             <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">$</span>
                             <input
                                type="number"
                                id="hourly-rate"
                                value={rateInput}
                                onChange={handleRateChange}
                                className="w-full rounded-lg bg-[#1A1A1A] py-2 pl-7 pr-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                            />
                        </div>
                    </div>
                </ROIPillarCard>

                <ROIPillarCard
                    icon={<Icons.Users />}
                    title="Staff ROI"
                    description="$100K+ Cost Avoidance"
                    value={roiValues.staffROI}
                    prefix="$"
                    kDecimalPlaces={0}
                    withoutText="Hiring a video editor, VA, and social media manager."
                    withText="Automation replaces 2-3 full-time staff functions."
                    calculationText="Annual Cost Avoided"
                />

                <ROIPillarCard
                    icon={<Icons.Share />}
                    title="Content ROI"
                    description="Reach That Compounds"
                    value={roiValues.contentROI}
                    kDecimalPlaces={0}
                    suffix="+"
                    withoutText="Audio and a few clips result in capped audience reach."
                    withText="1 podcast → 15+ assets, multiplying exposure 5-10x."
                    calculationText="Annual Impressions"
                />

                <ROIPillarCard
                    icon={<Icons.Trophy />}
                    title="Brand ROI"
                    description="Authority That Converts"
                    value={roiValues.brandROI}
                    prefix="$"
                    kDecimalPlaces={0}
                    withoutText="Inconsistent presence fails to build trust and authority."
                    withText="Polished assets create a premium brand that closes deals."
                    calculationText="Value from Authority"
                >
                    <SentimentTrendChart data={DEFAULT_AUDIENCE_INSIGHTS_DATA.sentimentTrend} />
                </ROIPillarCard>
            </div>

            <ROIPillarCard
                icon={<Icons.Analytics />}
                title="Analytics ROI"
                description="From Vanity to Revenue"
                value={roiValues.analyticsROI}
                prefix="$"
                kDecimalPlaces={0}
                withoutText="Likes and comments with no clear link to revenue."
                withText="Direct attribution from content → leads → sales pipeline."
                calculationText={`${isCrmConnected ? 'Actual' : 'Estimated'} Pipeline Value Driven`}
                isLive={isCrmConnected}
            />
            
            {/* Summary Section */}
            <div className="bg-gradient-to-t from-[#121212] to-[#1A1A1A] p-8 rounded-2xl border border-[#F1C87A]/30 text-center">
                 <h2 className="text-2xl font-bold text-white">Your Total Estimated Annual ROI</h2>
                 <p className="text-7xl font-extrabold text-white my-4">
                    $<AnimatedNumber value={roiValues.total} isIntersecting={true} />
                 </p>
                <div className="max-w-3xl mx-auto">
                    <button 
                        onClick={generateNarrative} 
                        disabled={isNarrativeLoading}
                        className="mb-6 inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold text-black bg-[#F1C87A] rounded-lg shadow-md hover:shadow-lg hover:shadow-[#F1C87A]/20 hover:-translate-y-0.5 transition-all transform disabled:opacity-50 disabled:cursor-wait"
                    >
                         <Icons.Sparkles className="w-5 h-5" />
                        {isNarrativeLoading ? 'Generating Your Story...' : 'Generate ROI Narrative'}
                    </button>
                    
                    {isNarrativeLoading && (
                        <div className="flex justify-center items-center h-20">
                            <div className="relative w-8 h-8">
                                <div className="absolute inset-0 bg-[#F1C87A]/50 rounded-full animate-ping"></div>
                                <div className="w-8 h-8 bg-[#F1C87A]/20 rounded-full"></div>
                            </div>
                        </div>
                    )}
                    
                    {narrative && !isNarrativeLoading && (
                         <blockquote className="text-lg text-gray-300 leading-relaxed border-l-4 border-[#F1C87A] pl-6 text-left animate-fade-in">
                            {narrative}
                        </blockquote>
                    )}
                </div>
            </div>

        </main>
    );
};
// Added default export for the component
export default ROICenterPage;