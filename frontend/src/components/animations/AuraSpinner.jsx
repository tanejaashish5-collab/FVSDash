import { motion } from 'framer-motion';

export function AuraSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const ringSize = {
    sm: { strokeWidth: 2, r: 10 },
    md: { strokeWidth: 3, r: 16 },
    lg: { strokeWidth: 4, r: 26 },
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Blur trail glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(241, 200, 122, 0.3) 0%, transparent 70%)',
          filter: 'blur(8px)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Main rotating ring */}
      <svg
        className={`${sizeClasses[size]} absolute inset-0`}
        viewBox="0 0 40 40"
      >
        <defs>
          <linearGradient id="aura-spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(241, 200, 122, 1)" />
            <stop offset="50%" stopColor="rgba(241, 200, 122, 0.6)" />
            <stop offset="100%" stopColor="rgba(241, 200, 122, 0.1)" />
          </linearGradient>
          <filter id="spinner-glow">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        <motion.circle
          cx="20"
          cy="20"
          r={ringSize[size].r}
          fill="none"
          stroke="url(#aura-spinner-gradient)"
          strokeWidth={ringSize[size].strokeWidth}
          strokeLinecap="round"
          strokeDasharray="60 40"
          filter="url(#spinner-glow)"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ transformOrigin: 'center' }}
        />
      </svg>
      
      {/* Inner subtle pulse */}
      <motion.div
        className="absolute inset-2 rounded-full border border-amber-400/20"
        animate={{
          scale: [0.9, 1, 0.9],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}

// Full page loading overlay with Aura Spinner
export function AuraLoadingOverlay({ message = 'Loading...' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <AuraSpinner size="lg" />
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4 text-sm text-zinc-400"
      >
        {message}
      </motion.p>
    </motion.div>
  );
}

// Inline loading indicator
export function AuraLoadingInline({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <AuraSpinner size="sm" />
      <span className="text-xs text-zinc-500 animate-pulse">Syncing...</span>
    </div>
  );
}

export default AuraSpinner;
