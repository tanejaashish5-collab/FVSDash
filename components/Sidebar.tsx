import React from 'react';
import { OnboardingStep, SidebarItem } from '../types';
import Icons from './Icons';
import { useAuth } from '../lib/AuthProvider';
import { SIDEBAR_ONBOARDING_STEPS } from '../constants';

interface SidebarProps {
    items: SidebarItem[];
    collapsed: boolean;
    setCollapsed: (c: boolean) => void;
    activePage: string;
    onNavigate: (pageId: string) => void;
    mobileOpen: boolean;
    onMobileClose: () => void;
    setOnboardingRef: (el: HTMLElement | null) => void;
    startTour: (steps: OnboardingStep[]) => void;
}

const ImpersonationBar = () => {
    const { user, stopImpersonating } = useAuth();
    return (
        <div className="bg-yellow-500/10 text-yellow-300 p-2 text-center text-xs">
            <p>Viewing as <strong>{user?.name}</strong></p>
            <button onClick={stopImpersonating} className="font-bold underline hover:text-white">
                Return to Admin
            </button>
        </div>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ items, collapsed, setCollapsed, activePage, onNavigate, mobileOpen, onMobileClose, setOnboardingRef, startTour }) => {
    const { logout, isImpersonating } = useAuth();

    const handleNavigate = (pageId: string) => {
        onNavigate(pageId);
        onMobileClose();
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity duration-300 ${
                    mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onMobileClose}
                aria-hidden="true"
            />
            <aside className={`fixed top-0 left-0 h-full z-40 bg-[#121212] border-r border-[#2A2A2A] transition-all duration-300 ease-in-out flex flex-col
                w-64 
                ${collapsed ? 'lg:w-20' : 'lg:w-64'} 
                transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            >
                {isImpersonating && !collapsed && <ImpersonationBar />}
                <div className={`flex items-center h-16 border-b border-[#2A2A2A] px-6 ${collapsed ? 'lg:justify-center' : 'justify-between'}`}>
                    <div className={`flex items-center gap-3 transition-opacity duration-200 ${collapsed ? 'lg:opacity-0' : 'opacity-100'}`}>
                        <div className={`w-8 h-8 bg-gradient-to-br from-[#121212] to-black rounded-lg flex items-center justify-center border border-[#2A2A2A]`}>
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-5 h-5"><rect width="256" height="256" fill="none"/><path d="M128,24a104,104,0,1,0,104,104A104.11,104.11,0,0,0,128,24Zm-42.3,158.42a8,8,0,0,1-11.4,0L32.2,140.3a8,8,0,0,1,11.4-11.4L85.7,171a8,8,0,0,1,0,11.42ZM171,171l42.12-42.12a8,8,0,1,1,11.4,11.4l-42.1,42.1a8,8,0,0,1-11.42,0L128.9,139.3a8,8,0,0,1,11.4-11.4Z" opacity="0.2"/><path d="M128,24a104,104,0,1,0,104,104A104.11,104.11,0,0,0,128,24ZM74.3,182.42a8,8,0,0,1-11.4,0L20.8,140.3a8,8,0,0,1,11.4-11.4L74.3,171a8,8,0,0,1,0,11.42Zm96.8-1.12,42.12-42.12a8,8,0,1,1,11.4,11.4l-42.1,42.1a8,8,0,0,1-11.42,0L128.9,150.7a8,8,0,0,1,11.4-11.4Z" fill="#F1C87A"/></svg>
                        </div>
                         <span className="font-bold text-sm tracking-wider text-white">FORGEVOICE</span>
                         <button onClick={() => startTour(SIDEBAR_ONBOARDING_STEPS)} className="p-1 rounded-full text-gray-500 hover:bg-white/10 hover:text-white" title="Tour Sidebar Navigation">
                            <Icons.Help />
                        </button>
                    </div>
                     <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded-full text-gray-400 hover:bg-white/10 hover:text-white hidden lg:block">
                        {collapsed ? <Icons.ChevronRight/> : <Icons.ChevronLeft/>}
                    </button>
                </div>
                <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
                    {items.map(item => {
                        const isActive = item.id === activePage;
                        const isDisabled = !['overview', 'analytics', 'billing', 'help', 'blog', 'assets', 'system', 'calendar', 'roi-center', 'submissions', 'deliverables', 'settings', 'strategy-lab'].includes(item.id);
                        
                        return (
                        <button
                            key={item.name}
                            ref={setOnboardingRef}
                            disabled={isDisabled}
                            data-onboarding-id={`sidebar-item-${item.id}`}
                            onClick={() => handleNavigate(item.id)}
                            className={`w-full group flex items-center gap-4 p-3 rounded-lg transition-all duration-200 text-left
                            ${ isActive ? `bg-[#F1C87A]/10 text-[#F1C87A] font-semibold` : `text-[#B3B3B3] hover:bg-[#2A2A2A] hover:text-white` } 
                            ${ collapsed ? 'lg:justify-center' : '' }
                            ${ isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:translate-x-1' }`}
                            title={item.name}
                        >
                            <div className={`w-6 h-6 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-[#F1C87A]' : ''}`}>
                                {item.icon}
                            </div>
                            <span 
                                className={`font-medium whitespace-nowrap transition-all duration-300 ${ collapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100' }`}
                            >
                                {item.name}
                            </span>
                        </button>
                    )})}
                </nav>
                <div className="px-4 py-4 border-t border-[#2A2A2A]">
                    <button
                        onClick={logout}
                        className={`w-full group flex items-center gap-4 p-3 rounded-lg transition-all duration-200 text-left text-[#B3B3B3] hover:bg-red-500/10 hover:text-red-400 ${ collapsed ? 'justify-center' : '' }`}
                        title="Logout"
                    >
                        <div className={`w-6 h-6 flex items-center justify-center`}>
                            <Icons.Logout className="w-5 h-5" />
                        </div>
                        <span 
                            className={`font-medium whitespace-nowrap transition-all duration-300 ${ collapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100' }`}
                        >
                            Logout
                        </span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;