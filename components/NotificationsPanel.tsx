
import React from 'react';
import { Notification } from '../types';
import Icons from './Icons';
import { useAnalytics } from '../lib/AnalyticsProvider';

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

    return (
        <div ref={panelRef} className="absolute top-16 right-8 z-50 w-full max-w-md bg-[#1A1A1A] rounded-lg shadow-2xl border border-[#2A2A2A]">
            <div className="p-4 border-b border-[#2A2A2A] flex justify-between items-center">
                <h3 className="font-semibold text-white">Notifications ({unreadCount > 0 ? `${unreadCount} new` : 'All read'})</h3>
                <button onClick={() => { onMarkAllAsRead(); logEvent('notifications_mark_all_read'); }} className="text-sm text-[#F1C87A] hover:underline">Mark all as read</button>
            </div>
            <div className="max-h-96 overflow-y-auto">
                {notifications.map(notification => (
                    <div key={notification.id} className="p-4 border-b border-[#2A2A2A] last:border-b-0 hover:bg-[#2A2A2A]/50">
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
                                <a href={notification.actionUrl} className="text-sm text-[#F1C87A] hover:underline whitespace-nowrap">
                                    {notification.actionText} &rarr;
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
             {notifications.length === 0 && <p className="text-center text-gray-400 p-8">No notifications yet.</p>}
        </div>
    );
};

export default NotificationsPanel;
