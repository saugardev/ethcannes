'use client';

import { ReactNode } from 'react';

interface BlackButtonProps {
  onClick: () => void;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export default function BlackButton({ 
  onClick, 
  icon, 
  children, 
  className = '', 
  disabled = false 
}: BlackButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-black text-white 
        rounded-full 
        px-6 py-3 
        flex items-center justify-center gap-2 
        font-medium 
        transition-all duration-200 
        hover:bg-gray-800 
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span>{children}</span>
    </button>
  );
} 