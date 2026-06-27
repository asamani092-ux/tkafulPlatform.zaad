import type { ReactNode } from 'react';

interface TagProps {
  children: ReactNode;
  className?: string;
}

export default function Tag({ children, className = '' }: TagProps) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-gray-700 border border-gray-200 ${className}`}>
      {children}
    </span>
  );
}
