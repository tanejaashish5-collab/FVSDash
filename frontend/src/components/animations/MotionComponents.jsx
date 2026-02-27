import { motion, AnimatePresence } from 'framer-motion';
import { forwardRef } from 'react';

// Custom easing
const silkEase = [0.22, 1, 0.36, 1];

// Check for reduced motion
const getPrefersReducedMotion = () => 
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animated Button with press effect
export const MotionButton = forwardRef(({ children, className = '', ...props }, ref) => {
  const prefersReducedMotion = getPrefersReducedMotion();
  
  return (
    <motion.button
      ref={ref}
      className={className}
      whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
      transition={{ duration: 0.15, ease: silkEase }}
      {...props}
    >
      {children}
    </motion.button>
  );
});
MotionButton.displayName = 'MotionButton';

// Animated Card with hover lift
export const MotionCard = forwardRef(({ children, className = '', delay = 0, ...props }, ref) => {
  const prefersReducedMotion = getPrefersReducedMotion();
  
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.35, 
        ease: silkEase,
        delay,
      }}
      whileHover={prefersReducedMotion ? {} : { 
        y: -2,
        transition: { duration: 0.2 },
      }}
      style={{ willChange: 'transform, opacity' }}
      {...props}
    >
      {children}
    </motion.div>
  );
});
MotionCard.displayName = 'MotionCard';

// Staggered list container
export function StaggerContainer({ children, className = '', ...props }) {
  const prefersReducedMotion = getPrefersReducedMotion();
  
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="enter"
      variants={prefersReducedMotion ? {} : {
        initial: {},
        enter: {
          transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Staggered list item
export function StaggerItem({ children, className = '', isNew = false, ...props }) {
  const prefersReducedMotion = getPrefersReducedMotion();
  
  const variants = {
    initial: { opacity: 0, x: 20 },
    enter: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3, ease: silkEase },
    },
  };

  const newVariants = {
    initial: { opacity: 0, x: 20, backgroundColor: 'rgba(16, 185, 129, 0.2)' },
    enter: { 
      opacity: 1, 
      x: 0,
      backgroundColor: 'transparent',
      transition: { 
        duration: 0.3, 
        ease: silkEase,
        backgroundColor: { duration: 2, ease: 'easeOut' },
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={prefersReducedMotion ? {} : (isNew ? newVariants : variants)}
      style={{ willChange: 'transform, opacity' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Animated Modal/Dialog wrapper
export function MotionModal({ 
  children, 
  isOpen, 
  onClose, 
  className = '',
  ...props 
}) {
  const prefersReducedMotion = getPrefersReducedMotion();
  
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Modal content */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={prefersReducedMotion ? { duration: 0.15 } : {
              type: 'spring',
              stiffness: 300,
              damping: 25,
            }}
            className={`fixed z-50 ${className}`}
            style={{ willChange: 'transform, opacity' }}
            {...props}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Sync/Loading pulse animation for labels
export function SyncPulse({ children, isSyncing = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {children}
      {isSyncing && (
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-amber-400"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </span>
  );
}

// Fade in wrapper for lazy content
export function FadeIn({ children, delay = 0, className = '', ...props }) {
  const prefersReducedMotion = getPrefersReducedMotion();
  
  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        ease: silkEase,
        delay,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Hover glow effect wrapper
export function HoverGlow({ children, color = 'gold', className = '', ...props }) {
  const prefersReducedMotion = getPrefersReducedMotion();
  
  const glowColors = {
    gold: 'rgba(241, 200, 122, 0.3)',
    teal: 'rgba(45, 212, 191, 0.3)',
    indigo: 'rgba(99, 102, 241, 0.3)',
  };

  return (
    <motion.div
      className={`relative ${className}`}
      whileHover={prefersReducedMotion ? {} : {
        boxShadow: `0 0 20px ${glowColors[color]}`,
      }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default {
  MotionButton,
  MotionCard,
  StaggerContainer,
  StaggerItem,
  MotionModal,
  SyncPulse,
  FadeIn,
  HoverGlow,
};
