import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCaregiverPatients, getCaregiverAlerts } from '../api/caregiver';
import AlertFeed from '../components/AlertFeed';
import AdherenceRing from '../components/AdherenceRing';
import { Users, ShieldAlert, Activity, ArrowRight, Heart, UserPlus, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CaregiverDashboard() {
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [p, a] = await Promise.all([getCaregiverPatients(), getCaregiverAlerts()]);
      setPatients(p.data);
      setAlerts(a.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const highRiskCount = patients.filter(p => p.risk_level === 'high').length;
  const avgAdherence = patients.length > 0
    ? Math.round(patients.reduce((s, p) => s + p.weekly_adherence, 0) / patients.length)
    : 0;

  if (loading) return (
    <div className="dashboard-main bg-slate-50/30 min-h-screen py-12 px-8 lg:px-16 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Synchronizing Care Network...</p>
      </div>
    </div>
  );

  return (
    <div className="dashboard-main bg-slate-50/30 min-h-screen py-12 px-8 lg:px-16">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[1600px] mx-auto"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16 px-1">
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-[0.2em] bg-primary/5 px-3 py-1 rounded-lg border border-primary/10 w-fit">
                    <Heart size={14} />
                    <span>Care Synergy Hub</span>
                </div>
                <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Caregiver Dashboard</h1>
                <p className="text-slate-400 font-medium text-lg">Monitoring protocol adherence and risk trajectories across your clinical network.</p>
            </div>
            <div className="flex gap-4">
                <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm">
                    <Search size={18} />
                    Find Patient
                </button>
                <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                    <UserPlus size={18} />
                    Add Dependent
                </button>
            </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16">
          <StatTile 
            icon={<Users className="text-primary" />} 
            value={patients.length} 
            label="Total Protected Patients" 
            sub="Active clinical monitoring"
          />
          <StatTile 
            icon={<ShieldAlert className="text-red-500" />} 
            value={highRiskCount} 
            label="High Deviation Risk" 
            sub="Requires clinical intervention"
            isCritical={highRiskCount > 0}
          />
          <StatTile 
            icon={<Activity className="text-success" />} 
            value={`${avgAdherence}%`} 
            label="Network Adherence" 
            sub="Average protocol compliance"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
          {/* Patient cards */}
          <div className="xl:col-span-2 space-y-10">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Assigned Patients</h2>
                <div className="flex items-center gap-3 text-slate-400 font-bold text-[11px] uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                    <Filter size={14} />
                    Sort by Deviation Risk
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {patients.map((p, i) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="medico-card p-10 cursor-pointer bg-white border border-slate-50 hover:shadow-2xl transition-all group relative overflow-hidden"
                  onClick={() => navigate(`/caregiver/patients/${p.id}`)}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10 group-hover:bg-primary/10 transition-colors" />
                  
                  <div className="flex items-center gap-6 mb-10">
                    <div className="w-16 h-16 rounded-[24px] bg-slate-900 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-slate-200 group-hover:scale-110 transition-transform">
                      {p.name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">{p.name}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Age {p.age} · {p.conditions}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex flex-col gap-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Weekly Adherence</p>
                        <p className="text-2xl font-bold text-slate-900">{p.weekly_adherence}%</p>
                    </div>
                    <div className="text-right">
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border-2 shadow-sm ${
                        p.risk_level === 'high' ? 'bg-red-50 border-red-500/20 text-red-500' : 
                        p.risk_level === 'medium' ? 'bg-amber-50 border-amber-500/20 text-amber-500' : 
                        'bg-success-soft border-success/20 text-success'
                      }`}>
                         {p.risk_level} Risk
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3">{p.medicines_count} Active Protocols</p>
                    </div>
                  </div>
                  
                  <button className="flex items-center justify-center gap-2 w-full mt-10 py-5 bg-white border border-slate-100 hover:bg-slate-900 hover:text-white rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all shadow-sm">
                    Analyze Trajectory <ArrowRight size={16} />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Alert feed */}
          <div className="space-y-10">
            <div className="px-2">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Active Stream</h2>
            </div>
            <AlertFeed alerts={alerts} onRefresh={fetchData} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const StatTile = ({ icon, value, label, sub, isCritical }) => (
    <div className={`medico-card p-10 bg-white border shadow-xl flex items-center gap-8 ${isCritical ? 'border-red-100' : 'border-slate-50'}`}>
        <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center shadow-inner ${isCritical ? 'bg-red-50' : 'bg-slate-50'}`}>
            <div className="scale-125">{icon}</div>
        </div>
        <div>
            <p className="text-4xl font-bold text-slate-900 tracking-tight tabular-nums">{value}</p>
            <p className="text-xs font-bold text-slate-900 uppercase tracking-widest mt-1">{label}</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.1em] mt-2 italic">{sub}</p>
        </div>
    </div>
)
