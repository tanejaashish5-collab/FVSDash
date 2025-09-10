import React, { useState, useEffect, useCallback } from 'react';
import Icons from './Icons';

interface CoPilotModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialCopilotId: string | null;
}

const COPILOT_DETAILS = [
    {
        id: 'evaluator',
        name: 'The Evaluator',
        icon: <Icons.EvaluatorIcon className="w-8 h-8" />,
        color: 'text-blue-400',
        summary: 'Identifies high-impact moments and shareable clips.',
        responsibilities: [
            'Scans for engaging questions and answers.',
            'Benchmarks topic engagement against historical data.',
            'Scores quotes and segments for viral potential.',
            'Identifies ideal clips for short-form content.',
        ],
    },
    {
        id: 'enforcer',
        name: 'The Enforcer',
        icon: <Icons.EnforcerIcon className="w-8 h-8" />,
        color: 'text-purple-400',
        summary: 'Guarantees your unique brand voice is consistent everywhere.',
        responsibilities: [
            'Analyzes copy against your brand guidelines.',
            'Ensures tone of voice is consistent across all assets.',
            'Corrects jargon and phrasing to match your style.',
            'Flags content that deviates from your core messaging.',
        ],
    },
    {
        id: 'storyteller',
        name: 'The Storyteller',
        icon: <Icons.StorytellerIcon className="w-8 h-8" />,
        color: 'text-pink-400',
        summary: 'Crafts compelling copy that captures attention and drives engagement.',
        responsibilities: [
            'Generates captivating titles and descriptions.',
            'Writes engaging social media posts and hooks.',
            'Drafts SEO-optimized blog posts and show notes.',
            'Creates compelling call-to-actions for your content.',
        ],
    },
    {
        id: 'strategist',
        name: 'The Strategist',
        icon: <Icons.StrategistIcon className="w-8 h-8" />,
        color: 'text-green-400',
        summary: 'Predicts content performance to maximize your reach and impact.',
        responsibilities: [
            'Scores assets for their potential to go viral.',
            'Recommends the best platforms for each content type.',
            'Suggests optimal publishing times based on data.',
            'Identifies content gaps and strategic opportunities.',
        ],
    }
];

const CoPilotModal: React.FC<CoPilotModalProps> = ({ isOpen, onClose, initialCopilotId }) => {
    const [activeCopilotId, setActiveCopilotId] = useState(initialCopilotId);

    useEffect(() => {
        if (isOpen) {
            setActiveCopilotId(initialCopilotId);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen, initialCopilotId]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
    
    const activeCopilot = COPILOT_DETAILS.find(c => c.id === activeCopilotId);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="copilot-modal-title"
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="copilot-modal-content bg-[#1A1A1A] rounded-2xl shadow-2xl border border-[#2A2A2A] w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Tabs Column */}
                <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-[#2A2A2A] p-4 flex flex-row md:flex-col gap-2">
                    {COPILOT_DETAILS.map((copilot) => (
                        <button
                            key={copilot.id}
                            onClick={() => setActiveCopilotId(copilot.id)}
                            className={`w-full text-left p-4 rounded-lg flex items-center gap-4 transition-colors duration-200 ${
                                activeCopilotId === copilot.id
                                ? 'bg-[#F1C87A]/10 text-[#F1C87A]'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <span className={copilot.color}>{copilot.icon}</span>
                            <span className="font-bold">{copilot.name}</span>
                        </button>
                    ))}
                </div>

                {/* Content Column */}
                <div className="flex-1 p-8 md:p-12 overflow-y-auto">
                    {activeCopilot && (
                         <div key={activeCopilot.id} className="copilot-content-pane">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center bg-[#2A2A2A] ${activeCopilot.color}`}>
                                    {React.cloneElement(activeCopilot.icon, { className: 'w-10 h-10' })}
                                </div>
                                <div>
                                    <h2 id="copilot-modal-title" className="text-3xl font-bold text-white">{activeCopilot.name}</h2>
                                    <p className={`text-lg font-semibold ${activeCopilot.color}`}>{activeCopilot.summary}</p>
                                </div>
                            </div>
                            <div className="mt-8">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Key Responsibilities</h3>
                                <ul className="space-y-3">
                                    {activeCopilot.responsibilities.map((resp, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <Icons.CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">{resp}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         </div>
                    )}
                </div>
                 <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 rounded-full hover:bg-[#2A2A2A] hover:text-white transition-colors">
                    <Icons.CloseLarge />
                </button>
            </div>
        </div>
    );
};

export default CoPilotModal;