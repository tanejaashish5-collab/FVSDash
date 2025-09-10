import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
    Episode,
    KPIData,
    KanbanCard,
    UserProfile,
    Notification,
    ToastNotification,
    OnboardingStep,
    Command,
    ContentPerformanceData,
    BlogPost,
    QuickAction,
    Submission,
} from './types';
import {
    DEFAULT_USER_PROFILE,
    DEFAULT_KPI_DATA,
    DEFAULT_SIDEBAR_ITEMS,
    DEFAULT_EPISODES,
    DEFAULT_NOTIFICATIONS,
    DEFAULT_TOAST_NOTIFICATIONS,
    DEFAULT_ONBOARDING_STEPS,
    DEFAULT_ONBOARDING_SETTINGS,
    DEFAULT_KANBAN_CARDS,
    DEFAULT_BLOG_POSTS,
    DEFAULT_ASSETS,
    DEFAULT_QUICK_ACTIONS,
    DEFAULT_SUBMISSIONS,
    DEFAULT_DELIVERABLES,
    SIDEBAR_ONBOARDING_STEPS,
} from './constants';
import { generatePerformanceData, mergeRefs } from './utils';
import Sidebar from './components/Sidebar';
import AnalyticsPage from './pages/Analytics';
import BillingPage from './pages/Billing';
import HelpPage from './pages/HelpPage';
import EpisodeDetailPage from "./pages/EpisodeDetail";
import SubmitContentForm from "./components/SubmitContentForm";
import ErrorBoundary from "./components/ErrorBoundary";
import ErrorDisplay from "./components/ErrorDisplay";
import BlogPage from "./pages/BlogPage";
import BlogEditor from "./pages/BlogEditor";
import AssetsPage from "./pages/AssetsPage";
import DeliverablesPage from "./pages/DeliverablesPage";
import PublicLandingPage from "./components/PublicLandingPage";
import SystemPage from "./pages/SystemPage";
import Header from "./components/Header";
import OnboardingTooltip from "./components/OnboardingTooltip";
import { ToastContainer } from "./components/Toast";
import NotificationsPanel from "./components/NotificationsPanel";
import CommandPalette from "./components/CommandPalette";
import LoadingScreen from "./components/LoadingScreen";
import DashboardContent from "./components/DashboardContent";
import CalendarPage from "./pages/CalendarPage";
import ROICenterPage from "./pages/ROICenter";
import Icons from "./components/Icons";
import FilterDropdown from "./components/FilterDropdown";
import SubmissionTimeline from "./components/SubmissionTimeline";
import SettingsPage from "./pages/SettingsPage";
import { useAuth } from "./lib/AuthProvider";
import AdminDashboard from "./pages/AdminDashboard";
import StrategyLabPage from "./pages/StrategyLabPage";

// New Component for Submissions Page
const SubmissionsPage: React.FC<{ addToast: (toast: Omit<ToastNotification, 'id' | 'duration'>) => void }> = ({ addToast }) => {
    const [submissions] = useState<Submission[]>(DEFAULT_SUBMISSIONS);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');

    const filteredSubmissions = useMemo(() => {
        return submissions.filter(submission => {
            const matchesSearch = submission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                submission.guestName?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' || submission.status === statusFilter;
            const matchesType = typeFilter === 'All' || submission.type === typeFilter;
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [submissions, searchTerm, statusFilter, typeFilter]);
    
    const statusOptions = ["All", "New", "In Production", "Review", "Scheduled", "Published"];
    const typeOptions = ["All", "Podcast", "Shorts", "Blog"];

    const getStatusStyle = (type: Submission['type']) => {
        switch (type) {
            case "Podcast": return `bg-purple-500/10 text-purple-400`;
            case "Shorts": return `bg-blue-500/10 text-blue-400`;
            case "Blog": return `bg-teal-500/10 text-teal-400`;
            default: return `bg-gray-500/10 text-gray-400`;
        }
    };

    return (
        <>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in bg-[#0B0B0B]">
            <div className="flex flex-col md:flex-row justify-between md:items-start mb-10">
                <div>
                    <p className="text-lg font-semibold text-[#F1C87A]">SUBMISSION HISTORY</p>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mt-1">Submission Log</h1>
                </div>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                    <div className="relative w-full max-w-xs">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500"><Icons.Search /></span>
                        <input
                            type="text"
                            placeholder="Search submissions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-lg bg-[#121212] py-2 pl-10 pr-4 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                        />
                    </div>
                     <FilterDropdown label="Type" options={typeOptions} selectedValue={typeFilter} onSelect={setTypeFilter} />
                    <FilterDropdown label="Status" options={statusOptions} selectedValue={statusFilter} onSelect={setStatusFilter} />
                </div>
            </div>

             <div className="bg-[#121212] p-2 rounded-lg border border-[#2A2A2A]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b-2 border-[#2A2A2A] text-[#B3B3B3] uppercase tracking-wider text-xs">
                            <tr>
                                <th className="p-4">Submitted On</th>
                                <th className="p-4">Title</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Production Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSubmissions.map(sub => (
                                <tr key={sub.id} className="border-b border-[#2A2A2A] hover:bg-[#1A1A1A]/50 transition-colors">
                                    <td className="p-4 text-gray-400">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                                    <td className="p-4 font-semibold text-white max-w-md truncate">{sub.title}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyle(sub.type)}`}>
                                            {sub.type}
                                        </span>
                                    </td>
                                     <td className="p-4">
                                        <SubmissionTimeline status={sub.status} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredSubmissions.length === 0 && (
                        <p className="text-center p-8 text-gray-500">No submissions match your criteria.</p>
                    )}
                </div>
            </div>
        </main>
        </>
    );
};

interface MainContentProps {
    activePage: string;
    detailedEpisode: ContentPerformanceData | null;
    editingBlogPost: BlogPost | null;
    addToast: (toast: Omit<ToastNotification, 'id' | 'duration'>) => void;
    setDetailedEpisode: (episode: ContentPerformanceData | null) => void;
    setEditingBlogPost: (post: BlogPost | null) => void;
    setActivePage: (page: string) => void;
    onSaveBlogPost: (post: BlogPost) => Promise<void>;
    blogPosts: BlogPost[];
    isBlogLoading: boolean;
    blogError: string | null;
    fetchBlogPosts: () => void;
    user: UserProfile;
    kpiData: KPIData;
    episodes: Episode[];
    kanbanCards: Record<string, KanbanCard[]>;
    performanceData: ContentPerformanceData[];
    setIsFormOpen: (isOpen: boolean) => void;
    setOnboardingRef: (node: HTMLElement | null) => void;
    quickActions: QuickAction[];
    currentTourStepId?: string | null;
    startTour: (steps: OnboardingStep[]) => void;
}

const MainContent: React.FC<MainContentProps> = ({
    activePage,
    detailedEpisode,
    editingBlogPost,
    addToast,
    setDetailedEpisode,
    setEditingBlogPost,
    setActivePage,
    onSaveBlogPost,
    blogPosts,
    isBlogLoading,
    blogError,
    fetchBlogPosts,
    user, kpiData, episodes, kanbanCards, performanceData, setIsFormOpen, setOnboardingRef, quickActions, currentTourStepId,
    startTour
}) => {
    
    const onViewEpisodeDetails = (episode: ContentPerformanceData) => {
        setDetailedEpisode(episode);
        setActivePage('analytics');
    };

    if (detailedEpisode) {
        return <EpisodeDetailPage 
            episodePerformance={detailedEpisode} 
            onBack={() => setDetailedEpisode(null)} 
        />;
    }

    if (editingBlogPost) {
        return <BlogEditor
            post={editingBlogPost}
            onSave={onSaveBlogPost}
            onBack={() => setEditingBlogPost(null)}
            addToast={addToast}
        />;
    }

    switch (activePage) {
        case 'overview':
            return <DashboardContent 
                        user={user}
                        kpiData={kpiData}
                        episodes={episodes}
                        kanbanCards={kanbanCards}
                        performanceData={performanceData}
                        setActivePage={setActivePage} 
                        onViewEpisodeDetails={onViewEpisodeDetails}
                        addToast={addToast}
                        setIsFormOpen={setIsFormOpen}
                        setOnboardingRef={setOnboardingRef}
                        quickActions={quickActions}
                        currentTourStepId={currentTourStepId}
                    />;
        case 'analytics':
            return <AnalyticsPage episodes={DEFAULT_EPISODES} onViewEpisodeDetails={onViewEpisodeDetails} addToast={addToast} />;
        case 'billing':
            return <BillingPage />;
        case 'help':
            return <HelpPage 
                        onStartTour={() => {
                            setActivePage('overview');
                             setTimeout(() => startTour(DEFAULT_ONBOARDING_STEPS), 300);
                        }}
                        addToast={addToast} 
                    />;
        case 'blog':
            return <BlogPage 
                        posts={blogPosts}
                        onEditPost={(post) => setEditingBlogPost(post)}
                        isLoading={isBlogLoading}
                        error={blogError}
                        onRetry={fetchBlogPosts}
                    />;
        case 'assets':
            return <AssetsPage assets={DEFAULT_ASSETS} episodes={DEFAULT_EPISODES} />;
        case 'deliverables':
            return <DeliverablesPage deliverables={DEFAULT_DELIVERABLES} addToast={addToast} />;
        case 'system':
            return <SystemPage />;
        case 'calendar':
            return <CalendarPage addToast={addToast} />;
        case 'roi-center':
            return <ROICenterPage />;
        case 'submissions':
            return <SubmissionsPage addToast={addToast}/>;
        case 'settings':
            return <SettingsPage />;
        case 'strategy-lab':
            return <StrategyLabPage addToast={addToast} />;
        default:
             return <DashboardContent 
                        user={user}
                        kpiData={kpiData}
                        episodes={episodes}
                        kanbanCards={kanbanCards}
                        performanceData={performanceData}
                        setActivePage={setActivePage} 
                        onViewEpisodeDetails={onViewEpisodeDetails}
                        addToast={addToast}
                        setIsFormOpen={setIsFormOpen}
                        setOnboardingRef={setOnboardingRef}
                        quickActions={quickActions}
                        currentTourStepId={currentTourStepId}
                    />;
    }
};

const App: React.FC = () => {
    const { user, isAdmin, isImpersonating, logout } = useAuth();
    const [activePage, setActivePage] = useState('overview');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [detailedEpisode, setDetailedEpisode] = useState<ContentPerformanceData | null>(null);
    const [toasts, setToasts] = useState<ToastNotification[]>([]);
    
    const [editingBlogPost, setEditingBlogPost] = useState<BlogPost | null>(null);
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
    const [isBlogLoading, setIsBlogLoading] = useState(true);
    const [blogError, setBlogError] = useState<string | null>(null);

    const onboardingRefs = useRef<Record<string, HTMLElement | null>>({});
    const [activeTourSteps, setActiveTourSteps] = useState<OnboardingStep[] | null>(null);
    const [tourStepIndex, setTourStepIndex] = useState(0);

    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const notificationBellRef = useRef<HTMLButtonElement>(null);
    const notificationPanelRef = useRef<HTMLDivElement>(null);

    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [kpiData, setKpiData] = useState<KPIData | null>(null);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [kanbanCards, setKanbanCards] = useState<Record<string, KanbanCard[]>>({});
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
    const [isSearchResultsOpen, setIsSearchResultsOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    
    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
    const performanceData = useMemo(() => generatePerformanceData(episodes, 30), [episodes]);
    const isTourActive = activeTourSteps !== null;


    const addToast = useCallback((toast: Omit<ToastNotification, 'id' | 'duration'>) => {
        const newToast: ToastNotification = { id: `toast-${Date.now()}`, duration: 5000, ...toast };
        setToasts(prev => [...prev, newToast]);
    }, []);

    const fetchBlogPosts = useCallback(async () => {
        setIsBlogLoading(true);
        setBlogError(null);
        await new Promise(resolve => setTimeout(resolve, 500));
        setBlogPosts(DEFAULT_BLOG_POSTS);
        addToast({ title: 'Live Data Unavailable', message: 'Displaying sample blog posts as the API is offline.', type: 'info' });
        setIsBlogLoading(false);
    }, [addToast]);
    
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setKpiData(DEFAULT_KPI_DATA);
            setEpisodes(DEFAULT_EPISODES);
            setKanbanCards(DEFAULT_KANBAN_CARDS);
            setNotifications(DEFAULT_NOTIFICATIONS);
        } catch (err) {
            setError("Sorry, we couldn't load the dashboard data. Please check your connection and try again.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const startTour = useCallback((steps: OnboardingStep[], isFirstTime = false) => {
        if (isFirstTime) {
            localStorage.setItem('forge-voice-dashboard-visited', 'true');
        }
        let firstIndex = 0;
        // eslint-disable-next-line
        while(firstIndex < steps.length && !onboardingRefs.current![steps[firstIndex].target]) {
            firstIndex++;
        }
        if (firstIndex < steps.length) {
            setActiveTourSteps(steps);
            setTourStepIndex(firstIndex);
        }
    }, [onboardingRefs]);

    useEffect(() => {
        if (user) {
            fetchData();
            fetchBlogPosts();
            setToasts(DEFAULT_TOAST_NOTIFICATIONS);
        }
    }, [user, fetchData, fetchBlogPosts]);

    useEffect(() => {
        if (user) {
            const visited = localStorage.getItem('forge-voice-dashboard-visited');
            if (DEFAULT_ONBOARDING_SETTINGS.showOnFirstVisit && !visited && !isLoading && activePage === 'overview') {
                setTimeout(() => startTour(DEFAULT_ONBOARDING_STEPS, true), 1000);
            }
        }
    }, [user, startTour, isLoading, activePage]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isNotificationsOpen && notificationBellRef.current && !notificationBellRef.current.contains(event.target as Node) && notificationPanelRef.current && !notificationPanelRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsSearchResultsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isNotificationsOpen]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                setIsCommandPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    
    useEffect(() => {
        if (globalSearchQuery.length > 1) {
            const query = globalSearchQuery.toLowerCase();
            const keywords = query.split(' ').filter(k => k.trim() !== '');
            const kanbanResults: any[] = Object.entries(kanbanCards).flatMap(([column, cards]) => cards.filter(card => keywords.every(keyword => `${card.title} ${card.description}`.toLowerCase().includes(keyword))).map(card => ({ type: 'kanban', item: card, column })));
            const episodeResults: any[] = episodes.filter(episode => keywords.every(keyword => episode.title.toLowerCase().includes(keyword))).map(episode => ({ type: 'episode', item: episode }));
            setGlobalSearchResults([...kanbanResults, ...episodeResults]);
            setIsSearchResultsOpen(true);
        } else {
            setGlobalSearchResults([]);
            setIsSearchResultsOpen(false);
        }
    }, [globalSearchQuery, kanbanCards, episodes]);


    const handleContentSubmit = (formData: Omit<Episode, 'id' | 'status' | 'column'>) => {
        const newEpisode: Episode = { ...formData, id: `ep-${Date.now()}`, status: 'New' };
        setEpisodes(prev => [newEpisode, ...prev]);
        setIsFormOpen(false);
        addToast({ title: "Content Received!", message: `"${newEpisode.title}" has been added to the production queue.`, type: "success" });
    };

    const stopTour = () => setActiveTourSteps(null);

    const nextTourStep = () => {
        if (!activeTourSteps) return;
        let nextIndex = tourStepIndex + 1;
        // eslint-disable-next-line
        while(nextIndex < activeTourSteps.length && !onboardingRefs.current![activeTourSteps[nextIndex].target]) {
            nextIndex++;
        }
        if (nextIndex < activeTourSteps.length) setTourStepIndex(nextIndex);
        else stopTour();
    };
    
    const prevTourStep = () => {
        if (!activeTourSteps) return;
        let prevIndex = tourStepIndex - 1;
        // eslint-disable-next-line
        while(prevIndex >= 0 && !onboardingRefs.current![activeTourSteps[prevIndex].target]) {
            prevIndex--;
        }
        if (prevIndex >= 0) setTourStepIndex(prevIndex);
    };
    
    const handleMarkAllAsRead = () => setNotifications(current => current.map(n => ({ ...n, read: true })));

    const handleGlobalResultClick = (result: any) => {
        addToast({ title: 'Navigation', message: `Navigating to ${result.item.title}`, type: 'info' });
        setGlobalSearchQuery('');
        setIsSearchResultsOpen(false);
    };

    const handleNavigate = (pageId: string) => {
        setDetailedEpisode(null);
        setEditingBlogPost(null);
        setActivePage(pageId);
        setIsMobileNavOpen(false);
    };

    const commands: Command[] = useMemo(() => [
        { id: 'nav-overview', name: 'Go to Overview', category: 'Navigation', icon: <Icons.Navigate/>, action: () => handleNavigate('overview') },
        { id: 'nav-analytics', name: 'Go to Analytics', category: 'Navigation', icon: <Icons.Navigate/>, action: () => handleNavigate('analytics') },
        { id: 'nav-blog', name: 'Go to Blog', category: 'Navigation', icon: <Icons.Navigate/>, action: () => handleNavigate('blog') },
        { id: 'action-submit', name: 'Submit New Content', category: 'Actions', icon: <Icons.Action/>, action: () => setIsFormOpen(true) },
        { id: 'action-onboarding', name: 'Start Onboarding Tour', category: 'Actions', icon: <Icons.Action/>, action: () => { handleNavigate('overview'); startTour(DEFAULT_ONBOARDING_STEPS); } },
    ], [startTour]);


    const handleSaveBlogPost = async (updatedPost: BlogPost) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        setBlogPosts(posts => posts.map(p => p.id === updatedPost.id ? updatedPost : p));
        setEditingBlogPost(null);
        addToast({ title: 'Blog Post Saved (Simulated)', message: `Changes to "${updatedPost.title}" have been saved.`, type: 'success' });
    };
    
    const setOnboardingRef = useCallback((node: HTMLElement | null) => {
        if (node?.dataset.onboardingId) {
            onboardingRefs.current[node.dataset.onboardingId] = node;
        }
    }, []);

    const setOnboardingAndSearchRef = useCallback((node: HTMLDivElement | null) => {
        // @ts-ignore
        searchContainerRef.current = node;
        setOnboardingRef(node);
    }, [setOnboardingRef]);


    if (!user) {
        return <PublicLandingPage />;
    }

    if (isAdmin && !isImpersonating) {
        return <AdminDashboard />;
    }

    if (isLoading || !kpiData) {
        return <LoadingScreen />;
    }
    
    if (error) {
        return <ErrorDisplay message={error} onRetry={fetchData} />;
    }
    
    return (
        <ErrorBoundary>
            <div className="flex h-screen bg-black text-white">
                <ToastContainer toasts={toasts} onClose={(id) => setToasts(current => current.filter(t => t.id !== id))} />
                <Sidebar 
                    items={DEFAULT_SIDEBAR_ITEMS} 
                    collapsed={sidebarCollapsed} 
                    setCollapsed={setSidebarCollapsed}
                    activePage={activePage}
                    onNavigate={handleNavigate}
                    mobileOpen={isMobileNavOpen}
                    onMobileClose={() => setIsMobileNavOpen(false)}
                    setOnboardingRef={setOnboardingRef}
                    startTour={startTour}
                />
                <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                    <SubmitContentForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleContentSubmit} addToast={addToast} />
                    <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} commands={commands} />
                    {isTourActive && activeTourSteps && tourStepIndex < activeTourSteps.length && onboardingRefs.current![activeTourSteps[tourStepIndex].target] && (
                        <OnboardingTooltip
                            step={activeTourSteps[tourStepIndex]}
                            targetElement={onboardingRefs.current![activeTourSteps[tourStepIndex].target]!}
                            onNext={nextTourStep}
                            onPrev={prevTourStep}
                            onSkip={stopTour}
                            isLastStep={tourStepIndex === activeTourSteps.length - 1}
                            currentStep={tourStepIndex + 1}
                            totalSteps={activeTourSteps.length}
                        />
                    )}
                    
                    <Header
                        user={user}
                        unreadCount={unreadCount}
                        onMenuClick={() => setIsMobileNavOpen(true)}
                        onBellClick={() => setIsNotificationsOpen(prev => !prev)}
                        onStartTour={() => startTour(DEFAULT_ONBOARDING_STEPS)}
                        onSubmitContentClick={() => setIsFormOpen(true)}
                        onPreviewPublicPage={() => setActivePage('public')}
                        bellRef={notificationBellRef}
                        searchQuery={globalSearchQuery}
                        onSearchChange={setGlobalSearchQuery}
                        onSearchFocus={() => { if (globalSearchQuery.length > 1) setIsSearchResultsOpen(true); }}
                        setSearchContainerRef={setOnboardingAndSearchRef}
                        setOnboardingRef={setOnboardingRef}
                        isSearchResultsOpen={isSearchResultsOpen}
                        globalSearchResults={globalSearchResults}
                        onGlobalResultClick={handleGlobalResultClick}
                    />
                    {isNotificationsOpen && (
                        <NotificationsPanel
                            notifications={notifications}
                            unreadCount={unreadCount}
                            onMarkAllAsRead={handleMarkAllAsRead}
                            panelRef={notificationPanelRef}
                        />
                    )}

                    <MainContent
                        activePage={activePage}
                        detailedEpisode={detailedEpisode}
                        editingBlogPost={editingBlogPost}
                        addToast={addToast}
                        setDetailedEpisode={setDetailedEpisode}
                        setEditingBlogPost={setEditingBlogPost}
                        setActivePage={setActivePage}
                        onSaveBlogPost={handleSaveBlogPost}
                        blogPosts={blogPosts}
                        isBlogLoading={isBlogLoading}
                        blogError={blogError}
                        fetchBlogPosts={fetchBlogPosts}
                        user={user}
                        kpiData={kpiData}
                        episodes={episodes}
                        kanbanCards={kanbanCards}
                        performanceData={performanceData}
                        setIsFormOpen={setIsFormOpen}
                        setOnboardingRef={setOnboardingRef}
                        quickActions={DEFAULT_QUICK_ACTIONS}
                        currentTourStepId={isTourActive && activeTourSteps ? activeTourSteps[tourStepIndex].id : null}
                        startTour={startTour}
                    />
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default App;