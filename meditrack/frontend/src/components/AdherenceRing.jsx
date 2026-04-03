import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function AdherenceRing({ percent=0, size = 120, strokeWidth = 10, label = "Today" }) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // We actually animate the dash offset directly via framer-motion so we don't need JS interpolation for offset

  useEffect(() => {
    setAnimatedPercent(percent);
  }, [percent]);

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
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - (animatedPercent / 100) * circumference }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-foreground leading-none">{Math.round(animatedPercent)}%</span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">{label}</span>
    </div>
  );
}
