import React from 'react';

interface SentimentTrendChartProps {
    data: { date: string; value: number }[];
}

const SentimentTrendChart: React.FC<SentimentTrendChartProps> = ({ data }) => {
    if (!data || data.length < 2) return null;

    const svgWidth = 300;
    const svgHeight = 80;
    const margin = { top: 10, right: 10, bottom: 20, left: 10 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    // Normalize Y values to a 0-1 scale for simplicity, as sentiment is positive in the sample
    const minY = 0;
    const maxY = 1;

    const xScale = (index: number) => (index / (data.length - 1)) * width;
    const yScale = (value: number) => height - ((value - minY) / (maxY - minY)) * height;

    const pathData = data.map((point, i) => `${xScale(i)},${yScale(point.value)}`).join(' L ');
    const areaPathData = `${pathData} L ${xScale(data.length - 1)},${height} L ${xScale(0)},${height} Z`;

    return (
        <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2 text-center">Audience Sentiment Trend</h4>
            <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} aria-label="Audience sentiment trend chart">
                 <defs>
                    <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#4ADE80" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <g transform={`translate(${margin.left}, ${margin.top})`}>
                    <path d={areaPathData} fill="url(#sentimentGradient)" />
                    <path d={`M ${pathData}`} fill="none" stroke="#4ADE80" strokeWidth="2.5" />
                    
                    {/* Start and End labels */}
                    <text x={xScale(0)} y={height + 15} textAnchor="start" className="text-[10px] fill-gray-500">{data[0].date}</text>
                    <text x={xScale(data.length - 1)} y={height + 15} textAnchor="end" className="text-[10px] fill-gray-500">{data[data.length - 1].date}</text>
                </g>
            </svg>
        </div>
    );
};

export default SentimentTrendChart;