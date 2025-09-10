import React from 'react';

const Sparkline: React.FC<{ data: number[]; strokeColor?: string }> = ({ data, strokeColor = '#34D399' }) => {
    if (!data || data.length < 2) return <div className="w-24 h-8" />;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min === 0 ? 1 : max - min;
    
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - ((d - min) / range) * 100}`).join(' ');

    return (
        <svg width="100" height="32" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
            <polyline
                fill="none"
                stroke={strokeColor}
                strokeWidth="8"
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default Sparkline;