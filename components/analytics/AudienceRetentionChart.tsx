import React, { useState, useMemo } from 'react';
import { AudienceRetentionPoint } from '../../types';

const AudienceRetentionChart: React.FC<{ data: AudienceRetentionPoint[] }> = ({ data }) => {
    const [tooltip, setTooltip] = useState<{ x: number, y: number, point: AudienceRetentionPoint } | null>(null);
    const svgWidth = 600;
    const svgHeight = 250;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const maxTimestamp = Math.max(...data.map(d => d.timestamp));

    const xScale = (timestamp: number) => (timestamp / maxTimestamp) * width;
    const yScale = (retention: number) => height - (retention / 100) * height;

    const pathData = useMemo(() => {
        if (data.length < 2) return '';
        const path = data.map(point => `${xScale(point.timestamp)},${yScale(point.retention)}`).join(' L ');
        return `M ${path}`;
    }, [data, width, height, maxTimestamp]);
    
    const areaPathData = useMemo(() => {
        if (data.length < 2) return '';
        return `${pathData} L ${xScale(maxTimestamp)},${height} L ${xScale(0)},${height} Z`;
    }, [pathData, maxTimestamp, height]);

    const formatTimestamp = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return [h, m > 9 ? m : (h > 0 ? '0' : '') + m, s > 9 ? s : '0' + s]
            .filter(a => a)
            .join(':');
    };

    const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
        const svg = event.currentTarget;
        const pt = svg.createSVGPoint();
        pt.x = event.clientX;
        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        const mouseX = svgP.x - margin.left;

        const timestamp = (mouseX / width) * maxTimestamp;
        
        const closestPoint = data.reduce((prev, curr) => {
            return (Math.abs(curr.timestamp - timestamp) < Math.abs(prev.timestamp - timestamp) ? curr : prev);
        });

        setTooltip({
            x: xScale(closestPoint.timestamp) + margin.left,
            y: yScale(closestPoint.retention) + margin.top,
            point: closestPoint,
        });
    };

    const handleMouseLeave = () => {
        setTooltip(null);
    };

    const yAxisLabels = [0, 25, 50, 75, 100];
    const xAxisLabels = Array.from({ length: 5 }, (_, i) => i * (maxTimestamp / 4));

    return (
        <div className="relative font-sans">
            <svg
                width="100%"
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F1C87A" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#F1C87A" stopOpacity={0} />
                    </linearGradient>
                </defs>

                <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {/* Y Axis Grid Lines & Labels */}
                    {yAxisLabels.map(label => (
                        <g key={label} className="text-gray-600">
                            <line
                                x1={0} y1={yScale(label)}
                                x2={width} y2={yScale(label)}
                                stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,3"
                            />
                            <text
                                x={-10} y={yScale(label) + 4}
                                textAnchor="end"
                                className="text-xs fill-current"
                            >
                                {label}%
                            </text>
                        </g>
                    ))}
                    {/* X Axis Grid Lines & Labels */}
                    {xAxisLabels.map(ts => (
                         <text
                            key={ts}
                            x={xScale(ts)} y={height + 20}
                            textAnchor="middle"
                            className="text-xs fill-gray-500"
                        >
                            {formatTimestamp(ts)}
                        </text>
                    ))}

                    <path d={areaPathData} fill="url(#areaGradient)" />
                    <path d={pathData} fill="none" stroke="#F1C87A" strokeWidth="2.5" />
                    
                    {/* Tooltip elements */}
                    {tooltip && (
                        <g>
                             <line
                                x1={xScale(tooltip.point.timestamp)} y1={yScale(tooltip.point.retention)}
                                x2={xScale(tooltip.point.timestamp)} y2={height}
                                stroke="#F1C87A" strokeWidth="1" strokeDasharray="3,3"
                            />
                            <circle cx={xScale(tooltip.point.timestamp)} cy={yScale(tooltip.point.retention)} r="4" fill="#F1C87A" stroke="#121212" strokeWidth="2" />
                        </g>
                    )}
                </g>
            </svg>
            {tooltip && (
                <div 
                    className="absolute z-10 p-2 text-xs text-black bg-white rounded-md shadow-lg pointer-events-none"
                    style={{ left: tooltip.x + 10, top: tooltip.y - 40, transform: 'translateX(-50%)' }}
                >
                    <div className="font-bold">{tooltip.point.retention.toFixed(1)}%</div>
                    <div>{formatTimestamp(tooltip.point.timestamp)}</div>
                </div>
            )}
        </div>
    );
};

export default AudienceRetentionChart;