import React from 'react';
import Icons from './Icons';
import { UserProfile, Episode, KanbanCard, OnboardingStep } from '../types';
import { useAnalytics } from '../lib/AnalyticsProvider';
import { mergeRefs } from '../utils';

interface SearchResult {
    type: 'kanban' | 'episode';
    item: KanbanCard | Episode;
    column?: string;
}

const HighlightMatch: React.FC<{ text: string; query: string }> = ({ text, query }) => {
    if (!query.trim() || !text) return <>{text}</>;

    const keywords = query.trim().split(' ').filter(k => k).map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    if (keywords.length === 0) return <>{text}</>;

    const regex = new RegExp(`(${keywords.join('|')})`, 'gi');
    const parts = text.split(regex);
    
    const lowerCaseKeywords = keywords.map(k => k.toLowerCase());

    return (
        <span>
            {parts.map((part, i) =>
                part && lowerCaseKeywords.includes(part.toLowerCase()) ? (
                    <strong key={i} className="text-[#F1C87A] font-bold bg-[#F1C87A]/10 rounded-[2px]">
                        {part}
                    </strong>
                ) : (
                    part
                )
            )}
        </span>
    );
};


const GlobalSearchResults: React.FC<{
    results: SearchResult[];
    query: string;
    onResultClick: (result: SearchResult) => void;
}> = ({ results, query, onResultClick }) => {
    return (
        <div className="absolute top-full mt-2 w-full bg-[#1A1A1A] rounded-lg shadow-2xl border border-[#2A2A2A] z-20 max-h-96 overflow-y-auto animate-fade-in-up">
            {results.length > 0 ? (
                <ul>
                    <li className="p-3 text-xs text-gray-400 border-b border-[#2A2A2A]">
                        Showing {results.length} result{results.length > 1 ? 's' : ''} for "{query}"
                    </li>
                    {results.map((result, index) => (
                        <li key={`${result.type}-${result.item.id}-${index}`} className="border-b border-[#2A2A2A] last:border-b-0">
                            <button onClick={() => onResultClick(result)} className="w-full text-left p-3 hover:bg-[#F1C87A]/10 transition-colors">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-white truncate"><HighlightMatch text={result.item.title} query={query} /></p>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${result.type === 'kanban' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                        {result.type === 'kanban' ? 'Task' : 'Episode'}
                                    </span>
                                </div>
                                {result.type === 'kanban' && (result.item as KanbanCard).description && (
                                    <p className="text-sm text-gray-400 mt-1 truncate">
                                        <HighlightMatch text={(result.item as KanbanCard).description} query={query} />
                                    </p>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="p-4 text-center text-gray-400">No results found.</p>
            )}
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
    onPreviewPublicPage: () => void;
    bellRef: React.RefObject<HTMLButtonElement>;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onSearchFocus: () => void;
    setSearchContainerRef: (el: HTMLDivElement | null) => void;
    setOnboardingRef: (el: HTMLElement | null) => void;
    isSearchResultsOpen: boolean;
    globalSearchResults: SearchResult[];
    onGlobalResultClick: (result: SearchResult) => void;
}> = ({
    user,
    unreadCount,
    onMenuClick,
    onBellClick,
    onStartTour,
    onSubmitContentClick,
    onPreviewPublicPage,
    bellRef,
    searchQuery,
    onSearchChange,
    onSearchFocus,
    setSearchContainerRef,
    setOnboardingRef,
    isSearchResultsOpen,
    globalSearchResults,
    onGlobalResultClick,
}) => {
    const { logEvent } = useAnalytics();

    const Logo = () => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-[#121212] to-black rounded-lg flex items-center justify-center border border-[#2A2A2A]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-5 h-5"><rect width="256" height="256" fill="none"/><path d="M128,24a104,104,0,1,0,104,104A104.11,104.11,0,0,0,128,24Zm-42.3,158.42a8,8,0,0,1-11.4,0L32.2,140.3a8,8,0,0,1,11.4-11.4L85.7,171a8,8,0,0,1,0,11.42ZM171,171l42.12-42.12a8,8,0,1,1,11.4,11.4l-42.1,42.1a8,8,0,0,1-11.42,0L128.9,139.3a8,8,0,0,1,11.4-11.4Z" opacity="0.2"/><path d="M128,24a104,104,0,1,0,104,104A104.11,104.11,0,0,0,128,24ZM74.3,182.42a8,8,0,0,1-11.4,0L20.8,140.3a8,8,0,0,1,11.4-11.4L74.3,171a8,8,0,0,1,0,11.42Zm96.8-1.12,42.12-42.12a8,8,0,1,1,11.4,11.4l-42.1,42.1a8,8,0,0,1-11.42,0L128.9,150.7a8,8,0,0,1,11.4-11.4Z" fill="#F1C87A"/></svg>
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
                    
                    <div ref={setSearchContainerRef} data-onboarding-id="search-bar" className="flex-1 max-w-lg hidden md:block mx-8 relative">
                        <div className="group relative">
                             <div className="relative flex items-center">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 transition-colors group-focus-within:text-[#F1C87A]">
                                    <Icons.Search />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search episodes, tasks, assets..."
                                    className="w-full rounded-lg bg-[#121212] py-2 pl-10 pr-4 text-sm text-white outline-none ring-1 ring-inset ring-[#2A2A2A] transition-all duration-300 focus:ring-2 focus:ring-[#F1C87A]"
                                    value={searchQuery}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    onFocus={onSearchFocus}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                    <kbd className="inline-flex items-center rounded border border-gray-600 px-2 font-sans text-xs text-gray-400">⌘K</kbd>
                                </div>
                            </div>
                        </div>
                        {isSearchResultsOpen && (
                            <GlobalSearchResults
                                results={globalSearchResults}
                                query={searchQuery}
                                onResultClick={onGlobalResultClick}
                            />
                        )}
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
                            onClick={onPreviewPublicPage}
                            className="p-1 rounded-full text-gray-400 hover:bg-white/10 hover:text-[#F1C87A] transition-colors"
                            aria-label="Preview Public Page"
                            title="Public View"
                        >
                            <Icons.Eye />
                        </button>
                        <button
                            onClick={onStartTour}
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

export default Header;