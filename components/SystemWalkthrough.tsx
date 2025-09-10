import React, { useState, useEffect, useRef } from 'react';
import Icons from './Icons';

interface SystemWalkthroughProps {
    onClose: () => void;
}

const NARRATIVE_STOPS = [
    { scroll: 0, title: 'Step 1: Your Raw Genius', description: "You upload your raw audio or video content to your secure folder. This is the only step you need to take. From here, our system takes over." },
    { scroll: 15, title: 'Step 2: The FVS Brain Activates', description: "Your content enters our AI-powered engine. Four specialized AI co-pilots work together to analyze, deconstruct, and strategize the best way to repurpose your content." },
    { scroll: 35, title: 'The Evaluator', description: "The Evaluator identifies the most engaging moments, potent quotes, and viral-ready clips, forming the foundation of your content ecosystem." },
    { scroll: 50, title: 'The Storyteller', description: "Simultaneously, the Storyteller crafts compelling titles, descriptions, show notes, and social media copy for every potential asset." },
    { scroll: 65, title: 'The Enforcer', description: "The Enforcer ensures every word aligns with your unique brand voice and guidelines, guaranteeing consistency across all content." },
    { scroll: 80, title: 'The Strategist', description: "Finally, the Strategist scores each potential asset for its viral potential, prioritizing what will perform best for your audience." },
    { scroll: 90, title: 'Step 3: Human-in-the-Loop', description: "Our expert human editors review and refine the AI's output, adding the final layer of quality, nuance, and polish that only a human can provide." },
    { scroll: 100, title: 'Step 4: Delivery', description: "A complete ecosystem of polished assets—podcasts, shorts, blogs—is delivered to your dashboard, ready for you to review and schedule." }
];

export const SystemWalkthrough: React.FC<SystemWalkthroughProps> = ({ onClose }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const diagramContainerRef = useRef<HTMLDivElement>(null);
    const [narrativeIndex, setNarrativeIndex] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const container = scrollContainerRef.current;
            if (!container) return;
            const { scrollTop, scrollHeight, clientHeight } = container;
            const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;
            
            // Update CSS variable for animations
            if (diagramContainerRef.current) {
                diagramContainerRef.current.style.setProperty('--scroll-progress', `${scrollPercentage}`);
            }

            // Find the current narrative stop
            let currentStopIndex = 0;
            for (let i = NARRATIVE_STOPS.length - 1; i >= 0; i--) {
                if (scrollPercentage >= NARRATIVE_STOPS[i].scroll) {
                    currentStopIndex = i;
                    break;
                }
            }
            setNarrativeIndex(currentStopIndex);
        };

        const container = scrollContainerRef.current;
        container?.addEventListener('scroll', handleScroll);
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        
        document.body.style.overflow = 'hidden';

        return () => {
            container?.removeEventListener('scroll', handleScroll);
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
            if (diagramContainerRef.current) {
                 diagramContainerRef.current.style.removeProperty('--scroll-progress');
            }
        };
    }, [onClose]);

    const activeNarrative = NARRATIVE_STOPS[narrativeIndex];

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in bg-black/50">
            <div className="relative w-full h-full overflow-hidden bg-[#0B0B0B]">
                <div className="aurora-background"></div>
                
                <button onClick={onClose} className="absolute top-6 right-6 z-20 p-2 text-white bg-black/30 rounded-full transition-all hover:bg-white/20 hover:scale-110">
                    <Icons.CloseLarge />
                </button>
                
                {/* Scrollable container that drives the animation */}
                <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-scroll">
                    <div className="h-[500vh]"></div> {/* Spacer to create scroll height */}
                </div>

                {/* Fixed Content */}
                <div className="absolute inset-0 flex items-center pointer-events-none">
                    {/* Left Narrative Panel */}
                    <div className="w-full max-w-md p-8 md:p-12">
                        <div className="system-narrative-card p-8 rounded-2xl pointer-events-auto">
                            <h2 className="text-3xl font-bold text-[#F1C87A]">{activeNarrative.title}</h2>
                            <p className="text-gray-300 mt-4 leading-relaxed">{activeNarrative.description}</p>
                        </div>
                    </div>
                </div>

                {/* Animated Diagram Canvas */}
                <div ref={diagramContainerRef} className="absolute inset-y-0 left-1/4 -right-1/4 md:left-1/3 md:-right-1/3 flex items-center pointer-events-none">
                    <div 
                        className="w-full h-full transition-transform duration-500 ease-out"
                        style={{ transform: 'translateX(calc(-1 * var(--scroll-progress, 0) * (1%)))' }}
                    >
                         <svg width="100%" height="100%" viewBox="0 0 1600 500" preserveAspectRatio="xMidYMid meet" className="absolute inset-0">
                            {/* Paths */}
                            <path id="path1" d="M 250 250 H 450" stroke="#2A2A2A" strokeWidth="2" fill="none" style={{ strokeDasharray: 200, strokeDashoffset: 'calc(200 - (200 * clamp(0, (var(--scroll-progress, 0) - 5) / 10, 1)))' }}/>
                            <path id="path2" d="M 750 250 H 950" stroke="#2A2A2A" strokeWidth="2" fill="none" style={{ strokeDasharray: 200, strokeDashoffset: 'calc(200 - (200 * clamp(0, (var(--scroll-progress, 0) - 85) / 10, 1)))' }}/>
                            <path id="path3" d="M 1150 250 H 1350" stroke="#2A2A2A" strokeWidth="2" fill="none" style={{ strokeDasharray: 200, strokeDashoffset: 'calc(200 - (200 * clamp(0, (var(--scroll-progress, 0) - 95) / 5, 1)))' }}/>
                            
                            {/* Data Pulses */}
                            <circle cx="0" cy="0" r="5" fill="#F1C87A" className="data-pulse" style={{ opacity: 'calc(clamp(0, (var(--scroll-progress, 0) - 5) / 10, 1) - clamp(0, (var(--scroll-progress, 0) - 90) / 1, 1))', offsetPath: 'path("M 250 250 H 450")' }}/>
                            <circle cx="0" cy="0" r="5" fill="#F1C87A" className="data-pulse" style={{ opacity: 'calc(clamp(0, (var(--scroll-progress, 0) - 85) / 10, 1) - clamp(0, (var(--scroll-progress, 0) - 95) / 1, 1))', offsetPath: 'path("M 750 250 H 950")', animationDelay: '0.5s' }}/>
                            <circle cx="0" cy="0" r="5" fill="#F1C87A" className="data-pulse" style={{ opacity: 'calc(clamp(0, (var(--scroll-progress, 0) - 95) / 5, 1))', offsetPath: 'path("M 1150 250 H 1350")', animationDelay: '1s' }}/>
                        </svg>

                        {/* Nodes */}
                        <div className="absolute top-1/2 left-[15.625%]" style={{ transform: 'translate(-50%, -50%) scale(calc(0.8 + 0.2 * clamp(0, (20 - var(--scroll-progress, 0)) / 20, 1)))', opacity: 'calc(clamp(0, (30 - var(--scroll-progress, 0)) / 30, 1))' }}>
                            <div className="flex flex-col items-center text-center text-white"><div className="w-24 h-24 rounded-full bg-[#1A1A1A] border-2 border-[#2A2A2A] flex items-center justify-center mb-3"><Icons.CloudUpload className="w-12 h-12 text-[#F1C87A]" /></div><p>You Submit</p></div>
                        </div>

                        <div className="absolute top-1/2 left-[37.5%]" style={{ transform: 'translate(-50%, -50%) scale(calc(0.8 + 0.2 * clamp(0, (var(--scroll-progress, 0) - 5) / 10, 1) - 0.2 * clamp(0, (var(--scroll-progress, 0) - 85) / 10, 1)))', opacity: 'calc(clamp(0, (var(--scroll-progress, 0) - 5) / 10, 1) - clamp(0, (var(--scroll-progress, 0) - 90) / 1, 1))' }}>
                            <div className="relative p-6 border-2 border-dashed border-[#F1C87A]/50 rounded-xl">
                                <h3 className="text-lg font-bold text-[#F1C87A] mb-4 text-center">FVS Brain</h3>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                    <div className="text-center text-sm text-gray-300 transition-all" style={{ opacity: 'calc(0.5 + 0.5 * clamp(0, (var(--scroll-progress, 0) - 30) / 5, 1))', transform: 'scale(calc(1 + 0.1 * clamp(0, (var(--scroll-progress, 0) - 30) / 5, 1) - 0.1 * clamp(0, (var(--scroll-progress, 0) - 45) / 1, 1)))' }}>Evaluator</div>
                                    <div className="text-center text-sm text-gray-300 transition-all" style={{ opacity: 'calc(0.5 + 0.5 * clamp(0, (var(--scroll-progress, 0) - 45) / 5, 1))', transform: 'scale(calc(1 + 0.1 * clamp(0, (var(--scroll-progress, 0) - 45) / 5, 1) - 0.1 * clamp(0, (var(--scroll-progress, 0) - 60) / 1, 1)))' }}>Storyteller</div>
                                    <div className="text-center text-sm text-gray-300 transition-all" style={{ opacity: 'calc(0.5 + 0.5 * clamp(0, (var(--scroll-progress, 0) - 60) / 5, 1))', transform: 'scale(calc(1 + 0.1 * clamp(0, (var(--scroll-progress, 0) - 60) / 5, 1) - 0.1 * clamp(0, (var(--scroll-progress, 0) - 75) / 1, 1)))' }}>Enforcer</div>
                                    <div className="text-center text-sm text-gray-300 transition-all" style={{ opacity: 'calc(0.5 + 0.5 * clamp(0, (var(--scroll-progress, 0) - 75) / 5, 1))', transform: 'scale(calc(1 + 0.1 * clamp(0, (var(--scroll-progress, 0) - 75) / 5, 1) - 0.1 * clamp(0, (var(--scroll-progress, 0) - 85) / 1, 1)))' }}>Strategist</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="absolute top-1/2 left-[65.625%]" style={{ transform: 'translate(-50%, -50%) scale(calc(0.8 + 0.2 * clamp(0, (var(--scroll-progress, 0) - 85) / 5, 1) - 0.2 * clamp(0, (var(--scroll-progress, 0) - 95) / 5, 1)))', opacity: 'calc(clamp(0, (var(--scroll-progress, 0) - 85) / 5, 1) - clamp(0, (var(--scroll-progress, 0) - 98) / 1, 1))' }}>
                             <div className="flex flex-col items-center text-center text-white"><div className="w-24 h-24 rounded-full bg-[#1A1A1A] border-2 border-[#2A2A2A] flex items-center justify-center mb-3"><Icons.Users className="w-12 h-12 text-white" /></div><p>Human Review</p></div>
                        </div>

                        <div className="absolute top-1/2 left-[87.5%]" style={{ transform: 'translate(-50%, -50%) scale(calc(0.8 + 0.2 * clamp(0, (var(--scroll-progress, 0) - 95) / 5, 1)))', opacity: 'calc(clamp(0, (var(--scroll-progress, 0) - 95) / 5, 1))' }}>
                            <div className="flex flex-col items-center text-center text-white"><div className="w-24 h-24 rounded-full bg-[#1A1A1A] border-2 border-[#2A2A2A] flex items-center justify-center mb-3"><Icons.AnalyticsSimple className="w-12 h-12 text-green-400" /></div><p>We Deliver</p></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};