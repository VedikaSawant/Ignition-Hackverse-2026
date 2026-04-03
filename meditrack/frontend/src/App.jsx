import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DemoBanner from './components/DemoBanner';
import Login from './pages/Login';
import Register from './pages/Register';
import Demo from './pages/Demo';
import Home from './pages/Home';
import PatientDashboard from './pages/PatientDashboard';
import Medicines from './pages/Medicines';
import Adherence from './pages/Adherence';
import Insights from './pages/Insights';
import HealthLog from './pages/HealthLog';
import Achievements from './pages/Achievements';
import CaregiverDashboard from './pages/CaregiverDashboard';
import CaregiverPatientDetail from './pages/CaregiverPatientDetail';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorPatientDetail from './pages/DoctorPatientDetail';
import IntelligenceDashboard from './pages/IntelligenceDashboard';
import { motion, AnimatePresence } from 'framer-motion';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Initializing MediTrack...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    const paths = { patient: '/dashboard', caregiver: '/caregiver/dashboard', doctor: '/doctor/dashboard' };
    return <Navigate to={paths[user.role] || '/dashboard'} replace />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Show Navbar only for the landing page or if needed */}
      {!user && <Navbar />}
      
      <div className={user ? "flex overflow-hidden" : ""}>
        {user && <Sidebar />}
        
        <main className={user ? "flex-1 h-screen overflow-y-auto" : "w-full"}>
          {user && <DemoBanner />}
          <AnimatePresence mode="wait">
            <Routes>
                {/* Public routes */}
                <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Home />} />
                <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
                <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
                <Route path="/demo" element={<Demo />} />

                {/* Authenticated routes wrap in motion for transitions */}
                <Route path="/dashboard" element={<ProtectedRoute roles={['patient']}><PatientDashboard /></ProtectedRoute>} />
                <Route path="/medicines" element={<ProtectedRoute roles={['patient']}><Medicines /></ProtectedRoute>} />
                <Route path="/adherence" element={<ProtectedRoute roles={['patient']}><Adherence /></ProtectedRoute>} />
                <Route path="/insights" element={<ProtectedRoute roles={['patient']}><Insights /></ProtectedRoute>} />
                <Route path="/intelligence" element={<ProtectedRoute roles={['patient']}><IntelligenceDashboard /></ProtectedRoute>} />
                <Route path="/health" element={<ProtectedRoute roles={['patient']}><HealthLog /></ProtectedRoute>} />
                <Route path="/achievements" element={<ProtectedRoute roles={['patient']}><Achievements /></ProtectedRoute>} />

                {/* Caregiver routes */}
                <Route path="/caregiver/dashboard" element={<ProtectedRoute roles={['caregiver']}><CaregiverDashboard /></ProtectedRoute>} />
                <Route path="/caregiver/patients/:id" element={<ProtectedRoute roles={['caregiver']}><CaregiverPatientDetail /></ProtectedRoute>} />

                {/* Doctor routes */}
                <Route path="/doctor/dashboard" element={<ProtectedRoute roles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
                <Route path="/doctor/patients/:id" element={<ProtectedRoute roles={['doctor']}><DoctorPatientDetail /></ProtectedRoute>} />

                {/* Default redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" reverseOrder={false} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
