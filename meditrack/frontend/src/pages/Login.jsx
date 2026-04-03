import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, Activity, Stethoscope, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white font-inter">
      <div className="flex w-full min-h-screen overflow-hidden">
        
        {/* ── LEFT COLUMN: AUTH FORM ──────────────────────────────── */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-12 md:p-24 bg-white z-10">
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
                <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Clinical Login</h1>
                <p className="text-slate-500 text-lg font-medium">Access your personalized health protocol and biometric streams.</p>
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
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Email Protocol Address</label>
                <div className="relative group">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all text-slate-700 font-semibold"
                    placeholder="clinical.id@meditrack.org"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Sovereign Password</label>
                  <a href="#" className="text-xs font-bold text-primary hover:text-primary-dark transition-colors tracking-tight">Recover Access</a>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all text-slate-700 font-semibold"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-medico btn-medico-primary py-5 text-base font-bold rounded-2xl shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 group transition-all hover:-translate-y-1 active:scale-95"
              >
                {loading ? 'Authenticating Protocol...' : 'Initialize Access'}
                {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>

            <div className="pt-8 border-t border-slate-100 text-center">
                <p className="text-slate-500 font-medium">
                  New to the platform?{' '}
                  <Link to="/register" className="text-primary font-bold hover:underline transition-all">
                    Register Clinical ID
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

        {/* ── RIGHT COLUMN: IMAGE & QUOTE ─────────────────────────── */}
        <div className="hidden lg:block lg:w-1/2 relative bg-slate-900 overflow-hidden">
          <motion.img 
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 0.6 }}
            transition={{ duration: 1.5 }}
            src="file:///C:/Users/91981/.gemini/antigravity/brain/f146f558-d10d-4c68-9f3c-3d8797184174/auth_bg_1775216026938.png" 
            alt="Medical Background"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,82,255,0.2),transparent)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          
          <div className="absolute inset-0 flex items-center justify-center p-20">
            <div className="max-w-xl w-full space-y-12">
              <div className="flex items-center gap-4 text-primary">
                <div className="w-16 h-1 w-full bg-primary/30 rounded-full" />
                <div className="p-4 bg-primary/20 backdrop-blur-xl rounded-2xl border border-primary/30 shadow-2xl">
                    <Activity size={32} />
                </div>
                <div className="w-16 h-1 w-full bg-primary/30 rounded-full" />
              </div>

              <div className="space-y-8">
                <h2 className="text-5xl font-bold text-white leading-tight tracking-tight">Empowering Better <br />Health Decisions</h2>
                <p className="text-slate-300 text-xl leading-relaxed font-medium italic opacity-80">
                  "MediTrack has revolutionized how I synchronize my clinical protocols. The behavioral insights and provider streams give me complete sovereignty over my health journey."
                </p>
              </div>

              <div className="flex items-center gap-6 pt-10 border-t border-white/10">
                <div className="w-16 h-16 rounded-3xl bg-primary shadow-2xl flex items-center justify-center font-bold text-white text-2xl border border-white/20">JS</div>
                <div>
                  <p className="text-2xl font-bold text-white tracking-tight uppercase">John Stevens</p>
                  <p className="text-sm font-bold text-primary uppercase tracking-[0.2em] mt-1">Verified Clinical User</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
