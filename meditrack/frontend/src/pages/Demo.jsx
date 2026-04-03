import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Demo() {
  const { demoLogin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const role = params.get('role') || 'patient';
    demoLogin(role).then(() => {
      const paths = { patient: '/dashboard', caregiver: '/caregiver/dashboard', doctor: '/doctor/dashboard' };
      navigate(paths[role] || '/dashboard');
    }).catch(() => {
      navigate('/login');
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="text-center animate-fade-in">
        <div className="text-5xl mb-4">💊</div>
        <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40 }} />
        <p className="text-gray-600 font-medium">Loading demo...</p>
      </div>
    </div>
  );
}
