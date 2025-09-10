import React from 'react';
import { ContentToCashData } from '../../types';
import Icons from '../Icons';
import { formatNumber } from '../../utils';

interface FunnelStageProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    prefix?: string;
    color: string;
    isLast?: boolean;
}

const FunnelStage: React.FC<FunnelStageProps> = ({ icon, label, value, prefix, color, isLast }) => {
    return (
        <div className="relative flex flex-col items-center">
            <div className="flex items-center gap-4 w-full">
                <div className={`w-12 h-12 rounded-lg ${color} flex-shrink-0 flex items-center justify-center`}>
                    {icon}
                </div>
                <div className="flex-1">
                    <p className="text-sm text-gray-400">{label}</p>
                    <p className="text-2xl font-bold text-white">{prefix}{formatNumber(value)}</p>
                </div>
            </div>
            {!isLast && (
                <div className="w-px h-12 bg-gray-700 my-2"></div>
            )}
        </div>
    );
};

const ContentToCashFunnel: React.FC<{ data: ContentToCashData }> = ({ data }) => {
    if (!data) return null;

    return (
        <div className="p-4 space-y-2">
            <FunnelStage
                icon={<Icons.Target className="w-6 h-6 text-blue-200" />}
                label="Total CTA Clicks"
                value={data.ctaClicks}
                color="bg-blue-500/80"
            />
            <FunnelStage
                icon={<Icons.Users className="w-6 h-6 text-teal-200" />}
                label="Leads Generated"
                value={data.leadsGenerated}
                color="bg-teal-500/80"
            />
            <FunnelStage
                icon={<Icons.CheckCircle className="w-6 h-6 text-purple-200" />}
                label="Marketing Qualified Leads (MQLs)"
                value={data.mqlsCreated}
                color="bg-purple-500/80"
            />
            <FunnelStage
                icon={<Icons.DollarSign className="w-6 h-6 text-green-200" />}
                label="Pipeline Value Added"
                value={data.pipelineValue}
                prefix="$"
                color="bg-green-500/80"
                isLast
            />
        </div>
    );
};

export default ContentToCashFunnel;
