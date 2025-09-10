import React from 'react';

const Quadrant: React.FC<{ title: string, isActive: boolean }> = ({ title, isActive }) => (
    <div className={`flex-1 flex items-center justify-center p-2 text-center text-xs font-semibold transition-all duration-300 ${isActive ? 'bg-[#1A1A1A] border border-[#F1C87A] text-[#F1C87A] rounded-lg' : 'text-gray-500'}`}>
        {title}
    </div>
);

const QuadrantAnalysis: React.FC<{ quadrant: string }> = ({ quadrant }) => {
    return (
        <div className="bg-[#121212] p-6 rounded-lg border border-[#2A2A2A] flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-bold text-white mb-4">Market Quadrant</h3>
            <div className="w-full max-w-xs aspect-square grid grid-cols-2 grid-rows-2 gap-2 relative">
                {/* Quadrants */}
                <Quadrant title="Goldmine" isActive={quadrant === 'Goldmine'} />
                <Quadrant title="Tough Competition" isActive={quadrant === 'Tough Competition'} />
                <Quadrant title="Niche Down" isActive={quadrant === 'Niche Down'} />
                <Quadrant title="Explore Cautiously" isActive={quadrant === 'Explore Cautiously'} />

                {/* Axis Labels */}
                <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-gray-400">Competitive Saturation &rarr;</div>
                <div className="absolute -left-2 top-0 bottom-0 flex items-center transform -rotate-90">
                    <span className="text-xs text-gray-400 whitespace-nowrap">Audience Interest &rarr;</span>
                </div>
            </div>
        </div>
    );
};

// FIX: Added a default export for the QuadrantAnalysis component.
export default QuadrantAnalysis;