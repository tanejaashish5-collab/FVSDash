'use client';
import React, { useState } from 'react';
import SystemDiagram from '../components/SystemDiagram';
import CoPilotModal from '../components/CoPilotModal';

const COPILOTS = [
    { id: 'evaluator', title: 'The Evaluator', description: 'Analyzes your content to find the most potent, shareable clips that will resonate with your audience.' },
    { id: 'enforcer', title: 'The Enforcer', description: 'Ensures every piece of copy, every title, and every asset adheres strictly to your unique brand voice and guidelines.' },
    { id: 'storyteller', title: 'The Storyteller', description: 'Crafts compelling hooks, captions, and descriptions that stop the scroll and drive engagement.' },
    { id: 'strategist', title: 'The Strategist', description: 'Scores every potential asset against your historical data to predict its viral potential before it\'s ever published.' },
];

export default function SystemPage() {
    const [selectedCopilot, setSelectedCopilot] = useState<string | null>(null);

    const handleCopilotClick = (copilotId: string) => {
        setSelectedCopilot(copilotId);
    };

    const handleCloseModal = () => {
        setSelectedCopilot(null);
    };

    return (
        <>
            <CoPilotModal 
                isOpen={!!selectedCopilot}
                initialCopilotId={selectedCopilot}
                onClose={handleCloseModal}
            />
            <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-[#0B0B0B] text-white">
                <div className="max-w-7xl mx-auto space-y-24">
                    <header className="text-center">
                        <p className="text-lg font-semibold text-[#F1C87A]">THE FORGEVOICE ENGINE</p>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mt-2">
                            Your Intelligent <br/> Content Co-Pilot.
                        </h1>
                        <p className="mt-6 max-w-3xl mx-auto text-lg text-gray-400">
                            You're investing in more than a service; you're leveraging a sophisticated, AI-powered system designed to turn your single voice into a multi-platform brand. Explore the engine that works for you 24/7.
                        </p>
                    </header>

                    <section className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-600 via-pink-600 to-purple-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                        <div className="relative bg-[#121212] py-12 rounded-xl border border-[#2A2A2A]">
                            <SystemDiagram />
                        </div>
                    </section>
                    
                     <section>
                        <div className="text-center">
                            <h2 className="text-4xl font-bold mb-4">Meet Your AI Co-Pilots</h2>
                            <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">Each component of the FVS Brain has a specific, strategic job. Click a card to learn more.</p>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {COPILOTS.map((copilot) => (
                                <button
                                    key={copilot.id}
                                    onClick={() => handleCopilotClick(copilot.id)}
                                    className="text-left bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A] transition-all duration-300 hover:-translate-y-1 hover:border-[#F1C87A] hover:shadow-xl hover:shadow-[#F1C87A]/10"
                                >
                                     <h3 className="font-bold text-xl text-white mb-2">{copilot.title}</h3>
                                     <p className="text-gray-400">{copilot.description}</p>
                                </button>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}