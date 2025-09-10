import React, { useRef, useState, useLayoutEffect } from 'react';
import { OnboardingStep } from '../types';
import Icons from './Icons';

interface OnboardingTooltipProps {
    step: OnboardingStep;
    targetElement: HTMLElement;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
    isLastStep: boolean;
    currentStep: number;
    totalSteps: number;
}

const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
    step,
    targetElement,
    onNext,
    onPrev,
    onSkip,
    isLastStep,
    currentStep,
    totalSteps
}) => {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, opacity: 0 });
    const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

    useLayoutEffect(() => {
        if (!targetElement || !tooltipRef.current) return;
        
        targetElement.scrollIntoView({
            behavior: 'auto',
            block: 'center',
            inline: 'center',
        });

        const calculatePosition = () => {
            if (!targetElement || !tooltipRef.current) return;
            
            const targetRect = targetElement.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();

            setHighlightStyle({
                top: targetRect.top - 5,
                left: targetRect.left - 5,
                width: targetRect.width + 10,
                height: targetRect.height + 10,
            });

            let newPos = { top: 0, left: 0 };

            switch (step.position) {
                case 'bottom':
                    newPos = {
                        top: targetRect.bottom + 15,
                        left: targetRect.left + targetRect.width / 2 - tooltipRect.width / 2,
                    };
                    break;
                case 'top':
                    newPos = {
                        top: targetRect.top - tooltipRect.height - 15,
                        left: targetRect.left + targetRect.width / 2 - tooltipRect.width / 2,
                    };
                    break;
                case 'left':
                    newPos = {
                        top: targetRect.top + targetRect.height / 2 - tooltipRect.height / 2,
                        left: targetRect.left - tooltipRect.width - 15,
                    };
                    break;
                case 'right':
                    newPos = {
                        top: targetRect.top + targetRect.height / 2 - tooltipRect.height / 2,
                        left: targetRect.right + 15,
                    };
                    break;
            }
            
            newPos.left = Math.max(10, Math.min(newPos.left, window.innerWidth - tooltipRect.width - 10));
            newPos.top = Math.max(10, Math.min(newPos.top, window.innerHeight - tooltipRect.height - 10));
            
            setPosition({ ...newPos, opacity: 1 });
        };
        
        requestAnimationFrame(calculatePosition);

    }, [targetElement, step.position, currentStep]);
    
    const progressPercentage = (currentStep / totalSteps) * 100;

    return (
        <>
            <div className="tour-overlay animate-fade-in"></div>
            <div className="tour-highlight-box animate-fade-in" style={highlightStyle} />
            <div
                ref={tooltipRef}
                style={{ ...position, transition: 'opacity 0.3s ease-in-out' }}
                className="onboarding-tooltip animate-fade-in-up"
                data-position={step.position}
                role="dialog"
                aria-labelledby="onboarding-title"
                aria-describedby="onboarding-description"
            >
                <div className="flex justify-between items-center p-4">
                    <h3 id="onboarding-title" className="font-bold text-white">{step.title}</h3>
                    <div className="flex items-center gap-4">
                         <span className="text-xs text-gray-400">Step {currentStep} of {totalSteps}</span>
                         <button onClick={onSkip} className="text-xs text-gray-500 hover:text-white hover:underline">Skip Tour</button>
                    </div>
                </div>
                
                <div className="px-4 pb-4">
                    <p id="onboarding-description" className="text-gray-300 text-sm leading-relaxed">{step.description}</p>
                </div>
                
                <div className="flex justify-between items-center p-4 bg-[#121212]/50 rounded-b-lg">
                    <div className="tour-progress-bar">
                        <div className="tour-progress-bar-inner" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={onPrev} 
                            disabled={currentStep === 1} 
                            className="px-4 py-2 text-sm font-semibold text-white bg-transparent border border-gray-600 rounded-lg hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <button 
                            onClick={onNext} 
                            className="px-4 py-2 text-sm font-semibold text-black bg-[#F1C87A] rounded-lg hover:-translate-y-0.5 transition-transform"
                        >
                            {isLastStep ? 'Finish Tour' : step.actionText || 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default OnboardingTooltip;