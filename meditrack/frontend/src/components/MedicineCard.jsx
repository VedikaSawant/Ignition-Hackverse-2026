import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, Pill, AlertCircle, Info, ChevronRight } from "lucide-react";

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
    <motion.div layout className="mb-6">
      <div
        className={`medico-card transition-all duration-300 ${
          isDone ? "bg-slate-50/50" : "bg-white"
        } ${justTaken ? "ring-2 ring-success/20" : ""}`}
      >
        <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-10">
          {/* Left: Info */}
          <div className="flex items-center gap-8">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                isTaken
                  ? "bg-success/10 text-success"
                  : isSkipped
                  ? "bg-danger/10 text-danger"
                  : "bg-primary/5 text-primary"
              }`}
            >
              {isTaken ? <Check size={28} strokeWidth={2.5} /> : isSkipped ? <X size={28} strokeWidth={2.5} /> : <Pill size={28} />}
            </div>
            
            <div className="space-y-1.5">
              <h4 className={`text-xl font-bold tracking-tight ${isDone ? 'text-slate-400' : 'text-slate-900'}`}>
                {dose.medicine_name}
              </h4>
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                  <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {dose.dosage || dose.medicine_dosage}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="truncate max-w-[200px]">{dose.instructions || 'Standard Protocol'}</span>
              </div>
            </div>
          </div>

          {/* Right: Actions/Status */}
          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm ${isDone ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
              <Clock size={16} className={isDone ? 'text-slate-300' : 'text-primary'} />
              <span>{displayTime}</span>
            </div>

            <div className="flex items-center gap-4">
              {!isDone && !justTaken ? (
                <>
                  <button
                    onClick={() => setShowSkipMenu(!showSkipMenu)}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleTaken}
                    disabled={isLoading}
                    className="btn-medico btn-medico-primary px-8 py-3.5 shadow-lg shadow-primary/10 min-w-[140px]"
                  >
                    {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                      <>Log Dose <ChevronRight size={16} /></>
                    )}
                  </button>
                </>
              ) : isTaken ? (
                <div className="flex items-center gap-2.5 px-6 py-3 bg-green-50 text-green-600 rounded-xl font-bold text-sm animate-in fade-in zoom-in duration-300">
                    <Check size={18} strokeWidth={3} />
                    Verified Taken
                </div>
              ) : (
                <div className="flex items-center gap-2.5 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm">
                    <AlertCircle size={18} strokeWidth={3} />
                    Marked Skipped
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Skip Menu Overlay/Drawer */}
        <AnimatePresence>
          {showSkipMenu && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-50"
            >
              <div className="p-8 bg-slate-50 flex flex-col gap-6">
                 <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dose Anomaly Attribution</p>
                    <p className="text-sm font-medium text-slate-500">Why are you skipping this medication today?</p>
                 </div>
                 <div className="flex flex-wrap gap-3">
                    {SKIP_REASONS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => handleSkip(r.value)}
                        disabled={isLoading}
                        className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:border-primary hover:text-primary transition-all disabled:opacity-50"
                      >
                        {r.label}
                      </button>
                    ))}
                    <button 
                      onClick={() => setShowSkipMenu(false)}
                      className="px-6 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors"
                    >
                      Cancel
                    </button>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
