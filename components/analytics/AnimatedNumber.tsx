import React, { useState, useEffect, useRef } from 'react';

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    isIntersecting: boolean;
    formatter?: (val: number) => string;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, duration = 1000, isIntersecting, formatter }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const frameRef = useRef<number | null>(null);
    const startValueRef = useRef(0);

    useEffect(() => {
        // When the component is not visible, reset its state to animate from 0 when it reappears.
        if (!isIntersecting) {
            startValueRef.current = 0;
            setDisplayValue(0);
            return;
        }
        
        // When the target value changes, we want to start the animation from the *current* display value.
        startValueRef.current = displayValue;

    }, [isIntersecting]);

    useEffect(() => {
        if (!isIntersecting) return;

        const startValue = startValueRef.current;
        const endValue = value;

        if (startValue === endValue) {
             setDisplayValue(endValue);
             return;
        }

        let startTime: number | null = null;
        
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const currentAnimatedValue = startValue + (endValue - startValue) * progress;
            
            setDisplayValue(currentAnimatedValue);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            } else {
                setDisplayValue(endValue);
            }
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [value, duration, isIntersecting]);

    const formattedCount = (val: number) => {
        if (formatter) {
            return formatter(val);
        }
        return Math.round(val).toLocaleString();
    };

    return <>{formattedCount(displayValue)}</>;
};

export default AnimatedNumber;