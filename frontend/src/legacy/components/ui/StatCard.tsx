import type { ReactNode } from 'react';
import { useCountUp } from '../../hooks/useCountUp';

interface StatCardProps {
  icon: ReactNode;
  value: number;
  label: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function StatCard({ icon, value, label, className = '', style }: StatCardProps) {
  const { count, ref } = useCountUp({ to: value });

  return (
    <div 
      ref={ref}
      className={`rounded-2xl bg-white border border-gray-200 p-6 shadow-soft ${className}`}
      style={style}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-3xl font-extrabold text-gray-900">
            {count}
          </div>
          <div className="mt-1 text-gray-600 text-sm">
            {label}
          </div>
        </div>
        
        <div className="h-10 w-10 rounded-full bg-brand-50 grid place-items-center text-brand-600 flex-shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}
