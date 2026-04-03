export default function AdherenceRing({ percent, size = 120, strokeWidth = 10, label = "Today" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const getColor = () => {
    if (percent >= 80) return "hsl(var(--success))";
    if (percent >= 50) return "hsl(var(--warning))";
    return "hsl(var(--danger))";
  };

  const getGlow = () => {
    if (percent >= 80) return "drop-shadow(0 0 6px hsl(var(--success) / 0.4))";
    if (percent >= 50) return "drop-shadow(0 0 6px hsl(var(--warning) / 0.4))";
    return "drop-shadow(0 0 6px hsl(var(--danger) / 0.4))";
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ filter: getGlow() }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            opacity={0.5}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-foreground leading-none">{percent}%</span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">{label}</span>
    </div>
  );
}
