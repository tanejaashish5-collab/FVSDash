'use client';
import React, { createContext, useState, useCallback, useContext } from 'react';
import { ToastNotification } from '@/types';
import ToastContainer from '@/components/ToastContainer';
import { DEFAULT_TOAST_NOTIFICATIONS } from '@/constants';

interface ToastContextType {
    addToast: (toast: Omit<ToastNotification, 'id' | 'duration'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToasts = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToasts must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastNotification[]>([]);

    const addToast = useCallback((toast: Omit<ToastNotification, 'id' | 'duration'>) => {
        const newToast: ToastNotification = {
            id: `toast-${Date.now()}`,
            duration: 5000,
            ...toast,
        };
        setToasts(prev => [...prev, newToast]);
    }, []);

    const handleCloseToast = (id: string) => {
        setToasts(currentToasts => currentToasts.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <ToastContainer toasts={toasts} onClose={handleCloseToast} />
        </ToastContext.Provider>
    );
};
