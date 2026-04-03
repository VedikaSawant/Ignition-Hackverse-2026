import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, BarElement, Filler
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { getIntelligenceMetrics, getMLStats } from '../api/intelligence';
import { getRiskScore } from '../api/predictions';

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
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Processing Medical Intelligence</p>
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
        backgroundColor: '#0A112F',
        titleFont: { family: 'Outfit', size: 12, weight: 'bold' },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 12,
        cornerRadius: 12,
        displayColors: false
      }
    },
    scales: {
      y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10, weight: '600' }, color: '#94A3B8' } },
      x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10, weight: '600' }, color: '#94A3B8' } }
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
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(0, 82, 255, 0.15)');
        gradient.addColorStop(1, 'rgba(0, 82, 255, 0)');
        return gradient;
      },
      tension: 0.45,
      fill: true,
      pointRadius: 4,
      pointBackgroundColor: '#FFFFFF',
      pointBorderColor: '#0052FF',
      pointBorderWidth: 2
    }]
  };

  const behaviorData = {
    labels: metrics.behaviors.map(b => b.label),
    datasets: [{
      data: metrics.behaviors.map(b => b.value),
      backgroundColor: ['#0052FF', '#FF5C39', '#10B981', '#F59E0B', '#94A3B8'],
      borderWidth: 0,
      hoverOffset: 15
    }]
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 pt-28 lg:pt-32">
       <div className="page-container">
          
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-in">
             <div>
                <span className="inline-block px-4 py-1 bg-primary-light text-primary text-[10px] font-black uppercase tracking-widest rounded-full mb-3">
                  ML-Driven Behavioral Insights
                </span>
                <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight">Intelligence Dashboard</h1>
                <p className="text-gray-500 font-medium mt-2">Deep analytics of clinical adherence patterns and risk vectors.</p>
             </div>
             
             <div className="flex gap-3">
                <div className="px-5 py-3 pro-card bg-white flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pipeline Status: Operational</span>
                </div>
             </div>
          </div>

          {/* High Priority Alerts */}
          {risk.risk_level === 'high' && (
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-accent/5 border-2 border-accent/20 rounded-[32px] p-8 mb-12 flex items-center gap-8"
            >
               <div className="w-20 h-20 bg-accent rounded-3xl flex items-center justify-center text-3xl shadow-xl shadow-orange-200">🚨</div>
               <div>
                  <h3 className="text-2xl font-black text-accent uppercase tracking-tighter">Critical Adherence Risk</h3>
                  <p className="text-accent/80 font-bold mt-1">Our XGBoost model has detected high variance in your recent behavior. Immediate clinical intervention via Dr. Aria is advised.</p>
               </div>
            </motion.div>
          )}

          {/* Core Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
             {/* Trend Graph */}
             <div className="lg:col-span-8 pro-card p-8 bg-white">
                <div className="flex items-center justify-between mb-8">
                   <div>
                      <h2 className="text-xl font-black text-text uppercase tracking-tight">Clinical Adherence Trend</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">7-Day Moving Average</p>
                   </div>
                   <span className="text-2xl font-black text-primary">{(trendData.datasets[0].data[6] || 0).toFixed(0)}%</span>
                </div>
                <div className="h-[350px]">
                   <Line data={trendData} options={chartOptions} />
                </div>
             </div>

             {/* Risk Score Gauge Component */}
             <div className="lg:col-span-4 pro-card p-8 bg-white flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-accent"></div>
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Predictive Risk Factor</h2>
                <div className="relative w-48 h-48 flex items-center justify-center">
                   <svg className="w-full h-full transform -rotate-90">
                      <circle cx="96" cy="96" r="88" fill="none" stroke="#F1F5F9" strokeWidth="12" />
                      <motion.circle 
                         cx="96" cy="96" r="88" 
                         fill="none" 
                         stroke={risk.risk_score > 65 ? '#EF4444' : risk.risk_score > 35 ? '#F59E0B' : '#0052FF'} 
                         strokeWidth="12" 
                         strokeDasharray="552.9" 
                         initial={{ strokeDashoffset: 552.9 }}
                         animate={{ strokeDashoffset: 552.9 - (552.9 * risk.risk_score) / 100 }}
                         transition={{ duration: 2, ease: "easeOut" }}
                         strokeLinecap="round"
                      />
                   </svg>
                   <div className="absolute flex flex-col items-center">
                      <span className="text-5xl font-black text-text">{risk.risk_score}</span>
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full mt-2 uppercase tracking-widest ${
                         risk.risk_level === 'high' ? 'bg-red-100 text-red-600' : 'bg-primary-light text-primary'
                      }`}>
                         {risk.risk_level} Risk
                      </span>
                   </div>
                </div>
                <p className="mt-8 text-xs font-medium text-gray-400 px-6 italic">Verified against 1,200+ behavioral telemetry markers.</p>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             {/* Behavioral Drivers */}
             <div className="lg:col-span-5 pro-card p-8 bg-white">
                <h2 className="text-xl font-black text-text uppercase tracking-tight mb-8">Behavioral Drivers</h2>
                {metrics.behaviors.length > 0 ? (
                   <div className="h-64 flex items-center justify-center">
                      <Pie data={behaviorData} options={{ ...chartOptions, plugins: { legend: { display: true, position: 'right', labels: { boxWidth: 10, font: { size: 10, weight: '700' } } } } }} />
                   </div>
                ) : (
                   <div className="h-64 flex flex-col items-center justify-center">
                      <span className="text-4xl opacity-20 mb-4">🧩</span>
                      <p className="text-[10px] font-black text-gray-300 uppercase">Aggregating telemetry...</p>
                   </div>
                )}
             </div>

             {/* ML Attribution Section */}
             <div className="lg:col-span-7 pro-card p-8 bg-white">
                <div className="flex items-center justify-between mb-10">
                   <h2 className="text-xl font-black text-text uppercase tracking-tight">XGBoost Attribution</h2>
                   <span className="text-[10px] font-bold text-primary bg-primary-light px-3 py-1 rounded-full uppercase tracking-tighter">Feature Importance</span>
                </div>
                
                {mlStats?.status === 'trained' ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                      {mlStats.feature_importances.slice(0, 6).map((f, i) => (
                         <div key={i}>
                            <div className="flex justify-between items-end mb-2">
                               <span className="text-xs font-black text-gray-700 uppercase tracking-tighter">{f.feature}</span>
                               <span className="text-[10px] font-bold text-gray-400">{(f.importance * 100).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-50 h-2.5 rounded-full overflow-hidden">
                               <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${f.importance * 100}%` }}
                                  transition={{ duration: 1, delay: i * 0.1 }}
                                  className="h-full bg-primary shadow-[0_0_10px_rgba(0,82,255,0.3)]"
                               />
                            </div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="h-64 flex flex-col items-center justify-center text-center">
                      <p className="text-sm font-bold text-gray-300 uppercase tracking-widest leading-relaxed">ML Pipeline training in progress.<br/>Attribution available momentarily.</p>
                   </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
}
