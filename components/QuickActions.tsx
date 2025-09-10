
import React from 'react';
import { QuickAction } from '../types';
import { useAnalytics } from '../lib/AnalyticsProvider';

const QuickActions: React.FC<{ actions: QuickAction[]; onSubmitContentClick: () => void; }> = ({ actions, onSubmitContentClick }) => {
    const { logEvent } = useAnalytics();
    return (
        <section className="bg-[#121212] p-6 rounded-lg border border-[#2A2A2A]">
            <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
                {actions.map(action => (
                    <a
                        key={action.title}
                        href={action.url}
                        data-command-id={action.id}
                        onClick={(e) => {
                            if (action.id === 'submit-content') {
                                e.preventDefault();
                                onSubmitContentClick();
                            }
                            logEvent('quick_action_clicked', { action: action.title })
                        }}
                        className="group flex flex-col items-center justify-center text-center p-4 bg-[#1A1A1A] rounded-lg hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#F1C87A]/20 transition-all"
                    >
                        <div className="text-3xl mb-2">{action.icon}</div>
                        <h4 className="font-semibold text-sm text-white group-hover:text-[#F1C87A]">{action.title}</h4>
                    </a>
                ))}
            </div>
        </section>
    );
};

export default QuickActions;