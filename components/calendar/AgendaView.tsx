import React from 'react';
import { Episode } from '../../types';
import { getStatusStyle } from '../../utils';

interface AgendaViewProps {
    filteredEpisodes: Episode[];
    onEventClick: (event: Episode) => void;
}

const AgendaView: React.FC<AgendaViewProps> = ({ filteredEpisodes, onEventClick }) => {
    const eventsByDate = filteredEpisodes.reduce((acc, event) => {
        const date = event.dueDate;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(event);
        return acc;
    }, {} as Record<string, Episode[]>);

    const sortedDates = Object.keys(eventsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return (
        <div className="p-4 space-y-6">
            {sortedDates.length > 0 ? sortedDates.map(dateStr => {
                const date = new Date(dateStr + 'T00:00:00');
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                    <div key={dateStr} className={`p-4 rounded-lg bg-[#1A1A1A]/50 border-l-4 ${isToday ? 'border-[#F1C87A]' : 'border-[#2A2A2A]'}`}>
                        <h3 className="font-bold text-white text-lg">
                            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
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
                    <p className="text-lg font-semibold text-white">No Scheduled Content</p>
                    <p className="text-gray-400 mt-2">There are no events scheduled for the current filters.</p>
                </div>
            )}
        </div>
    );
};
export default AgendaView;
