import React from 'react';
import Icons from '../Icons';
import { ProductionCycleData } from '../../types';

interface CycleTimeChartProps {
    data: ProductionCycleData[];
}

const CycleTimeChart: React.FC<CycleTimeChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <p className="text-center text-gray-500 py-10">No cycle time data available.</p>;
    }
    
    const maxTime = Math.max(...data.map(d => d.avgTimeDays));

    return (
        <div className="flex flex-col md:flex-row items-stretch gap-6 p-4">
            <div className="w-full md:w-2/3 space-y-2">
                {data.filter(d => d.stage !== 'Published').map((item, index) => (
                    <div key={item.stage} className="flex items-center gap-4 group relative">
                        <div className="w-28 text-right flex-shrink-0">
                            <p className="font-semibold text-sm text-gray-300 group-hover:text-white transition-colors">{item.stage}</p>
                        </div>
                        <div className="flex-1 bg-[#2A2A2A]/50 rounded-full h-8 flex items-center pr-2">
                            <div
                                className="bg-gradient-to-r from-[#F1C87A]/50 to-[#F1C87A] h-full rounded-full flex items-center justify-end px-3 transition-all duration-1000 ease-out"
                                style={{ width: `${(item.avgTimeDays / maxTime) * 100}%` }}
                            >
                                <span className="text-sm font-bold text-black">{item.avgTimeDays.toFixed(1)} days</span>
                            </div>
                        </div>
                        <div className="absolute bottom-full left-28 z-10 mb-2 w-max rounded-lg bg-[#1A1A1A] px-3 py-1.5 text-xs font-medium text-gray-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 border border-[#2A2A2A] pointer-events-none">
                           {`Avg. ${item.avgTimeDays.toFixed(1)} days`}
                        </div>
                    </div>
                ))}
            </div>
            <div className="w-full md:w-1/3 flex flex-col justify-center items-center bg-[#1A1A1A] p-6 rounded-lg border border-[#2A2A2A]/50">
                <p className="text-lg text-gray-300">Total Production Time</p>
                <p className="text-6xl font-bold text-white my-2">{data.find(d => d.total)?.total?.toFixed(1)}</p>
                <p className="text-lg text-[#F1C87A] font-semibold">Days from Intake to Published</p>
                <div className="flex items-center gap-1 text-sm text-green-400 mt-4">
                    <Icons.TrendDown />
                    <span>-8% vs last period</span>
                </div>
            </div>
        </div>
    );
};

export default CycleTimeChart;