import React from 'react';
import { FunnelData } from '../../types';
import Icons from '../Icons';
import { formatNumber } from '../../utils';

interface FunnelStageProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
    isLast?: boolean;
}

const FunnelStage: React.FC<FunnelStageProps> = ({ icon, label, value, color, isLast }) => {
    return (
        <div className="relative flex flex-col items-center">
            <div className="flex items-center gap-4 w-full">
                <div className={`w-12 h-12 rounded-lg ${color} flex-shrink-0 flex items-center justify-center`}>
                    {icon}
                </div>
                <div className="flex-1">
                    <p className="text-sm text-gray-400">{label}</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(value)}</p>
                </div>
            </div>
            {!isLast && (
                <div className={`w-px h-12 bg-gray-700 my-2`}></div>
            )}
        </div>
    );
};


const PerformanceFunnel: React.FC<{ data: FunnelData }> = ({ data }) => {
    if (!data) return null;

    return (
        <div className="p-4 space-y-2">
            <FunnelStage
                icon={<Icons.Episodes className="w-6 h-6 text-purple-200" />}
                label="Content Published"
                value={data.published}
                color="bg-purple-500/80"
            />
             <FunnelStage
                icon={<Icons.Eye className="w-6 h-6 text-blue-200" />}
                label="Total Views / Listens"
                value={data.views}
                color="bg-blue-500/80"
            />
             <FunnelStage
                icon={<Icons.Heart className="w-6 h-6 text-pink-200" />}
                label="Engaged Audience"
                value={data.engaged}
                color="bg-pink-500/80"
            />
             <FunnelStage
                icon={<Icons.Users className="w-6 h-6 text-green-200" />}
                label="New Subscribers"
                value={data.subscribers}
                color="bg-green-500/80"
                isLast
            />
        </div>
    );
};

export default PerformanceFunnel;