import React, { useEffect, useState } from 'react';

const getQuadrantInfo = (quadrant: string) => {
    switch (quadrant) {
        case 'Goldmine': return { label: "Excellent Potential", color: "text-green-400" };
        case 'Tough Competition': return { label: "Good Potential", color: "text-blue-400" };
        case 'Niche Down': return { label: "Average Potential", color: "text-yellow-400" };
        case 'Explore Cautiously': return { label: "Weak Potential", color: "text-red-400" };
        default: return { label: "Potential", color: "text-white" };
    }
};

const ScoreGauge: React.FC<{ score: number, quadrant: string }> = ({ score, quadrant }) => {
    const [animatedScore, setAnimatedScore] = useState(0);

    useEffect(() => {
        const animation = requestAnimationFrame(() => setAnimatedScore(score));
        return () => cancelAnimationFrame(animation);
    }, [score]);

    const circumference = 2 * Math.PI * 45; // r = 45
    const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

    const quadrantInfo = getQuadrantInfo(quadrant);

    return (
        <div className="bg-[#121212] p-6 rounded-lg border border-[#2A2A2A] flex flex-col items-center justify-center text-center">
            <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="transparent" stroke="#2A2A2A" strokeWidth="10" />
                    <circle
                        cx="50" cy="50" r="45"
                        fill="transparent"
                        stroke="url(#scoreGradient)"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        style={{
                            strokeDashoffset,
                            transition: 'stroke-dashoffset 1s ease-out'
                        }}
                    />
                     <defs>
                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#F1C87A" />
                            <stop offset="100%" stopColor="#E6A23C" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-extrabold text-white">{Math.round(animatedScore)}</span>
                    <span className="text-sm font-semibold text-gray-400">/ 100</span>
                </div>
            </div>
            <h3 className="text-xl font-bold text-white mt-4">Predicted Performance</h3>
            <p className={`text-lg font-semibold ${quadrantInfo.color}`}>{quadrantInfo.label}</p>
        </div>
    );
};

export default ScoreGauge;
