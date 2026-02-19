import { useState, useRef, useEffect, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

/**
 * AuraTooltip - Contextual Help Component
 * 
 * Glassmorphic tooltip with smart positioning and subtle ? icon trigger.
 * Part of the Aura design system.
 * 
 * @param {string} content - The tooltip text to display
 * @param {string} position - Preferred position: 'top' | 'bottom' | 'left' | 'right' (auto-adjusts)
 * @param {number} maxWidth - Maximum width in pixels (default: 260)
 */
export function AuraTooltip({ content, position = 'top', maxWidth = 260, children }) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, actualPosition: position });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipHeight = 80; // Estimated height
    const tooltipWidth = maxWidth;
    const padding = 8;
    const arrowSize = 6;

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Calculate available space in each direction
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewport.height - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewport.width - triggerRect.right;

    let actualPosition = position;
    let top = 0;
    let left = 0;

    // Determine best position based on available space
    if (position === 'top' && spaceAbove < tooltipHeight + padding) {
      actualPosition = 'bottom';
    } else if (position === 'bottom' && spaceBelow < tooltipHeight + padding) {
      actualPosition = 'top';
    } else if (position === 'left' && spaceLeft < tooltipWidth + padding) {
      actualPosition = 'right';
    } else if (position === 'right' && spaceRight < tooltipWidth + padding) {
      actualPosition = 'left';
    }

    // Calculate position based on actual position
    switch (actualPosition) {
      case 'top':
        top = triggerRect.top - tooltipHeight - arrowSize - padding;
        left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + arrowSize + padding;
        left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
        left = triggerRect.left - tooltipWidth - arrowSize - padding;
        break;
      case 'right':
        top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
        left = triggerRect.right + arrowSize + padding;
        break;
      default:
        top = triggerRect.top - tooltipHeight - arrowSize - padding;
        left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
    }

    // Clamp to viewport bounds
    left = Math.max(padding, Math.min(left, viewport.width - tooltipWidth - padding));
    top = Math.max(padding, Math.min(top, viewport.height - tooltipHeight - padding));

    setTooltipPos({ top, left, actualPosition });
  }, [position, maxWidth]);

  const showTooltip = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    calculatePosition();
    setIsVisible(true);
  }, [calculatePosition]);

  const hideTooltip = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isVisible]);

  // Get arrow styles based on position
  const getArrowStyles = () => {
    const base = "absolute w-2.5 h-2.5 bg-[rgba(20,20,25,0.95)] border-white/10 rotate-45";
    
    switch (tooltipPos.actualPosition) {
      case 'top':
        return `${base} -bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b`;
      case 'bottom':
        return `${base} -top-1.5 left-1/2 -translate-x-1/2 border-l border-t`;
      case 'left':
        return `${base} -right-1.5 top-1/2 -translate-y-1/2 border-t border-r`;
      case 'right':
        return `${base} -left-1.5 top-1/2 -translate-y-1/2 border-b border-l`;
      default:
        return `${base} -bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b`;
    }
  };

  return (
    <>
      {/* Inline wrapper for label + icon */}
      <span className="inline-flex items-center gap-1">
        {children}
        <span
          ref={triggerRef}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
          onFocus={showTooltip}
          onBlur={hideTooltip}
          className="inline-flex items-center justify-center cursor-help"
          tabIndex={0}
          role="button"
          aria-label="Help"
        >
          <HelpCircle 
            className="h-3 w-3 text-amber-400/40 hover:text-amber-400 transition-colors duration-150" 
            strokeWidth={2.5}
          />
        </span>
      </span>

      {/* Tooltip Portal */}
      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
          className="fixed z-[9999] animate-tooltip-fade-in pointer-events-auto"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            maxWidth: maxWidth,
          }}
        >
          <div className="relative backdrop-blur-md bg-[rgba(20,20,25,0.95)] border border-white/10 rounded-[10px] shadow-xl px-3.5 py-3">
            <p className="text-[13px] leading-relaxed text-zinc-200">
              {content}
            </p>
            {/* Arrow */}
            <span className={getArrowStyles()} />
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes tooltip-fade-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-tooltip-fade-in {
          animation: tooltip-fade-in 150ms ease-out forwards;
        }
      `}</style>
    </>
  );
}

/**
 * Simple inline tooltip trigger without wrapping children
 * Use when you just need to add a ? icon after some text
 */
export function TooltipIcon({ content, position = 'top' }) {
  return (
    <AuraTooltip content={content} position={position}>
      {null}
    </AuraTooltip>
  );
}

export default AuraTooltip;
