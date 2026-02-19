import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// Custom easing for silk-smooth transitions
const silkEase = [0.22, 1, 0.36, 1];

const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: silkEase,
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.25,
      ease: silkEase,
    },
  },
};

// Reduced motion variants (respects prefers-reduced-motion)
const reducedMotionVariants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export function PageTransition({ children }) {
  const location = useLocation();
  
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const variants = prefersReducedMotion ? reducedMotionVariants : pageVariants;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={variants}
        className="w-full"
        style={{ willChange: 'transform, opacity' }}
        onAnimationComplete={() => {
          // Scroll to top on page transition
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Staggered children container for lists
export const staggerContainer = {
  initial: {},
  enter: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

// Individual item animation for staggered lists
export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: silkEase,
    },
  },
};

// Card entrance animation with stagger
export const cardVariants = {
  initial: { opacity: 0, y: 15, scale: 0.98 },
  enter: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.35,
      ease: silkEase,
    },
  },
};

// Modal/Popover spring animation
export const modalVariants = {
  initial: { 
    opacity: 0, 
    scale: 0.95,
    y: 10,
  },
  enter: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.2,
      ease: silkEase,
    },
  },
};

// List item slide-in with highlight
export const listItemVariants = {
  initial: { 
    opacity: 0, 
    x: 20,
    backgroundColor: 'transparent',
  },
  enter: { 
    opacity: 1, 
    x: 0,
    backgroundColor: 'transparent',
    transition: {
      duration: 0.3,
      ease: silkEase,
    },
  },
  new: {
    opacity: 1,
    x: 0,
    backgroundColor: ['rgba(16, 185, 129, 0.15)', 'transparent'],
    transition: {
      duration: 2,
      ease: 'easeOut',
      backgroundColor: {
        duration: 2,
        ease: 'easeOut',
      },
    },
  },
};

export default PageTransition;
