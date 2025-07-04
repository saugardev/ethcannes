'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';

interface TransitionContextType {
  direction: 'forward' | 'back';
  setDirection: (direction: 'forward' | 'back') => void;
  navigate: (url: string) => void;
  navigateInstant: (url: string) => void;
  goBack: () => void;
}

const TransitionContext = createContext<TransitionContextType | undefined>(undefined);

export function useTransition() {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error('useTransition must be used within a TransitionProvider');
  }
  return context;
}

interface TransitionProviderProps {
  children: ReactNode;
}

export default function TransitionProvider({ children }: TransitionProviderProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionKey, setTransitionKey] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const pendingNavigation = useRef<string | 'back' | null>(null);
  const currentDirection = useRef<'forward' | 'back'>('forward');
  const isInitialLoad = useRef(true);

  // Skip animation on initial load
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
    }
  }, []);

  // Handle navigation with proper timing
  const navigate = (url: string) => {
    if (isTransitioning) return;
    
    currentDirection.current = 'forward';
    setIsTransitioning(true);
    pendingNavigation.current = url;
    
    // Change the key to trigger exit animation
    setTransitionKey(prev => prev + 1);
  };

  const navigateInstant = (url: string) => {
    if (isTransitioning) return;
    
    router.push(url);
  };

  const goBack = () => {
    if (isTransitioning) return;
    
    currentDirection.current = 'back';
    setIsTransitioning(true);
    pendingNavigation.current = 'back';
    
    // Change the key to trigger exit animation
    setTransitionKey(prev => prev + 1);
  };

  // Handle the actual navigation after exit animation
  const handleExitComplete = () => {
    if (pendingNavigation.current) {
      if (pendingNavigation.current === 'back') {
        router.back();
      } else {
        router.push(pendingNavigation.current);
      }
      pendingNavigation.current = null;
    }
  };

  // Reset transition state when pathname changes (after navigation)
  useEffect(() => {
    if (isTransitioning && !pendingNavigation.current) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 350);
      
      return () => clearTimeout(timer);
    }
  }, [pathname, isTransitioning]);

  // Animation variants
  const slideVariants = {
    // Forward: parent → child (exit right, enter from right)
    forwardInitial: { x: '100%' },
    forwardAnimate: { x: 0 },
    forwardExit: { x: '100%' },
    
    // Back: child → parent (exit left, enter from left)
    backInitial: { x: '-100%' },
    backAnimate: { x: 0 },
    backExit: { x: '-100%' },
  };

  const transition = {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1] as const,
  };

  return (
    <TransitionContext.Provider value={{ 
      direction: currentDirection.current, 
      setDirection: () => {}, // Not used anymore
      navigate, 
      navigateInstant,
      goBack 
    }}>
      <div className="relative overflow-hidden min-h-screen">
        <AnimatePresence 
          initial={false}
          onExitComplete={handleExitComplete}
          mode="wait"
        >
          <motion.div
            key={transitionKey}
            initial={isInitialLoad.current ? false : (
              currentDirection.current === 'forward' ? slideVariants.forwardInitial : slideVariants.backInitial
            )}
            animate={currentDirection.current === 'forward' ? slideVariants.forwardAnimate : slideVariants.backAnimate}
            exit={currentDirection.current === 'forward' ? slideVariants.forwardExit : slideVariants.backExit}
            transition={transition}
            className="w-full h-full fixed inset-0 bg-base-100"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </TransitionContext.Provider>
  );
} 