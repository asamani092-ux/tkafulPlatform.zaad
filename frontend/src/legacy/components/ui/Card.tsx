import type { ReactNode, CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** فعّل/عطّل تأثير اللمعة عند المرور */
  shine?: boolean;
}

export default function Card({
  children,
  className = '',
  style,
  shine = true,
}: CardProps) {
  const baseClasses =
    // ثابت: بدون hover translate/scale
    'relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-soft';

  const shineClasses = shine
    ? [
      // عنصر اللمعة قبل المحتوى
      'before:content-[""] before:absolute before:inset-y-0 before:left-[-30%]',
      // شريط اللمعة بعرض ~30% مع ميلان بسيط
      'before:w-[30%] before:skew-x-12',
      // تدرّج شفاف→أبيض→شفاف
      'before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent',
      // انتقال ناعم عند المرور
      'before:opacity-0 hover:before:opacity-100 before:transition-all before:duration-700',
      // حركة الشريط من اليسار إلى خارج اليمين
      'hover:before:left-[130%]',
      // لا تلتقط المؤشر
      'before:pointer-events-none',
    ].join(' ')
    : '';

  return (
    <div className={`${baseClasses} ${shineClasses} ${className}`} style={style}>
      {children}
    </div>
  );
}
