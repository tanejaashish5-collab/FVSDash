import React, { useEffect } from 'react';
import { KanbanCard } from '../types';
import Icons from './Icons';
import { getStatusStyle, getPriorityBadgeStyle } from '../utils';

const KanbanCardModal: React.FC<{ card: KanbanCard & { column: string }, onClose: () => void }> = ({ card, onClose }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    return (
        <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="kanban-card-title"
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-[#1A1A1A] rounded-lg shadow-2xl border border-[#2A2A2A] w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between p-6 border-b border-[#2A2A2A] flex-shrink-0">
                    <div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-2 ${getStatusStyle(card.type)}`}>{card.type}</span>
                        <h2 id="kanban-card-title" className="text-2xl font-bold text-white">{card.title}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 rounded-full hover:bg-[#2A2A2A] hover:text-white transition-colors">
                        <Icons.CloseLarge />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex flex-col gap-6">
                    {/* Description Section */}
                    <div>
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-[#B3B3B3] mb-2">Description</h3>
                        <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{card.description}</p>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 pt-6 border-t border-[#2A2A2A]">
                        {/* Status */}
                        <div>
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-[#B3B3B3] mb-3">Status</h3>
                            <p className="text-white font-medium">{card.column}</p>
                        </div>
                        
                        {/* Due Date */}
                        <div>
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-[#B3B3B3] mb-3">Due Date</h3>
                            <p className="text-white font-medium">{card.dueDate}</p>
                        </div>
                        
                        {/* Priority */}
                        {card.priority && (
                             <div>
                                 <h3 className="font-semibold text-sm uppercase tracking-wider text-[#B3B3B3] mb-3">Priority</h3>
                                 <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadgeStyle(card.priority)}`}>
                                    {card.priority}
                                 </span>
                             </div>
                        )}

                        {/* Links */}
                        {card.links && card.links.length > 0 && (
                            <div className="sm:col-span-2">
                                <h3 className="font-semibold text-sm uppercase tracking-wider text-[#B3B3B3] mb-3">Links</h3>
                                <ul className="space-y-2">
                                    {card.links.map(link => (
                                        <li key={link.url}>
                                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#F1C87A] hover:underline">
                                                <Icons.Link />
                                                <span>{link.name}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KanbanCardModal;