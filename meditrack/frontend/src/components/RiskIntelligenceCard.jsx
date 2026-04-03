import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Brain, Bell, TrendingDown, Shield, Sparkles, Activity, AlertTriangle, Info, Clock, Calendar, Zap } from "lucide-react";
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
});

export default function RiskIntelligenceCard({
  riskScore: riskScoreObj,
  insight,
  nextMiss,
  userName,
  onAlertCaregiver,
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [behavioralSuite, setBehavioralSuite] = useState({ patterns: [], narrative: "" });

  const riskScore = riskScoreObj?.risk_score ?? riskScoreObj;

  const getRiskLevel = () => {
    if (riskScore == null) return { label: "N/A", color: "text-slate-400", bg: "bg-slate-100", ringColor: "border-slate-200", icon: Info };
    if (riskScore <= 30) return { label: "SAFE", color: "text-emerald-600", bg: "bg-emerald-50", ringColor: "border-emerald-100", icon: Shield };
    if (riskScore <= 60) return { label: "CAUTION", color: "text-amber-600", bg: "bg-amber-50", ringColor: "border-amber-100", icon: AlertTriangle };
    return { label: "CRITICAL", color: "text-red-600", bg: "bg-red-50", ringColor: "border-red-100", icon: ShieldAlert };
  };

  const risk = getRiskLevel();
  const RiskIcon = risk.icon;

  useEffect(() => {
    const fetchSuite = async () => {
      try {
        const resp = await api.get('/api/predictions/behavioral-suite');
        setBehavioralSuite(resp.data);
      } catch (err) {
        console.error("Failed to fetch behavioral suite:", err);
      }
    };
    fetchSuite();
  }, []);

  useEffect(() => {
    const text = behavioralSuite.narrative || insight?.insight?.pattern || insight?.insight?.encouragement || insight || '';
    if (!text || typeof text !== 'string') return;

    setDisplayedText('');
    setIsTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [behavioralSuite.narrative, insight]);

  return (
    <div className="medico-card bg-white shadow-xl shadow-slate-200/40 overflow-hidden">
      {/* ── CLEAN HEADER ── */}
      <div className="p-10 pb-0 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-4 px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10">
              <Zap size={14} className="text-primary fill-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Clinical Intelligence Protocol Active</span>
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-8">Comprehensive Risk Analysis</h3>
          
          <div className="relative mb-10 flex flex-col items-center">
              <div className="flex items-baseline gap-1">
                  <motion.span 
                    key={riskScore}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-8xl font-bold text-slate-900 tracking-tighter"
                  >
                    {riskScore ?? "--"}
                  </motion.span>
                  <span className="text-xl font-bold text-slate-400">/100</span>
              </div>
              
              <div className={`mt-4 px-5 py-2 rounded-xl flex items-center gap-2.5 font-bold text-sm ${risk.color} ${risk.bg} border ${risk.ringColor}`}>
                  <RiskIcon size={18} />
                  <span className="tracking-tight">{risk.label} NON-COMPLIANCE STATUS</span>
              </div>
          </div>
      </div>

      <div className="px-10 pb-10 space-y-8">
        {/* ── BEHAVIORAL NARRATIVE ── */}
        <div className="space-y-4">
            <div className="flex items-center justify-between pl-1">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Brain size={14} className="text-primary" />
                    Predictive Intelligence Narrative
                </div>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">ML-VERIFIED</span>
            </div>
            <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 min-h-[140px] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity size={80} className="text-white" />
                </div>
                <p className="text-base text-slate-200 font-medium leading-relaxed relative z-10">
                    {displayedText}
                    {isTyping && <span className="inline-block w-1.5 h-5 bg-primary animate-pulse ml-1 align-middle" />}
                </p>
            </div>
        </div>

        {/* ── VERIFIED PATTERNS (NEW SUITE) ── */}
        {behavioralSuite.patterns && behavioralSuite.patterns.length > 0 && (
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    <Activity size={14} className="text-primary" />
                    Detected Behavioral Anomalies
                </div>
                <div className="flex flex-wrap gap-3">
                    {behavioralSuite.patterns.map((p, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`flex flex-col gap-1 p-4 rounded-xl border transition-all hover:shadow-md cursor-default shrink-0 max-w-[200px] ${
                                p.severity === 'high' ? 'bg-red-50/50 border-red-100 text-red-900' : 'bg-amber-50/50 border-amber-100 text-amber-900'
                            }`}
                        >
                            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-tight">
                                <span>{p.icon}</span>
                                {p.title}
                            </div>
                            <p className="text-[11px] font-medium opacity-80 leading-snug">{p.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        )}

        {/* ── ANOMALY FORECAST ── */}
        {nextMiss && (
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-5">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm">
                <TrendingDown size={24} />
            </div>
            <div className="flex-1 space-y-2">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Primary Anomaly Prediction</p>
               <p className="text-lg font-bold text-slate-900 leading-tight">
                    {nextMiss.medicine_name || (typeof nextMiss === 'string' ? nextMiss : 'Potential Omission')}
               </p>
               <div className="flex items-center gap-3 mt-1">
                    <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <Clock size={12} /> {nextMiss.predicted_time || "Scheduled Time"}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 italic">
                        {Math.round(nextMiss.miss_probability || 0)}% Probability Rating
                    </span>
               </div>
            </div>
          </div>
        )}

        {/* ── INTERVENTION ── */}
        {riskScore > 60 && (
          <button
            onClick={onAlertCaregiver}
            className="w-full flex items-center justify-center gap-3 bg-red-600 text-white py-5 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200/40"
          >
            <Bell size={18} />
            Engage Care Intervention Team
          </button>
        )}
      </div>
    </div>
  );
}
