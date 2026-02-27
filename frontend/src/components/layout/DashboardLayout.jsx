import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ImpersonationBanner from '@/components/ImpersonationBanner';
import { useAuth } from '@/context/AuthContext';

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

// Check for reduced motion preference
const getPrefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function DashboardLayout() {
  const { isImpersonating } = useAuth();
  const location = useLocation();
  const prefersReducedMotion = getPrefersReducedMotion();
  
  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-layout">
      <ImpersonationBanner />
      <Sidebar />
      <div className={`ml-[280px] min-h-screen flex flex-col ${isImpersonating ? 'pt-10' : ''}`}>
        <Header />
        <main className="flex-1 p-6 md:p-8 min-h-[calc(100vh-64px)]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={prefersReducedMotion ? {} : "initial"}
              animate="enter"
              exit={prefersReducedMotion ? {} : "exit"}
              variants={prefersReducedMotion ? {} : pageVariants}
              className="w-full"
              style={{ willChange: prefersReducedMotion ? 'auto' : 'transform, opacity' }}
              onAnimationComplete={() => {
                // Scroll to top on page transition
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
