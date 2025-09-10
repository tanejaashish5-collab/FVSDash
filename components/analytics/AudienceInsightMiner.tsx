import React from 'react';
import { AudienceInsightsData } from '../../types';
import Icons from '../Icons';
import Sparkline from './Sparkline';

const AudienceInsightMiner: React.FC<{ data: AudienceInsightsData }> = ({ data }) => {
    const { topQuestions, sentimentTrend, painPointWordCloud } = data;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
            {/* Top Questions */}
            <div className="md:col-span-1 space-y-3">
                <h4 className="font-semibold text-white flex items-center gap-2">
                    <Icons.MessageCircle className="w-5 h-5 text-blue-400" />
                    Top Audience Questions
                </h4>
                <ul className="space-y-2">
                    {topQuestions.map((q, i) => (
                        <li key={i} className="text-sm text-gray-300 bg-[#1A1A1A]/50 p-3 rounded-md border border-[#2A2A2A]/50">
                            "{q}"
                        </li>
                    ))}
                </ul>
            </div>

            {/* Sentiment & Word Cloud */}
            <div className="md:col-span-2 space-y-6">
                <div>
                    <h4 className="font-semibold text-white flex items-center gap-2">
                        <Icons.Heart className="w-5 h-5 text-green-400" />
                        Overall Sentiment Trend
                    </h4>
                    <div className="h-20 -mx-4 -mb-4">
                        <Sparkline data={sentimentTrend.map(p => p.value * 100)} strokeColor="#4ADE80" />
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-white flex items-center gap-2">
                        <Icons.Telescope className="w-5 h-5 text-purple-400" />
                        Common Pain Points
                    </h4>
                    <div className="flex flex-wrap gap-3 mt-3">
                        {painPointWordCloud.sort((a, b) => b.value - a.value).map(word => (
                            <span
                                key={word.text}
                                className="bg-[#2A2A2A] text-gray-300 text-sm font-medium px-4 py-1.5 rounded-full"
                            >
                                {word.text}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AudienceInsightMiner;