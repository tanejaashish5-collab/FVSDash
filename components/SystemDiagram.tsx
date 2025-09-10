
import React from 'react';
import Icons from './Icons';

const DiagramNode: React.FC<{ icon: React.ReactNode; title: string; }> = ({ icon, title }) => (
    <div className="flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-[#1A1A1A] border-2 border-[#2A2A2A] flex items-center justify-center mb-3 transition-transform hover:scale-105">
            {icon}
        </div>
        <p className="font-bold text-white">{title}</p>
    </div>
);

const CoPilotNode: React.FC<{ icon: React.ReactNode; title: string; glowColor: string; }> = ({ icon, title, glowColor }) => (
    <div className="copilot-node text-center transition-transform hover:scale-105" style={{ '--glow-color': glowColor } as React.CSSProperties}>
        {icon}
        <span className="text-xs text-gray-300">{title}</span>
    </div>
);


const SystemDiagram: React.FC = () => {
    return (
        <div className="system-diagram-container">
            <svg width="100%" height="180" viewBox="0 0 900 180" preserveAspectRatio="xMidYMid meet" className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <defs>
                    <path id="flow-path-1" d="M 110 90 H 260" />
                    <path id="flow-path-2" d="M 450 90 C 480 90, 480 90, 510 90" />
                    <path id="flow-path-3" d="M 690 90 H 840" />
                    
                    {/* Brain Internal Paths */}
                    <path id="brain-path-eval-story" d="M 315 65 Q 375 25, 435 65" />
                    <path id="brain-path-story-strat" d="M 435 115 Q 475 90, 435 65" />
                    <path id="brain-path-strat-enforce" d="M 435 115 Q 375 155, 315 115" />
                    <path id="brain-path-enforce-eval" d="M 315 65 Q 275 90, 315 115" />
                </defs>
            </svg>
            
            {/* Particle Animations */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Main Flow Particles */}
                {Array.from({ length: 5 }).map((_, i) => (
                    // FIX: Cast style object to React.CSSProperties to allow for custom CSS variables.
                    <div key={`p1-${i}`} className="particle" style={{ '--flow-path': 'path("M 110 90 H 260")', animationDelay: `${i * 1}s` } as React.CSSProperties} />
                ))}
                 {Array.from({ length: 5 }).map((_, i) => (
                    // FIX: Cast style object to React.CSSProperties to allow for custom CSS variables.
                    <div key={`p2-${i}`} className="particle" style={{ '--flow-path': 'path("M 450 90 H 690")', animationDelay: `${i * 1}s` } as React.CSSProperties} />
                ))}
                 {Array.from({ length: 5 }).map((_, i) => (
                    // FIX: Cast style object to React.CSSProperties to allow for custom CSS variables.
                    <div key={`p3-${i}`} className="particle" style={{ '--flow-path': 'path("M 690 90 H 840")', animationDelay: `${i * 1}s` } as React.CSSProperties} />
                ))}
            </div>

            <div className="relative flex justify-between items-center h-[180px]">
                <DiagramNode icon={<Icons.CloudUpload className="w-10 h-10 text-[#F1C87A]" />} title="You Submit" />
                
                <div className="relative brain-hover-area cursor-pointer">
                     {/* Brain Internal Particles & Vortex */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="brain-particle-group">
                            {Array.from({ length: 2 }).map((_, i) => <div key={`bp1-${i}`} className="brain-particle" style={{ '--flow-path': 'path("M 315 65 Q 375 25, 435 65")', animationDelay: `${i * 1}s`, '--particle-color': '#60A5FA' } as React.CSSProperties} />)}
                            {Array.from({ length: 2 }).map((_, i) => <div key={`bp2-${i}`} className="brain-particle" style={{ '--flow-path': 'path("M 435 65 Q 475 90, 435 115")', animationDelay: `${i * 1 + 0.5}s`, '--particle-color': '#F472B6' } as React.CSSProperties} />)}
                            {Array.from({ length: 2 }).map((_, i) => <div key={`bp3-${i}`} className="brain-particle" style={{ '--flow-path': 'path("M 435 115 Q 375 155, 315 115")', animationDelay: `${i * 1}s`, '--particle-color': '#34D399' } as React.CSSProperties} />)}
                            {Array.from({ length: 2 }).map((_, i) => <div key={`bp4-${i}`} className="brain-particle" style={{ '--flow-path': 'path("M 315 115 Q 275 90, 315 65")', animationDelay: `${i * 1 + 0.5}s`, '--particle-color': '#A78BFA' } as React.CSSProperties} />)}
                        </div>
                        <div className="brain-vortex absolute" style={{ top: '90px', left: '100px', transform: 'translate(-50%, -50%)' }}>
                            {Array.from({ length: 15 }).map((_, i) => (
                                <div key={i} className="vortex-particle" style={{
                                    animationDelay: `${i * 0.13}s`,
                                    '--particle-color': ['#60A5FA', '#F472B6', '#34D399', '#A78BFA'][i % 4]
                                } as React.CSSProperties} />
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col items-center">
                        <h3 className="font-bold text-[#F1C87A] text-lg flex items-center gap-2 mb-2">
                            <Icons.System className="w-5 h-5" /> FVS Brain
                        </h3>
                        <div className="relative p-6 border-2 border-dashed border-[#F1C87A]/50 rounded-xl w-[200px]">
                            <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                                <CoPilotNode icon={<Icons.Telescope className="w-8 h-8 mx-auto mb-1 text-blue-400" />} title="Evaluator" glowColor="#60A5FA" />
                                <CoPilotNode icon={<Icons.Publishing className="w-8 h-8 mx-auto mb-1 text-pink-400" />} title="Storyteller" glowColor="#F472B6" />
                                <CoPilotNode icon={<Icons.Wand className="w-8 h-8 mx-auto mb-1 text-purple-400" />} title="Enforcer" glowColor="#A78BFA" />
                                <CoPilotNode icon={<Icons.Trophy className="w-8 h-8 mx-auto mb-1 text-green-400" />} title="Strategist" glowColor="#34D399" />
                            </div>
                        </div>
                    </div>
                </div>

                <DiagramNode icon={<Icons.Users className="w-10 h-10 text-white" />} title="Human Review" />
                <DiagramNode icon={<Icons.AnalyticsSimple className="w-10 h-10 text-green-400" />} title="We Deliver" />
            </div>
        </div>
    );
};

export default SystemDiagram;