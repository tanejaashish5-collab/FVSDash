import React, { useRef } from 'react';
import Icons from '../components/Icons';
import useIntersectionObserver from '../hooks/useIntersectionObserver';
import { useAuth } from '../lib/AuthProvider';

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-[#121212] p-8 rounded-xl border border-[#2A2A2A] transition-all duration-300 hover:border-[#F1C87A] hover:-translate-y-1">
        <div className="w-12 h-12 rounded-lg bg-[#2A2A2A] flex items-center justify-center text-[#F1C87A] mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 leading-relaxed">{children}</p>
    </div>
);

const Step: React.FC<{ number: string, title: string, children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="relative pl-12">
        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-[#F1C87A] text-black font-bold flex items-center justify-center ring-4 ring-[#F1C87A]/20">
            {number}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400">{children}</p>
    </div>
);

const AnimatedSection: React.FC<{ children: React.ReactNode, className?: string, id?: string }> = ({ children, className, id }) => {
    const ref = useRef<HTMLDivElement>(null);
    const isVisible = useIntersectionObserver(ref, { threshold: 0.2, triggerOnce: true });

    return (
        <section ref={ref} id={id} className={`transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} ${className}`}>
            {children}
        </section>
    );
};

const PublicLandingPage: React.FC = () => {
    const { login, loginAsAdmin } = useAuth();
    return (
        <div className="bg-[#0B0B0B] text-white font-sans antialiased animate-fade-in">
            {/* Header */}
            <header className="py-6 px-8 flex justify-between items-center sticky top-0 z-50 bg-[#0B0B0B]/70 backdrop-blur-lg">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#121212] to-black rounded-lg flex items-center justify-center border border-[#2A2A2A]">
                        {/* Reusing logo SVG from App.tsx */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-5 h-5"><rect width="256" height="256" fill="none"/><path d="M128,24a104,104,0,1,0,104,104A104.11,104.11,0,0,0,128,24Zm-42.3,158.42a8,8,0,0,1-11.4,0L32.2,140.3a8,8,0,0,1,11.4-11.4L85.7,171a8,8,0,0,1,0,11.42ZM171,171l42.12-42.12a8,8,0,1,1,11.4,11.4l-42.1,42.1a8,8,0,0,1-11.42,0L128.9,139.3a8,8,0,0,1,11.4-11.4Z" opacity="0.2"/><path d="M128,24a104,104,0,1,0,104,104A104.11,104.11,0,0,0,128,24ZM74.3,182.42a8,8,0,0,1-11.4,0L20.8,140.3a8,8,0,0,1,11.4-11.4L74.3,171a8,8,0,0,1,0,11.42Zm96.8-1.12,42.12-42.12a8,8,0,1,1,11.4,11.4l-42.1,42.1a8,8,0,0,1-11.42,0L128.9,150.7a8,8,0,0,1,11.4-11.4Z" fill="#F1C87A"/></svg>
                    </div>
                    <span className="font-bold text-lg tracking-wider text-white">FORGEVOICE STUDIO</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={loginAsAdmin}
                        className="text-sm font-semibold text-gray-400 hover:text-[#F1C87A] transition-colors"
                    >
                        Admin Login
                    </button>
                    <button
                        onClick={login}
                        className="px-5 py-2 text-sm font-semibold text-white bg-transparent border border-gray-600 rounded-lg hover:bg-[#F1C87A] hover:text-black hover:border-[#F1C87A] transition-all"
                    >
                        Client Login
                    </button>
                </div>
            </header>

            <main className="container mx-auto px-8 py-20 text-center">
                {/* Hero Section */}
                <AnimatedSection>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        Stop Editing. <br />
                        <span className="text-[#F1C87A]">Start Creating.</span>
                    </h1>
                    <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-400">
                        We transform your raw recordings into a complete content ecosystem of podcasts, shorts, and blogs, so you can focus on what you do best.
                    </p>
                    <a
                        href="#contact"
                        className="mt-10 inline-block px-8 py-4 text-lg font-semibold text-black bg-[#F1C87A] rounded-lg shadow-lg shadow-[#F1C87A]/20 hover:-translate-y-1 transition-transform"
                    >
                        Become a Client
                    </a>
                </AnimatedSection>
                
                {/* How It Works Section */}
                <AnimatedSection className="py-32">
                    <h2 className="text-4xl font-bold mb-4">Your Content on Autopilot</h2>
                    <p className="text-lg text-gray-400 mb-16 max-w-2xl mx-auto">A seamless, hands-off process designed for busy creators.</p>
                    <div className="grid md:grid-cols-3 gap-12 text-left">
                        <Step number="1" title="Submit Your Content">
                            Upload your raw audio or video files to your dedicated Google Drive folder. That's it. Your work is done.
                        </Step>
                        <Step number="2" title="We Produce & Repurpose">
                            Our team of experts edits, enhances, and transforms your core content into a suite of assets ready for every platform.
                        </Step>
                        <Step number="3" title="Track & Publish">
                            Monitor the entire production process on your client dashboard and watch as your content ecosystem goes live.
                        </Step>
                    </div>
                </AnimatedSection>
                
                {/* Value Proposition Section */}
                <AnimatedSection className="py-24">
                    <h2 className="text-4xl font-bold mb-4">For Experts Who Value Time, Not Tools</h2>
                    <p className="text-lg text-gray-400 mb-16 max-w-3xl mx-auto">Stop juggling multiple apps and subscriptions. We're not selling you another tool—we're delivering a finished content ecosystem.</p>
                    <div className="grid md:grid-cols-2 gap-8 text-left max-w-5xl mx-auto">
                        {/* The DIY Struggle */}
                        <div className="bg-[#121212] p-8 rounded-xl border border-[#2A2A2A]">
                            <h3 className="text-2xl font-bold text-white mb-6">The Tool Juggle</h3>
                            <div className="flex items-center justify-center gap-2 mb-8 text-gray-500">
                                <Icons.CloudUpload className="w-8 h-8" />
                                <span className="text-2xl font-thin">&rarr;</span>
                                <Icons.Timeline className="w-8 h-8" />
                                <span className="text-2xl font-thin">&rarr;</span>
                                <Icons.Share className="w-8 h-8" />
                                <span className="text-2xl font-thin">&rarr;</span>
                                <Icons.Blog className="w-8 h-8" />
                            </div>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <Icons.CrossCircle className="w-6 h-6 text-red-400/70 flex-shrink-0 mt-0.5" />
                                    <span>Learn & manage 4+ different software tools.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Icons.CrossCircle className="w-6 h-6 text-red-400/70 flex-shrink-0 mt-0.5" />
                                    <span>Spend 8-10 hours per week on tedious post-production.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Icons.CrossCircle className="w-6 h-6 text-red-400/70 flex-shrink-0 mt-0.5" />
                                    <span>Manually select clips, write copy, and schedule posts.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Icons.CrossCircle className="w-6 h-6 text-red-400/70 flex-shrink-0 mt-0.5" />
                                    <span>Struggle with inconsistent quality and branding.</span>
                                </li>
                            </ul>
                        </div>

                        {/* The Expert System */}
                        <div className="bg-[#1A1A1A] p-8 rounded-xl border-2 border-[#F1C87A]">
                            <h3 className="text-2xl font-bold text-[#F1C87A] mb-6">The Expert System</h3>
                             <div className="flex items-center justify-center gap-4 mb-8 text-[#F1C87A]">
                                <Icons.CloudUpload className="w-8 h-8" />
                                <span className="text-3xl font-thin">&rarr;</span>
                                <Icons.ForgeVoiceLogo className="w-12 h-12" />
                                <span className="text-3xl font-thin">&rarr;</span>
                                <div className="flex flex-col gap-2">
                                    <Icons.Episodes className="w-8 h-8" />
                                    <Icons.IconVideo className="w-8 h-8" />
                                    <Icons.Blog className="w-8 h-8" />
                                </div>
                            </div>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <Icons.CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                                    <span>One simple, single-platform workflow.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Icons.CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                                    <span>Reclaim 10+ hours per week to focus on your business.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Icons.CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                                    <span>Expert-curated content that hits the mark, every time.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <Icons.CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                                    <span>Guaranteed professional quality and brand consistency.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </AnimatedSection>


                {/* Features Section */}
                <AnimatedSection className="py-24">
                     <h2 className="text-4xl font-bold mb-4">One Recording, Infinite Possibilities</h2>
                    <p className="text-lg text-gray-400 mb-16 max-w-2xl mx-auto">We maximize the value of every piece of content you create.</p>
                    <div className="grid md:grid-cols-3 gap-8 text-left">
                        <FeatureCard icon={<Icons.Episodes className="w-6 h-6" />} title="Polished Podcasts">
                            Professional audio editing, mixing, mastering, and show note creation. Ready for Spotify, Apple Podcasts, and YouTube.
                        </FeatureCard>
                        <FeatureCard icon={<Icons.IconVideo className="w-6 h-6" />} title="Viral-Ready Shorts">
                            Engaging, captioned short-form video clips from your main content, perfectly formatted for TikTok, Instagram Reels, and YouTube Shorts.
                        </FeatureCard>
                        <FeatureCard icon={<Icons.Blog className="w-6 h-6" />} title="SEO-Optimized Blogs">
                            AI-powered, human-reviewed blog posts based on your episode's key topics, designed to drive organic traffic and build authority.
                        </FeatureCard>
                    </div>
                </AnimatedSection>

                {/* Testimonial Section */}
                 <AnimatedSection className="py-24">
                    <div className="max-w-3xl mx-auto">
                        <img src="https://i.pravatar.cc/80?u=jane" alt="Jane Doe" className="w-20 h-20 rounded-full mx-auto mb-6" />
                        <blockquote className="text-2xl italic text-gray-300">
                            "ForgeVoice Studio completely changed the game for us. We went from spending 10 hours a week on post-production to zero. The quality is incredible, and our audience has grown by 30% in three months."
                        </blockquote>
                        <p className="mt-6 font-semibold text-white">Jane Doe</p>
                        <p className="text-sm text-gray-400">Creator, 'Future Forward' Podcast</p>
                    </div>
                </AnimatedSection>

                {/* Final CTA */}
                <AnimatedSection id="contact" className="py-24 bg-[#121212] rounded-2xl">
                    <h2 className="text-4xl font-bold">Ready to Scale Your Content?</h2>
                    <p className="mt-4 text-lg text-gray-400">Let's build your content ecosystem together.</p>
                     <a
                        href="#"
                        className="mt-8 inline-block px-8 py-4 text-lg font-semibold text-black bg-[#F1C87A] rounded-lg shadow-lg shadow-[#F1C87A]/20 hover:-translate-y-1 transition-transform"
                    >
                        Book a Strategy Call
                    </a>
                </AnimatedSection>
            </main>

            {/* Footer */}
            <footer className="text-center py-8 border-t border-[#2A2A2A]">
                <p className="text-gray-500">&copy; {new Date().getFullYear()} ForgeVoice Studio. All Rights Reserved.</p>
            </footer>
        </div>
    );
};

export default PublicLandingPage;