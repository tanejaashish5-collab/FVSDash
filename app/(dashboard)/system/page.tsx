'use client';
import React, { useState } from 'react';
import Icons from '@/components/Icons';
// FIX: Changed import paths to relative to fix module resolution error.
import { SystemWalkthrough } from '../../../components/SystemWalkthrough';
import SystemDiagram from '../../../components/SystemDiagram';

export default function SystemPage() {
    const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);

    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-[#0B0B0B] text-white">
            {isWalkthroughOpen && <SystemWalkthrough onClose={() => setIsWalkthroughOpen(false)} />}
            
            <div className="max-w-5xl mx-auto space-y-16">
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
                    <div className="relative bg-[#121212] p-8 rounded-xl border border-[#2A2A2A] text-center">
                        <div className="max-w-3xl mx-auto h-auto">
                           <SystemDiagram />
                        </div>
                        <button 
                            onClick={() => setIsWalkthroughOpen(true)}
                            className="mt-8 inline-flex items-center gap-3 px-8 py-4 text-lg font-semibold text-black bg-[#F1C87A] rounded-lg shadow-lg shadow-[#F1C87A]/20 hover:-translate-y-1 transition-transform"
                        >
                            <Icons.System className="w-6 h-6"/>
                            Launch Interactive Walkthrough
                        </button>
                    </div>
                </section>
                
                 <section>
                    <div className="text-center">
                        <h2 className="text-4xl font-bold mb-4">Meet Your AI Co-Pilots</h2>
                        <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">Each component of the FVS Brain has a specific, strategic job.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A]">
                             <h3 className="font-bold text-xl text-white mb-2">The Eveluator</h3>
                             <p className="text-gray-400">Analyzes your content to find the most potent, shareable clips that will resonate with your audience.</p>
                        </div>
                         <div className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A]">
                             <h3 className="font-bold text-xl text-white mb-2">The Enforcer</h3>
                             <p className="text-gray-400">Ensures every piece of copy, every title, and every asset adheres strictly to your unique brand voice and guidelines.</p>
                        </div>
                         <div className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A]">
                             <h3 className="font-bold text-xl text-white mb-2">The Storyteller</h3>
                             <p className="text-gray-400">Crafts compelling hooks, captions, and descriptions that stop the scroll and drive engagement.</p>
                        </div>
                         <div className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A]">
                             <h3 className="font-bold text-xl text-white mb-2">The Strategist</h3>
                             <p className="text-gray-400">Scores every potential asset against your historical data to predict its viral potential before it's ever published.</p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
