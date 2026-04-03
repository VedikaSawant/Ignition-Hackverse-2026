import { 
  LayoutDashboard, 
  Pill, 
  BarChart3, 
  Brain, 
  Activity, 
  Home, 
  Stethoscope,
  Bell,
  LogOut,
  ChevronDown
} from 'lucide-react';

const NAV_ITEMS = {
  patient: [
    { path: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { path: '/medicines', label: 'Medicine', icon: <Pill size={18} /> },
    { path: '/intelligence', label: 'Intelligence', icon: <BarChart3 size={18} /> },
    { path: '/insights', label: 'Clinical AI', icon: <Brain size={18} /> },
    { path: '/health', label: 'Vitals', icon: <Activity size={18} /> },
  ],
  caregiver: [
    { path: '/caregiver/dashboard', label: 'Dashboard', icon: <Home size={18} /> },
  ],
  doctor: [
    { path: '/doctor/dashboard', label: 'Clinic', icon: <Stethoscope size={18} /> },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useAlerts();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!user) return null;

  const items = NAV_ITEMS[user.role] || NAV_ITEMS.patient;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
      scrolled 
        ? 'bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] py-3' 
        : 'bg-transparent py-5'
    }`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/dashboard" className="flex items-center gap-4 group no-underline">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200 border border-slate-800"
            >
              <Activity className="text-primary w-6 h-6" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-slate-900 tracking-tighter leading-none">MediTrack</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] leading-none mt-1.5">Clinical Protocol</span>
            </div>
          </Link>

          {/* Main Navigation (Desktop) */}
          <div className="hidden lg:flex items-center bg-gray-100/50 p-1.5 rounded-2xl border border-gray-200/50 backdrop-blur-sm">
            {items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all no-underline ${
                    isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="nav-bg"
                      className="absolute inset-0 bg-white shadow-sm rounded-xl border border-gray-100"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10 text-lg">{item.icon}</span>
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Action Area */}
          <div className="flex items-center gap-4">
             {/* Notifications */}
             <button 
              onClick={() => navigate('/dashboard')}
              className="relative w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl hover:border-primary/30 hover:bg-slate-50 transition-all group"
             >
                <Bell size={20} className="text-slate-400 group-hover:text-primary transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
             </button>

             {/* Profile Section */}
             <div className="relative">
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-3 pl-3 pr-2 py-1.5 bg-white border border-gray-100 rounded-2xl hover:border-primary/30 transition-all"
                >
                   <div className="hidden sm:block text-right">
                      <p className="text-xs font-bold text-text leading-none">{user.name?.split(' ')[0]}</p>
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-0.5">{user.role}</p>
                   </div>
                   <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white font-bold shadow-md">
                      {user.name?.charAt(0)}
                   </div>
                </button>

                <AnimatePresence>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-2"
                      >
                         <div className="px-5 py-4 bg-gray-50 rounded-2xl mb-2">
                            <p className="text-sm font-bold text-text truncate">{user.name}</p>
                            <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                         </div>
                         <button 
                          onClick={() => { logout(); navigate('/login'); }}
                          className="w-full flex items-center gap-4 px-6 py-4 text-[13px] font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-colors"
                         >
                            <LogOut size={18} /> Sign Out
                         </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
             </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
