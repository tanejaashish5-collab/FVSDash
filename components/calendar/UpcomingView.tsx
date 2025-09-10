import React from 'react';
import { Episode } from '../../types';
import { getStatusStyle, getDueDateInfo } from '../../utils';

interface UpcomingViewProps {
    filteredEpisodes: Episode[];
    onEventClick: (event: Episode) => void;
}

const UpcomingView: React.FC<UpcomingViewProps> = ({ filteredEpisodes, onEventClick }) => {
    // 1. Filter for upcoming events (from today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingEvents = filteredEpisodes.filter(event => {
        if (!event.dueDate) return false;
        const eventDate = new Date(event.dueDate + 'T00:00:00');
        return eventDate >= today;
    });

    // 2. Group by date
    const eventsByDate = upcomingEvents.reduce((acc, event) => {
        const date = event.dueDate;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(event);
        return acc;
    }, {} as Record<string, Episode[]>);

    // 3. Sort dates
    const sortedDates = Object.keys(eventsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return (
        <div className="p-4 space-y-6">
            {sortedDates.length > 0 ? sortedDates.map(dateStr => {
                const date = new Date(dateStr + 'T00:00:00');
                const dueDateInfo = getDueDateInfo(dateStr);
                const isToday = dueDateInfo.relativeTime === 'Due today';

                return (
                    <div key={dateStr} className={`p-4 rounded-lg bg-[#1A1A1A]/50 border-l-4 ${isToday ? 'border-[#F1C87A]' : 'border-[#2A2A2A]'}`}>
                        <h3 className="font-bold text-white text-lg flex items-center gap-3">
                            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            <span className="text-sm font-normal text-gray-400">({dueDateInfo.relativeTime})</span>
                        </h3>
                        <div className="mt-3 space-y-3">
                            {eventsByDate[dateStr].map(event => (
                                <div
                                    key={event.id}
                                    onClick={() => onEventClick(event)}
                                    className="flex items-center gap-4 p-3 rounded-md bg-[#1A1A1A] border border-[#2A2A2A] cursor-pointer transition-all duration-200 relative hover:-translate-y-1 hover:[filter:drop-shadow(0_0_8px_rgba(241,200,122,0.5))]">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyle(event.type)}`}>{event.type}</span>
                                    <p className="font-semibold text-white flex-1">{event.title}</p>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyle(event.status)}`}>{event.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }) : (
                <div className="text-center py-12">
                    <p className="text-lg font-semibold text-white">No Upcoming Events</p>
                    <p className="text-gray-400 mt-2">Your schedule is clear for the foreseeable future!</p>
                </div>
            )}
        </div>
    );
};
export default UpcomingView;
