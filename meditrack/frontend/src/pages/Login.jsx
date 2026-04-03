import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { login as loginApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginApi({ email, password });
      loginSuccess(res.data);
      const paths = { patient: '/dashboard', caregiver: '/caregiver/dashboard', doctor: '/doctor/dashboard' };
      navigate(paths[res.data.user.role] || '/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F4F7FF]">
      {/* Left side - Branding & Illustration (Market Grade) */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>
        
        <div className="relative text-white max-w-md p-12 text-center">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-8xl mb-6 drop-shadow-xl"
          >
            ➕
          </motion.div>
          <motion.h1 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-6xl font-extrabold mb-4"
          >
            MediPlus
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-blue-100 font-medium leading-relaxed"
          >
            Changing the way you receive healthcare with medical excellence.
          </motion.p>
        </div>
      </div>

      {/* Right side - Login Form (Market Grade) */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden text-center mb-8">
             <span className="text-4xl">➕</span>
             <h1 className="text-3xl font-extrabold text-primary">MediPlus</h1>
          </div>

          <div className="pro-card p-10 bg-white shadow-xl rounded-[32px]">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h2>
            <p className="text-gray-500 mb-8">Sign in to continue your health journey.</p>

            {error && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-sm font-medium border border-red-100 flex items-center gap-2"
              >
                <span className="text-xl">⚠️</span> {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="pro-label">Email Address</label>
                <input
                  type="email"
                  className="pro-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="pro-label mb-0">Password</label>
                  <a href="#" className="text-xs font-bold text-primary hover:underline">Forgot?</a>
                </div>
                <input
                  type="password"
                  className="pro-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="btn-pro primary w-full py-4 text-base rounded-2xl shadow-lg shadow-blue-200"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </div>
                ) : 'Log In'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500 font-medium">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary font-bold hover:underline">Register Now</Link>
              </p>
            </div>

            {/* Demo Quick Choice */}
            <div className="mt-10 pt-8 border-t border-gray-100">
               <p className="text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest mb-4">Quick Demo Portal</p>
               <div className="flex justify-between gap-3">
                  {[
                    { email: 'patient@demo.com', role: 'Patient', icon: '👤' },
                    { email: 'doctor@demo.com', role: 'Doctor', icon: '🩺' }
                  ].map(demo => (
                    <button
                      key={demo.role}
                      onClick={() => { setEmail(demo.email); setPassword('demo123'); }}
                      className="flex-1 p-3 rounded-2xl bg-gray-50 hover:bg-primary-light hover:text-primary transition-all text-sm font-bold flex flex-col items-center gap-1 border border-transparent hover:border-primary-light"
                    >
                      <span className="text-lg">{demo.icon}</span>
                      {demo.role}
                    </button>
                  ))}
               </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
