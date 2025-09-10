import React, { useEffect } from 'react';
import Icons from './Icons';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-dialog-title"
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-[#1A1A1A] rounded-lg shadow-2xl border border-[#2A2A2A] w-full max-w-md"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-500/10 sm:mx-0 sm:h-10 sm:w-10">
                            <svg className="h-6 w-6 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>
                        <div className="mt-0 text-left">
                            <h3 id="confirmation-dialog-title" className="text-lg font-bold text-white">{title}</h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-300">{message}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#121212] px-6 py-4 flex flex-row-reverse gap-3 rounded-b-lg">
                    <button
                        type="button"
                        onClick={() => { onConfirm(); onClose(); }}
                        className="px-4 py-2 text-sm font-semibold text-black bg-[#F1C87A] rounded-lg hover:-translate-y-0.5 transition-transform"
                    >
                        Confirm
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-white bg-transparent border border-gray-600 rounded-lg hover:bg-gray-700/50 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;