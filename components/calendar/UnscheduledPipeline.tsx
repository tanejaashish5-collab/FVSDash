import React from 'react';
import { UnscheduledItem, Episode } from '../../types';
import Icons from '../Icons';
import { getStatusStyle } from '../../utils';

type DraggedEntity =
    | { type: 'pipeline', item: UnscheduledItem }
    | { type: 'calendar', item: Episode };

interface UnscheduledPipelineProps {
    unscheduledItems: UnscheduledItem[];
    draggedEntity: DraggedEntity | null;
    onDragStart: (item: UnscheduledItem, e: React.DragEvent) => void;
    onDragEnd: () => void;
    onAddNewIdea: () => void;
}

const UnscheduledPipeline: React.FC<UnscheduledPipelineProps> = ({
    unscheduledItems,
    draggedEntity,
    onDragStart,
    onDragEnd,
    onAddNewIdea,
}) => {
    return (
        <aside
            data-testid="unscheduled-pipeline"
            className="lg:w-1/3 xl:w-1/4 flex flex-col bg-[#121212] rounded-lg border border-[#2A2A2A] overflow-hidden"
        >
            <div className="p-4 border-b border-[#2A2A2A]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Icons.Submissions className="w-5 h-5 text-[#F1C87A]" />
                    Content Pipeline
                </h3>
                <p className="text-sm text-gray-400 mt-1">Drag ideas onto the calendar to schedule.</p>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {unscheduledItems.map(item => (
                    <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => onDragStart(item, e)}
                        onDragEnd={onDragEnd}
                        className={`p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg cursor-grab active:cursor-grabbing hover:border-[#F1C87A] transition-all ${draggedEntity?.type === 'pipeline' && draggedEntity.item.id === item.id ? 'opacity-40 shadow-2xl shadow-[#F1C87A]/30' : ''}`}
                    >
                        <div className="flex justify-between items-start">
                            <p className="font-semibold text-white">{item.title}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusStyle(item.type)}`}>{item.type}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                    </div>
                ))}
                {unscheduledItems.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-gray-400">Pipeline is clear!</p>
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-[#2A2A2A]">
                <button
                    onClick={onAddNewIdea}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-transparent border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-all">
                    <Icons.PlusCircle className="w-5 h-5" /> Add New Idea
                </button>
            </div>
        </aside>
    );
};

export default UnscheduledPipeline;