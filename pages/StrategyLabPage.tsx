import React, { useState, useCallback } from 'react';
import { ToastNotification, StrategyLabResult } from '../types';
import Icons from '../components/Icons';
import ScoreGauge from '../components/strategy-lab/ScoreGauge';
import QuadrantAnalysis from '../components/strategy-lab/QuadrantAnalysis';
import { GoogleGenAI, Type } from "@google/genai";
import { useSettings } from '../lib/SettingsProvider';

const StrategyLabPage: React.FC<{ addToast: (toast: Omit<ToastNotification, 'id' | 'duration'>) => void; }> = ({ addToast }) => {
    const [topic, setTopic] = useState('');
    const [title, setTitle] = useState('');
    const [guest, setGuest] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<StrategyLabResult | null>(null);
    const { settings } = useSettings();

    const handleAnalyze = useCallback(async () => {
        if (!topic.trim()) {
            addToast({ title: 'Topic Required', message: 'Please enter a primary topic to analyze.', type: 'warning' });
            return;
        }
        setIsLoading(true);
        setResult(null);
        addToast({ title: 'Strategy Lab', message: 'AI is analyzing your idea...', type: 'info' });

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `
                You are a master content strategist with deep knowledge of audience engagement and market trends. 
                Analyze the following content idea and provide a predictive performance analysis.

                **Content Idea Details:**
                - Primary Topic: "${topic}"
                - Potential Title: "${title || 'Not provided'}"
                - Potential Guest: "${guest || 'Not provided'}"
                - Client Historical Data Context (Simulated): The client's content typically performs well on topics related to personal development, productivity, and biohacking. Their audience is highly engaged with actionable advice.

                **Your Task:**
                Provide a predictive analysis based on the idea. Your response MUST be a valid JSON object conforming to the provided schema. Do not include any other text, explanations, or markdown formatting.

                - **score**: An integer from 0-100 representing the predicted performance potential. A score > 85 is excellent, 70-84 is good, 50-69 is average, < 50 is weak.
                - **quadrant**: Categorize the idea into one of four quadrants based on a 2x2 matrix of Audience Interest vs. Competitive Saturation:
                    - 'Goldmine': High Audience Interest, Low Competition.
                    - 'Tough Competition': High Audience Interest, High Competition.
                    - 'Niche Down': Low Audience Interest, Low Competition.
                    - 'Explore Cautiously': Low Audience Interest, High Competition.
                - **pros**: An array of 2-3 brief strings highlighting the strengths of this idea.
                - **cons**: An array of 2-3 brief strings highlighting the potential weaknesses or risks.
                - **recommendation**: A single, concise sentence providing a clear strategic recommendation (e.g., "Proceed with confidence, but focus on a unique angle to stand out.").
            `;

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.INTEGER },
                    quadrant: { type: Type.STRING },
                    pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                    cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                    recommendation: { type: Type.STRING },
                },
                required: ["score", "quadrant", "pros", "cons", "recommendation"],
            };
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });

            let jsonStr = response.text.trim();
            if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();

            const data = JSON.parse(jsonStr);
            setResult(data);

        } catch (error: any) {
            addToast({ title: 'Analysis Failed', message: error.message || 'An unknown error occurred.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [topic, title, guest, addToast]);

    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-[#0B0B0B]">
            {/* Header */}
            <div>
                <p className="text-lg font-semibold text-[#F1C87A]">PREDICTIVE ANALYSIS</p>
                <h1 className="text-4xl md:text-5xl font-bold text-white mt-1">Strategy Lab</h1>
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Input Column */}
                <div className="lg:col-span-1 bg-[#121212] p-6 rounded-lg border border-[#2A2A2A] h-fit">
                    <h2 className="text-xl font-bold text-white">Test Your Idea</h2>
                    <p className="text-sm text-gray-400 mt-1 mb-6">Enter details below to get an AI-powered performance forecast.</p>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-1">Primary Topic*</label>
                            <input type="text" id="topic" value={topic} onChange={e => setTopic(e.target.value)} className="w-full input-field" placeholder="e.g., The Future of AI in Healthcare" />
                        </div>
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Potential Title</label>
                            <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className="w-full input-field" placeholder="e.g., Unlocking Longevity with AI" />
                        </div>
                        <div>
                            <label htmlFor="guest" className="block text-sm font-medium text-gray-300 mb-1">Potential Guest</label>
                            <input type="text" id="guest" value={guest} onChange={e => setGuest(e.target.value)} className="w-full input-field" placeholder="e.g., Dr. Eva Rostova, AI Ethicist" />
                        </div>
                    </div>
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || !topic.trim()}
                        className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-black bg-[#F1C87A] rounded-lg shadow-md hover:shadow-lg hover:shadow-[#F1C87A]/20 hover:-translate-y-0.5 transition-all transform disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isLoading ? (
                             <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : <Icons.FlaskConical className="w-5 h-5" />}
                        {isLoading ? 'Analyzing...' : 'Analyze Idea'}
                    </button>
                    {!settings.airtable.apiKey && (
                        <p className="text-xs text-center text-gray-500 mt-4">Connect Airtable in Settings for hyper-personalized predictions.</p>
                    )}
                </div>

                {/* Results Column */}
                <div className="lg:col-span-2">
                    {isLoading && (
                        <div className="flex items-center justify-center h-full min-h-[400px] bg-[#121212] rounded-lg border border-dashed border-[#2A2A2A]">
                             <div className="text-center">
                                <div className="relative w-16 h-16 mx-auto mb-4">
                                    <div className="absolute inset-0 bg-[#F1C87A]/50 rounded-full animate-ping"></div>
                                    <div className="w-16 h-16 bg-[#F1C87A]/20 rounded-full flex items-center justify-center">
                                        <Icons.System className="w-8 h-8 text-[#F1C87A]" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-white">The FVS Brain is analyzing...</h3>
                                <p className="text-gray-400">This may take a moment.</p>
                            </div>
                        </div>
                    )}
                    {!isLoading && !result && (
                        <div className="flex items-center justify-center h-full min-h-[400px] bg-[#121212] rounded-lg border border-dashed border-[#2A2A2A]">
                            <div className="text-center text-gray-500">
                                <Icons.FlaskConical className="w-12 h-12 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-white">Awaiting Analysis</h3>
                                <p>Your predictive report will appear here.</p>
                            </div>
                        </div>
                    )}
                    {result && (
                        <div className="space-y-8 animate-fade-in-up">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <ScoreGauge score={result.score} quadrant={result.quadrant} />
                                <QuadrantAnalysis quadrant={result.quadrant} />
                            </div>
                            <div className="bg-[#121212] p-6 rounded-lg border border-[#2A2A2A]">
                                <h3 className="text-xl font-bold text-white mb-4">Strategic Breakdown</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2"><Icons.PlusCircle className="w-5 h-5" /> Pros</h4>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                                            {result.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                                        </ul>
                                    </div>
                                    <div>
                                         <h4 className="font-semibold text-red-400 mb-2 flex items-center gap-2"><Icons.MinusCircle className="w-5 h-5" /> Cons</h4>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                                            {result.cons.map((con, i) => <li key={i}>{con}</li>)}
                                        </ul>
                                    </div>
                                </div>
                                <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
                                    <h4 className="font-semibold text-[#F1C87A] mb-2 flex items-center gap-2"><Icons.Sparkles className="w-5 h-5" /> Recommendation</h4>
                                    <p className="text-gray-300">{result.recommendation}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default StrategyLabPage;
