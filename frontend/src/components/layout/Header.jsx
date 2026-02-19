import { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
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
import { Search, Bell, LogOut, Settings, User } from 'lucide-react';
import NotificationPanel from '@/components/NotificationPanel';
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
  const { user, logout, authHeaders } = useAuth();
  const pageTitle = pathLabels[location.pathname] || 'Dashboard';
  const isDashboard = location.pathname.startsWith('/dashboard');
  
  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  // Refetch when panel closes (in case notifications were read)
  const handleCloseNotifications = useCallback(() => {
    setShowNotifications(false);
    fetchUnreadCount();
  }, [fetchUnreadCount]);

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
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <Input
            data-testid="header-search"
            placeholder="Search..."
            className="w-48 h-8 pl-8 text-xs bg-zinc-900 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-indigo-500/20"
          />
        </div>

        {/* Notification Bell */}
        <div className="relative">
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
    </header>
  );
}
