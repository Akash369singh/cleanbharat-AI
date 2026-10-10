import { Variants, Transition } from 'framer-motion';

// Common durations (150-400 ms)
export const durations = {
  instant: 0.15,
  fast: 0.2,
  normal: 0.3,
  slow: 0.4,
};

// Easing curves
export const easings = {
  easeOut: [0.16, 1, 0.3, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
  sharp: [0.4, 0, 0.6, 1] as const,
};

// Spring presets
export const springs = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 } as Transition,
  gentle: { type: 'spring', stiffness: 260, damping: 20 } as Transition,
  bouncy: { type: 'spring', stiffness: 350, damping: 15 } as Transition,
};

export const defaultSpring = springs.snappy;

// Page Transition Variants (Fade + slight slide)
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
    scale: 0.995,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.995,
    transition: {
      duration: durations.fast,
      ease: easings.sharp,
    },
  },
};

// Stagger Container
export const staggerContainer = (staggerDelay = 0.05): Variants => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0.02,
    },
  },
});

export const containerStagger = staggerContainer(0.06);

// Staggered Child Entry
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.easeOut,
    },
  },
};

export const cardVariants = fadeInUp;
export const listItemVariants = fadeInUp;

// Micro-interactions for buttons and cards
export const buttonPress = {
  scale: 0.97,
  transition: { duration: durations.instant },
};

export const cardHover = {
  y: -2,
  transition: { duration: durations.fast, ease: easings.easeOut },
};

// Pulsing ring variant for overdue / critical reports
export const pulseRing: Variants = {
  initial: { scale: 1, opacity: 0.8 },
  animate: {
    scale: [1, 1.25, 1],
    opacity: [0.8, 0.2, 0.8],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Modal / Drawer enter/exit
export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springs.snappy,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: durations.fast },
  },
};
