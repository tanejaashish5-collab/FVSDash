
import React, { useMemo } from 'react';
import { Episode, ContentPerformanceData } from '../types';
import { getStatusStyle, parseDueDate, getPriorityStyle } from '../utils';
import Icons from './Icons';
import DatePicker from './DatePicker';
import FilterDropdown from './FilterDropdown';

const EpisodesTable: React.FC<{ 
    episodes: Episode[], 
    performanceData: ContentPerformanceData[],
    filters: any,
    setFilters: (filters: any) => void,
    onViewEpisodeDetails: (episode: ContentPerformanceData) => void,
}> = ({ episodes, performanceData, filters, setFilters, onViewEpisodeDetails }) => {

    const filteredEpisodes = useMemo(() => {
        const start = filters.startDate ? new Date(filters.startDate + 'T00:00:00') : null;
        const end = filters.endDate ? new Date(filters.endDate + 'T23:59:59') : null;

        return episodes.filter(episode => {
            const matchesSearch = episode.title.toLowerCase().includes(filters.searchTerm.toLowerCase());
            const matchesStatus = filters.status === "All" || episode.status === filters.status;
            const matchesType = filters.type === "All" || episode.type === filters.type;
            const matchesPriority = filters.priority === "All" || episode.priority === filters.priority;

            const episodeDate = parseDueDate(episode.dueDate);
            const dateInRange = !episodeDate || (
                (!start || episodeDate >= start) &&
                (!end || episodeDate <= end)
            );
            
            return matchesSearch && matchesStatus && matchesType && matchesPriority && dateInRange;
        });
    }, [episodes, filters]);

    const statusOptions = ["All", "New", "In Production", "Review", "Scheduled", "Published"] as const;
    const typeOptions = ["All", "Podcast", "Shorts", "Blog"] as const;
    const priorityOptions = ["All", "High", "Medium", "Low"] as const;
    
    const handleFilterChange = (filterName: string, value: string) => {
        setFilters((prev: any) => ({ ...prev, [filterName]: value }));
    };

    return (
        <div className="bg-[#121212] p-6 rounded-lg border border-[#2A2A2A]">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                 <div className="flex flex-wrap items-center gap-4 flex-1 min-w-[300px]">
                     <div className="relative w-full sm:max-w-xs">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500"><Icons.Search /></span>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={filters.searchTerm}
                            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                            className="w-full rounded-lg bg-[#1A1A1A] py-2 pl-10 pr-4 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                            <DatePicker
                            selectedDate={filters.startDate}
                            onDateChange={(date) => handleFilterChange('startDate', date)}
                            placeholder="Start Date"
                        />
                        <span className="text-gray-500">to</span>
                        <DatePicker
                            selectedDate={filters.endDate}
                            onDateChange={(date) => handleFilterChange('endDate', date)}
                            placeholder="End Date"
                            minDate={filters.startDate}
                        />
                            {(filters.startDate || filters.endDate) && (
                            <button 
                                onClick={() => { handleFilterChange('startDate', ""); handleFilterChange('endDate', ""); }} 
                                className="p-2 text-gray-500 rounded-full hover:bg-[#2A2A2A] hover:text-white transition-colors"
                                title="Clear date filter"
                            >
                                <Icons.Close />
                            </button>
                        )}
                    </div>
                </div>
                 <div className="flex flex-wrap items-center gap-2">
                    <FilterDropdown label="Status" options={[...statusOptions]} selectedValue={filters.status} onSelect={(value) => handleFilterChange('status', value as string)} tooltip="Filter by episode status" />
                    <FilterDropdown label="Type" options={[...typeOptions]} selectedValue={filters.type} onSelect={(value) => handleFilterChange('type', value as string)} tooltip="Filter by content type" />
                    <FilterDropdown label="Priority" options={[...priorityOptions]} selectedValue={filters.priority} onSelect={(value) => handleFilterChange('priority', value as string)} tooltip="Filter by priority level" />
                 </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-[#2A2A2A] text-[#B3B3B3] uppercase tracking-wider">
                        <tr>
                            <th className="p-4">Title</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Priority</th>
                            <th className="p-4">Due Date</th>
                            <th className="p-4 text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEpisodes.map(episode => {
                            const perfData = performanceData.find(p => p.id === episode.id);
                            return (
                                <tr key={episode.id} className="border-b border-[#2A2A2A] transition-colors even:bg-white/5 hover:bg-white/10">
                                    <td className="p-4 font-semibold text-white">{episode.title}</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyle(episode.type)}`}>{episode.type}</span></td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyle(episode.status)}`}>{episode.status}</span></td>
                                    <td className="p-4"><span className={`border px-2 py-1 rounded-full text-xs font-semibold ${getPriorityStyle(episode.priority)}`}>{episode.priority || 'N/A'}</span></td>
                                    <td className="p-4 text-[#B3B3B3]">{new Date(episode.dueDate).toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        {perfData ? (
                                            <button
                                                onClick={() => onViewEpisodeDetails(perfData)}
                                                className="p-2 rounded-full text-gray-400 hover:bg-[#F1C87A]/20 hover:text-[#F1C87A] transition-colors"
                                                title="View detailed report"
                                            >
                                                <Icons.ChevronRight className="w-5 h-5" />
                                            </button>
                                        ) : (
                                            <span className="text-gray-600">-</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredEpisodes.length === 0 && <p className="text-center p-8 text-[#B3B3B3]">No episodes found matching your criteria.</p>}
            </div>
        </div>
    );
};

export default EpisodesTable;
