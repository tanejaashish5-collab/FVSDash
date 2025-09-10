import React, { useRef } from 'react';
import useIntersectionObserver from '../../hooks/useIntersectionObserver';
import AnimatedNumber from './AnimatedNumber';
import Icons from '../Icons';


interface AnalyticsWidgetProps {
    title: string;
    subtitle: string;
    kpi?: { value: number | string; label: string };
    insight?: { text: string; icon: React.ReactNode };
    children: React.ReactNode;
    tooltipText?: string;
}

const AnalyticsWidget: React.FC<AnalyticsWidgetProps> = ({ title, subtitle, kpi, insight, children, tooltipText }) => {
    const ref = useRef<HTMLDivElement>(null);
    const isVisible = useIntersectionObserver(ref, { threshold: 0.2, triggerOnce: true });

    return (
        <section
            ref={ref}
            className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
            <div className="flex flex-col md:flex-row justify-between md:items-end mb-6">
                <div className="max-w-xl">
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
                        {tooltipText && (
                            <div className="group relative">
                                <Icons.Info className="w-5 h-5 text-gray-500 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 rounded-lg bg-[#1A1A1A] px-3 py-2 text-xs font-medium text-gray-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 border border-[#2A2A2A] pointer-events-none z-10">
                                    {tooltipText}
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="text-md text-gray-400 mt-1">{subtitle}</p>
                    {insight && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-[#F1C87A] bg-[#F1C87A]/10 p-2 rounded-md">
                           <span className="w-5 h-5">{insight.icon}</span>
                            <p>{insight.text}</p>
                        </div>
                    )}
                </div>
                {kpi && (
                    <div className="text-right mt-4 md:mt-0">
                        <p className="text-sm text-gray-400">{kpi.label}</p>
                        {typeof kpi.value === 'number' ? (
                            <AnimatedNumber value={kpi.value} isIntersecting={isVisible} />
                        ) : (
                            <span className="text-4xl lg:text-5xl font-bold text-[#F1C87A]">{kpi.value}</span>
                        )}
                    </div>
                )}
            </div>
            <div className="bg-[#121212] p-4 sm:p-6 rounded-xl border border-[#2A2A2A]">
                {children}
            </div>
        </section>
    );
};

export default AnalyticsWidget;