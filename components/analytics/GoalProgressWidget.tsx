'use client';
import React from 'react';
import { Goal } from '../../types';
import AnimatedNumber from './AnimatedNumber';
import useIntersectionObserver from '../../hooks/useIntersectionObserver';

const GoalProgressBar: React.FC<{ goal: Goal }> = ({ goal }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isVisible = useIntersectionObserver(ref, { threshold: 0.5, triggerOnce: true });

    const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
    const progressClamped = Math.min(progress, 100);

    return (
        <div ref={ref} className="bg-[#1A1A1A]/50 p-4 rounded-lg border border-[#2A2A2A]">
            <p className="font-semibold text-white text-md truncate">{goal.description}</p>
            <div className="flex items-center gap-4 my-2">
                <div className="h-2.5 flex-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: isVisible ? `${progressClamped}%` : '0%' }}
                    />
                </div>
                <span className="text-sm font-bold text-white">{Math.round(progress)}%</span>
            </div>
            <div className="text-right text-sm text-gray-400">
                <span className="font-bold text-white">
                    <AnimatedNumber value={goal.current} isIntersecting={isVisible} />
                </span> / {goal.target.toLocaleString()}{goal.suffix}
            </div>
        </div>
    );
};


const GoalProgressWidget: React.FC<{ goals: Goal[] }> = ({ goals }) => {
    if (!goals || goals.length === 0) {
        return (
            <div className="text-center text-gray-500 py-10">
                No goals set. Visit the Settings page to define your quarterly objectives.
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2">
            {goals.map(goal => (
                <GoalProgressBar key={goal.id} goal={goal} />
            ))}
        </div>
    );
};

export default GoalProgressWidget;