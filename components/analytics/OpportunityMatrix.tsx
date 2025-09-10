import React, { useState } from 'react';
import { OpportunityMatrixTopic } from '../../types';
import Icons from '../Icons';

const getQuadrantInfo = (interest: number, saturation: number): { name: string; advice: string; color: string } => {
    if (interest >= 50 && saturation < 50) {
        return { name: "Goldmine", advice: "High potential. This topic strongly resonates with your audience and has low competition. Prioritize creating content here.", color: "text-green-400" };
    }
    if (interest >= 50 && saturation >= 50) {
        return { name: "Tough Competition", advice: "High audience interest, but the space is crowded. A unique angle or superior quality is required to stand out.", color: "text-red-400" };
    }
    if (interest < 50 && saturation < 50) {
        return { name: "Niche Down", advice: "Good for a core, dedicated audience but may have limited broad reach. Ideal for building community.", color: "text-gray-400" };
    }
    return { name: "Explore Cautiously", advice: "Low immediate return. The audience isn't highly engaged, and competition is stiff. Proceed with market research.", color: "text-yellow-400" };
};

const ProgressBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
    <div>
        <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-300">{label}</span>
            <span className={`text-sm font-bold ${color}`}>{value}%</span>
        </div>
        <div className="h-2 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
            <div className={`h-full ${color.replace('text', 'bg').replace('-400', '-500')} rounded-full`} style={{ width: `${value}%` }} />
        </div>
    </div>
);


const OpportunityMatrix: React.FC<{ data: OpportunityMatrixTopic[] }> = ({ data }) => {
    const [selectedTopic, setSelectedTopic] = useState<OpportunityMatrixTopic | null>(data.find(d => d.audienceInterest >= 50 && d.competitiveSaturation < 50) || data[0] || null);
    
    const quadrantInfo = selectedTopic ? getQuadrantInfo(selectedTopic.audienceInterest, selectedTopic.competitiveSaturation) : null;

    return (
        <div className="flex flex-col md:flex-row gap-6 p-4 h-full min-h-[400px]">
            {/* Chart Area */}
            <div className="flex-1 flex flex-col">
                <div className="relative flex-1">
                    {/* Background Grid */}
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-[#2A2A2A] rounded-lg">
                        <div className="bg-[#121212] rounded-tl-lg p-2 flex items-end"><span className="text-xs text-gray-500">Goldmine</span></div>
                        <div className="bg-[#121212] rounded-tr-lg p-2 flex items-end"><span className="text-xs text-gray-500">Tough Competition</span></div>
                        <div className="bg-[#121212] rounded-bl-lg p-2"><span className="text-xs text-gray-500">Niche Down</span></div>
                        <div className="bg-[#121212] rounded-br-lg p-2"><span className="text-xs text-gray-500">Explore Cautiously</span></div>
                    </div>
                    
                    {/* Data Points Layer */}
                    <div className="absolute inset-0">
                        {data.map(topic => (
                            <button
                                key={topic.name}
                                onClick={() => setSelectedTopic(topic)}
                                className="absolute w-4 h-4 rounded-full bg-[#1A1A1A] border-2 transition-all duration-200 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 focus:outline-none"
                                style={{
                                    bottom: `${topic.audienceInterest}%`,
                                    left: `${topic.competitiveSaturation}%`,
                                    borderColor: selectedTopic?.name === topic.name ? '#F1C87A' : '#6b7280',
                                }}
                                title={topic.name}
                            >
                                {selectedTopic?.name === topic.name && (
                                    <div className="absolute -inset-1.5 rounded-full ring-4 ring-[#F1C87A]/50 animate-glow" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* X-Axis Label */}
                <div className="flex justify-between items-center mt-2 px-2">
                    <span className="text-xs text-gray-500">Low Saturation</span>
                    <span className="text-xs font-semibold text-gray-300">Competitive Saturation &rarr;</span>
                    <span className="text-xs text-gray-500">High Saturation</span>
                </div>
                 {/* Y-Axis Label (for mobile) */}
                 <div className="text-center mt-2 md:hidden">
                    <span className="text-xs font-semibold text-gray-300">&uarr; Audience Interest</span>
                </div>
            </div>

            {/* Analysis Panel */}
            <div className="w-full md:w-1/3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-6 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-1">Strategic Analysis</h3>
                <p className="text-sm text-gray-400 mb-6">Click a topic on the chart to analyze.</p>
                {selectedTopic && quadrantInfo ? (
                    <div className="flex flex-col flex-1 animate-fade-in">
                        <p className="font-bold text-xl text-white break-words">{selectedTopic.name}</p>
                        <p className={`font-semibold text-md mt-1 ${quadrantInfo.color}`}>{quadrantInfo.name}</p>
                        
                        <div className="space-y-4 my-6">
                            <ProgressBar label="Audience Interest" value={selectedTopic.audienceInterest} color="text-blue-400" />
                            <ProgressBar label="Competitive Saturation" value={selectedTopic.competitiveSaturation} color="text-purple-400" />
                        </div>
                        
                        <div className="mt-auto pt-6 border-t border-[#2A2A2A]">
                             <h4 className="font-semibold text-white flex items-center gap-2 mb-2">
                                <Icons.Sparkles className="w-5 h-5 text-[#F1C87A]" />
                                Strategic Advice
                            </h4>
                            <p className="text-sm text-gray-300 leading-relaxed">{quadrantInfo.advice}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-center text-gray-500">
                        <p>No topic selected</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OpportunityMatrix;