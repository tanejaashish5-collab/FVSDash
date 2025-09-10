
import React, { useState, useMemo } from 'react';
import { Deliverable, ToastNotification } from '../types';
import Icons from '../components/Icons';

// Helper function to get status styles
const getDeliverableStatusPillStyle = (status: Deliverable['status']) => {
    switch (status) {
        case 'Needs Review':
            return 'bg-yellow-500/10 text-yellow-400';
        case 'Approved':
            return 'bg-green-500/10 text-green-400';
        case 'Revisions Requested':
            return 'bg-red-500/10 text-red-400';
        default:
            return 'bg-gray-500/10 text-gray-400';
    }
};

const DeliverableCard: React.FC<{
    deliverable: Deliverable;
    onUpdateStatus: (id: string, status: Deliverable['status']) => void;
}> = ({ deliverable, onUpdateStatus }) => {
    
    const DeliverableIcon = () => {
        switch(deliverable.type) {
            case 'Blog': return <Icons.Blog className="w-5 h-5 text-teal-400" />;
            case 'Shorts': return <Icons.IconVideo className="w-5 h-5 text-blue-400" />;
            case 'Quote Graphic': return <Icons.IconImage className="w-5 h-5 text-pink-400" />;
            default: return null;
        }
    }

    return (
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A] flex flex-col sm:flex-row items-start gap-4">
            {deliverable.previewUrl && (
                <img src={deliverable.previewUrl} alt={`Preview for ${deliverable.title}`} className="w-full sm:w-32 h-32 sm:h-auto object-cover rounded-md flex-shrink-0" />
            )}
            <div className="flex-1 flex flex-col h-full">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <DeliverableIcon />
                    <span>{deliverable.type}</span>
                </div>
                <p className="font-bold text-white mt-1 flex-grow">{deliverable.title}</p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-3 gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getDeliverableStatusPillStyle(deliverable.status)}`}>
                        {deliverable.status}
                    </span>
                    <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2A2A2A] rounded-md hover:bg-white/20 transition-colors">
                            Review
                        </button>
                         {deliverable.status !== 'Approved' && (
                            <button 
                                onClick={() => onUpdateStatus(deliverable.id, 'Approved')}
                                className="px-3 py-1.5 text-xs font-semibold text-black bg-green-500 rounded-md hover:bg-green-600 transition-colors">
                                Approve
                            </button>
                         )}
                         {deliverable.status === 'Needs Review' && (
                             <button 
                                onClick={() => onUpdateStatus(deliverable.id, 'Revisions Requested')}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors">
                                Revisions
                            </button>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface DeliverablesPageProps {
    deliverables: Deliverable[];
    addToast: (toast: Omit<ToastNotification, 'id' | 'duration'>) => void;
}

const DeliverablesPage: React.FC<DeliverablesPageProps> = ({ deliverables: initialDeliverables, addToast }) => {
    const [deliverables, setDeliverables] = useState<Deliverable[]>(initialDeliverables);

    const deliverablesByEpisode = useMemo(() => {
        return deliverables.reduce((acc, deliverable) => {
            if (!acc[deliverable.episodeId]) {
                acc[deliverable.episodeId] = {
                    title: deliverable.episodeTitle,
                    items: [],
                };
            }
            acc[deliverable.episodeId].items.push(deliverable);
            return acc;
        }, {} as Record<string, { title: string, items: Deliverable[] }>);
    }, [deliverables]);
    
    const handleUpdateStatus = (id: string, status: Deliverable['status']) => {
        setDeliverables(prev => prev.map(d => d.id === id ? { ...d, status } : d));
        addToast({ title: "Status Updated", message: `Deliverable status changed to "${status}".`, type: "success" });
    };

    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-[#0B0B0B]">
            {/* Header */}
            <div>
                <p className="text-lg font-semibold text-[#F1C87A]">DELIVERABLES HUB</p>
                <h1 className="text-4xl md:text-5xl font-bold text-white mt-1">Ready for Review</h1>
            </div>

            <div className="mt-10 space-y-12">
                {Object.entries(deliverablesByEpisode).map(([episodeId, group]) => (
                    <section key={episodeId}>
                        <div className="flex items-baseline gap-4">
                            <h2 className="text-2xl font-bold text-white">{group.title}</h2>
                            <span className="text-sm font-medium text-gray-400">{group.items.length} deliverables</span>
                        </div>
                        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {group.items.map(deliverable => (
                                <DeliverableCard 
                                    key={deliverable.id} 
                                    deliverable={deliverable}
                                    onUpdateStatus={handleUpdateStatus} 
                                />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </main>
    );
};

export default DeliverablesPage;
