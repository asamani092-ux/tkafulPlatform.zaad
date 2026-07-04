import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function Chip({ children, selected = false, onClick, className = '' }: ChipProps) {
  const baseClasses = 'inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ease-out cursor-pointer select-none focus-visible:ring-2 ring-brand-600 ring-offset-2';
  
  const variantClasses = selected
    ? 'bg-brand-600 text-white shadow-md'
    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300';
  
  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {children}
    </button>
  );
}
