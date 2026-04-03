import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock } from "lucide-react";

const SKIP_REASONS = [
  { value: 'forgot', label: 'Forgot' },
  { value: 'travelling', label: 'Travelling' },
  { value: 'side_effects', label: 'Side Effects' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'other', label: 'Other' },
];

export default function MedicineCard({ dose, onMarkTaken, onSkip }) {
  const [showSkipMenu, setShowSkipMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [justTaken, setJustTaken] = useState(false);

  const isTaken = dose.status === "taken";
  const isSkipped = dose.status === "skipped";
  const isDone = isTaken || isSkipped;

  const timeStr = dose.scheduled_time?.split(' ')[1] || dose.scheduled_time || '00:00';
  const hourMatch = timeStr.match(/^(\d+)/);
  let displayTime = dose.scheduled_time;
  if(hourMatch && !timeStr.toLowerCase().includes('m')) {
      const hour = parseInt(hourMatch[1]);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      displayTime = `${displayHour}:${timeStr.split(':')[1] || '00'} ${period}`;
  }


  const handleTaken = async () => {
    setIsLoading(true);
    await onMarkTaken(dose);
    setIsLoading(false);
    setJustTaken(true);
    setTimeout(() => setJustTaken(false), 2000);
  };

  const handleSkip = async (reason) => {
    setIsLoading(true);
    await onSkip(dose, reason);
    setIsLoading(false);
    setShowSkipMenu(false);
  };

  return (
    <motion.div layout className="mb-4">
      <div
        className={`pro-card p-5 flex items-center justify-between gap-4 transition-all duration-300 ${
          isDone ? "opacity-50 scale-[0.99]" : "hover:scale-[1.005]"
        } ${justTaken ? "ring-2 ring-success/30 bg-success/5" : ""}`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 transition-all duration-300 ${
              isTaken
                ? "bg-success/15 text-success ring-2 ring-success/20"
                : isSkipped
                ? "bg-danger/15 text-danger ring-2 ring-danger/20"
                : "bg-primary/10 text-primary"
            }`}
          >
            {isTaken ? <Check className="w-5 h-5" strokeWidth={3} /> : isSkipped ? <X className="w-5 h-5" strokeWidth={3} /> : "💊"}
          </div>
          <div>
            <h4 className="font-bold text-foreground text-sm tracking-tight">{dose.medicine_name}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">{dose.dosage || dose.medicine_dosage}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/70 px-3.5 py-2 rounded-xl">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-semibold">{displayTime}</span>
          </div>
          {!isDone && !justTaken && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowSkipMenu(!showSkipMenu)}
                className="bg-muted text-muted-foreground px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-border/80 transition-all duration-200"
              >
                Skip...
              </button>
              <button
                onClick={handleTaken}
                disabled={isLoading}
                className="bg-success text-success-foreground px-5 py-2.5 rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-success/20 hover:scale-105 transition-all duration-200 disabled:opacity-70 flex items-center justify-center min-w-[70px]"
              >
                {isLoading ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : "Take"}
              </button>
            </div>
          )}
          {isTaken && !justTaken && (
            <span className="text-xs font-bold text-success bg-success/10 px-4 py-2 rounded-xl ring-1 ring-success/20">
              ✓ Taken
            </span>
          )}
          {isSkipped && (
            <span className="text-xs font-bold text-danger bg-danger/10 px-4 py-2 rounded-xl ring-1 ring-danger/20">
              Skipped
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSkipMenu && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-4 bg-muted/30 rounded-2xl border border-border/50 grid grid-cols-2 sm:grid-cols-5 gap-3">
               {SKIP_REASONS.map((r) => (
                 <button
                   key={r.value}
                   onClick={() => handleSkip(r.value)}
                   disabled={isLoading}
                   className="px-3 py-2.5 rounded-xl border border-border/60 bg-background text-[10px] font-bold text-foreground hover:border-primary hover:text-primary transition-all uppercase tracking-wide disabled:opacity-50"
                 >
                   {r.label}
                 </button>
               ))}
               <button 
                onClick={() => setShowSkipMenu(false)}
                className="px-3 py-2.5 rounded-xl bg-muted/50 text-[10px] font-bold text-muted-foreground hover:bg-muted"
               >
                 CANCEL
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
