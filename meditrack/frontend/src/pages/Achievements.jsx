import { useState, useEffect } from 'react';
import { getAllBadges, getPoints, checkAchievements } from '../api/achievements';
import BadgeCard from '../components/BadgeCard';
import { 
  Trophy, 
  Star, 
  ChevronRight, 
  Info, 
  Award, 
  TrendingUp, 
  Zap,
  Medal,
  Target,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Achievements() {
  const [badges, setBadges] = useState([]);
  const [points, setPoints] = useState({ points: 0, level: 'Beginner 🌱' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      checkAchievements(),
      getAllBadges().then(r => setBadges(r.data)),
      getPoints().then(r => setPoints(r.data)),
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  const earned = badges.filter(b => b.earned);
  const locked = badges.filter(b => !b.earned);

  if (loading) return (
    <div className="dashboard-main bg-slate-50/30 min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compiling Clinical Milestones...</p>
      </div>
    </div>
  );

  return (
    <div className="dashboard-main bg-slate-50/30 min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[1600px] mx-auto px-4 lg:px-0"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16 px-1">
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-[0.2em] bg-primary/5 px-3 py-1 rounded-lg border border-primary/10 w-fit">
                    <Trophy size={14} />
                    <span>Protocol Milestone Tracker</span>
                </div>
                <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Achievements</h1>
                <p className="text-slate-400 font-medium text-lg flex items-center gap-2">
                    <Medal size={20} className="text-slate-300" />
                    Validating behavioral adherence and protocol excellence
                </p>
            </div>
        </div>

        {/* --- POINTS & PROGRESS --- */}
        <div className="medico-card p-12 mb-16 bg-white shadow-2xl relative overflow-hidden group border border-slate-50">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 group-hover:bg-primary/10 transition-all duration-700" />
          
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-16">
              <div className="flex items-center gap-10">
                  <div className="w-28 h-28 bg-slate-900 rounded-[40px] flex items-center justify-center shadow-2xl shadow-slate-200 relative group-hover:scale-105 transition-transform duration-500">
                      <Zap size={48} className="text-primary group-hover:animate-pulse" />
                      <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="space-y-3">
                      <div className="flex items-baseline gap-3">
                          <span className="text-7xl font-bold text-slate-900 tracking-tighter">{points.points}</span>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">Total Points</span>
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="px-5 py-2 bg-slate-100 text-slate-900 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] border border-slate-200">
                              Rank: {points.level.split(' ')[0]}
                          </div>
                          <span className="text-3xl filter drop-shadow-sm">{points.level.split(' ')[1] || '🚀'}</span>
                      </div>
                  </div>
              </div>

              <div className="flex-1 max-w-2xl bg-slate-50/50 p-10 rounded-[32px] border border-slate-100 shadow-inner">
                  <div className="flex justify-between items-end mb-6 px-1">
                      <div>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-2">Protocol Progression</p>
                          <h3 className="text-lg font-bold text-slate-800">Next Rank Tier: <span className="text-primary">Clinical Champion</span></h3>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">{Math.round((points.points / 5000) * 100)}<span className="text-sm text-slate-400 ml-1">%</span></p>
                      </div>
                  </div>
                  <div className="w-full h-5 bg-white rounded-full overflow-hidden border border-slate-100 p-1">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((points.points / 5000) * 100, 100)}%` }}
                        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full bg-slate-900 shadow-xl rounded-full relative overflow-hidden" 
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent animate-shimmer" />
                      </motion.div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-6 px-1">
                      <span>Initiate</span>
                      <span>Advanced</span>
                      <span>Sovereign</span>
                      <span>Elite Tier</span>
                  </div>
              </div>
          </div>
        </div>

        {/* --- EARNED BADGES --- */}
        <div className="mb-20">
            <div className="flex items-center justify-between mb-10 px-2">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-success/5 text-success rounded-2xl flex items-center justify-center border border-success/10 shadow-sm">
                        <Award size={28} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Validated Achievements</h2>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Protocol accomplishments across all biometric sectors</p>
                    </div>
                </div>
                <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-bold text-slate-900 tabular-nums">{earned.length}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Verified</span>
                </div>
            </div>
            
            {earned.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                    {earned.map((b, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <BadgeCard badge={b} />
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="medico-card py-32 text-center border-dashed bg-slate-50/50">
                    <Medal size={64} className="mx-auto text-slate-200 mb-6" />
                    <h3 className="text-xl font-bold text-slate-400 uppercase tracking-[0.2em]">No Verified Artifacts Found</h3>
                    <p className="text-slate-400 mt-4 italic max-w-sm mx-auto">Maintain high adherence protocols to synchronize milestone artifacts.</p>
                </div>
            )}
        </div>

        {/* --- LOCKED BADGES --- */}
        <div className="pb-20">
            <div className="flex items-center gap-4 mb-10 px-2">
                <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm">
                    <Target size={28} />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Upcoming Milestones</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Projected behavioral trajectories and unlocking vectors</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                {locked.map((b, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + (i * 0.1) }}
                    >
                        <BadgeCard badge={b} />
                    </motion.div>
                ))}
            </div>
        </div>
      </motion.div>
    </div>
  );
}
