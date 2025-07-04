'use client';

import { ChevronLeftIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  onOptionsClick?: (option: number) => void;
}

export default function Header({ 
  title, 
  showBackButton = false, 
  onBackClick,
  onOptionsClick 
}: HeaderProps) {
  return (
    <div className="navbar bg-base-100/95 backdrop-blur-sm border-b border-base-300 sticky top-0 z-50 shadow-sm px-4 lg:px-6">
      <div className="navbar-start">
        {showBackButton && (
          <button 
            onClick={onBackClick}
            className="btn btn-ghost btn-circle btn-sm hover:bg-base-200"
            aria-label="Go back"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="navbar-center">
        <h1 className="text-lg lg:text-xl font-bold text-base-content tracking-tight">{title}</h1>
      </div>
      
      <div className="navbar-end">
        {!showBackButton && (
          <div className="flex items-center gap-1 lg:gap-2">
            <div className="avatar-group -space-x-1 lg:-space-x-2">
              <button 
                onClick={() => onOptionsClick?.(1)}
                className="avatar btn btn-circle btn-sm bg-primary/20 hover:bg-primary/30 border-2 border-base-100"
                aria-label="Settings"
              >
                <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-gradient-to-br from-primary to-primary-focus"></div>
              </button>
              <button 
                onClick={() => onOptionsClick?.(2)}
                className="avatar btn btn-circle btn-sm bg-secondary/20 hover:bg-secondary/30 border-2 border-base-100"
                aria-label="Profile"
              >
                <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-gradient-to-br from-secondary to-secondary-focus"></div>
              </button>
              <button 
                onClick={() => onOptionsClick?.(3)}
                className="avatar btn btn-circle btn-sm bg-accent/20 hover:bg-accent/30 border-2 border-base-100"
                aria-label="Help"
              >
                <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-gradient-to-br from-accent to-accent-focus"></div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 