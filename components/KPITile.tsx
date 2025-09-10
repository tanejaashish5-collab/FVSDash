import React from 'react';
import Icons from './Icons';

export const KPITile: React.FC<{
    title: string,
    value: number | string,
    subtitle?: string,
    hasIndicator?: boolean,
    trend: 'up' | 'down',
    change: string,
    onClick: () => void,
    isActive: boolean,
}> = ({ title, value, subtitle, hasIndicator, trend, change, onClick, isActive }) => {
    const trendColor = trend === 'up' ? 'text-green-400' : 'text-red-400';
    return (
        <div
            onClick={onClick}
            className={`bg-[#121212] p-6 rounded-lg border transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#F1C87A]/20 h-full flex flex-col ${isActive ? 'border-[#F1C87A] ring-2 ring-[#F1C87A]/30' : 'border-[#2A2A2A]'}`}
        >
            <div>
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-medium text-[#B3B3B3]">{title}</h3>
                    {hasIndicator && <div className="w-2.5 h-2.5 rounded-full bg-[#F1C87A]"></div>}
                </div>
                <div className="flex items-baseline gap-4">
                    <p className="text-4xl font-bold text-white mt-2">{value}</p>
                    <div className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
                        {trend === 'up' ? <Icons.TrendUp /> : <Icons.TrendDown />}
                        <span>{change}</span>
                    </div>
                </div>
            </div>
            {subtitle && <p className="text-sm text-[#B3B3B3] mt-auto pt-2">{subtitle}</p>}
        </div>
    )
};

export default KPITile;
