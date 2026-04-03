import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Calendar, 
  ChevronRight, 
  Plus, 
  Activity, 
  TrendingUp, 
  Package, 
  Sparkles,
  Stethoscope,
  Info,
  Clock,
  CheckCircle2,
  FileText,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useDoses from '../hooks/useDoses';
import useAlerts from '../hooks/useAlerts';
import AdherenceRing from '../components/AdherenceRing';
import MedicineCard from '../components/MedicineCard';
import RiskIntelligenceCard from '../components/RiskIntelligenceCard';
import StreakTracker from '../components/StreakTracker';
import AlertFeed from '../components/AlertFeed';
import { getRiskScore, getNextMiss, getInsights } from '../api/predictions';
import { getStreak, sendReportToDoctor } from '../api/analytics';
import { getMedicines } from '../api/medicines';
import { testAlert } from '../api/alerts';
import VideoCallModal from '../components/consult/VideoCallModal';
import { toast } from 'react-hot-toast';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { todayDoses, loading: dosesLoading, markDose, refresh: refreshDoses } = useDoses();
  const { alerts, refresh: refreshAlerts } = useAlerts();
  const [riskScore, setRiskScore] = useState(null);
  const [nextMiss, setNextMiss] = useState(null);
  const [insight, setInsight] = useState(null);
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0, streak_history: [] });
  const [medicines, setMedicines] = useState([]);
  const [insightLoading, setInsightLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);

  const refreshAllData = async () => {
    try {
      await Promise.all([
        refreshDoses(),
        getMedicines().then(r => setMedicines(r?.data || [])),
        getRiskScore().then(r => setRiskScore(r?.data || null)),
        getNextMiss().then(r => setNextMiss(r?.data || null)),
        getStreak().then(r => setStreak(r?.data || { current_streak: 0, longest_streak: 0, streak_history: [] })),
      ]);
    } catch (err) {
      console.error("Dashboard full refresh failed:", err);
    }
  };

  useEffect(() => {
    refreshAllData();
    setInsightLoading(true);
    getInsights()
      .then(r => setInsight(r.data))
      .catch(console.error)
      .finally(() => setInsightLoading(false));
  }, []);

  const handleSendReport = async () => {
    setReportLoading(true);
    try {
      await sendReportToDoctor();
      toast.success("Clinical report delivered to your doctor's inbox.", {
        style: {
          borderRadius: '16px',
          background: '#0F172A',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '14px',
        }
      });
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Failed to deliver report. Verify clinical connections.");
    } finally {
      setReportLoading(false);
    }
  };

  const todayDosesSafe = todayDoses || [];
  const takenToday = todayDosesSafe.filter(d => d.status === 'taken').length;
  const totalToday = todayDosesSafe.length;
  const todayAdherence = totalToday > 0 ? Math.round((takenToday / totalToday) * 100) : 0;

  const lowStockMeds = medicines.filter(m => m.remaining_quantity <= m.refill_alert_threshold);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="dashboard-main bg-slate-50/30 min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[1600px] mx-auto px-4 lg:px-0"
      >
        {/* --- HEADER --- */}
        <div className="mb-16">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 px-3 py-1 bg-primary/5 rounded-lg border border-primary/10 w-fit">
                  <Activity size={14} className="text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Clinical Intelligence Active</span>
              </div>
              <h1 className="text-6xl font-bold text-slate-900 tracking-tight">
                {greeting}, {user?.name?.split(' ')[0]}
              </h1>
              <p className="text-lg font-medium text-slate-400 flex items-center gap-2">
                <Calendar size={20} className="text-slate-300" />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
               <button 
                onClick={handleSendReport}
                disabled={reportLoading}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:border-primary hover:text-primary transition-all disabled:opacity-50"
               >
                  {reportLoading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                  <span>Share Weekly Progress</span>
               </button>

               <button 
                onClick={() => setIsConsultModalOpen(true)}
                className="btn-medico btn-medico-primary px-10 py-4 shadow-xl shadow-primary/20 group"
               >
                  <Stethoscope size={20} className="group-hover:rotate-12 transition-transform" />
                  <span>Consult AI Consultant</span>
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
          </div>
        </div>

        {/* --- GRID --- */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
          
          {/* LEFT: SCHEDULE & ANALYTICS */}
          <div className="xl:col-span-8 space-y-12">
            
            {/* Top Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="medico-card p-10 flex flex-col items-center justify-center">
                    <AdherenceRing percent={todayAdherence} label="Attendance" />
                </div>

                <div className="medico-card p-10 flex flex-col items-center justify-center text-center">
                     <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6 border border-orange-100">
                        <TrendingUp size={28} />
                     </div>
                     <span className="text-5xl font-bold text-slate-900 leading-none">{streak.current_streak}</span>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Current Day Streak</p>
                </div>

                <div className="medico-card p-10 flex flex-col items-center justify-center text-center">
                     <div className="w-14 h-14 bg-primary/5 text-primary rounded-2xl flex items-center justify-center mb-6 border border-primary/10">
                        <Package size={28} />
                     </div>
                     <span className="text-5xl font-bold text-slate-900 leading-none">{medicines.length}</span>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Active Compendium</p>
                </div>
            </div>

            {/* Inventory Attention */}
            <AnimatePresence>
                {lowStockMeds.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="medico-card border-none bg-amber-500 text-white shadow-xl shadow-amber-200"
                    >
                        <div className="p-8 flex items-center justify-between gap-6 flex-wrap">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
                                    <Package size={28} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold">Inventory Low Stock Alert</h3>
                                    <p className="text-amber-50/80 font-medium text-sm">Critical refills required for your prescribed regime.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {lowStockMeds.map(m => (
                                    <div key={m.id} className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl text-[10px] font-bold border border-white/20">
                                        {m.name}: {m.remaining_quantity} Remain
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Daily Protocol */}
            <div className="space-y-8">
                 <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Daily Protocol</h2>
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold tracking-widest uppercase">
                            {todayDosesSafe.length} Tasks
                        </span>
                    </div>
                    <Link to="/medicines" className="group flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-dark transition-colors no-underline">
                        Compendium <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                 </div>

                 <div className="space-y-6">
                    {dosesLoading ? (
                        Array(3).fill(0).map((_, i) => <div key={i} className="w-full h-32 bg-white rounded-2xl animate-pulse border border-slate-100" />)
                    ) : todayDosesSafe.length === 0 ? (
                        <div className="medico-card p-24 text-center border-dashed bg-slate-50/50">
                            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm border border-slate-100 text-primary">
                                <CheckCircle2 size={48} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Protocols Cleared</h3>
                            <p className="text-slate-400 font-medium max-w-sm mx-auto">Your medical schedule is clear for the remainder of the day.</p>
                        </div>
                    ) : (
                        todayDosesSafe.map((dose) => (
                            <MedicineCard
                                key={dose.id}
                                dose={dose}
                                onMarkTaken={() => markDose(dose.medicine_id, dose.scheduled_time, 'taken')}
                                onSkip={(reason) => markDose(dose.medicine_id, dose.scheduled_time, 'skipped', reason)}
                            />
                        ))
                    )}
                 </div>
            </div>

            {/* Consistency Map */}
            <div className="space-y-8">
                <div className="flex items-center gap-3 px-2">
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Historical Consistency</h2>
                    <Info size={18} className="text-slate-300" />
                </div>
                <StreakTracker
                    current={streak.current_streak}
                    longest={streak.longest_streak}
                    history={streak.streak_history}
                />
            </div>
          </div>

          {/* RIGHT: INTELLIGENCE & FEED */}
          <div className="xl:col-span-4 space-y-12">
            <div className="sticky top-12 space-y-12">
                {/* Intelligence Analysis */}
                <div className="reveal-in">
                    {insightLoading ? (
                        <div className="medico-card h-96 bg-white animate-pulse border border-slate-100" />
                    ) : (
                        <RiskIntelligenceCard
                            riskScore={riskScore}
                            insight={insight}
                            nextMiss={nextMiss}
                            userName={user?.name}
                            onAlertCaregiver={() => testAlert().then(refreshAlerts)}
                        />
                    )}
                </div>

                {/* AI Tip (Simplified) */}
                <div className="medico-card p-10 bg-primary text-white space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-xl">
                            <Sparkles size={24} />
                        </div>
                        <h3 className="text-lg font-bold">Optimization Tip</h3>
                    </div>
                    <p className="text-blue-50 leading-relaxed text-sm font-medium">
                        "Your adherence probability increases by 15% when taking your morning dose immediately after breakfast."
                    </p>
                    <button className="w-full py-4 bg-white text-primary rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-blue-50 transition-colors">
                        View Analysis
                    </button>
                </div>

                {/* Alerts */}
                <div className="reveal-in" style={{ animationDelay: '0.2s' }}>
                    <AlertFeed alerts={alerts} onRefresh={refreshAlerts} />
                </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* MODALS */}
      <AnimatePresence>
        {isConsultModalOpen && (
          <VideoCallModal 
            isOpen={isConsultModalOpen} 
            onClose={() => setIsConsultModalOpen(false)} 
            onSuccess={(data) => {
              if (data.action_taken === "DoseLogged") {
                refreshDoses();
                toast.success(`Aria logged ${data.logged_medicine} for you.`, {
                  icon: '🤖',
                });
              } else if (data.action_taken === "MedicineAdded") {
                refreshAllData();
                toast.success(`Aria added ${data.new_medicine_data?.name} to your protocol.`, {
                  icon: '✨',
                });
              } else if (data.action_taken === "MedicinePaused") {
                refreshAllData();
                toast.success(`Aria paused ${data.new_medicine_data?.name}.`, {
                  icon: '⏸️',
                });
              } else if (data.action_taken === "MedicineDeleted") {
                refreshAllData();
                toast.error(`Aria removed ${data.new_medicine_data?.name}.`, {
                  icon: '🗑️',
                });
              } else if (data.action_taken === "MedicineResumed") {
                refreshAllData();
                toast.success(`Aria resumed ${data.new_medicine_data?.name}.`, {
                  icon: '▶️',
                });
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
