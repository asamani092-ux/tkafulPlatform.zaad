interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

export default function ProgressBar({ current, total, className = '' }: ProgressBarProps) {
  const safeTotal = Math.max(1, total || 1);
  const pct = Math.min(100, Math.max(0, Math.round((current / safeTotal) * 100)));

  return (
    <div className={`w-full ${className}`} dir="rtl">
      {/* البادجات */}
     <div className="mb-2 flex items-center justify-between text-[12px]">
        <span className="inline-flex items-center gap-1 font-medium text-gray-800">
          <span className="text-[#711F2C] font-bold">{current}</span>
          <span>المتطوعون الحاليون</span>
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-gray-800">
          <span>المطلوب</span>
          <span className="text-[#711F2C] font-bold">{safeTotal}</span>
        </span>
      </div>

      {/* الشريط */}
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={current}
        className="relative"
      >
        {/* المسار */}
        <div className="h-3.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
          {/* الامتلاء */}
          <div
            className="h-full rounded-full transition-[width] duration-600 ease-out will-change-[width]"
            style={{
              width: `${pct}%`,
              background:
                // تدرّج لطيف + خطوط شفافة خفيفة
                'linear-gradient(90deg,#9a2d3d 0%,#711F2C 60%,#5a1823 100%), repeating-linear-gradient(45deg, rgba(255,255,255,.12) 0 6px, rgba(255,255,255,0) 6px 12px)',
              backgroundBlendMode: 'overlay',
            }}
          />
        </div>

        {/* النسبة المئوية */}
        <div className="absolute inset-0 -translate-y-[150%] flex items-center justify-center">
          <span className="rounded-full bg-white/85 px-2 py-0.5 text-[12px] font-medium text-slate-700 shadow-sm">
            {pct}% مكتمل
          </span>
        </div>
      </div>
    </div>
  );
}
