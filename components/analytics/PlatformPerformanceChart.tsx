import React, { useMemo } from 'react';
import { PlatformData } from '../../types';

interface PlatformPerformanceChartProps {
    data: PlatformData[];
    timeRange: number;
}

const platformColors: { [key: string]: string } = {
    'YouTube': 'bg-red-500',
    'Spotify': 'bg-green-500',
    'Apple Podcasts': 'bg-purple-500',
    'Website': 'bg-blue-500',
};

const PlatformPerformanceChart: React.FC<PlatformPerformanceChartProps> = ({ data, timeRange }) => {
    const scaledData = useMemo(() => {
        // Scale data based on time range for simulation purposes
        const scale = timeRange / 90;
        return data.map(platform => ({
            ...platform,
            views: Math.round(platform.views * scale * (0.8 + Math.random() * 0.4)) // add some randomness
        }));
    }, [data, timeRange]);

    const totalViews = scaledData.reduce((sum, platform) => sum + platform.views, 0);

    if (!scaledData || scaledData.length === 0) {
        return <p className="text-center text-gray-500 py-10">No platform data available.</p>;
    }

    return (
        <div className="p-2 space-y-4">
            {scaledData.sort((a,b) => b.views - a.views).map(platform => {
                const percentage = totalViews > 0 ? (platform.views / totalViews) * 100 : 0;

                return (
                    <div key={platform.name} className="group">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-semibold text-white">{platform.name}</span>
                            <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
                                {platform.views.toLocaleString()} views
                            </span>
                        </div>
                        <div className="h-4 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${platformColors[platform.name] || 'bg-gray-500'}`}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PlatformPerformanceChart;