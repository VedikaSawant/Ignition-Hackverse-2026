import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, HeartHandshake, Stethoscope, Play } from 'lucide-react';

export default function DemoBanner() {
  const { user, demoLogin } = useAuth();
  const navigate = useNavigate();

  const handleSwitch = async (role) => {
    await demoLogin(role);
    const paths = { patient: '/dashboard', caregiver: '/caregiver/dashboard', doctor: '/doctor/dashboard' };
    navigate(paths[role]);
  };

  return (
    <div className="bg-slate-900 text-white px-8 py-3 flex items-center justify-between border-b border-white/5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-lg border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
            <Play size={12} fill="currentColor" />
            <span>Simulation Context</span>
        </div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Protocol Multi-Role Access</span>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${user?.role === 'patient' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} 
            onClick={() => handleSwitch('patient')}
        >
            <User size={14} /> Patient Context
        </button>
        <button 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${user?.role === 'caregiver' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} 
            onClick={() => handleSwitch('caregiver')}
        >
            <HeartHandshake size={14} /> Caregiver 
        </button>
        <button 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${user?.role === 'doctor' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} 
            onClick={() => handleSwitch('doctor')}
        >
            <Stethoscope size={14} /> Clinical 
        </button>
      </div>
    </div>
  );
}
