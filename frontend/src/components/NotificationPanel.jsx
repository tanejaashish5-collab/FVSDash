import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Bell, Check, CheckCheck, X, Sparkles, AlertCircle, Calendar, Settings } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const typeIcons = {
  SUBMISSION: <Bell className="h-4 w-4 text-indigo-400" />,
  STATUS_CHANGE: <AlertCircle className="h-4 w-4 text-amber-400" />,
  DEADLINE: <Calendar className="h-4 w-4 text-rose-400" />,
  SYSTEM: <Settings className="h-4 w-4 text-zinc-400" />,
  FVS_IDEA: <Sparkles className="h-4 w-4 text-teal-400" />,
};

const priorityColors = {
  HIGH: 'border-l-rose-500',
  MEDIUM: 'border-l-amber-500',
  LOW: 'border-l-zinc-600',
};

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationPanel({ isOpen, onClose, unreadCount, setUnreadCount }) {
  const navigate = useNavigate();
  const { authHeaders } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/notifications`, { headers: authHeaders });
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, authHeaders]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`${API}/notifications/${notificationId}/read`, {}, { headers: authHeaders });
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API}/notifications/read-all`, {}, { headers: authHeaders });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div
        data-testid="notification-panel"
        className="absolute right-0 top-full mt-2 w-96 max-h-[480px] aura-glass rounded-lg border border-white/[0.08] shadow-2xl z-50 overflow-hidden"
        style={{
          animation: 'slideDown 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-500/20 text-indigo-400 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                data-testid="mark-all-read-btn"
                onClick={markAllAsRead}
                className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
            <button
              data-testid="close-notification-panel"
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-white hover:bg-white/5 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-400">No notifications yet</p>
              <p className="text-xs text-zinc-600 mt-1">
                You'll be notified of important updates here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  data-testid={`notification-item-${notification.id}`}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    relative flex gap-3 px-4 py-3 cursor-pointer transition-all duration-200
                    border-l-2 ${priorityColors[notification.priority] || 'border-l-zinc-600'}
                    ${notification.is_read 
                      ? 'bg-transparent hover:bg-white/[0.02]' 
                      : 'bg-indigo-500/[0.04] hover:bg-indigo-500/[0.08]'
                    }
                  `}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-8 w-8 rounded-full bg-zinc-800/80 flex items-center justify-center">
                      {typeIcons[notification.type] || <Bell className="h-4 w-4 text-zinc-400" />}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium truncate ${notification.is_read ? 'text-zinc-300' : 'text-white'}`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="flex-shrink-0 h-2 w-2 rounded-full bg-indigo-500 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      {formatTimeAgo(notification.created_at)}
                    </p>
                  </div>

                  {/* Mark as read button (on hover) */}
                  {!notification.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-white hover:bg-white/10 rounded transition-all"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-white/[0.06] bg-zinc-900/50">
            <p className="text-[10px] text-zinc-600 text-center">
              Showing last 20 notifications
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
