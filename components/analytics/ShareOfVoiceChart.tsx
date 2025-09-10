import React from 'react';
import { ShareOfVoiceData } from '../../types';

interface ShareOfVoiceChartProps {
    data: ShareOfVoiceData[];
    competitors: { name1: string; name2: string };
}

const ShareOfVoiceChart: React.FC<ShareOfVoiceChartProps> = ({ data, competitors }) => {
    if (!data || data.length === 0 || !data[0].data) {
        return <p className="text-center text-gray-500 py-10">No share of voice data available.</p>;
    }

    const chartData = data[0].data;
    const maxValue = 50; // Set a fixed max value for better comparison
    const svgHeight = 200;
    const svgWidth = 500;
    const margin = { top: 20, right: 20, bottom: 40, left: 30 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const xScale = (index: number) => (index / (chartData.length - 1)) * width;
    const yScale = (value: number) => height - (value / maxValue) * height;

    const linePath = (key: 'client' | 'competitor1' | 'competitor2') => {
        return chartData.map((d, i) => `${xScale(i)},${yScale(d[key])}`).join(' L ');
    };

    const colors = {
        client: '#F1C87A',
        competitor1: '#60A5FA',
        competitor2: '#B3B3B3'
    };

    return (
        <div className="p-4">
            <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {/* Y-Axis lines and labels */}
                    {[0, 25, 50].map(val => (
                        <g key={val}>
                            <line x1="0" y1={yScale(val)} x2={width} y2={yScale(val)} stroke="#2A2A2A" strokeWidth="1" />
                            <text x="-8" y={yScale(val) + 4} textAnchor="end" className="text-xs fill-gray-500">{val}%</text>
                        </g>
                    ))}
                    {/* X-Axis labels */}
                    {chartData.map((d, i) => (
                        <text key={d.date} x={xScale(i)} y={height + 20} textAnchor="middle" className="text-xs fill-gray-500">{d.date}</text>
                    ))}

                    {/* Data Lines */}
                    <path d={`M ${linePath('competitor2')}`} fill="none" stroke={colors.competitor2} strokeWidth="2" strokeDasharray="4 4" />
                    <path d={`M ${linePath('competitor1')}`} fill="none" stroke={colors.competitor1} strokeWidth="2" />
                    <path d={`M ${linePath('client')}`} fill="none" stroke={colors.client} strokeWidth="3" />
                </g>
            </svg>
            <div className="flex justify-center items-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#F1C87A]"></div>
                    <span className="text-white">Your Brand</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#60A5FA]"></div>
                    <span className="text-gray-400">{competitors.name1}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#B3B3B3]"></div>
                    <span className="text-gray-400">{competitors.name2}</span>
                </div>
            </div>
        </div>
    );
};

export default ShareOfVoiceChart;