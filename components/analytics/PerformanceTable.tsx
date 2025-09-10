import React, { useState, useMemo } from 'react';
import { ContentPerformanceData } from '../../types';
import Icons from '../Icons';
import { getStatusStyle, formatNumber } from '../../utils';
import Sparkline from './Sparkline';

const PerformanceTable: React.FC<{ data: ContentPerformanceData[], onRowClick?: (episode: ContentPerformanceData) => void; }> = ({ data, onRowClick }) => {
    const [sortConfig, setSortConfig] = useState<{ key: keyof ContentPerformanceData; direction: 'asc' | 'desc' } | null>({ key: 'views', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');

    const sortedData = useMemo(() => {
        let sortableData = [...data];
        
        if (searchTerm) {
            sortableData = sortableData.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        if (sortConfig !== null) {
            sortableData.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableData;
    }, [data, sortConfig, searchTerm]);
    
    const requestSort = (key: keyof ContentPerformanceData) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader: React.FC<{ columnKey: keyof ContentPerformanceData, label: string, className?: string }> = ({ columnKey, label, className }) => {
        const isSorted = sortConfig?.key === columnKey;
        return (
            <th className={`p-4 cursor-pointer hover:bg-[#2A2A2A]/50 transition-colors ${className}`} onClick={() => requestSort(columnKey)}>
                <div className="flex items-center gap-2">
                    {label}
                    {isSorted ? (
                        sortConfig?.direction === 'desc' ? <Icons.ArrowDown /> : <Icons.ArrowUp />
                    ) : <Icons.Sort className="text-gray-600" />}
                </div>
            </th>
        );
    };

    if (data.length === 0) {
        return <p className="text-center text-gray-500 py-10">No published content to analyze in this period.</p>;
    }

    return (
        <div>
            <div className="mb-4">
                <div className="relative w-full max-w-xs">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500"><Icons.Search /></span>
                    <input
                        type="text"
                        placeholder="Search content..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-lg bg-[#1A1A1A] py-2 pl-10 pr-4 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b-2 border-[#2A2A2A] text-[#B3B3B3] uppercase tracking-wider text-xs">
                        <tr>
                            <th className="p-4">Content</th>
                            <SortableHeader columnKey="views" label="Views" />
                            <th className="p-4">Trend (30d)</th>
                            <SortableHeader columnKey="engagementRate" label="Engagement" />
                            <SortableHeader columnKey="subscribersGained" label="Subs Gained" />
                            <SortableHeader columnKey="ctaClicks" label="CTA Clicks" />
                            <th className="p-4 text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.slice(0, 10).map(item => {
                             const isTrendingUp = item.viewTrend[item.viewTrend.length - 1] > item.viewTrend[0];
                             return (
                                <tr 
                                    key={item.id} 
                                    className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A]/50 transition-colors"
                                >
                                    <td className="p-4">
                                        <p className="font-semibold text-white truncate max-w-xs">{item.title}</p>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusStyle(item.type)}`}>{item.type}</span>
                                    </td>
                                    <td className="p-4 font-bold text-lg text-white">{item.views.toLocaleString()}</td>
                                    <td className="p-4"><Sparkline data={item.viewTrend} strokeColor={isTrendingUp ? '#34D399' : '#F87171'} /></td>
                                    <td className="p-4 text-[#B3B3B3]">{item.engagementRate.toFixed(1)}%</td>
                                    <td className="p-4 text-green-400 font-semibold">+{item.subscribersGained.toLocaleString()}</td>
                                    <td className="p-4 text-white font-semibold">{formatNumber(item.ctaClicks)}</td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => onRowClick?.(item)}
                                            className="p-2 rounded-full text-gray-400 hover:bg-[#F1C87A]/20 hover:text-[#F1C87A] transition-colors"
                                            title="View detailed report"
                                        >
                                            <Icons.ChevronRight className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {sortedData.length === 0 && <p className="text-center text-gray-500 py-10">No content matches your search.</p>}
            </div>
        </div>
    );
};

export default PerformanceTable;