import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import DemoBanner from './components/DemoBanner';
import Login from './pages/Login';
import Register from './pages/Register';
import Demo from './pages/Demo';
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

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40 }} />
          <p className="text-gray-500">Loading...</p>
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

function AppLayout({ children }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {user && <DemoBanner />}
      {user && <Navbar />}
      {children}
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route path="/demo" element={<Demo />} />

        {/* Patient routes */}
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
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
