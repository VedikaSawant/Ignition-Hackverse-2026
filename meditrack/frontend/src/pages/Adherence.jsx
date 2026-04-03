import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import useAnalytics from '../hooks/useAnalytics';
import AdherenceHeatmap from '../components/AdherenceHeatmap';
import StreakTracker from '../components/StreakTracker';
import { 
  BarChart2, 
  TrendingUp, 
  Calendar, 
  Activity, 
  AlertCircle,
  PieChart as PieChartIcon,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#1A56DB', '#4F46E5', '#0D9488', '#F59E0B', '#EF4444'];

export default function Adherence() {
  const [period, setPeriod] = useState(30);
  const { daily, streak, heatmap, perMedicine, missedPatterns, loading } = useAnalytics(period);

  const overall = daily.length > 0
    ? Math.round(daily.reduce((s, d) => s + d.adherence_percent, 0) / daily.length)
    : 0;

  const prevPeriod = daily.slice(0, Math.floor(daily.length / 2));
  const curPeriod = daily.slice(Math.floor(daily.length / 2));
  const prevAvg = prevPeriod.length > 0 ? prevPeriod.reduce((s, d) => s + d.adherence_percent, 0) / prevPeriod.length : 0;
  const curAvg = curPeriod.length > 0 ? curPeriod.reduce((s, d) => s + d.adherence_percent, 0) / curPeriod.length : 0;
  const trend = curAvg - prevAvg;

  const reasonData = missedPatterns?.reason_breakdown
    ? Object.entries(missedPatterns.reason_breakdown).map(([k, v]) => ({ name: k, value: v }))
    : [];

  if (loading) return (
    <div className="dashboard-main bg-slate-50/30 min-h-screen">
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
        <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compiling Clinical Analytics...</p>
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
                    <BarChart2 size={14} />
                    <span>Behavioral Metrics</span>
                </div>
                <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Clinical Adherence</h1>
                <p className="text-slate-400 font-medium text-lg flex items-center gap-2">
                    <Calendar size={20} className="text-slate-300" />
                    Protocol adherence analytics for the last {period} days
                </p>
            </div>
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                {[{ val: 7, label: '7D' }, { val: 30, label: '30D' }, { val: 90, label: '3M' }].map(p => (
                    <button 
                        key={p.val} 
                        onClick={() => setPeriod(p.val)}
                        className={`px-8 py-3 rounded-xl text-[11px] font-bold transition-all uppercase tracking-widest ${period === p.val ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        {p.label} Analysis
                    </button>
                ))}
            </div>
        </div>

        {/* Overall stat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
            <div className="medico-card p-10 bg-white flex flex-col justify-center text-center lg:text-left shadow-xl border border-slate-50">
                <p className="text-label-pro mb-4">Baseline Adherence</p>
                <div className="flex items-baseline justify-center lg:justify-start gap-3">
                    <span className="text-6xl font-bold text-slate-900 tracking-tighter">{overall}%</span>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {trend >= 0 ? <TrendingUp size={12} /> : '↓'}
                        {Math.abs(Math.round(trend))}%
                    </div>
                </div>
                <p className="text-xs font-medium text-slate-400 mt-4">Variance compared to previous period</p>
            </div>
            
            <div className="lg:col-span-1">
                <StreakTracker current={streak.current_streak} longest={streak.longest_streak} history={streak.streak_history} />
            </div>

            <div className="medico-card p-10 bg-white flex flex-col justify-center text-center lg:text-left shadow-xl border border-slate-50">
                <p className="text-label-pro mb-4">Variance Incident Count</p>
                <div className="flex items-baseline justify-center lg:justify-start gap-3">
                    <span className="text-6xl font-bold text-slate-900 tracking-tighter">{missedPatterns?.total_missed || 0}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Missed</span>
                </div>
                {missedPatterns?.summary && (
                    <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 text-[10px] font-bold uppercase tracking-widest">
                        <AlertCircle size={14} />
                        {missedPatterns.summary}
                    </div>
                )}
            </div>
        </div>

        {/* Daily adherence line chart */}
        <div className="medico-card p-12 mb-16 bg-white shadow-xl border border-slate-50">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center border border-primary/10 shadow-sm">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Protocol Adherence Trend</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daily behavioral metrics over time</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-primary" />
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Metric</span>
                   </div>
                </div>
            </div>
            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={daily.map(d => ({ ...d, date: d.date.split('-').slice(1).join('/') }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} 
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis 
                            domain={[0, 100]} 
                            tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} 
                            axisLine={false}
                            tickLine={false}
                            dx={-10}
                        />
                        <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 600 }} 
                        />
                        <Line 
                            type="monotone" 
                            dataKey="adherence_percent" 
                            stroke="#1A56DB" 
                            strokeWidth={4} 
                            dot={false}
                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} 
                            name="Adherence %" 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
            {/* Per-medicine bar chart */}
            <div className="lg:col-span-7 medico-card p-12 bg-white shadow-xl border border-slate-50">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm">
                        <BarChart2 size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Compound-Specific Adherence</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocol performance per pharmaceutical entry</p>
                    </div>
                </div>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={perMedicine} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis 
                                dataKey="medicine_name" 
                                type="category" 
                                tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} 
                                width={120}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip 
                                cursor={{ fill: 'rgba(26, 86, 219, 0.05)' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                            />
                            <Bar 
                                dataKey="adherence_percent" 
                                fill="#1A56DB" 
                                radius={[0, 8, 8, 0]} 
                                name="Adherence %" 
                                barSize={24}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Miss reasons pie chart */}
            <div className="lg:col-span-5 medico-card p-12 bg-white shadow-xl border border-slate-50">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center border border-teal-100 shadow-sm">
                        <PieChartIcon size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Variance Etiology</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reasoning for protocol disruption</p>
                    </div>
                </div>
                {reasonData.length > 0 ? (
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={reasonData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={70}
                                    outerRadius={100} 
                                    paddingAngle={5}
                                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                >
                                    {reasonData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-100">
                             <Activity size={32} />
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest max-w-[200px]">Optimal performance: Zero variance detected in protocol timeline</p>
                    </div>
                )}
            </div>
        </div>

        {/* Heatmap */}
        <div className="pb-20">
            <AdherenceHeatmap data={heatmap} />
        </div>
      </motion.div>
    </div>
  );
}
