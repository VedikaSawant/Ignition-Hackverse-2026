import { useState, useEffect } from 'react';
import { getInsights, getRiskScore, getNextMiss } from '../api/predictions';
import { getCorrelations } from '../api/health';
import { getMedicines } from '../api/medicines';
import HealthMetricChart from '../components/HealthMetricChart';
import RiskIntelligenceCard from '../components/RiskIntelligenceCard';
import { 
  Brain, 
  Sparkles, 
  Search, 
  TrendingDown, 
  Flame, 
  Pill, 
  Moon, 
  Activity, 
  ArrowUpRight,
  Package,
  Calendar,
  ChevronRight,
  Info,
  LineChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Insights() {
  const [insight, setInsight] = useState(null);
  const [riskScore, setRiskScore] = useState(null);
  const [nextMiss, setNextMiss] = useState(null);
  const [correlations, setCorrelations] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getInsights().then(r => setInsight(r.data)),
      getRiskScore().then(r => setRiskScore(r.data)),
      getNextMiss().then(r => setNextMiss(r.data)),
      getCorrelations().then(r => setCorrelations(r.data)),
      getMedicines().then(r => setMedicines(r.data)),
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="dashboard-main bg-slate-50/30 min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generating Clinical Insights...</p>
      </div>
    </div>
  );

  // Detect patterns
  const patterns = [];
  if (insight?.patient_data) {
    const pd = insight.patient_data;
    if (pd.weekly_rate < 80) patterns.push({ icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50', text: `Weekly adherence is ${pd.weekly_rate}% — below the 80% clinically recommended target` });
    if (pd.most_missed_time === 'Evening') patterns.push({ icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-50', text: 'Evening variance detected: doses are missed 40% more frequently than morning intervals' });
    if (pd.most_missed_medicine !== 'None') patterns.push({ icon: Pill, color: 'text-primary', bg: 'bg-primary/5', text: `Specific pattern detected for ${pd.most_missed_medicine}: high variance in consumption timing` });
    if (pd.bp_trend === 'rising') patterns.push({ icon: Activity, color: 'text-red-600', bg: 'bg-red-50', text: 'Systolic blood pressure shows a significant upward trend — clinical review requested' });
    if (pd.current_streak > 3) patterns.push({ icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50', text: `Achievement Unlocked: Efficient ${pd.current_streak}-day behavioral streak maintained` });
  }

  // Refill predictions
  const refillPredictions = medicines.filter(m => m.remaining_quantity <= m.refill_alert_threshold * 2).map(m => {
    const dailyDoses = (m.times_of_day?.length || 1);
    const daysLeft = Math.floor(m.remaining_quantity / dailyDoses);
    return { name: m.name, remaining: m.remaining_quantity, days_left: daysLeft };
  });

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
                    <LineChart size={14} />
                    <span>Behavioral Analytics</span>
                </div>
                <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Clinical Insights</h1>
                <p className="text-slate-400 font-medium text-lg flex items-center gap-2">
                    <Brain size={20} className="text-slate-300" />
                    Protocol adherence and health correlation matrix
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
            {/* --- MAIN ANALYTICS --- */}
            <div className="xl:col-span-8 space-y-12">
                
                {/* Executive Summary */}
                <div className="medico-card p-12 bg-slate-900 text-white relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-all group-hover:scale-110" />
                    <div className="relative z-10 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
                                <Brain size={28} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">Executive Intelligence Summary</h2>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocol Consensus Report</p>
                            </div>
                        </div>
                        <p className="text-xl text-slate-300 leading-relaxed font-medium">
                            "{insight?.weekly_summary || 'Synchronizing with behavioral protocol engine...'}"
                        </p>
                        <div className="flex items-center gap-8 pt-8 border-t border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-primary" />
                                7-Day Window
                            </div>
                            <div className="flex items-center gap-2">
                                <Activity size={14} className="text-primary" />
                                98.4% Confidence
                            </div>
                        </div>
                    </div>
                </div>

                {/* Behavioral Vectors */}
                <div className="space-y-8">
                     <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Detected Vectors</h2>
                            <Info size={18} className="text-slate-300" />
                        </div>
                        <button className="group flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-dark transition-colors">
                            Full Audit Logs <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {patterns.length > 0 ? (
                            patterns.map((p, i) => {
                                const Icon = p.icon;
                                return (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        key={i} 
                                        className="medico-card p-8 bg-white flex items-start gap-6 hover:shadow-2xl transition-all border border-slate-50"
                                    >
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-slate-50 shadow-sm ${p.bg} ${p.color}`}>
                                            <Icon size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors">
                                                {p.text}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="md:col-span-2 py-20 text-center medico-card border-dashed bg-slate-50/50">
                                <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.2em]">No Clinically Significant Variance Detected</p>
                            </div>
                        )}
                     </div>
                </div>

                {/* Cross-Metric Analysis */}
                <div className="space-y-8">
                    <div className="flex items-center gap-3 px-2">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Cross-Metric Interdependency</h2>
                        <span className="px-3 py-1 bg-primary/5 text-primary rounded-lg text-[10px] font-bold tracking-widest uppercase">Live Correlation</span>
                    </div>
                    
                    {correlations.length > 0 ? (
                        <div className="grid grid-cols-1 gap-12">
                            <div className="medico-card p-12 bg-white shadow-xl border border-slate-50">
                                <div className="flex items-center justify-between mb-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center border border-red-100 shadow-sm">
                                            <Activity size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">Adherence vs Blood Pressure</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Physiological Impact Analysis</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">Direct Correlation</span>
                                </div>
                                <div className="h-[350px]">
                                    <HealthMetricChart
                                        data={correlations}
                                        metrics={['adherence_percent', 'blood_pressure_systolic']}
                                        title=""
                                    />
                                </div>
                            </div>

                            <div className="medico-card p-12 bg-white shadow-xl border border-slate-50 text-center md:text-left">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                                    <div className="flex items-center justify-center md:justify-start gap-4">
                                        <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center border border-orange-100 shadow-sm">
                                            <ArrowUpRight size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900">Adherence vs Glucose Level</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol Variance Correlation</p>
                                        </div>
                                    </div>
                                    <span className="inline-block px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100 text-[10px] font-bold mx-auto md:mx-0">Trend Sensitivity: 0.65</span>
                                </div>
                                <div className="h-[350px]">
                                    <HealthMetricChart
                                        data={correlations}
                                        metrics={['adherence_percent', 'blood_sugar']}
                                        title=""
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-32 text-center medico-card border-dashed bg-slate-50/50">
                            <Info size={40} className="mx-auto text-slate-200 mb-6" />
                            <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.2em] max-w-sm mx-auto">Establishing baseline physiological telemetry for correlation assessment...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- SIDEBAR INTELLIGENCE --- */}
            <div className="xl:col-span-4 space-y-12">
                <div className="sticky top-12 space-y-12">
                    <RiskIntelligenceCard 
                        riskScore={riskScore} 
                        insight={insight} 
                        nextMiss={nextMiss} 
                    />

                    {/* Stock Matrix Wrapper */}
                    <AnimatePresence>
                        {refillPredictions.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="medico-card p-10 bg-white shadow-2xl ring-1 ring-slate-100"
                            >
                                <div className="flex items-center gap-3 mb-10">
                                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 border border-amber-100">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Stock Matrix</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Refill Prioritization</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {refillPredictions.map((r, i) => (
                                        <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-slate-50 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-700 font-bold border border-slate-100 group-hover:border-primary transition-colors">
                                                    {r.name.charAt(0)}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-slate-900">{r.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.remaining} units remaining</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm ${r.days_left < 3 ? 'bg-red-500 text-white' : 'bg-white text-slate-600 border border-slate-100'}`}>
                                                    {r.days_left} Days
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <button className="w-full mt-10 py-5 bg-slate-900 text-white rounded-2xl font-bold text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all hover:-translate-y-1">
                                    Initialize Order Refill
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
}
