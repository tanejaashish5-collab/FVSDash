
import React from 'react';
import { Episode, UnscheduledItem } from '../../types';
import { getStatusStyle } from '../../utils';
import Icons from '../Icons';

const toYYYYMMDD = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

type DraggedEntity =
    | { type: 'pipeline', item: UnscheduledItem }
    | { type: 'calendar', item: Episode };

interface MonthViewProps {
    currentDate: Date;
    filteredEpisodes: Episode[];
    draggedEntity: DraggedEntity | null;
    dragOverDate: Date | null;
    onDragEnter: (date: Date) => void;
    onDrop: (date: Date) => void;
    onEventClick: (event: Episode) => void;
    onEventDragStart: (event: Episode, e: React.DragEvent) => void;
    onDragEnd: () => void;
}

const getCadence = (dayOfWeek: number): { text: string; type: "Podcast" | "Shorts" | "Blog" } | null => {
    switch (dayOfWeek) {
        case 1: return { text: 'Shorts Day', type: 'Shorts' };
        case 2: return { text: 'Podcast Day', type: 'Podcast' };
        case 3: return { text: 'Shorts Day', type: 'Shorts' };
        case 4: return { text: 'Blog Day', type: 'Blog' };
        case 5: return { text: 'Shorts Day', type: 'Shorts' };
        default: return null;
    }
};

const MonthView: React.FC<MonthViewProps> = ({
    currentDate,
    filteredEpisodes,
    draggedEntity,
    dragOverDate,
    onDragEnter,
    onDrop,
    onEventClick,
    onEventDragStart,
    onDragEnd,
}) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: firstDay + daysInMonth }, (_, i) => {
        if (i < firstDay) return null;
        return new Date(year, month, i - firstDay + 1);
    });

    return (
        <div className="grid grid-cols-7 flex-1" data-testid="month-view-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-bold uppercase text-gray-400 p-2 border-b border-r border-[#2A2A2A]">{day}</div>
            ))}
            {days.map((day, index) => {
                const isToday = day && day.toDateString() === new Date().toDateString();
                const dayEvents = day ? filteredEpisodes.filter(e => e.dueDate === toYYYYMMDD(day)) : [];
                const cadence = day ? getCadence(day.getDay()) : null;
                const isBeingDraggedOver = day && dragOverDate && day.getTime() === dragOverDate.getTime();

                return (
                    <div
                        key={index}
                        className={`relative p-2 border-b border-r border-[#2A2A2A] min-h-[120px] group transition-all duration-200 ${isBeingDraggedOver ? 'bg-[#F1C87A]/10' : ''}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            if (day && draggedEntity) onDragEnter(day);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            if (day) onDrop(day);
                        }}
                    >
                        <span className={`absolute top-2 right-2 text-sm font-bold ${isToday ? 'bg-[#F1C87A] text-black rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-400'}`}>
                            {day?.getDate()}
                        </span>
                        <div className="space-y-1 mt-8">
                            {dayEvents.map(event => (
                                <div
                                    key={event.id}
                                    draggable
                                    onDragStart={(e) => onEventDragStart(event, e)}
                                    onDragEnd={onDragEnd}
                                    onClick={() => onEventClick(event)}
                                    className={`px-2 py-1 rounded-md text-xs font-semibold text-white truncate cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:[filter:drop-shadow(0_0_8px_rgba(241,200,122,0.7))] ${getStatusStyle(event.type)} ${draggedEntity?.type === 'calendar' && draggedEntity.item.id === event.id ? 'opacity-40' : ''}`}>
                                    {event.title}
                                </div>
                            ))}
                           {dayEvents.length === 0 && cadence && (
                                <div className="absolute inset-0 flex items-center justify-center p-2 pointer-events-none">
                                    <div className={`px-2 py-1 rounded-full text-xs font-semibold opacity-30 group-hover:opacity-100 transition-opacity ${getStatusStyle(cadence.type)}`}>
                                        {cadence.text}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MonthView;