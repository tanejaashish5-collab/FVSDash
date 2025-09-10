import React, { useState, useMemo } from 'react';
import { KanbanCard } from '../types';
import Icons from './Icons';
import FilterDropdown from './FilterDropdown';
import { getDueDateInfo, getStatusStyle, getPriorityIndicatorStyle, getPriorityStyle } from '../utils';

interface KanbanBoardProps {
    cards: Record<string, KanbanCard[]>;
    onCardClick: (card: KanbanCard, column: string) => void;
    activeFilter: string | null;
    setOnboardingRef: (el: HTMLElement | null) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ cards, onCardClick, activeFilter, setOnboardingRef }) => {
    const [assigneeFilter, setAssigneeFilter] = useState('All Assignees');
    const [dueDateFilter, setDueDateFilter] = useState('All Dates');

    const allAssignees = useMemo(() => {
        const assignees = new Set<string>();
        Object.values(cards).flat().forEach(card => {
            card.assignees.forEach(a => assignees.add(a.name));
        });
        return ['All Assignees', ...Array.from(assignees).sort()];
    }, [cards]);
    
    const dueDateOptions = ['All Dates', 'Overdue', 'Due Today', 'Due This Week'];

    const columns = ["INTAKE", "EDITING", "DESIGN", "DISTRIBUTION", "REVIEW", "SCHEDULED", "PUBLISHED", "BLOCKED"];
    
    const statusToKanbanColumn: { [key: string]: string[] } = {
        'New': ['INTAKE'],
        'In Production': ['EDITING', 'DESIGN', 'DISTRIBUTION'],
        'Review': ['REVIEW'],
        'Published': ['PUBLISHED'],
        'Scheduled': ['SCHEDULED'],
    };

    const filteredCardsByColumn = useMemo(() => {
        const newFilteredCards: Record<string, KanbanCard[]> = {};
        for (const column of columns) {
            const columnCards = cards[column] || [];
            newFilteredCards[column] = columnCards.filter(card => {
                // Assignee Filter
                if (assigneeFilter !== 'All Assignees' && !card.assignees.some(a => a.name === assigneeFilter)) {
                    return false;
                }
                
                // Due Date Filter
                if (dueDateFilter !== 'All Dates') {
                    const dueDate = new Date(card.dueDate + 'T00:00:00');
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    
                    if (dueDateFilter === 'Overdue' && dueDate >= today) {
                        return false;
                    }
                    if (dueDateFilter === 'Due Today' && dueDate.getTime() !== today.getTime()) {
                        return false;
                    }
                    if (dueDateFilter === 'Due This Week') {
                        const endOfWeek = new Date(today);
                        endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
                        if (dueDate < today || dueDate > endOfWeek) {
                            return false;
                        }
                    }
                }
                
                return true;
            });
        }
        return newFilteredCards;
    }, [cards, assigneeFilter, dueDateFilter]);


    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
                 {/* This space is intentionally left for the draggable header */}
                 <div className="flex gap-2">
                    <FilterDropdown label="Assignee" options={allAssignees} selectedValue={assigneeFilter} onSelect={setAssigneeFilter} tooltip="Filter by assignee" />
                    <FilterDropdown label="Due Date" options={dueDateOptions} selectedValue={dueDateFilter} onSelect={setDueDateFilter} tooltip="Filter by due date" />
                 </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-6">
                {columns.map(column => {
                    const isHighlighted = activeFilter && statusToKanbanColumn[activeFilter]?.includes(column);
                    const columnCards = filteredCardsByColumn[column] || [];
                    
                    return (
                    <div
                        key={column}
                        className={`p-4 rounded-lg bg-[#121212] transition-all duration-300 ${isHighlighted ? 'ring-2 ring-offset-2 ring-offset-[#0B0B0B] ring-[#F1C87A]' : ''}`}
                    >
                        <h3 className={`font-semibold text-sm uppercase tracking-wider mb-4 ${column === 'BLOCKED' ? 'text-red-400/80' : 'text-[#B3B3B3]'}`}>{column} ({columnCards.length})</h3>
                        <div className="space-y-4 min-h-[100px]">
                            {columnCards.length > 0 ? (
                                columnCards.map((card) => {
                                    const dueDateInfo = getDueDateInfo(card.dueDate);
                                    const dueDateTextColor =
                                        dueDateInfo.status === 'past' ? 'text-red-400' :
                                        dueDateInfo.status === 'approaching' ? 'text-yellow-400' :
                                        'text-[#B3B3B3]';
                                    
                                    return (
                                    <div
                                        key={card.id}
                                        ref={setOnboardingRef}
                                        data-onboarding-id={card.id === 'card-2' ? 'high-priority-task' : undefined}
                                        onClick={() => onCardClick(card, column)}
                                        className="relative overflow-hidden p-4 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#F1C87A]/20 flex flex-col justify-between min-h-[160px]"
                                    >
                                        <div className={`absolute top-0 left-0 h-full w-1 ${getPriorityIndicatorStyle(card.priority)}`}></div>
                                        <div>
                                            <h4 className="font-semibold text-white mb-2">{card.title}</h4>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusStyle(card.type)}`}>{card.type}</span>
                                                {card.priority && <span className={`border px-2 py-1 rounded-full text-xs font-semibold ${getPriorityStyle(card.priority)}`}>{card.priority}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center mt-3">
                                            <div className={`flex items-center gap-1.5 text-xs ${dueDateTextColor}`} title={dueDateInfo.relativeTime}>
                                                <Icons.Clock />
                                                <span>{new Date(card.dueDate).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })
                            ) : (
                                <div className="border-2 border-dashed border-[#2A2A2A] rounded-lg h-24 flex items-center justify-center">
                                    <p className="text-sm text-[#B3B3B3]">No items</p>
                                </div>
                            )}
                        </div>
                    </div>
                )})}
            </div>
        </div>
    );
};

export default KanbanBoard;