import React from 'react';
import Icons from '../Icons';
import AnimatedNumber from './AnimatedNumber';
import useIntersectionObserver from '../../hooks/useIntersectionObserver';

interface LeverageReportProps {
    hours: number;
    cost: number;
    hourlyRate: number;
}

const LeverageReport: React.FC<LeverageReportProps> = ({ hours, cost, hourlyRate }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isVisible = useIntersectionObserver(ref, { threshold: 0.2, triggerOnce: true });

    return (
        <section
            ref={ref}
            className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
             <div className="bg-[#121212] p-6 rounded-xl border border-[#2A2A2A]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-[#2A2A2A]">
                    <div className="pt-4 md:pt-0 pr-8">
                        <h2 className="text-2xl font-bold text-white">Your Leverage Report</h2>
                        <p className="text-md text-gray-400 mt-1">Directly translating our work into your most valuable assets: time and money.</p>
                    </div>
                    <div className="pt-6 md:pt-0 md:pl-8 flex flex-col sm:flex-row items-center gap-8">
                        <div className="text-center sm:text-left">
                            <p className="text-sm text-gray-400 flex items-center gap-1.5 group relative">
                                Hours Saved This Month
                                <span className="cursor-help">
                                    <Icons.Info className="w-4 h-4 text-gray-500" />
                                </span>
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs rounded-lg bg-[#1A1A1A] px-3 py-1.5 text-xs font-medium text-gray-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 border border-[#2A2A2A] pointer-events-none">
                                   Calculated based on an industry estimate of 15 hours saved per podcast and 0.5 hours per short-form video.
                                </span>
                            </p>
                            <div className="text-6xl font-bold text-[#F1C87A]">
                               <AnimatedNumber value={hours} isIntersecting={isVisible} />
                            </div>
                        </div>
                         <div className="text-center sm:text-left">
                            <p className="text-sm text-gray-400 flex items-center gap-1.5 group relative">
                                Estimated Cost Savings
                                <span className="cursor-help">
                                    <Icons.Info className="w-4 h-4 text-gray-500" />
                                </span>
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs rounded-lg bg-[#1A1A1A] px-3 py-1.5 text-xs font-medium text-gray-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 border border-[#2A2A2A] pointer-events-none">
                                   Calculated at an estimated blended rate of ${hourlyRate}/hr.
                                </span>
                            </p>
                            <div className="text-6xl font-bold text-white">
                                $<AnimatedNumber value={cost} isIntersecting={isVisible} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default LeverageReport;