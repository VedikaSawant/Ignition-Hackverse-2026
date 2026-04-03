import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Pill, 
  BrainCircuit, 
  LineChart, 
  HeartPulse, 
  Trophy,
  LogOut,
  Stethoscope,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const NAV_ITEMS = {
  patient: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/medicines', label: 'Medications', icon: Pill },
    { path: '/intelligence', label: 'Clinical Intelligence', icon: BrainCircuit },
    { path: '/insights', label: 'Protocol Analysis', icon: LineChart },
    { path: '/health', label: 'Vital Logs', icon: HeartPulse },
    { path: '/achievements', label: 'Milestones', icon: Trophy },
  ],
  caregiver: [
    { path: '/caregiver/dashboard', label: 'Patients', icon: LayoutDashboard },
  ],
  doctor: [
    { path: '/doctor/dashboard', label: 'Clinical Overview', icon: Stethoscope },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const role = user?.role || 'patient';
  const items = NAV_ITEMS[role];

  return (
    <aside className="w-80 bg-white border-r border-slate-100 h-screen sticky top-0 flex flex-col z-50">
      {/* Brand Logo */}
      <div className="p-10 pb-8">
        <Link to="/" className="flex items-center gap-4 no-underline group">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-sm text-white transition-transform group-hover:scale-105">
            <Stethoscope size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-slate-900 tracking-tight leading-none">MediTrack</span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-1.5">Health Portal</span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-6 space-y-1.5 mt-6">
        <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 opacity-70">Management</p>
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-5 py-4 rounded-2xl text-[14px] font-medium transition-all no-underline ${
                isActive 
                  ? 'bg-primary/5 text-primary' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-4">
                <Icon size={20} className={isActive ? 'text-primary' : 'text-slate-400'} />
                <span className={isActive ? 'font-bold' : ''}>{item.label}</span>
              </div>
              {isActive && (
                <motion.div layoutId="active-indicator" className="w-1 h-6 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile Section */}
      <div className="p-8 border-t border-slate-50">
        <div className="mb-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 border border-transparent hover:border-slate-100 transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                    {user?.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{role}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
            </div>
        </div>

        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-5 py-4 text-sm font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all group"
        >
          <LogOut size={20} className="transition-transform group-hover:-translate-x-1" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
