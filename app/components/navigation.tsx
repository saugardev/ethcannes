'use client';

import { useTransition } from './transition-provider';

export function useViewTransitionRouter() {
  const { navigate, goBack } = useTransition();

  const navigateWithTransition = (url: string) => {
    console.log('🚀 Navigating forward to:', url);
    navigate(url);
  };

  const goBackWithTransition = () => {
    console.log('🚀 Navigating back');
    goBack();
  };

  return { navigateWithTransition, goBack: goBackWithTransition };
} 