import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoctorPatients, getNonCompliant } from '../api/doctor';
import { 
  Stethoscope, 
  Users, 
  ShieldAlert, 
  Activity, 
  Search, 
  Filter, 
  ArrowRight, 
  ChevronRight,
  TrendingDown,
  MoreVertical,
  Calendar,
  ClipboardList
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDoctorPatients()
      .then(r => setPatients(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(p => {
    if (filter === 'high_risk') return p.risk_level === 'high';
    if (filter === 'low_adherence') return p.weekly_adherence < 60;
    return true;
  });

  if (loading) return (
    <div className="dashboard-main bg-slate-50/30 min-h-screen py-12 px-8 lg:px-16 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aggregating Clinical Records...</p>
      </div>
    </div>
  );

  return (
    <div className="dashboard-main bg-slate-50/30 min-h-screen py-12 px-8 lg:px-16">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[1600px] mx-auto space-y-12"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-[0.2em] bg-primary/5 px-3 py-1 rounded-lg border border-primary/10 w-fit">
                    <Stethoscope size={14} />
                    <span>Provider Intelligence Hub</span>
                </div>
                <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Clinical Dashboard</h1>
                <p className="text-slate-400 font-medium text-lg">Comprehensive patient protocol oversight and biometric adherence analytics.</p>
            </div>
            <div className="flex gap-4">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search Medical ID..." 
                      className="bg-white border border-slate-200 text-slate-600 pl-12 pr-6 py-3 rounded-2xl font-bold text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm w-64"
                    />
                </div>
                <button className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                    <ClipboardList size={18} />
                    Generate Report
                </button>
            </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 p-2 bg-white rounded-[24px] border border-slate-100 shadow-sm w-fit">
            {[
              { val: 'all', label: 'Complete Directory', icon: <Users size={14} /> },
              { val: 'high_risk', label: 'Elevated Risk', icon: <ShieldAlert size={14} /> },
              { val: 'low_adherence', label: 'Deviation Detected', icon: <TrendingDown size={14} /> },
            ].map(f => (
              <button 
                key={f.val} 
                onClick={() => setFilter(f.val)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all ${
                  filter === f.val 
                    ? 'bg-slate-900 text-white shadow-xl' 
                    : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
        </div>

        {/* Patient table */}
        <div className="medico-card overflow-hidden bg-white shadow-2xl border border-slate-50">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                    <th className="p-8">Clinical Patient Profile</th>
                    <th className="p-8">Medical Context</th>
                    <th className="p-8">30-Day Adherence Coefficient</th>
                    <th className="p-8">Deviation Risk</th>
                    <th className="p-8 text-center">Active Protocols</th>
                    <th className="p-8 text-right">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((p) => {
                    const isLow = p.weekly_adherence < 60;
                    return (
                      <tr key={p.id} className={`group transition-all ${isLow ? 'bg-red-50/20' : 'hover:bg-slate-50/50'}`}>
                        <td className="p-8">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-base font-bold shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform">
                              {p.name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{p.name}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Clinical ID: {p.id.slice(0,8)} · Age {p.age}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-8">
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{p.conditions || 'Baseline'}</span>
                        </td>
                        <td className="p-8">
                          <div className="space-y-3">
                            <div className="w-48 h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${p.weekly_adherence}%` }}
                                className={`h-full rounded-full ${
                                p.weekly_adherence >= 80 ? 'bg-success' : p.weekly_adherence >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`} />
                            </div>
                            <span className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${
                              p.weekly_adherence >= 80 ? 'text-success' : p.weekly_adherence >= 60 ? 'text-amber-500' : 'text-red-600'
                            }`}>
                                <Activity size={12} />
                                {Math.round(p.weekly_adherence)}% Stability
                            </span>
                          </div>
                        </td>
                        <td className="p-8">
                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border-2 shadow-sm ${
                            p.risk_level === 'high' ? 'bg-red-50 border-red-500/20 text-red-500' : 
                            p.risk_level === 'medium' ? 'bg-amber-50 border-amber-500/20 text-amber-500' : 
                            'bg-success-soft border-success/20 text-success'
                          }`}>
                            {p.risk_level} Risk
                          </span>
                        </td>
                        <td className="p-8 text-center">
                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-900 text-xs font-bold border border-slate-200">
                                {p.medicines_count}
                            </div>
                        </td>
                        <td className="p-8 text-right">
                          <button onClick={() => navigate(`/doctor/patients/${p.id}`)}
                            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors group/btn">
                            Detailed Record
                            <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
                <div className="py-32 text-center">
                    <Users size={64} className="mx-auto text-slate-100 mb-6" />
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em]">No patient records found in current segment</p>
                </div>
            )}
        </div>
      </motion.div>
    </div>
  );
}
