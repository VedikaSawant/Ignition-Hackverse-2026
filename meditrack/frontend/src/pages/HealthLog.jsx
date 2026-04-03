import { useState, useEffect } from 'react';
import { logHealth, getHealthHistory } from '../api/health';
import HealthMetricChart from '../components/HealthMetricChart';
import { 
  Heart, 
  Activity, 
  Droplets, 
  Weight, 
  Smile, 
  AlertCircle, 
  History, 
  Plus, 
  Calendar,
  Thermometer,
  ChevronRight,
  TrendingUp,
  FileText,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MOODS = [
  { icon: '😫', label: 'Distressed' },
  { icon: '😟', label: 'Anxious' },
  { icon: '😐', label: 'Stable' },
  { icon: '🙂', label: 'Good' },
  { icon: '😊', label: 'Excellent' }
];

export default function HealthLog() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    blood_pressure_systolic: '', blood_pressure_diastolic: '',
    blood_sugar: '', weight: '', mood: 3, pain_level: 1, notes: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await getHealthHistory(60);
      setHistory(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await logHealth({
        ...form,
        blood_pressure_systolic: form.blood_pressure_systolic ? parseInt(form.blood_pressure_systolic) : null,
        blood_pressure_diastolic: form.blood_pressure_diastolic ? parseInt(form.blood_pressure_diastolic) : null,
        blood_sugar: form.blood_sugar ? parseFloat(form.blood_sugar) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
      });
      fetchHistory();
      setForm(f => ({ ...f, blood_pressure_systolic: '', blood_pressure_diastolic: '', blood_sugar: '', weight: '', notes: '' }));
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

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
                    <History size={14} />
                    <span>Vital Signs Archive</span>
                </div>
                <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Clinical Health Log</h1>
                <p className="text-slate-400 font-medium text-lg flex items-center gap-2">
                    <Heart size={20} className="text-slate-300" />
                    Structured tracking of physiological metrics
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
            {/* --- VITALS ENTRY FORM --- */}
            <div className="xl:col-span-4 sticky top-12">
                <div className="medico-card p-12 bg-white shadow-2xl relative overflow-hidden ring-1 ring-slate-100">
                    <h3 className="text-2xl font-bold text-slate-900 mb-10 flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary border border-primary/10">
                            <Plus size={24} />
                        </div>
                        New Medical Entry
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Entry Timestamp</label>
                            <div className="relative">
                                <Calendar size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                                <input type="date" className="w-full pl-16 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">BP Systolic</label>
                                <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all" type="number" placeholder="120" value={form.blood_pressure_systolic} onChange={e => setForm({...form, blood_pressure_systolic: e.target.value})} />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">BP Diastolic</label>
                                <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all" type="number" placeholder="80" value={form.blood_pressure_diastolic} onChange={e => setForm({...form, blood_pressure_diastolic: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Glucose Level</label>
                                <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all" type="number" placeholder="mg/dL" value={form.blood_sugar} onChange={e => setForm({...form, blood_sugar: e.target.value})} />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Weight (kg)</label>
                                <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all" type="number" step="0.1" placeholder="75.0" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Wellness Pulse</label>
                            <div className="flex justify-between bg-slate-50/50 p-2.5 rounded-2xl border border-slate-50">
                                {MOODS.map((m, i) => (
                                    <button 
                                        key={i} 
                                        type="button" 
                                        onClick={() => setForm({...form, mood: i + 1})}
                                        className={`w-14 h-14 flex items-center justify-center rounded-xl transition-all ${form.mood === i + 1 ? 'bg-white shadow-xl text-3xl scale-110 border border-slate-100' : 'text-2xl grayscale opacity-30 hover:grayscale-0 hover:opacity-100 hover:bg-white/80'}`}
                                        title={m.label}
                                    >
                                        {m.icon}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between px-1">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pain Index</label>
                                <span className="text-[11px] font-bold text-primary uppercase">Magnitude {form.pain_level}</span>
                            </div>
                            <input type="range" min="1" max="5" value={form.pain_level} onChange={e => setForm({...form, pain_level: parseInt(e.target.value)})}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary" />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Clinical Observations</label>
                            <textarea className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all resize-none" rows="3" placeholder="Enter clinical observations..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                        </div>

                        <button 
                            type="submit" 
                            disabled={saving} 
                            className="w-full btn-medico btn-medico-primary py-5 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group transition-all"
                        >
                            {saving ? 'Synchronizing Archive...' : <><Plus size={20} className="group-hover:rotate-90 transition-transform" /> Commit Vital Signs</>}
                        </button>
                    </form>
                </div>
            </div>

            {/* --- TREND ANALYTICS & HISTORY --- */}
            <div className="xl:col-span-8 space-y-12">
                {history.length > 0 ? (
                    <div className="space-y-12">
                        <div className="medico-card p-12 bg-white shadow-xl border border-slate-50">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center border border-red-100 shadow-sm">
                                        <Activity size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Blood Pressure Periodic Trend</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Composite Systolic/Diastolic Analysis</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-primary bg-primary/5 px-4 py-2 rounded-xl">
                                    <TrendingUp size={14} />
                                    <span>Last 60 Days</span>
                                </div>
                            </div>
                            <div className="h-[300px]">
                                <HealthMetricChart data={[...history].reverse()} metrics={['blood_pressure_systolic', 'blood_pressure_diastolic']} title="" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="medico-card p-10 bg-white shadow-xl border border-slate-50">
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center border border-orange-100 shadow-sm">
                                        <Thermometer size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Glucose Stability</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">mg/dL Index</p>
                                    </div>
                                </div>
                                <div className="h-[250px]">
                                    <HealthMetricChart data={[...history].reverse()} metrics={['blood_sugar']} title="" />
                                </div>
                            </div>
                            <div className="medico-card p-10 bg-white shadow-xl border border-slate-50">
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm">
                                        <Weight size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Mass Composition</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kilogram Metrics</p>
                                    </div>
                                </div>
                                <div className="h-[250px]">
                                    <HealthMetricChart data={[...history].reverse()} metrics={['weight']} title="" />
                                </div>
                            </div>
                        </div>

                        {/* Recent Entries Table */}
                        <div className="medico-card bg-white overflow-hidden shadow-xl border border-slate-50">
                            <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">
                                        <ClipboardList size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Recent Synchronizations</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Historical Trace</p>
                                    </div>
                                </div>
                                <button className="group flex items-center gap-2 text-xs font-bold text-primary hover:text-primary-dark transition-colors">
                                    Export Full Dataset <FileText size={16} className="group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] bg-slate-50/50">
                                            <th className="py-6 px-10">Timestamp</th>
                                            <th className="py-6 px-6">Vital Signs (mmHg)</th>
                                            <th className="py-6 px-6">Glucose</th>
                                            <th className="py-6 px-6">Mass (kg)</th>
                                            <th className="py-6 px-6 text-center">Mood</th>
                                            <th className="py-6 px-10 text-right">Pain Index</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {history.slice(0, 10).map((h) => (
                                            <tr key={h.id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="py-6 px-10 font-bold text-slate-900">{new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                                <td className="py-6 px-6">
                                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100">
                                                        {h.blood_pressure_systolic}/{h.blood_pressure_diastolic}
                                                    </div>
                                                </td>
                                                <td className="py-6 px-6 font-bold text-slate-700">{h.blood_sugar ? `${h.blood_sugar} mg/dL` : '—'}</td>
                                                <td className="py-6 px-6 font-bold text-slate-700">{h.weight ? `${h.weight} kg` : '—'}</td>
                                                <td className="py-6 px-6 text-center text-2xl drop-shadow-sm">{MOODS[(h.mood || 3) - 1]?.icon}</td>
                                                <td className="py-6 px-10 text-right">
                                                    <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                                        h.pain_level > 3 ? 'bg-red-500 text-white shadow-lg shadow-red-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                    }`}>
                                                        Magnitude {h.pain_level}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-40 text-center medico-card border-dashed bg-slate-50/50">
                        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl border border-slate-100 mx-auto mb-10 opacity-20">
                            <Activity size={48} className="text-slate-300" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-400 uppercase tracking-[0.2em]">Synchronizing Stream</h2>
                        <p className="text-slate-400 mt-4 font-medium italic">Awaiting biometric vital signs for archival analysis...</p>
                    </div>
                )}
            </div>
        </div>
      </motion.div>
    </div>
  );
}
