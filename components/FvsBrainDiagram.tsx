import React from 'react';
import Icons from './Icons';

const FvsBrainDiagram: React.FC = () => {
    // This component uses CSS variables (--scroll-progress) set by its parent
    // to drive animations. The parent is expected to have the ID `system-page-wrapper`.
    return (
        <svg width="100%" height="100%" viewBox="0 0 400 900" preserveAspectRatio="xMidYMid meet">
            <defs>
                <style>
                    {`
                        .fvs-node, .fvs-arrow {
                            transition: opacity 0.5s ease-out, transform 0.5s ease-out;
                        }
                        .fvs-arrow-path {
                            transition: stroke-dashoffset 0.7s ease-out;
                        }
                    `}
                </style>
            </defs>
            
            {/* Arrows */}
            <path
                d="M 200 120 V 220"
                stroke="#2A2A2A"
                strokeWidth="2"
                fill="none"
                strokeDasharray="100"
                className="fvs-arrow-path"
                style={{ strokeDashoffset: 'calc(100 - (100 * clamp(0, (var(--scroll-progress, 0) - 5) / 10, 1)))' }}
            />
            <path
                d="M 200 580 V 680"
                stroke="#2A2A2A"
                strokeWidth="2"
                fill="none"
                strokeDasharray="100"
                className="fvs-arrow-path"
                style={{ strokeDashoffset: 'calc(100 - (100 * clamp(0, (var(--scroll-progress, 0) - 70) / 10, 1)))' }}
            />
             <path
                d="M 200 780 V 820"
                stroke="#2A2A2A"
                strokeWidth="2"
                fill="none"
                strokeDasharray="40"
                className="fvs-arrow-path"
                style={{ strokeDashoffset: 'calc(40 - (40 * clamp(0, (var(--scroll-progress, 0) - 85) / 5, 1)))' }}
            />

            {/* Nodes using foreignObject for easier styling */}
            
            {/* 1. You Submit */}
            <foreignObject x="150" y="50" width="100" height="100" className="fvs-node" style={{ opacity: 'clamp(0, var(--scroll-progress, 0) / 10, 1)', transform: 'translateY(calc(20px * (1 - clamp(0, var(--scroll-progress, 0) / 10, 1))))' }}>
                <div className="flex flex-col items-center text-center text-white">
                    <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border-2 border-[#2A2A2A] flex items-center justify-center mb-2">
                        <Icons.CloudUpload className="w-8 h-8 text-[#F1C87A]" />
                    </div>
                    <p className="text-sm font-bold">You Submit</p>
                </div>
            </foreignObject>
            
            {/* 2. FVS Brain */}
            <g className="fvs-node" style={{ opacity: 'clamp(0, (var(--scroll-progress, 0) - 15) / 10, 1)', transform: 'translateY(calc(20px * (1 - clamp(0, (var(--scroll-progress, 0) - 15) / 10, 1))))' }}>
                <rect x="50" y="230" width="300" height="350" rx="12" stroke="#F1C87A" strokeWidth="2" strokeDasharray="6 6" fill="rgba(241, 200, 122, 0.05)" />
                <foreignObject x="100" y="240" width="200" height="50">
                     <div className="text-center">
                        <h3 className="font-bold text-[#F1C87A] text-lg flex items-center justify-center gap-2">
                            <Icons.System className="w-5 h-5" />
                            FVS Brain
                        </h3>
                    </div>
                </foreignObject>
                
                {/* Co-pilots inside the brain */}
                <foreignObject x="60" y="300" width="280" height="260">
                    <div className="grid grid-cols-2 gap-x-12 gap-y-8 h-full">
                        <div className="text-center fvs-node" style={{ opacity: 'clamp(0, (var(--scroll-progress, 0) - 25) / 10, 1)' }}>
                            <Icons.Telescope className="w-10 h-10 mx-auto mb-1 text-blue-400" />
                            <span className="text-sm text-gray-300 font-semibold">Evaluator</span>
                        </div>
                        <div className="text-center fvs-node" style={{ opacity: 'clamp(0, (var(--scroll-progress, 0) - 35) / 10, 1)' }}>
                            <Icons.Publishing className="w-10 h-10 mx-auto mb-1 text-pink-400" />
                            <span className="text-sm text-gray-300 font-semibold">Storyteller</span>
                        </div>
                        <div className="text-center fvs-node" style={{ opacity: 'clamp(0, (var(--scroll-progress, 0) - 45) / 10, 1)' }}>
                            <Icons.Wand className="w-10 h-10 mx-auto mb-1 text-purple-400" />
                            <span className="text-sm text-gray-300 font-semibold">Enforcer</span>
                        </div>
                        <div className="text-center fvs-node" style={{ opacity: 'clamp(0, (var(--scroll-progress, 0) - 55) / 10, 1)' }}>
                            <Icons.Trophy className="w-10 h-10 mx-auto mb-1 text-green-400" />
                            <span className="text-sm text-gray-300 font-semibold">Strategist</span>
                        </div>
                    </div>
                </foreignObject>
            </g>

            {/* 3. Human Review */}
            <foreignObject x="150" y="690" width="100" height="100" className="fvs-node" style={{ opacity: 'clamp(0, (var(--scroll-progress, 0) - 75) / 10, 1)', transform: 'translateY(calc(20px * (1 - clamp(0, (var(--scroll-progress, 0) - 75) / 10, 1))))' }}>
                 <div className="flex flex-col items-center text-center text-white">
                    <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border-2 border-[#2A2A2A] flex items-center justify-center mb-2">
                        <Icons.Users className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm font-bold">Human Review</p>
                </div>
            </foreignObject>

            {/* 4. We Deliver */}
            <foreignObject x="150" y="830" width="100" height="100" className="fvs-node" style={{ opacity: 'clamp(0, (var(--scroll-progress, 0) - 90) / 10, 1)', transform: 'translateY(calc(20px * (1 - clamp(0, (var(--scroll-progress, 0) - 90) / 10, 1))))' }}>
                 <div className="flex flex-col items-center text-center text-white">
                    <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border-2 border-[#2A2A2A] flex items-center justify-center mb-2">
                        <Icons.AnalyticsSimple className="w-8 h-8 text-green-400" />
                    </div>
                    <p className="text-sm font-bold">We Deliver</p>
                </div>
            </foreignObject>

        </svg>
    );
};

export default FvsBrainDiagram;
