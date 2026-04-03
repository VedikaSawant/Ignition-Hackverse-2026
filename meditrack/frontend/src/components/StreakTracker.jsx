import { Flame, Trophy, Info, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function StreakTracker({ current=0, longest=0, history=[] }) {
  return (
    <div className="medico-card bg-white">
      <div className="p-10 flex flex-col lg:flex-row items-center gap-12">
        {/* --- STREAK COUNTER --- */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-4 shrink-0 px-2">
            <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-orange-50 rounded-lg border border-orange-100">
                <Flame size={14} className="text-orange-500 fill-orange-500" />
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-[0.2em]">Live Pulse</span>
            </div>
            
            <div className="space-y-1">
                <h3 className="text-5xl font-bold text-slate-900 tracking-tighter leading-none">{current} Days</h3>
                <p className="text-sm font-medium text-slate-400">Current adherence streak</p>
            </div>
            
            <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl mt-2 transition-all hover:bg-slate-100">
                <Trophy size={16} className="text-warning" />
                <span className="text-xs font-bold text-slate-600">Personal Best: {longest}</span>
            </div>
        </div>

        {/* --- HEATMAP --- */}
        <div className="flex-1 w-full border-l border-slate-50 lg:pl-12">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <Activity size={14} className="text-primary" />
                    <span>30-Day Protocol Consistency</span>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm bg-primary/20" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Incomplete</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm bg-primary shadow-sm" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Achieved</span>
                    </div>
                </div>
            </div>
            
            <div className="flex gap-2 flex-wrap max-w-2xl">
                {history.slice(-30).map((day, i) => (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.015 }}
                    key={i}
                    title={day.date}
                    className={`w-6 h-6 rounded-md transition-all duration-300 cursor-pointer shadow-sm ${
                    day.completed || day.adherent
                        ? "bg-primary hover:scale-110 hover:shadow-md hover:shadow-primary/20"
                        : "bg-slate-100 hover:bg-slate-200"
                    }`}
                />
                ))}
                {/* Pad if history is short */}
                {history.length < 30 && Array(30 - history.length).fill(0).map((_, i) => (
                    <div key={`empty-${i}`} className="w-6 h-6 rounded-md bg-slate-50 border border-slate-100/50" />
                ))}
            </div>
            <p className="mt-6 text-[11px] font-medium text-slate-400 uppercase tracking-[0.1em] text-center lg:text-left">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
        </div>
      </div>
    </div>
  );
}
