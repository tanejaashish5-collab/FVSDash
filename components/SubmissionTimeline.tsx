
import React from 'react';
import { Episode } from '../types';
import Icons from './Icons';

interface SubmissionTimelineProps {
    status: Episode['status'];
}

const timelineSteps = ['Submitted', 'In Production', 'Review', 'Scheduled', 'Published'];
const statusToStepMap: Record<Episode['status'], string> = {
    'New': 'Submitted',
    'In Production': 'In Production',
    'Review': 'Review',
    'Scheduled': 'Scheduled',
    'Published': 'Published',
};

const Step: React.FC<{ label: string; state: 'completed' | 'active' | 'future' }> = ({ label, state }) => {
    const stateStyles = {
        completed: {
            iconContainer: 'bg-green-500',
            icon: <Icons.CheckCircle className="w-4 h-4 text-black" />,
            label: 'text-white',
        },
        active: {
            iconContainer: 'bg-[#F1C87A] ring-4 ring-[#F1C87A]/30 animate-pulse',
            icon: <div className="w-2 h-2 bg-black rounded-full" />,
            label: 'text-[#F1C87A] font-bold',
        },
        future: {
            iconContainer: 'bg-gray-700 border-2 border-gray-600',
            icon: <div className="w-2 h-2 bg-gray-500 rounded-full" />,
            label: 'text-gray-500',
        },
    };

    const styles = stateStyles[state];

    return (
        <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${styles.iconContainer}`}>
                {styles.icon}
            </div>
            <p className={`mt-1 text-xs text-center ${styles.label}`}>{label}</p>
        </div>
    );
};

const SubmissionTimeline: React.FC<SubmissionTimelineProps> = ({ status }) => {
    const currentStep = statusToStepMap[status];
    const currentIndex = timelineSteps.indexOf(currentStep);

    return (
        <div className="flex items-center w-full max-w-sm">
            {timelineSteps.map((step, index) => {
                const state = index < currentIndex ? 'completed' : index === currentIndex ? 'active' : 'future';
                const isConnectorActive = index < currentIndex;
                
                return (
                    <React.Fragment key={step}>
                        <Step label={step} state={state} />
                        {index < timelineSteps.length - 1 && (
                             <div className={`flex-1 h-0.5 mx-2 ${isConnectorActive ? 'bg-green-500' : 'bg-gray-700'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default SubmissionTimeline;