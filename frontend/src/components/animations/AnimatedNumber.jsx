import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion';

export function AnimatedNumber({ 
  value, 
  duration = 2, 
  delay = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  once = true,
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: '-50px' });
  const [displayValue, setDisplayValue] = useState(0);
  
  // Parse the numeric value (handle strings with commas, currency, etc.)
  const numericValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0
    : value || 0;

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      setDisplayValue(numericValue);
      return;
    }

    const controls = animate(0, numericValue, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        setDisplayValue(latest);
      },
    });

    return () => controls.stop();
  }, [isInView, numericValue, duration, delay, prefersReducedMotion]);

  const formatNumber = (num) => {
    if (decimals > 0) {
      return num.toFixed(decimals);
    }
    return Math.round(num).toLocaleString();
  };

  return (
    <span ref={ref} className={className}>
      {prefix}{formatNumber(displayValue)}{suffix}
    </span>
  );
}

// Animated percentage with circular progress
export function AnimatedPercentage({ 
  value, 
  size = 60, 
  strokeWidth = 4,
  duration = 2,
  className = '',
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [progress, setProgress] = useState(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const prefersReducedMotion = typeof window !== 'undefined' 
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      setProgress(value);
      return;
    }

    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setProgress(latest),
    });

    return () => controls.stop();
  }, [isInView, value, duration, prefersReducedMotion]);

  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div ref={ref} className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progress-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.1s ease' }}
        />
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold text-white">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

export default AnimatedNumber;
