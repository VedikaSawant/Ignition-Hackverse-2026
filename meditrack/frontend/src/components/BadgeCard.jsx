import { motion } from 'framer-motion';
import { Trophy, Lock, CheckCircle2, Award } from 'lucide-react';

export default function BadgeCard({ badge }) {
  const isEarned = badge.earned;

  return (
    <motion.div 
      whileHover={isEarned ? { y: -10, scale: 1.05 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`medico-card p-10 text-center transition-all flex flex-col items-center justify-center h-full relative overflow-hidden group shadow-xl ${
        isEarned 
            ? 'bg-white border border-slate-50 cursor-pointer hover:shadow-2xl' 
            : 'bg-slate-50/50 grayscale opacity-40 border-dashed border-2 border-slate-200'
      }`}
    >
      {/* Decorative background element */}
      {isEarned && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10 group-hover:bg-primary/10 transition-all duration-500" />
      )}

      <div className="relative mb-8">
        <div className={`text-7xl transition-all duration-500 ${isEarned ? 'scale-110 group-hover:rotate-6 drop-shadow-xl' : 'opacity-20 scale-90'}`}>
          {badge.badge_icon || '🏅'}
        </div>
        {isEarned && (
            <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-success text-white rounded-full flex items-center justify-center border-4 border-white shadow-xl">
                <CheckCircle2 size={14} strokeWidth={4} />
            </div>
        )}
        {!isEarned && (
            <div className="absolute -top-3 -right-3 w-7 h-7 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                <Lock size={12} strokeWidth={3} />
            </div>
        )}
      </div>

      <div className="space-y-4 flex-1 flex flex-col">
        <h4 className="text-base font-bold text-slate-900 tracking-tight leading-tight">{badge.badge_name}</h4>
        <p className="text-[11px] font-medium text-slate-400 leading-relaxed max-w-[160px] mx-auto italic">{badge.description}</p>
      </div>
      
      {isEarned ? (
        <div className="mt-8 px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10 transition-all group-hover:bg-primary group-hover:text-white group-hover:border-primary">
            <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] group-hover:text-white">
                Earned {new Date(badge.earned_at).toLocaleDateString()}
            </p>
        </div>
      ) : (
        <div className="mt-8">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] opacity-60">Requirement Pending</p>
        </div>
      )}
    </motion.div>
  );
}
