'use client';
import React, { useState, useMemo } from 'react';
import Icons from '@/components/Icons';
import { DEFAULT_FAQS } from '@/constants';
import { useToasts } from '@/lib/ToastProvider';
import { useRouter } from 'next/navigation';

// Internal Components
const FAQItem: React.FC<{ question: string; answer: string; searchTerm: string }> = ({ question, answer, searchTerm }) => {
    const [isOpen, setIsOpen] = useState(false);

    const highlight = (text: string, query: string) => {
        if (!query.trim()) return text;
        const keywords = query.trim().split(' ').filter(k => k).map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
        if (keywords.length === 0) return <span>{text}</span>;
        
        const regex = new RegExp(`(${keywords.join('|')})`, 'gi');
        const parts = text.split(regex);
        return (
            <span>
                {parts.map((part, i) =>
                    regex.test(part) ? (
                        <mark key={i} className="bg-[#F1C87A]/30 text-[#F1C87A] rounded-sm font-bold">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                )}
            </span>
        );
    };

    return (
        <div className="border-b border-[#2A2A2A]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left p-4 hover:bg-[#1A1A1A]/50 transition-colors"
                aria-expanded={isOpen}
            >
                <span className="font-semibold text-white">{highlight(question, searchTerm)}</span>
                <span className={`transform transition-transform duration-200 text-gray-400 ${isOpen ? 'rotate-180' : ''}`}>
                    <Icons.ChevronDown />
                </span>
            </button>
            {isOpen && (
                <div className="p-4 pt-0 text-gray-300 leading-relaxed animate-fade-in">
                    <p>{highlight(answer, searchTerm)}</p>
                </div>
            )}
        </div>
    );
};

const QuickLinkCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick?: () => void;
    href?: string;
}> = ({ icon, title, description, onClick, href }) => {
    const content = (
        <>
            <div className="w-12 h-12 rounded-lg bg-[#2A2A2A] flex items-center justify-center text-[#F1C87A] mb-4 group-hover:bg-[#F1C87A] group-hover:text-black transition-colors duration-200">
                {icon}
            </div>
            <h3 className="font-bold text-lg text-white">{title}</h3>
            <p className="text-sm text-gray-400 mt-1">{description}</p>
        </>
    );

    if (href) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="block group bg-[#121212] p-6 rounded-lg border border-[#2A2A2A] hover:border-[#F1C87A] hover:-translate-y-1 transition-transform duration-200">
                {content}
            </a>
        );
    }

    return (
        <button onClick={onClick} className="w-full text-left group bg-[#121212] p-6 rounded-lg border border-[#2A2A2A] hover:border-[#F1C87A] hover:-translate-y-1 transition-transform duration-200">
            {content}
        </button>
    );
};

export default function HelpPage() {
    const [faqSearchTerm, setFaqSearchTerm] = useState('');
    const [contactSubject, setContactSubject] = useState('');
    const [contactMessage, setContactMessage] = useState('');
    const { addToast } = useToasts();
    const router = useRouter();

    const onStartTour = () => {
        router.push('/overview?tour=true');
    };

    const filteredFaqs = useMemo(() => {
        if (!faqSearchTerm.trim()) {
            return DEFAULT_FAQS;
        }
        const lowercasedQuery = faqSearchTerm.toLowerCase();
        return DEFAULT_FAQS.filter(
            faq =>
                faq.q.toLowerCase().includes(lowercasedQuery) ||
                faq.a.toLowerCase().includes(lowercasedQuery)
        );
    }, [faqSearchTerm]);

    const handleContactSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactSubject.trim() || !contactMessage.trim()) {
            addToast({
                title: 'Missing Information',
                message: 'Please fill out both the subject and message fields.',
                type: 'warning',
            });
            return;
        }

        // In a real app, you'd send this to a backend service
        console.log('Sending message:', { subject: contactSubject, message: contactMessage });

        addToast({
            title: 'Message Sent!',
            message: "Thanks for reaching out. Our support team will get back to you within 24 hours.",
            type: 'success',
        });
        setContactSubject('');
        setContactMessage('');
    };

    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-[#0B0B0B] space-y-12">
            {/* Header */}
            <div className="text-center">
                <p className="text-lg font-semibold text-[#F1C87A]">SUPPORT CENTER</p>
                <h1 className="text-4xl md:text-5xl font-bold text-white mt-1">How can we help?</h1>
            </div>

            {/* Quick Links */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <QuickLinkCard
                    icon={<Icons.Sparkles className="w-6 h-6" />}
                    title="Restart Tour"
                    description="Take a guided walkthrough of the dashboard features."
                    onClick={onStartTour}
                />
                <QuickLinkCard
                    icon={<Icons.BookOpen className="w-6 h-6" />}
                    title="Submission Guide"
                    description="Best practices for submitting your raw content."
                    href="#"
                />
                <QuickLinkCard
                    icon={<Icons.Lifebuoy className="w-6 h-6" />}
                    title="Contact Support"
                    description="Get in touch with our team for personalized help."
                    onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
                />
                <QuickLinkCard
                    icon={<Icons.StatusIcon className="w-6 h-6" />}
                    title="Service Status"
                    description="Check for any ongoing incidents or maintenance."
                    href="#"
                />
            </section>

            {/* FAQs & Contact */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FAQs */}
                <div className="lg:col-span-2 bg-[#121212] p-6 rounded-lg border border-[#2A2A2A]">
                    <h2 className="text-2xl font-bold text-white mb-4">Frequently Asked Questions</h2>
                    <div className="relative mb-4">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500"><Icons.Search /></span>
                        <input
                            type="text"
                            placeholder="Search FAQs..."
                            value={faqSearchTerm}
                            onChange={(e) => setFaqSearchTerm(e.target.value)}
                            className="w-full rounded-lg bg-[#1A1A1A] py-2 pl-10 pr-4 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                        />
                    </div>
                    <div className="border-t border-[#2A2A2A] rounded-b-md overflow-hidden">
                        {filteredFaqs.length > 0 ? (
                            filteredFaqs.map((faq, index) => (
                                <FAQItem key={index} question={faq.q} answer={faq.a} searchTerm={faqSearchTerm} />
                            ))
                        ) : (
                            <p className="p-8 text-center text-gray-400">No FAQs found matching your search.</p>
                        )}
                    </div>
                </div>

                {/* Contact Form */}
                <div id="contact-form" className="lg:col-span-1 bg-[#121212] p-6 rounded-lg border border-[#2A2A2A] h-fit">
                    <h2 className="text-2xl font-bold text-white mb-4">Send us a Message</h2>
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
                            <input
                                type="text"
                                id="subject"
                                name="subject"
                                value={contactSubject}
                                onChange={(e) => setContactSubject(e.target.value)}
                                className="w-full rounded-lg bg-[#1A1A1A] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                                placeholder="e.g., Question about billing"
                            />
                        </div>
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">Message</label>
                            <textarea
                                id="message"
                                name="message"
                                rows={6}
                                value={contactMessage}
                                onChange={(e) => setContactMessage(e.target.value)}
                                className="w-full rounded-lg bg-[#1A1A1A] py-2 px-3 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                                placeholder="Tell us how we can help..."
                            ></textarea>
                        </div>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-black bg-[#F1C87A] rounded-lg shadow-md hover:shadow-lg hover:shadow-[#F1C87A]/20 hover:-translate-y-0.5 transition-all transform">
                            <Icons.PaperAirplane />
                            Send Message
                        </button>
                    </form>
                </div>
            </section>

        </main>
    );
};
