import React from 'react';

interface TaskData {
    [key: string]: number;
}

interface WorkloadData {
    name: string;
    avatar?: string;
    tasks: TaskData;
}

interface WorkloadChartProps {
    data: WorkloadData[];
}

const stageColors: { [key: string]: { bg: string; text: string } } = {
    'INTAKE': { bg: 'bg-gradient-to-r from-blue-500 to-blue-400', text: 'text-blue-100' },
    'EDITING': { bg: 'bg-gradient-to-r from-purple-500 to-purple-400', text: 'text-purple-100' },
    'DESIGN': { bg: 'bg-gradient-to-r from-pink-500 to-pink-400', text: 'text-pink-100' },
    'DISTRIBUTION': { bg: 'bg-gradient-to-r from-orange-500 to-orange-400', text: 'text-orange-100' },
    'REVIEW': { bg: 'bg-gradient-to-r from-yellow-500 to-yellow-400', text: 'text-yellow-100' },
    'SCHEDULED': { bg: 'bg-gradient-to-r from-teal-500 to-teal-400', text: 'text-teal-100' },
    'PUBLISHED': { bg: 'bg-gradient-to-r from-green-500 to-green-400', text: 'text-green-100' },
    'BLOCKED': { bg: 'bg-gradient-to-r from-red-500 to-red-400', text: 'text-red-100' },
};

const WorkloadChart: React.FC<WorkloadChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <p className="text-center text-gray-500 py-10">No workload data available.</p>;
    }
    
    const maxTasks = Math.max(1, ...data.map(d => Object.values(d.tasks).reduce((sum, count) => sum + count, 0)));

    return (
        <div className="space-y-6 p-2">
            {data.map(person => {
                const totalTasks = Object.values(person.tasks).reduce((sum, count) => sum + count, 0);

                return (
                    <div key={person.name} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-48 flex-shrink-0">
                            {person.avatar && <img src={person.avatar} alt={person.name} className="w-10 h-10 rounded-full object-cover" />}
                            <div className="flex-1">
                                <p className="font-semibold text-white truncate">{person.name}</p>
                                <p className="text-sm text-gray-400">{totalTasks} task{totalTasks !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <div className="w-full flex-1">
                            <div className="h-8 w-full bg-[#2A2A2A]/50 rounded-md flex overflow-hidden group relative">
                                {Object.entries(person.tasks).map(([stage, count]) => {
                                    const widthPercentage = maxTasks > 0 ? (count / maxTasks) * 100 : 0;
                                    return (
                                        <div
                                            key={stage}
                                            className={`${stageColors[stage]?.bg || 'bg-gray-500'}`}
                                            style={{ width: `${widthPercentage}%` }}
                                            title={`${stage}: ${count}`}
                                        />
                                    );
                                })}
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center px-4 pointer-events-none">
                                    <p className="text-white font-semibold text-sm">
                                        {Object.entries(person.tasks).map(([stage, count]) => `${stage}: ${count}`).join(' / ')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default WorkloadChart;