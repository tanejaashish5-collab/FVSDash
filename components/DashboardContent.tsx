

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
    Episode,
    KPIData,
    KanbanCard,
    UserProfile,
    ContentPerformanceData,
    ToastNotification,
    QuickAction
} from '../types';
import KanbanBoard from "./KanbanBoard";
import KanbanCardModal from "./KanbanCardModal";
import KPITile from "./KPITile";
import CalendarView from "./CalendarView";
import QuickActions from "./QuickActions";
import EpisodesTable from "./EpisodesTable";
import Icons from "./Icons";

interface DashboardContentProps {
    user: UserProfile;
    kpiData: KPIData;
    episodes: Episode[];
    kanbanCards: Record<string, KanbanCard[]>;
    performanceData: ContentPerformanceData[];
    quickActions: QuickAction[];
    setActivePage: (page: string) => void;
    onViewEpisodeDetails: (episode: ContentPerformanceData) => void;
    addToast: (toast: Omit<ToastNotification, 'id' | 'duration'>) => void;
    setIsFormOpen: (isOpen: boolean) => void;
    setOnboardingRef: (node: HTMLElement | null) => void;
    currentTourStepId?: string | null;
}

const DashboardContent: React.FC<DashboardContentProps> = ({
    user,
    kpiData,
    episodes,
    kanbanCards,
    performanceData,
    setActivePage,
    onViewEpisodeDetails,
    addToast,
    setIsFormOpen,
    setOnboardingRef,
    quickActions,
    currentTourStepId,
}) => {
    const [selectedCard, setSelectedCard] = useState<(KanbanCard & { column: string }) | null>(null);

    // State for interactive KPIs and table filtering
    const [tableFilters, setTableFilters] = useState({
        searchTerm: "", status: "All", type: "All", priority: "All", startDate: "", endDate: ""
    });

    // State for Drag and Drop dashboard widgets
    const initialWidgetOrder = useMemo(() => {
        try {
            const savedOrder = localStorage.getItem('dashboardWidgetOrder');
            return savedOrder ? JSON.parse(savedOrder) : ['overview', 'kanban', 'secondary', 'episodes'];
        } catch (e) {
            return ['overview', 'kanban', 'secondary', 'episodes'];
        }
    }, []);
    const [widgetOrder, setWidgetOrder] = useState<string[]>(initialWidgetOrder);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

    useEffect(() => {
        // This effect handles the automated demo for the "customize layout" tour step.
        if (currentTourStepId === 'customize-layout') {
            const kanbanEl = document.getElementById('kanban-widget');
            if (!kanbanEl) return;
    
            // Make the kanban widget "pop" to indicate it's being dragged.
            kanbanEl.classList.add('is-being-demo-dragged');
    
            // After a delay, simulate the drop by swapping it with the next widget.
            const swapTimeout = setTimeout(() => {
                setWidgetOrder(prevOrder => {
                    const newOrder = [...prevOrder];
                    const fromIndex = newOrder.indexOf('kanban');
                    if (fromIndex === -1) return newOrder; // Safety check

                    // Swap with the next widget, or the previous if it's the last one.
                    const toIndex = (fromIndex + 1) < newOrder.length ? fromIndex + 1 : fromIndex - 1;
                    if (toIndex < 0) return newOrder; // Should not happen with >1 widget

                    [newOrder[fromIndex], newOrder[toIndex]] = [newOrder[toIndex], newOrder[fromIndex]];
                    return newOrder;
                });
            }, 1500);
            
            // After another delay, swap it back to the original position.
            const swapBackTimeout = setTimeout(() => {
                setWidgetOrder(initialWidgetOrder);
            }, 3500);
            
            // Clean up the "pop" effect after the animation is complete.
            const cleanupTimeout = setTimeout(() => {
                if (kanbanEl) {
                  kanbanEl.classList.remove('is-being-demo-dragged');
                }
            }, 4000);
    
            // Cleanup function to clear timeouts and styles if the component unmounts or the step changes.
            return () => {
                clearTimeout(swapTimeout);
                clearTimeout(swapBackTimeout);
                clearTimeout(cleanupTimeout);
                if (kanbanEl) {
                    kanbanEl.classList.remove('is-being-demo-dragged');
                }
                // Ensure the order is reset if the tour step is skipped mid-animation.
                setWidgetOrder(initialWidgetOrder);
            };
        }
    }, [currentTourStepId, initialWidgetOrder]);

    const handleCardClick = (card: KanbanCard, column: string) => {
        setSelectedCard({ ...card, column });
    };

    const handleKpiClick = (status: string) => {
        const statusMap: { [key: string]: string } = {
            'New Submissions': 'New',
            'In Production': 'In Production',
            'Ready for Review': 'Review',
            'Published (30d)': 'Published',
        };
        const newStatus = statusMap[status];
        setTableFilters(prev => ({
            ...prev,
            status: prev.status === newStatus ? 'All' : newStatus
        }));
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLElement>, index: number) => {
        dragItem.current = index;
        setDraggingIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLElement>, index: number) => {
        dragOverItem.current = index;
    };
    
    const handleDragEnd = () => {
        const newWidgetOrder = [...widgetOrder];
        if (dragItem.current !== null && dragOverItem.current !== null) {
            const draggedItemContent = newWidgetOrder.splice(dragItem.current, 1)[0];
            newWidgetOrder.splice(dragOverItem.current, 0, draggedItemContent);
            setWidgetOrder(newWidgetOrder);
            localStorage.setItem('dashboardWidgetOrder', JSON.stringify(newWidgetOrder));
        }
        dragItem.current = null;
        dragOverItem.current = null;
        setDraggingIndex(null);
    };

    const widgets: { [key: string]: { title: string; component: React.ReactNode; onboardingId?: string } } = {
        overview: {
            title: 'Overview',
            onboardingId: 'welcome-card',
            component: (
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                    <div ref={setOnboardingRef} data-onboarding-id="welcome-card" className="lg:col-span-2 bg-[#121212] p-8 rounded-lg border border-[#2A2A2A] h-full flex flex-col transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#F1C87A]/20">
                        <h1 className="text-4xl font-bold text-white">Welcome back, <span className="text-[#F1C87A]">{user.name}</span></h1>
                        <p className="text-lg text-[#B3B3B3] mt-2">BUILT FOR LEVERAGE. Your content pipeline at a glance.</p>
                        <div className="mt-auto pt-6 flex items-center justify-between gap-6 flex-grow">
                            <div className="flex items-center gap-6">
                                <div className="relative w-24 h-24 flex-shrink-0">
                                    <svg className="w-full h-full" viewBox="0 0 36 36">
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2A2A2A" strokeWidth="3"></path>
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831" fill="none" stroke="#F1C87A" strokeWidth="3" strokeDasharray="65, 100" strokeLinecap="round"></path>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">65%</div>
                                </div>
                                <div>
                                    <p className="text-lg text-white font-semibold">This month: <b>1 Podcast, 10 Shorts, 1 Blog</b></p>
                                    <p className="text-sm text-[#B3B3B3] mt-1">Targets reset on the 1st of each month.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div ref={setOnboardingRef} data-onboarding-id="kpi-tiles" className="grid grid-cols-2 gap-4 h-full">
                        <KPITile title="New Submissions" value={kpiData.newSubmissions.value} subtitle="last 7 days" trend={kpiData.newSubmissions.trend} change={kpiData.newSubmissions.change} onClick={() => handleKpiClick("New Submissions")} isActive={tableFilters.status === 'New'} />
                        <KPITile title="In Production" value={kpiData.inProduction.value} trend={kpiData.inProduction.trend} change={kpiData.inProduction.change} onClick={() => handleKpiClick("In Production")} isActive={tableFilters.status === 'In Production'}/>
                        <KPITile title="Ready for Review" value={kpiData.readyForReview.value} hasIndicator trend={kpiData.readyForReview.trend} change={kpiData.readyForReview.change} onClick={() => handleKpiClick("Ready for Review")} isActive={tableFilters.status === 'Review'} />
                        <KPITile title="Published (30d)" value={kpiData.published.value} trend={kpiData.published.trend} change={kpiData.published.change} onClick={() => handleKpiClick("Published (30d)")} isActive={tableFilters.status === 'Published'}/>
                    </div>
                </section>
            ),
        },
        kanban: {
            title: 'Production Pipeline',
            onboardingId: 'kanban-section',
            component: <KanbanBoard cards={kanbanCards} onCardClick={handleCardClick} activeFilter={tableFilters.status} setOnboardingRef={setOnboardingRef} />
        },
        secondary: {
            title: 'Schedule & Actions',
            onboardingId: 'calendar-view',
            component: (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                    <div className="lg:col-span-2" ref={setOnboardingRef} data-onboarding-id="calendar-view" id="calendar-view">
                        <CalendarView />
                    </div>
                    <div ref={setOnboardingRef} data-onboarding-id="quick-actions" id="quick-actions">
                         <QuickActions actions={quickActions} onSubmitContentClick={() => setIsFormOpen(true)} />
                    </div>
                </div>
            )
        },
        episodes: {
            title: 'Episodes & Deliverables',
            onboardingId: 'episodes-table',
            component: <EpisodesTable episodes={episodes} performanceData={performanceData} filters={tableFilters} setFilters={setTableFilters} onViewEpisodeDetails={onViewEpisodeDetails} />
        }
    };
    
    return (
        <main className="flex-1 overflow-y-auto p-8 isolate space-y-8">
            {selectedCard && <KanbanCardModal card={selectedCard} onClose={() => setSelectedCard(null)} />}
            
            {widgetOrder.map((widgetId, index) => {
                    const widget = widgets[widgetId];
                    const isDragging = draggingIndex === index;
                    return (
                    <section 
                        key={widgetId} 
                        id={`${widgetId}-widget`}
                        data-testid={`widget-${widgetId}`}
                        aria-label={`${widget.title} widget`}
                        ref={setOnboardingRef}
                        data-onboarding-id={widget.onboardingId}
                        draggable
                        onDragStart={e => handleDragStart(e, index)}
                        onDragEnter={e => handleDragEnter(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={e => e.preventDefault()}
                        className={`relative transition-all duration-1000 ease-in-out ${isDragging ? 'opacity-50 border-2 border-dashed border-[#F1C87A] rounded-lg' : 'opacity-100'}`}
                    >
                            <div className="flex items-center justify-between mb-4 cursor-grab active:cursor-grabbing group">
                                <h2 className="text-2xl font-bold text-white">{widget.title}</h2>
                                <div
                                    ref={setOnboardingRef}
                                    data-onboarding-id={widgetId === 'kanban' ? 'draggable-section-handle' : undefined}
                                    className="text-gray-600 group-hover:text-white transition-colors"
                                    title="Drag to reorder"
                                >
                                    <Icons.GripVertical />
                                </div>
                            </div>
                            {widget.component}
                    </section>
                    );
            })}
        </main>
    );
};

export default DashboardContent;