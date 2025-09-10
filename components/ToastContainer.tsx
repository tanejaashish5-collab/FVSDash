'use client';
import React, { useState, useEffect } from 'react';
import { ToastNotification } from '@/types';
import Icons from '@/components/Icons';

const Toast: React.FC<{ notification: ToastNotification, onClose: () => void }> = ({ notification, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(true); // Animate in
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 300); // Wait for fade out animation
        }, notification.duration);
        
        return () => clearTimeout(timer);
    }, [notification, onClose]);

    const typeStyles = {
        success: { border: 'border-green-500', title: 'text-green-400', button: 'border-green-500/50 text-green-400 hover:bg-green-500/10' },
        info: { border: 'border-blue-500', title: 'text-blue-400', button: 'border-blue-500/50 text-blue-400 hover:bg-blue-500/10' },
        warning: { border: 'border-yellow-500', title: 'text-yellow-400', button: 'border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10' },
        error: { border: 'border-red-500', title: 'text-red-400', button: 'border-red-500/50 text-red-400 hover:bg-red-500/10' },
    };
    const styles = typeStyles[notification.type] || typeStyles.info;

    return (
        <div className={`w-full max-w-sm bg-[#1A1A1A] rounded-lg shadow-2xl p-4 border-l-4 ${styles.border} transition-all duration-300 transform ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
            <div className="flex items-start">
                <div className="flex-1">
                    <p className={`text-sm font-semibold ${styles.title}`}>{notification.title}</p>
                    <p className="mt-1 text-sm text-gray-300">{notification.message}</p>
                    {notification.actionText && (
                        <a href={notification.actionUrl} className={`mt-3 inline-block px-3 py-1 text-xs font-medium rounded-md border ${styles.button} transition-colors`}>
                           {notification.actionText}
                        </a>
                    )}
                </div>
                <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="ml-4 text-gray-500 hover:text-white transition-colors">
                    <Icons.Close />
                </button>
            </div>
        </div>
    );
};

export default function ToastContainer({ toasts, onClose }: { toasts: ToastNotification[], onClose: (id: string) => void }) {
    return (
        <div className="fixed top-4 right-4 z-50 w-full max-w-sm space-y-3">
            {toasts.map(toast => (
                <Toast key={toast.id} notification={toast} onClose={() => onClose(toast.id)} />
            ))}
        </div>
    );
};
