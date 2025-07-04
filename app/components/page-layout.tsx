'use client';

import { ReactNode } from 'react';
import Header from './header';

interface PageLayoutProps {
  title: string;
  children: ReactNode;
  showBackButton?: boolean;
  onBackClick?: () => void;
  onOptionsClick?: (option: number) => void;
  className?: string;
}

export default function PageLayout({ 
  title,
  children, 
  showBackButton = false,
  onBackClick,
  onOptionsClick,
  className = ''
}: PageLayoutProps) {
  return (
    <div className={`w-full min-h-screen relative ${className}`}>
      <Header 
        title={title}
        showBackButton={showBackButton}
        onBackClick={onBackClick}
        onOptionsClick={onOptionsClick}
      />
      <main className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-base-100/50 to-base-200/30 pointer-events-none"></div>
        <div className="relative z-10 pb-safe">
          {children}
        </div>
      </main>
    </div>
  );
} 