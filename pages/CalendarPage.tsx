
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Episode, UnscheduledItem, ToastNotification } from '../types';
import { DEFAULT_EPISODES, DEFAULT_UNSCHEDULED_IDEAS } from '../constants';
import Icons from '../components/Icons';
import FilterDropdown from '../components/FilterDropdown';
import ConfirmationModal from '../components/ConfirmationModal';
import useMediaQuery from '../hooks/useMediaQuery';
import MonthView from '../components/calendar/MonthView';
import AgendaView from '../components/calendar/AgendaView';
import UpcomingView from '../components/calendar/UpcomingView';
import UnscheduledPipeline from '../components/calendar/UnscheduledPipeline';
import AddNewIdeaModal from '../components/calendar/AddNewIdeaModal';
import EditContentModal from '../components/calendar/EditContentModal';

// Helper to format a Date object to a 'YYYY-MM-DD' string without timezone conversion issues.
const toYYYYMMDD = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface CalendarPageProps {
    addToast: (toast: Omit<ToastNotification, 'id' | 'duration'>) => void;
    episodes?: Episode[];
}

type DraggedEntity = 
    | { type: 'pipeline', item: UnscheduledItem }
    | { type: 'calendar', item: Episode };

type CalendarViewType = 'month' | 'agenda' | 'upcoming';

const CalendarPage: React.FC<CalendarPageProps> = ({ addToast, episodes: initialEpisodes = DEFAULT_EPISODES }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes);
    const [unscheduledItems, setUnscheduledItems] = useState<UnscheduledItem[]>(DEFAULT_UNSCHEDULED_IDEAS);
    
    const draggedEntityRef = useRef<DraggedEntity | null>(null);
    const [draggedEntity, setDraggedEntity] = useState<DraggedEntity | null>(null);

    const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<Episode | null>(null);
    const [isAddingIdea, setIsAddingIdea] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    
    const [isRescheduleConfirmOpen, setIsRescheduleConfirmOpen] = useState(false);
    const [rescheduleData, setRescheduleData] = useState<{ event: Episode; newDate: Date } | null>(null);
    
    const [typeFilter, setTypeFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    const isMobile = useMediaQuery('(max-width: 1023px)');
    const defaultView: CalendarViewType = isMobile ? 'upcoming' : 'month';
    const [view, setView] = useState<CalendarViewType>(defaultView);
    
    useEffect(() => {
        setView(isMobile ? 'upcoming' : 'month');
    }, [isMobile]);

    const filteredEpisodes = useMemo(() => {
        return episodes.filter(ep => 
            (typeFilter === 'All' || ep.type === typeFilter) &&
            (statusFilter === 'All' || ep.status === statusFilter)
        );
    }, [episodes, typeFilter, statusFilter]);
    
    const handleEventClick = (event: Episode) => setSelectedEvent(event);

    const handleSaveNewIdea = (idea: Omit<UnscheduledItem, 'id'>) => {
        const newIdea: UnscheduledItem = { id: `idea-${Date.now()}`, ...idea };
        setUnscheduledItems(prev => [newIdea, ...prev]);
        addToast({ title: "Idea Added!", message: `"${newIdea.title}" is in your pipeline.`, type: "success" });
    };

    const handleUpdateEpisode = (updatedEpisode: Episode) => {
        setEpisodes(prev => prev.map(e => e.id === updatedEpisode.id ? updatedEpisode : e));
        setSelectedEvent(null);
        addToast({ title: "Content Updated", message: `"${updatedEpisode.title}" has been saved.`, type: "success" });
    };

    const handleUnscheduleEpisode = (episodeToUnschedule: Episode) => {
        setEpisodes(prev => prev.filter(e => e.id !== episodeToUnschedule.id));
        const newUnscheduledItem: UnscheduledItem = { id: `idea-${episodeToUnschedule.id}`, title: episodeToUnschedule.title, description: episodeToUnschedule.description || '', type: episodeToUnschedule.type };
        setUnscheduledItems(prev => [newUnscheduledItem, ...prev]);
        setSelectedEvent(null);
        addToast({ title: "Content Unscheduled", message: `"${episodeToUnschedule.title}" moved back to pipeline.`, type: "info" });
    };

    const handleDeleteClick = () => { if (selectedEvent) setIsDeleteConfirmOpen(true); };

    const handleDeleteEpisode = () => {
        if (!selectedEvent) return;
        setEpisodes(prev => prev.filter(e => e.id !== selectedEvent.id));
        addToast({ title: "Content Deleted", message: `"${selectedEvent.title}" has been deleted.`, type: "error" });
        setSelectedEvent(null);
        setIsDeleteConfirmOpen(false);
    };
    
    const handlePipelineItemDragStart = (item: UnscheduledItem, e: React.DragEvent) => {
        const entity = { type: 'pipeline' as const, item };
        draggedEntityRef.current = entity;
        setTimeout(() => setDraggedEntity(entity), 0);
    };
    
    const handleEventDragStart = (item: Episode, e: React.DragEvent) => {
        const entity = { type: 'calendar' as const, item };
        draggedEntityRef.current = entity;
        setTimeout(() => setDraggedEntity(entity), 0);
    };

    const handleDrop = (date: Date) => {
        const dragged = draggedEntityRef.current;
        setDragOverDate(null);
        if (!dragged) return;

        if (dragged.type === 'pipeline') {
            const newEpisode: Episode = { id: `ep-${Date.now()}`, title: dragged.item.title, description: dragged.item.description, type: dragged.item.type, status: 'Scheduled', dueDate: toYYYYMMDD(date), priority: 'Medium' };
            setEpisodes(prev => [...prev, newEpisode]);
            setUnscheduledItems(prev => prev.filter(item => item.id !== dragged.item.id));
            addToast({ title: 'Content Scheduled!', message: `"${newEpisode.title}" scheduled for ${date.toLocaleDateString()}.`, type: 'success' });
        } else if (dragged.type === 'calendar') {
             if (dragged.item.dueDate === toYYYYMMDD(date)) return;
            setRescheduleData({ event: dragged.item, newDate: date });
            setIsRescheduleConfirmOpen(true);
        }
    };

    const handleConfirmReschedule = () => {
        if (!rescheduleData) return;
        const { event, newDate } = rescheduleData;
        setEpisodes(prev => prev.map(ep => ep.id === event.id ? { ...ep, dueDate: toYYYYMMDD(newDate) } : ep));
        addToast({ title: 'Content Rescheduled!', message: `"${event.title}" moved to ${newDate.toLocaleDateString()}.`, type: 'info' });
        setIsRescheduleConfirmOpen(false);
        setRescheduleData(null);
    };

    const handleDragEnd = () => {
        draggedEntityRef.current = null;
        setDraggedEntity(null);
        setDragOverDate(null);
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const changeMonth = (offset: number) => setCurrentDate(new Date(year, month + offset, 1));

    const DesktopLayout = () => (
        <div className="flex-1 flex flex-row gap-8 mt-8 min-h-0">
            <div className="flex-1 flex flex-col bg-[#121212] rounded-lg border border-[#2A2A2A] overflow-hidden">
                <div className="flex flex-wrap items-center justify-between p-4 border-b border-[#2A2A2A] gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-md hover:bg-[#2A2A2A] text-gray-300"><Icons.ChevronLeft /></button>
                        <h2 className="text-xl font-bold text-white">{`${monthNames[month]} ${year}`}</h2>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-md hover:bg-[#2A2A2A] text-gray-300"><Icons.ChevronRight /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm font-semibold text-white bg-transparent border border-gray-600 rounded-lg hover:bg-gray-700/50">Today</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <FilterDropdown label="Type" options={['All', 'Podcast', 'Shorts', 'Blog']} selectedValue={typeFilter} onSelect={setTypeFilter} />
                        <FilterDropdown label="Status" options={['All', 'New', 'In Production', 'Review', 'Scheduled', 'Published']} selectedValue={statusFilter} onSelect={setStatusFilter} />
                        <div className="bg-[#1A1A1A] p-1 rounded-lg flex items-center text-sm font-semibold">
                            {(['month', 'agenda', 'upcoming'] as const).map(v => (
                                <button key={v} onClick={() => setView(v)} className={`px-3 py-1 rounded-md transition-colors capitalize ${view === v ? 'bg-[#F1C87A] text-black' : 'text-gray-400 hover:text-white'}`}>
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-auto">
                    {view === 'month' ? (
                        <MonthView currentDate={currentDate} filteredEpisodes={filteredEpisodes} draggedEntity={draggedEntity} dragOverDate={dragOverDate} onDragEnter={(date) => setDragOverDate(date)} onDrop={handleDrop} onDragEnd={handleDragEnd} onEventClick={handleEventClick} onEventDragStart={handleEventDragStart} />
                    ) : view === 'agenda' ? (
                        <AgendaView filteredEpisodes={filteredEpisodes} onEventClick={handleEventClick} />
                    ) : (
                        <UpcomingView filteredEpisodes={filteredEpisodes} onEventClick={handleEventClick} />
                    )}
                </div>
            </div>
            <UnscheduledPipeline unscheduledItems={unscheduledItems} draggedEntity={draggedEntity} onDragStart={handlePipelineItemDragStart} onDragEnd={handleDragEnd} onAddNewIdea={() => setIsAddingIdea(true)} />
        </div>
    );

    const MobileLayout = () => (
        <div className="flex-1 flex flex-col mt-4 min-h-0">
             <div className="flex items-center justify-between p-2">
                 <div className="flex items-center gap-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-md hover:bg-[#2A2A2A] text-gray-300"><Icons.ChevronLeft /></button>
                    <h2 className="text-lg font-bold text-white">{`${monthNames[month]} ${year}`}</h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-md hover:bg-[#2A2A2A] text-gray-300"><Icons.ChevronRight /></button>
                </div>
                 <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm font-semibold text-white bg-transparent border border-gray-600 rounded-lg hover:bg-gray-700/50">Today</button>
            </div>
            <div className="p-2">
                <div className="bg-[#1A1A1A] p-1 rounded-lg flex items-center text-sm font-semibold w-full">
                    {(['upcoming', 'agenda', 'month'] as const).map(v => ( <button key={v} onClick={() => setView(v)} className={`flex-1 px-3 py-1 rounded-md transition-colors capitalize ${view === v ? 'bg-[#F1C87A] text-black' : 'text-gray-400 hover:text-white'}`}>{v}</button> ))}
                </div>
            </div>
            <details className="bg-[#121212] rounded-lg border border-[#2A2A2A] my-4">
                <summary className="p-4 font-bold text-white cursor-pointer list-none flex justify-between items-center">
                    <span>Content Pipeline ({unscheduledItems.length})</span> <Icons.ChevronDown />
                </summary>
                <div className="p-4 border-t border-[#2A2A2A] max-h-60 overflow-y-auto space-y-2">
                     {unscheduledItems.map(item => ( <div key={item.id} className="p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg"> <p className="font-semibold text-white">{item.title}</p> <p className="text-xs text-gray-400 mt-1">{item.description}</p> </div> ))}
                     <button onClick={() => setIsAddingIdea(true)} className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-transparent border border-dashed border-gray-600 rounded-lg hover:bg-gray-700/50 transition-all"> <Icons.PlusCircle className="w-5 h-5" /> Add New Idea </button>
                </div>
            </details>
            <div className="flex-1 overflow-y-auto bg-[#121212] rounded-lg border border-[#2A2A2A]">
                 {view === 'month' ? (
                        <MonthView currentDate={currentDate} filteredEpisodes={filteredEpisodes} draggedEntity={draggedEntity} dragOverDate={dragOverDate} onDragEnter={(date) => setDragOverDate(date)} onDrop={handleDrop} onDragEnd={handleDragEnd} onEventClick={handleEventClick} onEventDragStart={handleEventDragStart}/>
                    ) : view === 'agenda' ? (
                        <AgendaView filteredEpisodes={filteredEpisodes} onEventClick={handleEventClick} />
                    ) : (
                        <UpcomingView filteredEpisodes={filteredEpisodes} onEventClick={handleEventClick} />
                    )}
            </div>
        </div>
    );

    return (
        <main className="flex-1 flex flex-col p-4 md:p-8 animate-fade-in bg-[#0B0B0B] overflow-hidden">
            {selectedEvent && ( <EditContentModal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} episode={selectedEvent} onSave={handleUpdateEpisode} onUnschedule={handleUnscheduleEpisode} onDelete={handleDeleteClick} /> )}
             <ConfirmationModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={handleDeleteEpisode} title="Delete Content?" message="Are you sure you want to permanently delete this item? This action cannot be undone." />
            <ConfirmationModal isOpen={isRescheduleConfirmOpen} onClose={() => { setIsRescheduleConfirmOpen(false); setRescheduleData(null); }} onConfirm={handleConfirmReschedule} title="Reschedule Content?" message={`Are you sure you want to move "${rescheduleData?.event.title}" to ${rescheduleData?.newDate.toLocaleDateString()}?`} />
            <AddNewIdeaModal isOpen={isAddingIdea} onClose={() => setIsAddingIdea(false)} onSave={handleSaveNewIdea} />

            <div className="flex items-center justify-between">
                <div>
                    <p className="text-lg font-semibold text-[#F1C87A]">CONTENT COMMAND CENTER</p>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mt-1">Strategic Calendar</h1>
                </div>
            </div>

            {isMobile ? <MobileLayout /> : <DesktopLayout />}
        </main>
    );
};
export default CalendarPage;