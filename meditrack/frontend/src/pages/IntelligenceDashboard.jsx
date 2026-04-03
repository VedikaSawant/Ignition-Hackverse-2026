import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement, Filler
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { getIntelligenceMetrics, getMLStats } from '../api/intelligence';
import { getRiskScore } from '../api/predictions';
import { 
  BrainCircuit, 
  TrendingUp, 
  ShieldAlert, 
  Zap, 
  Activity, 
  BarChart3, 
  PieChart, 
  Info,
  ChevronRight,
  Database,
  Search,
  RefreshCcw,
  Cpu
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler);

export default function IntelligenceDashboard() {
  const [metrics, setMetrics] = useState({ trends: [], behaviors: [] });
  const [mlStats, setMlStats] = useState(null);
  const [risk, setRisk] = useState({ risk_score: 0, risk_level: 'low' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getIntelligenceMetrics().then(r => setMetrics(r.data)),
      getMLStats().then(r => setMlStats(r.data)),
      getRiskScore().then(r => setRisk(r.data))
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 border-4 border-slate-100 border-t-primary rounded-full animate-spin shadow-xl" />
        </div>
        <div className="space-y-2">
            <p className="text-2xl font-bold text-slate-900 tracking-tight">Clinical Intelligence Engine</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">Synchronizing Protocol Telemetry</p>
        </div>
      </div>
    </div>
  );

  // High-End Chart Options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { family: 'Inter', size: 12, weight: '700' },
        bodyFont: { family: 'Inter', size: 12, weight: '500' },
        padding: 20,
        cornerRadius: 16,
        displayColors: false,
        caretSize: 8,
      }
    },
    scales: {
      y: { 
        grid: { color: 'rgba(241, 245, 249, 0.5)', borderDash: [5, 5] }, 
        ticks: { font: { family: 'Inter', size: 10, weight: '600' }, color: '#94A3B8', padding: 12 } 
      },
      x: { 
        grid: { display: false }, 
        ticks: { font: { family: 'Inter', size: 10, weight: '600' }, color: '#94A3B8', padding: 12 } 
      }
    }
  };

  const trendData = {
    labels: metrics.trends.map(t => t.date),
    datasets: [{
      label: 'Performance',
      data: metrics.trends.map(t => t.adherence),
      borderColor: '#0052FF',
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 82, 255, 0.08)');
        gradient.addColorStop(1, 'rgba(0, 82, 255, 0)');
        return gradient;
      },
      tension: 0.4,
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 8,
      pointHoverBackgroundColor: '#0052FF',
      pointHoverBorderColor: '#FFFFFF',
      pointHoverBorderWidth: 4,
    }]
  };

  const behaviorData = {
    labels: metrics.behaviors.map(b => b.label),
    datasets: [{
      data: metrics.behaviors.map(b => b.value),
      backgroundColor: ['#0052FF', '#6366F1', '#10B981', '#F59E0B', '#94A3B8'],
      borderWidth: 0,
      hoverOffset: 24
    }]
  };

  return (
    <div className="dashboard-main py-12 px-8 lg:px-16 bg-white font-inter">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[1600px] mx-auto"
      >
        {/* --- HEADER --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 mb-16">
            <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="px-5 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[0.3em] rounded-full shadow-lg shadow-slate-200">
                        MT-Protocol v.1.4
                    </div>
                    <div className="px-5 py-2 bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-[0.3em] rounded-full border border-primary/10">
                        Secure Analytics
                    </div>
                </div>
                <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-none mb-6">Clinical Analytics Hub</h1>
                <p className="text-slate-500 font-medium text-lg leading-relaxed opacity-80">Predictive behavioral diagnostics processed via ensemble learning to identify clinical optimizations.</p>
            </div>
            
            <div className="flex items-center gap-4 px-8 py-5 bg-white border border-slate-100 rounded-[32px] shadow-xl shadow-slate-200/50">
                <div className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">Intelligence Status</span>
                    <span className="text-sm font-bold text-slate-900 leading-none uppercase">Active Stream</span>
                </div>
            </div>
        </div>

        {/* --- CRITICAL RISK ALERT --- */}
        {risk.risk_level === 'high' && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-600 rounded-[48px] p-12 mb-16 relative overflow-hidden group shadow-2xl shadow-red-200"
            >
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12 text-center lg:text-left">
                    <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[32px] flex items-center justify-center border border-white/30 shadow-2xl ring-4 ring-white/10">
                        <ShieldAlert size={48} className="text-white" />
                    </div>
                    <div className="flex-1 space-y-4">
                        <h3 className="text-4xl font-bold text-white tracking-tight uppercase leading-none">High Variance Detected</h3>
                        <p className="text-red-50 text-xl font-medium leading-relaxed opacity-90 max-w-2xl">
                          Identified deviation in clinical protocol adherence. Immediate caregiver synchronization is recommended for intervention.
                        </p>
                    </div>
                    <button className="px-12 py-6 bg-white text-red-600 rounded-3xl font-bold text-[11px] uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-2xl shadow-red-900/20 active:scale-95 whitespace-nowrap">
                        Initiate Intervention
                    </button>
                </div>
            </motion.div>
        )}

        {/* --- MAIN ANALYTICS GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
            {/* PERFORMANCE TREND */}
            <div className="lg:col-span-8 medico-card p-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                   <div className="space-y-2">
                      <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Performance Stream</h2>
                      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        <Activity size={14} className="text-primary" />
                        <span>7-Day Protocol Accuracy</span>
                      </div>
                   </div>
                   <div className="text-right">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Latest Composite</p>
                       <p className="text-5xl font-bold text-primary tracking-tighter leading-none">{(trendData.datasets[0].data[metrics.trends.length-1] || 0).toFixed(0)}%</p>
                   </div>
                </div>
                <div className="h-[400px]">
                   <Line data={trendData} options={chartOptions} />
                </div>
            </div>

            {/* PREDICTIVE GAUGE */}
            <div className="lg:col-span-4 medico-card p-12 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-3 mb-12 px-6 py-2 bg-slate-50 rounded-full border border-slate-100">
                    <Cpu size={14} className="text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Risk Coefficient</span>
                </div>
                
                <div className="relative w-72 h-72 flex items-center justify-center">
                   <svg className="w-full h-full transform -rotate-90">
                      <circle cx="144" cy="144" r="130" fill="none" stroke="rgba(241, 245, 249, 0.8)" strokeWidth="12" />
                      <motion.circle 
                         cx="144" cy="144" r="130" 
                         fill="none" 
                         stroke={risk.risk_score > 60 ? '#EF4444' : risk.risk_score > 30 ? '#F59E0B' : '#0052FF'} 
                         strokeWidth="12" 
                         strokeDasharray="816.4" 
                         initial={{ strokeDashoffset: 816.4 }}
                         animate={{ strokeDashoffset: 816.4 - (816.4 * risk.risk_score) / 100 }}
                         transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
                         strokeLinecap="round"
                      />
                   </svg>
                   <div className="absolute flex flex-col items-center">
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-8xl font-bold text-slate-900 tracking-tighter"
                      >
                        {risk.risk_score}
                      </motion.span>
                      <div className={`mt-6 px-6 py-2.5 rounded-2xl border-2 font-bold text-xs uppercase tracking-widest ${
                         risk.risk_level === 'high' 
                            ? 'bg-red-50 text-red-600 border-red-500/10' 
                            : 'bg-emerald-50 text-emerald-600 border-emerald-500/10'
                      }`}>
                         {risk.risk_level} Risk State
                      </div>
                   </div>
                </div>
                
                <div className="mt-16 w-full p-6 bg-slate-50/50 rounded-[32px] border border-slate-100 flex items-center gap-5">
                    <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                        <Database size={18} className="text-slate-300" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 text-left leading-relaxed opacity-70">Model verification via 22+ discrete protocol data markers.</p>
                </div>
            </div>
        </div>

        {/* --- SECONDARY METRICS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* BEHAVIORAL ATTRIBUTION */}
            <div className="lg:col-span-5 medico-card p-12">
                <div className="flex items-center gap-4 mb-16">
                    <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary border border-primary/10">
                        <PieChart size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Behavioral Analytics</h2>
                </div>
                
                {metrics.behaviors.length > 0 ? (
                   <div className="h-[320px] flex items-center justify-center">
                      <Pie 
                        data={behaviorData} 
                        options={{ 
                        ...chartOptions, 
                        plugins: { 
                            ...chartOptions.plugins,
                            legend: { 
                                display: true, 
                                position: 'right', 
                                labels: { 
                                    boxWidth: 10, 
                                    boxHeight: 10,
                                    usePointStyle: true,
                                    pointStyle: 'circle',
                                    padding: 32,
                                    font: { family: 'Inter', size: 11, weight: '700' },
                                    color: '#64748B'
                                } 
                            } 
                        } 
                        }} 
                      />
                   </div>
                ) : (
                   <div className="h-[320px] flex flex-col items-center justify-center text-center space-y-6 opacity-30 grayscale">
                      <BrainCircuit size={48} className="text-slate-300" />
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">Reconciling Protocol Data...</p>
                   </div>
                )}
            </div>

            {/* FEATURE IMPORTANCE */}
            <div className="lg:col-span-7 medico-card p-12">
                <div className="flex items-center justify-between mb-16">
                   <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                            <BarChart3 size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Model Sensitivity</h2>
                   </div>
                   <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl">
                        <Search size={14} />
                        XGBoost Insight
                   </div>
                </div>
                
                {mlStats?.status === 'trained' ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                      {mlStats.feature_importances.slice(0, 6).map((f, i) => (
                         <div key={i} className="group cursor-default">
                            <div className="flex justify-between items-end mb-3">
                               <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-900 transition-colors">{f.feature}</span>
                               <span className="text-sm font-bold text-primary">{(f.importance * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden border border-slate-100">
                               <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${f.importance * 100}%` }}
                                  transition={{ duration: 2, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                                  className="h-full bg-primary shadow-lg shadow-primary/20 rounded-full"
                                />
                            </div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="h-[320px] flex flex-col items-center justify-center text-center p-16 bg-slate-50/50 rounded-[48px] border border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-8">
                        <RefreshCcw size={24} className="text-slate-300 animate-spin-slow" />
                      </div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.15em] leading-relaxed max-w-md opacity-60">
                        Protocol intelligence engine is reconciling historical behavioral streams. Analysis will be available upon convergence.
                      </p>
                   </div>
                )}
            </div>
        </div>
      </motion.div>
    </div>
  );
}
