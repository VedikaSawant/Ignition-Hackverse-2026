import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, UserCheck, Stethoscope, ArrowRight, ShieldCheck, Activity, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'patient',
    age: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white font-inter">
      <div className="flex w-full min-h-screen overflow-hidden">
        
        {/* ── LEFT COLUMN: AUTH FORM ──────────────────────────────── */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-12 md:p-24 bg-white z-10 overflow-y-auto custom-scrollbar">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md w-full space-y-12"
          >
            <Link to="/" className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-xl">
                <Stethoscope size={28} />
              </div>
              <span className="text-3xl font-bold tracking-tighter text-slate-900">Medi<span className="text-primary">Track</span></span>
            </Link>

            <div className="space-y-4">
                <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Clinical Registration</h1>
                <p className="text-slate-500 text-lg font-medium">Initialize your clinical ID and biometric synchronization protocol.</p>
            </div>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-semibold rounded-xl flex items-center gap-3 shadow-sm"
              >
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                    <Activity size={18} />
                </div>
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Full Legal Name</label>
                  <div className="relative group">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
                    <input
                      required
                      type="text"
                      className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all text-sm font-semibold"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Chronological Age</label>
                  <input
                    required
                    type="number"
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all text-sm font-semibold"
                    placeholder="45"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Email Protocol Address</label>
                <div className="relative group">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
                  <input
                    required
                    type="email"
                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all text-sm font-semibold"
                    placeholder="clinical.id@meditrack.org"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Sovereign Password</label>
                <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
                  <input
                    required
                    type="password"
                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all text-sm font-semibold"
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Account Protocol Role</label>
                <div className="grid grid-cols-3 gap-4">
                  {['patient', 'caregiver', 'doctor'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setFormData({ ...formData, role })}
                      className={`py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.1em] border-2 transition-all ${
                        formData.role === role 
                          ? 'bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-200' 
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-medico btn-medico-primary py-5 text-base font-bold rounded-2xl shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:scale-95 group"
              >
                {loading ? 'Initializing Pipeline...' : 'Complete Phase 1 Registration'}
                {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>

            <div className="pt-8 border-t border-slate-100 text-center">
                <p className="text-slate-500 font-medium">
                  Already registered?{' '}
                  <Link to="/login" className="text-primary font-bold hover:underline transition-all">
                    Access Clinical ID
                  </Link>
                </p>
            </div>
            
            <div className="flex items-center justify-center gap-8 pt-4 opacity-30 grayscale">
                <ShieldCheck size={24} />
                <Sparkles size={24} />
                <Activity size={24} />
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN: IMAGE & TRUST ─────────────────────────── */}
        <div className="hidden lg:block lg:w-1/2 relative bg-slate-900 overflow-hidden">
          <motion.img 
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 0.6 }}
            transition={{ duration: 1.5 }}
            src="file:///C:/Users/91981/.gemini/antigravity/brain/f146f558-d10d-4c68-9f3c-3d8797184174/auth_bg_1775216026938.png" 
            alt="Medical Trust"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,82,255,0.2),transparent)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          
          <div className="absolute inset-0 flex items-center justify-center p-20">
            <div className="max-w-xl w-full space-y-12">
              <div className="flex items-center gap-4 text-primary">
                <div className="w-16 h-1 w-full bg-primary/30 rounded-full" />
                <div className="p-4 bg-primary/20 backdrop-blur-xl rounded-2xl border border-primary/30 shadow-2xl">
                    <ShieldCheck size={32} />
                </div>
                <div className="w-16 h-1 w-full bg-primary/30 rounded-full" />
              </div>

              <div className="space-y-8">
                <h2 className="text-5xl font-bold text-white leading-tight tracking-tight">Enterprise Clinical <br />Data Sovereignty</h2>
                <p className="text-slate-300 text-xl leading-relaxed font-medium opacity-80">
                  We utilize decentralized clinical infrastructure and military-grade encryption to ensure your biometric streams remain strictly confidential and secured under international health protocols.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-10 border-t border-white/10">
                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-white uppercase tracking-[0.2em]">End-to-End Encryption</p>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-white uppercase tracking-[0.2em]">Zero-Knowledge Storage</p>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-white uppercase tracking-[0.2em]">HIPAA Compliance Ready</p>
                </div>
                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-white uppercase tracking-[0.2em]">GDPR Sovereign Data</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
