import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Search, Bell, LogOut, Settings, User, HelpCircle, FileText, Image, Lightbulb, Loader2 } from 'lucide-react';
import NotificationPanel from '@/components/NotificationPanel';
import SpotlightTour from '@/components/SpotlightTour';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const pathLabels = {
  '/dashboard/overview': 'Overview',
  '/dashboard/submissions': 'Submissions',
  '/dashboard/calendar': 'Calendar',
  '/dashboard/deliverables': 'Deliverables',
  '/dashboard/assets': 'Assets',
  '/dashboard/blog': 'Blog',
  '/dashboard/strategy': 'Strategy Lab',
  '/dashboard/video-lab': 'AI Video Lab',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/roi': 'ROI Center',
  '/dashboard/billing': 'Billing',
  '/dashboard/settings': 'Settings',
  '/dashboard/help': 'Help / Support',
  '/admin': 'Admin Panel',
};

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, authHeaders } = useAuth();
  const pageTitle = pathLabels[location.pathname] || 'Dashboard';
  const isDashboard = location.pathname.startsWith('/dashboard');
  
  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Tour state
  const [showTour, setShowTour] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Fetch unread count on mount and periodically
  const fetchUnreadCount = useCallback(async () => {
    if (!authHeaders.Authorization) return;
    try {
      const res = await axios.get(`${API}/notifications/unread-count`, { headers: authHeaders });
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);
  
  // Search with 300ms debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await axios.get(`${API}/search?q=${encodeURIComponent(searchQuery)}`, { headers: authHeaders });
        setSearchResults(res.data);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, authHeaders]);
  
  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowSearchResults(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);
  
  const handleSearchResultClick = (result) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(result.url);
  };

  // Refetch when panel closes (in case notifications were read)
  const handleCloseNotifications = useCallback(async () => {
    setShowNotifications(false);
    // Mark all as read when closing panel
    if (unreadCount > 0) {
      try {
        await axios.post(`${API}/notifications/read-all`, {}, { headers: authHeaders });
        setUnreadCount(0); // Optimistic update
      } catch (err) {
        console.error('Failed to mark notifications as read:', err);
      }
    }
  }, [authHeaders, unreadCount]);
  
  const getResultIcon = (type) => {
    switch (type) {
      case 'submission': return FileText;
      case 'asset': return Image;
      case 'recommendation': return Lightbulb;
      default: return FileText;
    }
  };

  return (
    <header
      data-testid="header"
      className="sticky top-0 z-20 h-16 bg-[#09090b]/85 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-6"
    >
      {/* Left: Title + Breadcrumb */}
      <div className="flex flex-col justify-center">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard/overview" className="text-zinc-500 text-xs hover:text-zinc-300">
                  {isDashboard ? 'Dashboard' : 'Home'}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-zinc-600" />
            <BreadcrumbItem>
              <span className="text-xs text-zinc-300">{pageTitle}</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h2
          data-testid="page-title"
          className="text-base font-semibold text-white -mt-0.5"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {pageTitle}
        </h2>
      </div>

      {/* Right: Search, Notifications, User */}
      <div className="flex items-center gap-3">
        <div className="relative" ref={searchRef}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          {searchLoading && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 animate-spin" />
          )}
          <Input
            data-testid="header-search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults && setShowSearchResults(true)}
            className="w-48 h-8 pl-8 pr-8 text-xs bg-zinc-900 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-indigo-500/20"
          />
          
          {/* Search Results Dropdown */}
          {showSearchResults && searchResults && (
            <div className="absolute top-full left-0 mt-1 w-80 bg-zinc-900 border border-zinc-800 rounded-md shadow-xl z-50 max-h-80 overflow-y-auto">
              {searchResults.total === 0 ? (
                <div className="p-4 text-center text-zinc-500 text-sm">
                  No results for "{searchQuery}"
                </div>
              ) : (
                <div className="py-1">
                  {/* Submissions */}
                  {searchResults.submissions.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                        Submissions ({searchResults.submissions.length})
                      </div>
                      {searchResults.submissions.slice(0, 5).map((result) => {
                        const Icon = getResultIcon(result.type);
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleSearchResultClick(result)}
                            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-zinc-800 text-left"
                          >
                            <Icon className="h-4 w-4 text-indigo-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-zinc-200 truncate">{result.title}</div>
                              <div className="text-xs text-zinc-500 truncate">{result.subtitle}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Assets */}
                  {searchResults.assets.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 border-t border-zinc-800 mt-1 pt-2">
                        Assets ({searchResults.assets.length})
                      </div>
                      {searchResults.assets.slice(0, 3).map((result) => {
                        const Icon = getResultIcon(result.type);
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleSearchResultClick(result)}
                            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-zinc-800 text-left"
                          >
                            <Icon className="h-4 w-4 text-teal-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-zinc-200 truncate">{result.title}</div>
                              <div className="text-xs text-zinc-500 truncate">{result.subtitle}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Recommendations */}
                  {searchResults.recommendations.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 border-t border-zinc-800 mt-1 pt-2">
                        Ideas ({searchResults.recommendations.length})
                      </div>
                      {searchResults.recommendations.slice(0, 3).map((result) => {
                        const Icon = getResultIcon(result.type);
                        return (
                          <button
                            key={result.id}
                            onClick={() => handleSearchResultClick(result)}
                            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-zinc-800 text-left"
                          >
                            <Icon className="h-4 w-4 text-amber-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-zinc-200 truncate">{result.title}</div>
                              <div className="text-xs text-zinc-500 truncate">{result.subtitle}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Help Tour Trigger */}
        <button
          data-testid="help-tour-btn"
          onClick={() => setShowTour(true)}
          className="h-8 w-8 flex items-center justify-center rounded-sm text-zinc-500/60 hover:text-white hover:bg-white/5 transition-all duration-200 hover:shadow-[0_0_8px_rgba(241,200,122,0.3)]"
          title="Take a tour"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* Notification Bell */}
        <div className="relative" data-tour="notifications">
          <button
            data-testid="notifications-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            className={`
              relative h-8 w-8 flex items-center justify-center rounded-sm transition-all duration-200
              ${showNotifications 
                ? 'text-indigo-400 bg-indigo-500/10' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }
              ${unreadCount > 0 ? 'animate-notification-pulse' : ''}
            `}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span 
                data-testid="notification-badge"
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-500/30"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          <NotificationPanel
            isOpen={showNotifications}
            onClose={handleCloseNotifications}
            unreadCount={unreadCount}
            setUnreadCount={setUnreadCount}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid="user-menu-trigger"
              className="flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-white/5 transition-colors"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src="https://images.unsplash.com/photo-1643819642914-24b58a5f0be5?crop=entropy&cs=srgb&fm=jpg&q=85&w=64&h=64" />
                <AvatarFallback className="bg-indigo-500/20 text-indigo-400 text-xs">
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden lg:block">
                <p className="text-xs font-medium text-white leading-tight">{user?.name}</p>
                <p className="text-[10px] text-zinc-500 capitalize leading-tight">{user?.role}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-800">
            <DropdownMenuItem asChild>
              <Link to="/dashboard/settings" className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <User className="h-3.5 w-3.5" />
                <span className="text-xs">Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/settings" className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <Settings className="h-3.5 w-3.5" />
                <span className="text-xs">Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem
              data-testid="logout-btn"
              onClick={logout}
              className="flex items-center gap-2 text-red-400 cursor-pointer focus:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="text-xs">Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Spotlight Tour */}
      <SpotlightTour
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        autoStart={user?.onboardingComplete === false}
      />
    </header>
  );
}
