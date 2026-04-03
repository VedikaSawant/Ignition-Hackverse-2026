import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  Shield, 
  Brain, 
  Clock, 
  CheckCircle, 
  ArrowRight,
  Stethoscope,
  Heart,
  Users,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  return (
    <div className="bg-white overflow-hidden font-inter">
      {/* ── HERO SECTION ────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center bg-slate-50/50 py-32">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(0,82,255,0.05),transparent)] pointer-events-none" />
        
        <div className="max-w-[1600px] mx-auto w-full px-8 md:px-16 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="z-10 space-y-10"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white text-primary font-bold text-xs uppercase tracking-[0.2em] shadow-sm border border-slate-100 w-fit">
              <Sparkles size={16} />
              <span>Next-Generation Clinical Adherence</span>
            </div>
            
            <div className="space-y-6">
                <h1 className="text-6xl md:text-8xl font-bold text-slate-900 leading-[1.05] tracking-tight">
                  Professional <br />
                  <span className="text-primary italic">Protocol Management</span>
                </h1>
                <p className="text-xl text-slate-500 max-w-xl leading-relaxed font-medium">
                  MediTrack leverages advanced clinical intelligence to synchronize medical protocols with daily lifestyles. Enterprise-grade adherence for modern healthcare.
                </p>
            </div>

            <div className="flex flex-wrap gap-6 pt-6">
              <Link to="/register" className="btn-medico btn-medico-primary px-10 py-5 rounded-2xl text-base shadow-2xl shadow-primary/20 hover:-translate-y-1 transition-all">
                Initialize Protocol <ArrowRight size={20} className="ml-2" />
              </Link>
              <Link to="/login" className="btn-medico btn-medico-outline px-10 py-5 rounded-2xl text-base border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                Clinical Login
              </Link>
            </div>
            
            <div className="pt-16 grid grid-cols-3 gap-12 border-t border-slate-100">
              <div className="space-y-2">
                <p className="text-4xl font-bold text-slate-900 tracking-tighter tabular-nums">99.9<span className="text-primary">%</span></p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">Clinical Uptime</p>
              </div>
              <div className="space-y-2">
                <p className="text-4xl font-bold text-slate-900 tracking-tighter tabular-nums">24<span className="text-primary">/</span>7</p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">Protocol Monitoring</p>
              </div>
              <div className="space-y-2">
                <p className="text-4xl font-bold text-slate-900 tracking-tighter tabular-nums">12<span className="text-primary">k+</span></p>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">Active Records</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block"
          >
            <div className="absolute -inset-10 bg-gradient-to-tr from-primary/10 via-transparent to-transparent rounded-full blur-[100px] -z-10 animate-pulse" />
            <div className="relative p-4 bg-white rounded-[48px] shadow-2xl border border-slate-50">
                <img 
                  src="file:///C:/Users/91981/.gemini/antigravity/brain/f146f558-d10d-4c68-9f3c-3d8797184174/hero_doctor_1775215976010.png" 
                  alt="Clinical Care"
                  className="w-full h-auto object-cover rounded-[40px] shadow-inner"
                />
            </div>
            
            {/* Floating Stats Widget */}
            <motion.div 
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="absolute -bottom-10 -left-10 medico-card p-10 bg-white/80 backdrop-blur-xl flex items-center gap-6 shadow-2xl border border-white ring-1 ring-slate-100"
            >
              <div className="w-16 h-16 bg-success/10 text-success rounded-3xl flex items-center justify-center border border-success/10 shadow-inner">
                <ShieldCheck size={32} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1">Adherence Rating</p>
                <p className="text-3xl font-bold text-slate-900">+48.2<span className="text-success text-xl ml-1">%</span></p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES SECTION ───────────────────────────────────── */}
      <section className="py-40 bg-white relative">
        <div className="max-w-[1600px] mx-auto px-8 md:px-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-24">
            <div className="space-y-6">
                <div className="text-primary font-bold text-xs uppercase tracking-[0.3em] flex items-center gap-3">
                    <div className="w-10 h-[2px] bg-primary" />
                    Core Platform Capabilities
                </div>
                <h2 className="text-5xl font-bold text-slate-900 tracking-tight">Clinical Synergy Engine</h2>
            </div>
            <p className="text-slate-400 text-lg max-w-sm leading-relaxed font-medium">
              We bridge the gap between complex medical requirements and high-performance daily lifestyles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <FeatureCard 
              icon={<Brain className="text-primary" />}
              title="Predictive Modeling"
              desc="Advanced behavioral analysis projects adherence trajectories before deviations occur."
            />
            <FeatureCard 
              icon={<Shield size={28} className="text-indigo-500" />}
              title="Enterprise Security"
              desc="End-to-end clinical infrastructure ensuring the highest tier of data sovereignty."
            />
            <FeatureCard 
              icon={<Clock className="text-amber-500" />}
              title="Precision Latency"
              desc="Dynamic protocol synchronization adapting to global scheduling and metabolic cycles."
            />
            <FeatureCard 
              icon={<Users className="text-emerald-500" />}
              title="Care Ecosystem"
              desc="Unified interface for seamless patient-to-provider biometric data streams."
            />
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ────────────────────────────────────────── */}
      <section className="bg-slate-900 py-32 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_center,rgba(0,82,255,0.1),transparent)]" />
        <div className="max-w-[1600px] mx-auto px-8 md:px-16 relative z-10 flex flex-col xl:flex-row items-center justify-between gap-20">
          <div className="text-white space-y-8 text-center xl:text-left">
            <h2 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">Ready to Stabilize <br />Your Health Protocol?</h2>
            <p className="text-slate-400 text-xl max-w-xl font-medium">Join the elite network of patients optimizing their clinical results with MediTrack.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-6">
            <Link to="/register" className="btn-medico btn-medico-primary bg-white !text-slate-900 px-12 py-6 rounded-2xl text-lg font-bold hover:scale-105 transition-transform shadow-2xl">
              Create Clinical Account
            </Link>
            <button className="px-12 py-6 rounded-2xl text-lg font-bold text-white border border-slate-700 hover:bg-slate-800 transition-colors">
                View Enterprise Demo
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="bg-slate-50 py-24 border-t border-slate-100">
        <div className="max-w-[1600px] mx-auto px-8 md:px-16 flex flex-col md:flex-row justify-between items-start gap-20">
          <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-xl">
                  <Stethoscope size={28} />
                </div>
                <span className="text-3xl font-bold tracking-tighter text-slate-900">Medi<span className="text-primary">Track</span></span>
              </div>
              <p className="text-slate-400 max-w-xs font-medium text-sm leading-relaxed">
                  Advanced clinical protocol management for institutional and personal healthcare environments.
              </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-24">
              <div className="space-y-6">
                  <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">Platform</h4>
                  <div className="flex flex-col gap-4 text-sm font-medium text-slate-500">
                      <a href="#" className="hover:text-primary transition-colors">Protocol HUB</a>
                      <a href="#" className="hover:text-primary transition-colors">Risk Analysis</a>
                      <a href="#" className="hover:text-primary transition-colors">Integration API</a>
                  </div>
              </div>
              <div className="space-y-6">
                  <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">Compliance</h4>
                  <div className="flex flex-col gap-4 text-sm font-medium text-slate-500">
                      <a href="#" className="hover:text-primary transition-colors">Privacy Charter</a>
                      <a href="#" className="hover:text-primary transition-colors">Legal Terms</a>
                      <a href="#" className="hover:text-primary transition-colors">Data Sovereignty</a>
                  </div>
              </div>
              <div className="space-y-6">
                  <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">Professional</h4>
                  <div className="flex flex-col gap-4 text-sm font-medium text-slate-500">
                      <a href="#" className="hover:text-primary transition-colors">Case Studies</a>
                      <a href="#" className="hover:text-primary transition-colors">Institutional</a>
                      <a href="#" className="hover:text-primary transition-colors">Contact Expert</a>
                  </div>
              </div>
          </div>
        </div>
        <div className="max-w-[1600px] mx-auto px-8 md:px-16 mt-24 pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-slate-400 font-medium">&copy; 2026 MediTrack Institutional Systems. All rights reserved.</p>
            <div className="flex items-center gap-8 text-[11px] font-bold text-slate-300 uppercase tracking-widest">
                <span>London</span>
                <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                <span>San Francisco</span>
                <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                <span>Tokyo</span>
            </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <motion.div 
    whileHover={{ y: -12 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    className="medico-card p-12 bg-white shadow-xl hover:shadow-2xl border border-slate-50 group hover:border-primary/20 transition-all"
  >
    <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center mb-10 shadow-inner group-hover:bg-primary/5 transition-colors">
      <div className="scale-125">{icon}</div>
    </div>
    <h3 className="text-2xl font-bold mb-4 text-slate-900 tracking-tight">{title}</h3>
    <p className="text-slate-400 leading-relaxed text-sm font-medium">
      {desc}
    </p>
  </motion.div>
);

export default Home;
