import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function AdherenceRing({ percent=0, size = 150, strokeWidth = 12, label = "Today" }) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    setAnimatedPercent(percent);
  }, [percent]);

  const getColor = () => {
    if (percent >= 80) return "#10B981"; // Success (Emerald)
    if (percent >= 50) return "#F59E0B"; // Warning (Amber)
    return "#EF4444"; // Danger (Red)
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
          {/* Animated progress circle */}
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
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
                <motion.span 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-bold text-slate-900 leading-none tracking-tight block"
                >
                    {Math.round(animatedPercent)}%
                </motion.span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Protocols</span>
            </div>
        </div>
      </div>
      <div className="px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{label} Rate</span>
      </div>
    </div>
  );
}
