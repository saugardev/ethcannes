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
    <div className={`w-full min-h-screen relative bg-background ${className}`}>
      <Header 
        title={title}
        showBackButton={showBackButton}
        onBackClick={onBackClick}
        onOptionsClick={onOptionsClick}
      />
      <main className="relative h-screen">
        <div className="relative z-10 h-full overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
} 