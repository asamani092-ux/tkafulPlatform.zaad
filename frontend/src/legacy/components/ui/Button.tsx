import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'outlineGold' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  href?: string;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  href,
  ...props
}: ButtonProps) {
  const baseClasses =
    'group relative inline-flex items-center justify-center font-medium transition-all duration-200 ease-out focus-visible:ring-2 ring-brand-600 ring-offset-2 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden';

  const variantClasses = {
    primary:
      'bg-brand-600 hover:bg-brand-700 text-white rounded-lg active:scale-95',
    outline:
      'border border-brand-600 text-brand-600 hover:bg-brand-50 hover:border-brand-700 hover:text-brand-700 rounded-lg',
    outlineGold:
      'rounded-full border-2 border-[#DFC775] text-[#DFC775] bg-white hover:bg-[#FFF5D6] font-semibold active:scale-95',
    ghost:
      'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg',
  };

  const sizeClasses = {
    sm: 'px-5 py-2 text-sm',
    md: 'px-7 py-2.5 text-sm',
    lg: 'px-9 py-3 text-base',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  const content = (
    <div className="relative flex items-center justify-center">
      {/* النص - يتحرك يمين وقت الهوفر */}
      <span
        className="
          relative z-10 transition-transform duration-300
          group-hover:translate-x-1.5
        "
      >
        {children}
      </span>

      {/* السهم - نفس السابق */}
      <ArrowLeft
        className="
          absolute left-[-1.5rem] w-4 h-4 opacity-0
          transition-all duration-300 ease-out
          group-hover:opacity-100 group-hover:translate-x-2
        "
      />
    </div>
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {content}
    </button>
  );
}
