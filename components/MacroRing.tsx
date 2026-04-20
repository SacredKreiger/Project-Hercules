interface MacroRingProps {
  label: string;
  logged: number;
  target: number;
  unit: string;
  color: string; // CSS color string
  size?: number;
  strokeWidth?: number;
  hideTarget?: boolean; // omit the /target sub-label (use when showing targets, not tracking)
}

export function MacroRing({
  label,
  logged,
  target,
  unit,
  color,
  size = 88,
  strokeWidth = 7,
  hideTarget = false,
}: MacroRingProps) {
  const r = (size - strokeWidth * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, logged / target) : 0;
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        {/* SVG rotated so arc starts from top */}
        <svg
          width={size}
          height={size}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-foreground/10"
          />
          {/* Progress arc */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-base font-bold leading-none tabular-nums">{logged}</span>
          {hideTarget
            ? <span className="text-[9px] text-muted-foreground leading-none">{unit}</span>
            : <span className="text-[9px] text-muted-foreground leading-none">/{target}{unit}</span>
          }
        </div>
      </div>

      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
