'use client';

import { ChevronLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  showCloseButton?: boolean;
  onCloseClick?: () => void;
  onOptionsClick?: (option: number) => void;
}

export default function Header({ 
  title, 
  showBackButton = false, 
  onBackClick,
  showCloseButton = false,
  onCloseClick,
}: HeaderProps) {
  return (
    <div className="navbar sticky top-0 z-50 px-4 lg:px-6">
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
        {showCloseButton && (
          <button 
            onClick={onCloseClick}
            className="btn btn-ghost btn-circle btn-sm hover:bg-base-200"
            aria-label="Close"
          > 
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
} 