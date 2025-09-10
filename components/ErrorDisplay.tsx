import React from 'react';
import Icons from './Icons';

const ErrorDisplay = ({ message, onRetry, errorEventId }: { message: string, onRetry: () => void, errorEventId?: string | null }) => (
    <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-20 h-20 flex items-center justify-center rounded-full bg-red-500/10 mb-4">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
             </svg>
        </div>
        <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
        <p className="text-gray-400 mt-2 mb-6 max-w-md">{message}</p>
        {errorEventId && (
            <div className="mb-6 bg-[#2A2A2A] p-3 rounded-md text-xs text-gray-400 font-mono">
                <p>If you contact support, please reference this Error ID:</p>
                <p className="font-bold text-gray-300 mt-1">{errorEventId}</p>
            </div>
        )}
        <button 
            onClick={onRetry}
            className="px-6 py-2 text-md font-semibold text-black bg-[#F1C87A] rounded-lg shadow-md hover:shadow-lg hover:shadow-[#F1C87A]/20 hover:-translate-y-0.5 transition-all transform"
        >
            Try Again
        </button>
    </div>
);

export default ErrorDisplay;