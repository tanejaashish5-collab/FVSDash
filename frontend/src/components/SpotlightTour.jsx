import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';

// Tour step definitions for ForgeVoice Studio
const TOUR_STEPS = [
  {
    id: 'kpi-cards',
    target: '[data-tour="kpi-cards"]',
    fallbackTarget: '.stat-card',
    title: 'Performance Overview',
    description: 'Your high-level performance metrics at a glance. Track active projects, publishing rate, total assets, and estimated ROI.',
    position: 'bottom',
  },
  {
    id: 'pipeline',
    target: '[data-tour="pipeline"]',
    fallbackTarget: '[data-testid="production-pipeline"]',
    title: 'Production Pipeline',
    description: 'Track every episode from intake to publish. Drag cards between columns or click to update status.',
    position: 'bottom',
  },
  {
    id: 'sidebar-nav',
    target: '[data-tour="sidebar-nav"]',
    fallbackTarget: '[data-testid="sidebar"]',
    title: 'Navigation Hub',
    description: 'Quick access to Submissions, Assets, Strategy Lab, and more. Everything is organized by workflow stage.',
    position: 'right',
  },
  {
    id: 'submissions',
    target: '[data-tour="submissions-link"]',
    fallbackTarget: 'a[href="/dashboard/submissions"]',
    title: 'Submissions Center',
    description: 'Where you upload raw content and track episode progress. Click "+ New Submission" to get started.',
    position: 'right',
  },
  {
    id: 'strategy-lab',
    target: '[data-tour="strategy-lab-link"]',
    fallbackTarget: 'a[href="/dashboard/strategy"]',
    title: 'Strategy Lab',
    description: 'AI-powered research and scripting. Generate outlines, scripts, and YouTube metadata with multiple LLM providers.',
    position: 'right',
  },
  {
    id: 'fvs-system',
    target: '[data-tour="fvs-system-link"]',
    fallbackTarget: 'a[href="/dashboard/system"]',
    title: 'FVS System',
    description: 'The autonomous brain generating your ideas. Set automation levels and let AI propose content based on trends.',
    position: 'right',
  },
  {
    id: 'publishing',
    target: '[data-tour="publishing-link"]',
    fallbackTarget: 'a[href="/dashboard/publishing"]',
    title: 'Publishing Dashboard',
    description: 'Manage your social connections and scheduled posts. Connect YouTube, TikTok, and Instagram from Settings.',
    position: 'right',
  },
  {
    id: 'notifications',
    target: '[data-tour="notifications"]',
    fallbackTarget: '[data-testid="notifications-btn"]',
    title: 'Notification Center',
    description: 'Your real-time status feed for all updates. Get notified when submissions change status or new ideas are generated.',
    position: 'bottom-left',
  },
];

const STORAGE_KEY = 'fvs_tour_completed';

// Calculate optimal tooltip position
function calculatePosition(targetRect, tooltipWidth = 320, tooltipHeight = 200) {
  const padding = 16;
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // Default positions for each preference
  const positions = {
    bottom: {
      top: targetRect.bottom + padding,
      left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
    },
    top: {
      top: targetRect.top - tooltipHeight - padding,
      left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
    },
    right: {
      top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
      left: targetRect.right + padding,
    },
    left: {
      top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
      left: targetRect.left - tooltipWidth - padding,
    },
    'bottom-left': {
      top: targetRect.bottom + padding,
      left: targetRect.left - tooltipWidth + targetRect.width,
    },
    'bottom-right': {
      top: targetRect.bottom + padding,
      left: targetRect.left,
    },
  };

  return (preferredPosition) => {
    let pos = positions[preferredPosition] || positions.bottom;

    // Clamp to viewport bounds
    pos.left = Math.max(padding, Math.min(pos.left, viewport.width - tooltipWidth - padding));
    pos.top = Math.max(padding, Math.min(pos.top, viewport.height - tooltipHeight - padding));

    return pos;
  };
}

// Spotlight Overlay Component with SVG Mask
function SpotlightOverlay({ targetRect, children }) {
  if (!targetRect) return null;

  const padding = 8;
  const borderRadius = 8;

  // Expanded rect for the spotlight
  const spotlightRect = {
    x: targetRect.left - padding,
    y: targetRect.top - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
  };

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-auto">
      {/* SVG Mask Overlay */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          {/* Define the mask */}
          <mask id="spotlight-mask">
            {/* White background = visible overlay */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout = transparent hole */}
            <rect
              x={spotlightRect.x}
              y={spotlightRect.y}
              width={spotlightRect.width}
              height={spotlightRect.height}
              rx={borderRadius}
              ry={borderRadius}
              fill="black"
            />
          </mask>

          {/* Golden glow filter */}
          <filter id="golden-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feFlood floodColor="rgba(241, 200, 122, 0.6)" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Dark overlay with mask applied */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.65)"
          mask="url(#spotlight-mask)"
          style={{ pointerEvents: 'auto' }}
        />

        {/* Golden border around spotlight */}
        <rect
          x={spotlightRect.x}
          y={spotlightRect.y}
          width={spotlightRect.width}
          height={spotlightRect.height}
          rx={borderRadius}
          ry={borderRadius}
          fill="none"
          stroke="rgba(241, 200, 122, 0.8)"
          strokeWidth="2"
          filter="url(#golden-glow)"
          className="animate-spotlight-glow"
        />
      </svg>

      {/* Tooltip container */}
      {children}
    </div>
  );
}

// Adaptive Tooltip Card
function TourTooltip({ step, stepIndex, totalSteps, position, onNext, onBack, onSkip }) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 200);
    return () => clearTimeout(timer);
  }, [stepIndex]);

  const progress = ((stepIndex + 1) / totalSteps) * 100;
  const isLastStep = stepIndex === totalSteps - 1;
  const isFirstStep = stepIndex === 0;

  return (
    <div
      data-testid="tour-tooltip"
      className={`
        fixed z-[9999] w-80 pointer-events-auto
        transition-all duration-200 ease-out
        ${isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
      `}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="aura-glass rounded-xl border border-white/[0.1] shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Step {stepIndex + 1} of {totalSteps}
              </span>
            </div>
            <button
              data-testid="tour-skip-btn"
              onClick={onSkip}
              className="p-1 text-zinc-500 hover:text-white hover:bg-white/10 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Title & Description */}
          <h3 className="text-base font-semibold text-white mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {step.title}
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            {step.description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              data-testid="tour-back-btn"
              onClick={onBack}
              disabled={isFirstStep}
              className={`
                flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all
                ${isFirstStep
                  ? 'text-zinc-600 cursor-not-allowed'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }
              `}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <button
              data-testid="tour-next-btn"
              onClick={onNext}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-md bg-gradient-to-r from-amber-500 to-amber-400 text-black hover:from-amber-400 hover:to-amber-300 transition-all shadow-lg shadow-amber-500/20"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Pointer arrow */}
      <div
        className="absolute w-3 h-3 bg-[rgba(12,12,15,0.85)] border-l border-t border-white/[0.1] rotate-45"
        style={{
          // Position arrow based on tooltip position relative to target
          top: position.arrowTop || -6,
          left: position.arrowLeft || '50%',
          transform: position.arrowTransform || 'translateX(-50%) rotate(45deg)',
        }}
      />
    </div>
  );
}

// Main SpotlightTour Component
export default function SpotlightTour({ isOpen, onClose, autoStart = false }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isActive, setIsActive] = useState(false);

  // Define handlers first
  const closeTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsActive(false);
    setTargetRect(null);
    onClose?.();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Tour complete
      closeTour();
    }
  }, [currentStep, closeTour]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    closeTour();
  }, [closeTour]);

  // Check if tour should auto-start
  useEffect(() => {
    if (autoStart && !localStorage.getItem(STORAGE_KEY)) {
      // Small delay to let the page render
      const timer = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

  // External control
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsActive(true);
    }
  }, [isOpen]);

  // Find and highlight target element
  const highlightTarget = useCallback(() => {
    if (!isActive || currentStep >= TOUR_STEPS.length) return;

    const step = TOUR_STEPS[currentStep];
    let targetElement = document.querySelector(step.target);

    // Try fallback selector
    if (!targetElement && step.fallbackTarget) {
      targetElement = document.querySelector(step.fallbackTarget);
    }

    if (targetElement) {
      // Scroll element into view first
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });

      // Wait for scroll to complete, then get position
      const updatePosition = () => {
        const rect = targetElement.getBoundingClientRect();
        setTargetRect(rect);

        // Calculate tooltip position
        const getPosition = calculatePosition(rect);
        const pos = getPosition(step.position);
        setTooltipPosition(pos);
      };

      // Initial position update after scroll
      setTimeout(updatePosition, 400);
      
      // Also update after a brief delay for any layout shifts
      setTimeout(updatePosition, 600);
    } else {
      // Target not found - skip to next step
      console.warn(`Tour target not found: ${step.target}, trying fallback: ${step.fallbackTarget}`);
      
      // Skip to next step if target not found after a delay
      setTimeout(() => {
        if (currentStep < TOUR_STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          // End tour if no more steps
          closeTour();
        }
      }, 500);
    }
  }, [isActive, currentStep, closeTour]);

  // Update on step change
  useEffect(() => {
    highlightTarget();
  }, [highlightTarget]);

  // Handle window resize
  useEffect(() => {
    if (!isActive) return;

    const handleResize = () => highlightTarget();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isActive, highlightTarget]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Tour complete
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsActive(false);
      onClose?.();
    }
  }, [currentStep, onClose]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsActive(false);
    onClose?.();
  }, [onClose]);

  // Handle clicking outside spotlight (skip tour)
  const handleOverlayClick = useCallback((e) => {
    // Only close if clicking on the dark overlay, not the tooltip
    if (e.target === e.currentTarget) {
      handleSkip();
    }
  }, [handleSkip]);

  if (!isActive) return null;

  const currentStepData = TOUR_STEPS[currentStep];

  return createPortal(
    <SpotlightOverlay targetRect={targetRect} onClick={handleOverlayClick}>
      {targetRect && (
        <TourTooltip
          step={currentStepData}
          stepIndex={currentStep}
          totalSteps={TOUR_STEPS.length}
          position={tooltipPosition}
          onNext={handleNext}
          onBack={handleBack}
          onSkip={handleSkip}
        />
      )}
    </SpotlightOverlay>,
    document.body
  );
}

// Export for external use
export { STORAGE_KEY as TOUR_STORAGE_KEY };
