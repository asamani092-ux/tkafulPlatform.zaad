interface DonutChartProps {
  total: number;
  segments: Array<{ value: number; color: string; label: string }>;
  size?: number;
  strokeWidth?: number;
}

export default function DonutChart({ total, segments, size = 188, strokeWidth = 18 }: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate segment paths
  let currentOffset = 0;
  const segmentPaths = segments.map((segment) => {
    const percentage = segment.value / total;
    const segmentLength = circumference * percentage;
    const strokeDasharray = `${segmentLength} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    
    currentOffset += segmentLength;
    
    return {
      ...segment,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div dir="rtl" className="w-full">
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-5">
        <div className="relative mx-auto flex flex-1 items-center justify-center md:mx-0">
          <svg
            width={size}
            height={size}
            className="transform -rotate-90"
            role="img"
            aria-label="احصائية المتطوعين"
          >
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f1e7e4"
              strokeWidth={strokeWidth}
            />
            
            {/* Segment circles */}
            {segmentPaths.map((segment, index) => (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={segment.strokeDasharray}
                strokeDashoffset={segment.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            ))}
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-[#6B1F2B]">
                {total}
              </div>
              <div className="text-xs text-[#8b6f66]">
                متطوع
              </div>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="w-full space-y-2 md:w-56 md:flex-none">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center justify-between rounded-lg border border-[#efe2dd] bg-[#fffaf8] px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-[#5f4640]">{segment.label}</span>
              </div>
              <span className="font-semibold text-[#6B1F2B]">
                {Math.round((segment.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
