'use client';

import { useTransition } from './transition-provider';

export function useViewTransitionRouter() {
  const { navigate, navigateInstant, goBack } = useTransition();

  const navigateWithTransition = (url: string) => {
    navigate(url);
  };

  const navigateWithoutTransition = (url: string) => {
    navigateInstant(url);
  };

  const goBackWithTransition = () => {
    goBack();
  };

  return { 
    navigateWithTransition, 
    navigateWithoutTransition,
    goBack: goBackWithTransition 
  };
} 