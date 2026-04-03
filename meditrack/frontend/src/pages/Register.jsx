import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { register as registerApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '', password: '', name: '', role: 'patient'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await registerApi(formData);
      loginSuccess(res.data);
      const paths = { patient: '/dashboard', caregiver: '/caregiver/dashboard', doctor: '/doctor/dashboard' };
      navigate(paths[formData.role] || '/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F4F7FF]">
      {/* Left side - Branding (Market Grade) */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 blur-xl">
           <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white rounded-full"></div>
           <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200 rounded-full"></div>
        </div>
        
        <div className="relative text-white max-w-lg text-center">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-7xl font-extrabold mb-8"
          >
            Create your account
          </motion.h1>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-8 pro-card bg-white/10 backdrop-blur border-white/20 text-blue-50 text-left"
          >
            <p className="text-xl font-medium italic mb-4">"The best healthcare is proactive, intelligent, and human."</p>
            <p className="text-sm opacity-80">— Dr. Aria, Lead AI Consultant</p>
          </motion.div>
        </div>
      </div>

      {/* Right side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-xl"
        >
          <div className="pro-card p-10 bg-white shadow-2xl rounded-[40px]">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-2">Join MediPlus</h2>
            <p className="text-gray-500 mb-10">Experience the future of personalized medicine.</p>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 border border-red-100 flex items-center gap-2 font-medium">
                <span className="text-xl">⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
              <div className="md:col-span-2">
                <label className="pro-label">Full Name</label>
                <input
                  type="text"
                  className="pro-input"
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="pro-label">Email address</label>
                <input
                  type="email"
                  className="pro-input font-medium"
                  placeholder="you@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="pro-label">Account Role</label>
                <select
                  className="pro-input appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748B%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22/%3E%3C/svg%3E')] bg-[length:12px] bg-[right_20px_center] bg-no-repeat"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="patient">Patient</option>
                  <option value="caregiver">Caregiver</option>
                  <option value="doctor">Doctor</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="pro-label">Secure Password</label>
                <input
                  type="password"
                  className="pro-input font-mono"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="md:col-span-2 btn-pro primary py-5 text-lg rounded-2xl shadow-xl shadow-blue-200 mt-4">
                {loading ? 'Creating account...' : 'Start your journey'}
              </button>
            </form>

            <p className="mt-10 text-center text-sm font-medium text-gray-500">
              Already using MediPlus?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">Log in here</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
