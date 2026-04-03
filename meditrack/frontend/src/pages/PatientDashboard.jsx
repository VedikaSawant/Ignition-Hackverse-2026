import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import useDoses from '../hooks/useDoses';
import useAlerts from '../hooks/useAlerts';
import AdherenceRing from '../components/AdherenceRing';
import MedicineCard from '../components/MedicineCard';
import RiskIntelligenceCard from '../components/RiskIntelligenceCard';
import StreakTracker from '../components/StreakTracker';
import AlertFeed from '../components/AlertFeed';
import { getRiskScore, getNextMiss, getInsights } from '../api/predictions';
import { getStreak } from '../api/analytics';
import { getMedicines } from '../api/medicines';
import { testAlert } from '../api/alerts';
import VideoCallModal from '../components/consult/VideoCallModal';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { todayDoses, loading: dosesLoading, markDose } = useDoses();
  const { alerts, refresh: refreshAlerts } = useAlerts();
  const [riskScore, setRiskScore] = useState(null);
  const [nextMiss, setNextMiss] = useState(null);
  const [insight, setInsight] = useState(null);
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0, streak_history: [] });
  const [medicines, setMedicines] = useState([]);
  const [insightLoading, setInsightLoading] = useState(true);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      getRiskScore().then(r => setRiskScore(r?.data || null)),
      getNextMiss().then(r => setNextMiss(r?.data || null)),
      getStreak().then(r => setStreak(r?.data || { current_streak: 0, longest_streak: 0, streak_history: [] })),
      getMedicines().then(r => setMedicines(r?.data || [])),
    ]).catch(console.error);

    setInsightLoading(true);
    getInsights()
      .then(r => setInsight(r.data))
      .catch(console.error)
      .finally(() => setInsightLoading(false));
  }, []);

  const handleMarkTaken = async (dose) => {
    try {
       await markDose(dose.medicine_id, dose.scheduled_time, 'taken');
    } catch(e) { console.error(e); }
  };

  const handleSkip = async (dose, reason) => {
    try {
      await markDose(dose.medicine_id, dose.scheduled_time, 'skipped', reason);
    } catch(e) { console.error(e); }
  };

  const handleAlertCaregiver = async () => {
    await testAlert();
    refreshAlerts();
    alert('Caregiver notified successfully!');
  };

  const todayDosesSafe = todayDoses || [];
  const totalToday = todayDosesSafe.length;
  const takenToday = todayDosesSafe.filter(d => d.status === 'taken').length;
  const todayAdherence = totalToday > 0 ? Math.round((takenToday / totalToday) * 100) : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const lowStockMeds = medicines.filter(m => m.remaining_quantity <= m.refill_alert_threshold);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 pt-28 lg:pt-32">
      <div className="page-container">
        
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-in">
           <div>
              <span className="inline-block px-4 py-1 bg-primary-light text-primary text-[10px] font-black uppercase tracking-widest rounded-full mb-3">
                Patient Intelligence Panel
              </span>
              <h1 className="text-4xl md:text-5xl font-black text-text tracking-tight">
                {greeting}, {user?.name?.split(' ')[0]}
              </h1>
              <p className="text-gray-500 font-medium mt-2">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
           </div>
           
           <button 
            onClick={() => setIsConsultModalOpen(true)}
            className="btn-pro primary py-4 px-8 rounded-2xl shadow-xl shadow-blue-200 flex items-center gap-3 border-none"
           >
              <div className="relative">
                <span className="text-xl">👩‍⚕️</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse" />
              </div>
              <span>Consult Dr. Aria</span>
           </button>
        </div>

        {/* System Alerts Container */}
        <AnimatePresence>
          {lowStockMeds.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
            >
              <div className="bg-accent/10 border border-accent/20 rounded-3xl p-5 mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center text-white text-xl">📦</div>
                  <div>
                    <h3 className="text-sm font-bold text-accent">Inventory Alert</h3>
                    <p className="text-xs text-accent/80 font-medium">Some medications require your attention soon.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {lowStockMeds.map(m => (
                    <span key={m.id} className="bg-white px-3 py-1.5 rounded-xl text-[10px] font-black border border-accent/20 shadow-sm">
                      {m.name}: {m.remaining_quantity} LEFT
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Main Action Area (Left Side) */}
          <div className="xl:col-span-8 space-y-10">
            
            {/* High-Level Performance Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="pro-card p-6 flex flex-col items-center justify-center aspect-square md:aspect-auto">
                 <AdherenceRing percent={todayAdherence} size={110} strokeWidth={10} label="Daily" />
              </div>
              <div className="pro-card p-6 flex flex-col items-center justify-center">
                 <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center text-3xl mb-4">🔥</div>
                 <div className="text-4xl font-black text-orange-500">{streak.current_streak}</div>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Day Streak</p>
              </div>
              <div className="pro-card p-6 flex flex-col items-center justify-center">
                 <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-3xl mb-4">💊</div>
                 <div className="text-4xl font-black text-primary">{medicines.length}</div>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Active Prescriptions</p>
              </div>
            </div>

            {/* Schedule Timeline Section */}
            <div>
              <div className="flex items-center justify-between mb-6 px-1">
                 <h2 className="text-2xl font-black text-text">Today's Protocol</h2>
                 <div className="flex gap-2">
                    <span className="badge-pro low">Verified</span>
                    <span className="badge-pro">{todayDoses.length} Scheduled</span>
                 </div>
              </div>

              <div className="space-y-4">
                {dosesLoading ? (
                  Array(3).fill(0).map((_, i) => <div key={i} className="loading-skeleton h-24 w-full" />)
                ) : todayDosesSafe.length === 0 ? (
                  <div className="pro-card p-12 text-center bg-gray-50/50 border-dashed">
                     <span className="text-5xl mb-4 block">🏝️</span>
                     <h3 className="text-xl font-bold text-gray-800">Clear Schedule</h3>
                     <p className="text-sm text-gray-500">No medical tasks for today. Enjoy your rest!</p>
                  </div>
                ) : (
                  todayDosesSafe.map((dose) => (
                    <MedicineCard
                      key={dose.id}
                      dose={dose}
                      onMarkTaken={handleMarkTaken}
                      onSkip={handleSkip}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Advanced Activity Visualizer */}
            <div>
               <h2 className="text-2xl font-black text-text mb-6 px-1">Consistency Analysis</h2>
               <StreakTracker
                  current={streak.current_streak}
                  longest={streak.longest_streak}
                  history={streak.streak_history}
                />
            </div>
          </div>

          {/* Intelligence Sidebar (Right Side) */}
          <div className="xl:col-span-4 space-y-8">
            
            <div className="sticky top-32 space-y-8">
               {/* AI Predictive Insight Card */}
               <div className="animate-in" style={{ animationDelay: '0.2s' }}>
                {insightLoading ? (
                  <div className="pro-card p-8"><div className="loading-skeleton h-48 w-full" /></div>
                ) : (
                  <RiskIntelligenceCard
                    riskScore={riskScore}
                    insight={insight}
                    nextMiss={nextMiss}
                    userName={user?.name}
                    onAlertCaregiver={handleAlertCaregiver}
                  />
                )}
               </div>

               {/* Live Alert Feed */}
               <div className="animate-in" style={{ animationDelay: '0.3s' }}>
                  <AlertFeed alerts={alerts} onRefresh={refreshAlerts} />
               </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isConsultModalOpen && (
          <VideoCallModal 
            isOpen={isConsultModalOpen} 
            onClose={() => setIsConsultModalOpen(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
