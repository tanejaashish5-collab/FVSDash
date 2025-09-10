'use client';
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
    UserProfile,
    Notification,
    Command,
    OnboardingStep,
} from '@/types';
import {
    DEFAULT_USER_PROFILE,
    DEFAULT_NOTIFICATIONS,
    DEFAULT_SIDEBAR_ITEMS,
    DEFAULT_ONBOARDING_STEPS,
    DEFAULT_ONBOARDING_SETTINGS,
} from '@/constants';
import Icons from '@/components/Icons';
import Sidebar from '@/components/Sidebar';
import CommandPalette from "@/components/CommandPalette";
import { useAnalytics } from "@/lib/AnalyticsProvider";
import SubmitContentForm from "@/components/SubmitContentForm";
import { useToasts } from "@/lib/ToastProvider";
import { Episode } from "@/types";
import OnboardingTooltip from "@/components/OnboardingTooltip";
import { mergeRefs } from "@/utils";
import { SettingsProvider } from "@/lib/SettingsProvider";

const NotificationIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
    switch (type) {
        case 'submission': return <Icons.SubmissionReceived />;
        case 'status_change': return <Icons.StatusUpdate />;
        case 'deadline': return <Icons.DeadlineApproaching />;
        default: return <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center"><Icons.Bell /></div>;
    }
};

const NotificationsPanel: React.FC<{
    notifications: Notification[];
    unreadCount: number;
    onMarkAllAsRead: () => void;
    panelRef: React.RefObject<HTMLDivElement>;
}> = ({ notifications, unreadCount, onMarkAllAsRead, panelRef }) => {
    const { logEvent } = useAnalytics();
    const router = useRouter();

    return (
        <div ref={panelRef} className="absolute top-16 right-8 z-50 w-full max-w-md bg-[#1A1A1A] rounded-lg shadow-2xl border border-[#2A2A2A]">
            <div className="p-4 border-b border-[#2A2A2A] flex justify-between items-center">
                <h3 className="font-semibold text-white">Notifications ({unreadCount > 0 ? `${unreadCount} new` : 'All read'})</h3>
                <button onClick={() => { onMarkAllAsRead(); logEvent('notifications_mark_all_read'); }} className="text-sm text-[#F1C87A] hover:underline">Mark all as read</button>
            </div>
            <div className="max-h-96 overflow-y-auto">
                {notifications.map(notification => (
                    <button key={notification.id} onClick={() => router.push(notification.actionUrl || '/overview')} className="w-full text-left p-4 border-b border-[#2A2A2A] last:border-b-0 hover:bg-[#2A2A2A]/50">
                        <div className="flex items-start gap-4">
                            {!notification.read && <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>}
                            <div className={`flex-shrink-0 ${notification.read ? 'ml-4' : ''}`}>
                                <NotificationIcon type={notification.type} />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-white">{notification.title}</p>
                                <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                                <p className="text-xs text-gray-500 mt-2">{notification.timestamp}</p>
                            </div>
                            <div className="flex-shrink-0">
                                <span className="text-sm text-[#F1C87A] hover:underline whitespace-nowrap">
                                    {notification.actionText} &rarr;
                                </span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
             {notifications.length === 0 && <p className="text-center text-gray-400 p-8">No notifications yet.</p>}
        </div>
    );
};


const Header: React.FC<{
    user: UserProfile;
    unreadCount: number;
    onMenuClick: () => void;
    onBellClick: () => void;
    onStartTour: () => void;
    onSubmitContentClick: () => void;
    bellRef: React.RefObject<HTMLButtonElement>;
    setOnboardingRef: (el: HTMLElement | null) => void;
}> = ({
    user,
    unreadCount,
    onMenuClick,
    onBellClick,
    onStartTour,
    onSubmitContentClick,
    bellRef,
    setOnboardingRef,
}) => {
    const { logEvent } = useAnalytics();
    const router = useRouter();

    const Logo = () => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-[#121212] to-black rounded-lg flex items-center justify-center border border-[#2A2A2A]">
            <Icons.ForgeVoiceLogo className="w-5 h-5 text-[#F1C87A]"/>
        </div>
        <span className="font-bold text-lg tracking-wider text-[#F1C87A]">CLIENT DASHBOARD</span>
      </div>
    );

    return (
        <header className={`sticky top-0 z-30 bg-[#0B0B0B]/70 backdrop-blur-lg border-b border-[#2A2A2A]`}>
            <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={onMenuClick} className="lg:hidden text-gray-400 hover:text-white"><Icons.Menu /></button>
                         <div className="lg:hidden">
                            <Logo />
                         </div>
                    </div>
                    
                    <div ref={setOnboardingRef} data-onboarding-id="search-bar" className="flex-1 max-w-lg hidden md:block mx-8 relative">
                         <div className="relative flex items-center">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 transition-colors group-focus-within:text-[#F1C87A]">
                                <Icons.Search />
                            </span>
                            <input
                                type="text"
                                placeholder="Search everything..."
                                className="w-full rounded-lg bg-[#121212] py-2 pl-10 pr-4 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                                onFocus={(e) => { e.preventDefault(); (document.querySelector('[data-command-id="open-command-palette"]') as HTMLButtonElement)?.click() }}
                                readOnly
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                <kbd className="inline-flex items-center rounded border border-gray-600 px-2 font-sans text-xs text-gray-400">⌘K</kbd>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            ref={setOnboardingRef}
                            data-onboarding-id="submit-button"
                            className="flex items-center justify-center p-2 sm:px-4 sm:py-2 text-sm font-semibold text-black bg-[#F1C87A] rounded-lg shadow-md hover:shadow-lg hover:shadow-[#F1C87A]/20 hover:-translate-y-0.5 transition-all transform"
                            onClick={() => {
                                logEvent('submit_content_clicked');
                                onSubmitContentClick();
                            }}>
                            <Icons.PlusCircle className="h-6 w-6 sm:hidden" />
                            <span className="hidden sm:inline">Submit Content</span>
                        </button>
                        <div className="relative">
                            <button
                                ref={mergeRefs(bellRef, setOnboardingRef)}
                                data-onboarding-id="notification-bell"
                                className="p-2 rounded-full hover:bg-white/10 transition relative"
                                onClick={onBellClick}>
                                <Icons.Bell />
                                {unreadCount > 0 && <div className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">{unreadCount}</div>}
                            </button>
                        </div>
                        <button
                            onClick={() => router.push('/')}
                            className="p-1 rounded-full text-gray-400 hover:bg-white/10 hover:text-[#F1C87A] transition-colors"
                            aria-label="Preview Public Page"
                            title="Public View"
                        >
                            <Icons.Eye />
                        </button>
                        <button
                            onClick={() => onStartTour()}
                            className="p-1 rounded-full text-gray-400 hover:bg-white/10 hover:text-[#F1C87A] transition-colors"
                            aria-label="Start Onboarding Tour"
                            title="Help & Tour"
                        >
                            <Icons.Help />
                        </button>
                        <div className="w-9 h-9 rounded-full bg-[#F1C87A] flex items-center justify-center text-sm font-bold text-black cursor-pointer ring-2 ring-offset-2 ring-offset-[#0B0B0B] ring-transparent hover:ring-[#F1C87A] transition" title={user.email}>
                            {user.initials}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>(DEFAULT_NOTIFICATIONS);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const notificationBellRef = useRef<HTMLButtonElement>(null);
    const notificationPanelRef = useRef<HTMLDivElement>(null);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Onboarding Tour State
    const onboardingRefs = useRef<Record<string, HTMLElement | null>>({});
    // FIX: Replaced isTourActive state with activeTourSteps to support multiple tour types.
    const [activeTourSteps, setActiveTourSteps] = useState<OnboardingStep[] | null>(null);
    const [tourStepIndex, setTourStepIndex] = useState(0);
    const isTourActive = activeTourSteps !== null;


    const { addToast } = useToasts();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const activePage = pathname.split('/').pop() || 'overview';
    const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
    
    const setOnboardingRef = useCallback((node: HTMLElement | null) => {
        if (node?.dataset.onboardingId) {
            onboardingRefs.current[node.dataset.onboardingId] = node;
        }
    }, []);

    // FIX: Updated stopTour to manage activeTourSteps state.
    const stopTour = () => setActiveTourSteps(null);

    // FIX: Updated nextTourStep to use activeTourSteps state.
    const nextTourStep = () => {
        if (!activeTourSteps) return;
        let nextIndex = tourStepIndex + 1;
        while(nextIndex < activeTourSteps.length && !onboardingRefs.current![activeTourSteps[nextIndex].target]) {
            nextIndex++;
        }
        if (nextIndex < activeTourSteps.length) setTourStepIndex(nextIndex);
        else stopTour();
    };
    
    // FIX: Updated prevTourStep to use activeTourSteps state.
    const prevTourStep = () => {
        if (!activeTourSteps) return;
        let prevIndex = tourStepIndex - 1;
        while(prevIndex >= 0 && !onboardingRefs.current![activeTourSteps[prevIndex].target]) {
            prevIndex--;
        }
        if (prevIndex >= 0) setTourStepIndex(prevIndex);
    };

    // FIX: Updated startTour to accept a 'steps' argument to support different tours.
    const startTour = useCallback((steps: OnboardingStep[], isFirstTime = false) => {
        if (isFirstTime) {
            localStorage.setItem('forge-voice-dashboard-visited', 'true');
        }
        let firstIndex = 0;
        while(firstIndex < steps.length && !onboardingRefs.current![steps[firstIndex].target]) {
            firstIndex++;
        }
        if (firstIndex < steps.length) {
            setActiveTourSteps(steps);
            setTourStepIndex(firstIndex);
        } else {
             addToast({ title: 'Tour Unavailable', message: 'Could not start the tour as some elements are not visible.', type: 'warning'});
        }
    }, [addToast]);


    // Effect to handle the tour parameter on load.
    useEffect(() => {
        const tourParam = searchParams.get('tour');
        if (tourParam === 'true') {
             addToast({
                title: 'Welcome!',
                message: "Let's take a quick tour of your new dashboard.",
                type: 'info'
            });
            // FIX: Pass default steps to startTour.
            setTimeout(() => startTour(DEFAULT_ONBOARDING_STEPS, true), 500);
            router.replace(pathname, { scroll: false });
        }
    }, [searchParams, addToast, router, pathname, startTour]);


    const handleNavigate = (pageId: string) => {
        if (pageId === 'public') {
            router.push('/');
        } else {
            router.push(`/${pageId}`);
        }
        setIsMobileNavOpen(false);
    };
    
    const handleStartTour = () => {
        handleNavigate('overview');
        // FIX: Pass default steps to startTour.
        setTimeout(() => startTour(DEFAULT_ONBOARDING_STEPS), 300); // Delay to allow page transition
    };

    const handleMarkAllAsRead = () => {
        setNotifications(currentNotifications =>
            currentNotifications.map(n => ({ ...n, read: true }))
        );
    };
    
    const handleContentSubmit = (formData: Omit<Episode, 'id' | 'status' | 'column'>) => {
        const newEpisode: Episode = {
            ...formData,
            id: `ep-${Date.now()}`,
            status: 'New',
        };
        // In a real app, this would be an API call, and we would re-fetch data.
        console.info("New submission (simulated):", newEpisode);
        setIsFormOpen(false);
        addToast({
            title: "Content Received!",
            message: `"${newEpisode.title}" has been added to the production queue.`,
            type: "success",
        });
    };

    const commands: Command[] = useMemo(() => [
        { id: 'open-command-palette', name: 'Open Command Palette', category: 'Actions', icon: <Icons.Search/>, action: () => setIsCommandPaletteOpen(true) },
        ...DEFAULT_SIDEBAR_ITEMS.map(item => ({
            id: `nav-${item.id}`,
            name: `Go to ${item.name}`,
            category: 'Navigation' as const,
            icon: item.icon,
            action: () => router.push(`/${item.id}`)
        })),
        { id: 'action-submit', name: 'Submit New Content', category: 'Actions', icon: <Icons.Action/>, action: () => setIsFormOpen(true) },
        { id: 'action-onboarding', name: 'Start Onboarding Tour', category: 'Actions', icon: <Icons.Action/>, action: handleStartTour },
    ], [router, handleStartTour]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isNotificationsOpen &&
                notificationBellRef.current &&
                !notificationBellRef.current.contains(event.target as Node) &&
                notificationPanelRef.current &&
                !notificationPanelRef.current.contains(event.target as Node)
            ) {
                setIsNotificationsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
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

    // FIX: Use activeTourSteps to determine current step ID.
    const currentTourStepId = isTourActive && activeTourSteps ? activeTourSteps[tourStepIndex].id : null;
    const childrenWithProps = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            // The child component (a page) might not accept these props.
            // Casting the child allows us to pass them, and pages that need them
            // can define them in their props. Pages that don't will just ignore them.
            return React.cloneElement(child as React.ReactElement<{ setOnboardingRef?: (node: HTMLElement | null) => void; currentTourStepId?: string | null; }>, { 
                setOnboardingRef,
                currentTourStepId
            });
        }
        return child;
    });

    return (
    <SettingsProvider>
        <div className="flex h-screen bg-black text-white">
            <Sidebar 
                items={DEFAULT_SIDEBAR_ITEMS} 
                collapsed={sidebarCollapsed} 
                setCollapsed={setSidebarCollapsed}
                activePage={activePage}
                onNavigate={handleNavigate}
                mobileOpen={isMobileNavOpen}
                onMobileClose={() => setIsMobileNavOpen(false)}
                setOnboardingRef={setOnboardingRef}
                // FIX: Pass the required `startTour` prop to the Sidebar component.
                startTour={startTour}
            />
            <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} commands={commands} />
            <SubmitContentForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleContentSubmit} addToast={addToast} />

            {/* FIX: Use activeTourSteps to render the tooltip with the correct steps. */}
            {isTourActive && activeTourSteps && onboardingRefs.current![activeTourSteps[tourStepIndex].target] && (
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

            <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                <Header
                    user={DEFAULT_USER_PROFILE}
                    unreadCount={unreadCount}
                    onMenuClick={() => setIsMobileNavOpen(true)}
                    onBellClick={() => setIsNotificationsOpen(prev => !prev)}
                    onStartTour={handleStartTour}
                    onSubmitContentClick={() => setIsFormOpen(true)}
                    bellRef={notificationBellRef}
                    setOnboardingRef={setOnboardingRef}
                />
                {isNotificationsOpen && (
                    <NotificationsPanel
                        notifications={notifications}
                        unreadCount={unreadCount}
                        onMarkAllAsRead={handleMarkAllAsRead}
                        panelRef={notificationPanelRef}
                    />
                )}
                {childrenWithProps}
            </div>
        </div>
    </SettingsProvider>
  )
}
