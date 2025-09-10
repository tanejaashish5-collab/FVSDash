
import React from 'react';
import { AiRecommendation } from '../../types';
import Icons from '../Icons';

const AiCoPilot: React.FC<{ 
    recommendations: AiRecommendation[];
    onActionClick: (rec: AiRecommendation) => void;
}> = ({ recommendations, onActionClick }) => {
    if (!recommendations || recommendations.length === 0) {
        return <p className="text-center text-gray-500 py-10">No AI recommendations available at this time.</p>;
    }

    const getIcon = (type: AiRecommendation['type']) => {
        switch (type) {
            case 'Topic': return <Icons.Lightbulb className="text-yellow-400" />;
            case 'Title': return <Icons.Sparkles className="text-purple-400" />;
            case 'Guest': return <Icons.Users className="text-blue-400" />;
            default: return <Icons.Wand className="text-pink-400" />;
        }
    };
    
    const getPerformanceColor = (performance: AiRecommendation['predictedPerformance']) => {
        switch (performance) {
            case 'Top 10%': return 'bg-green-500/20 text-green-300';
            case 'Top 25%': return 'bg-blue-500/20 text-blue-300';
            case 'High Engagement': return 'bg-yellow-500/20 text-yellow-300';
            default: return 'bg-gray-500/20 text-gray-300';
        }
    };

    return (
        <div className="space-y-4 p-2">
            {recommendations.map(rec => (
                <div key={rec.id} className="bg-[#1A1A1A]/50 p-4 rounded-lg border border-[#2A2A2A] flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#2A2A2A] flex-shrink-0 flex items-center justify-center">
                        {getIcon(rec.type)}
                    </div>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-1">
                            <h4 className="font-bold text-white text-lg">{rec.suggestion}</h4>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getPerformanceColor(rec.predictedPerformance)}`}>
                                Predicted: {rec.predictedPerformance}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400">{rec.reasoning}</p>
                    </div>
                     <button
                        onClick={() => onActionClick(rec)}
                        className="w-full sm:w-auto mt-3 sm:mt-0 flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2A2A2A] rounded-lg hover:bg-[#F1C87A] hover:text-black transition-colors"
                    >
                        <Icons.PlusCircle className="w-5 h-5" />
                        Add to Pipeline
                    </button>
                </div>
            ))}
        </div>
    );
};

export default AiCoPilot;