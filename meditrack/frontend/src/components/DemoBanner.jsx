import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DemoBanner() {
  const { user, demoLogin } = useAuth();
  const navigate = useNavigate();

  const handleSwitch = async (role) => {
    await demoLogin(role);
    const paths = { patient: '/dashboard', caregiver: '/caregiver/dashboard', doctor: '/doctor/dashboard' };
    navigate(paths[role]);
  };

  return (
    <div className="demo-banner">
      <span>🎯 Demo Mode — Quick Switch:</span>
      <button className={user?.role === 'patient' ? 'active' : ''} onClick={() => handleSwitch('patient')}>
        👤 Patient
      </button>
      <button className={user?.role === 'caregiver' ? 'active' : ''} onClick={() => handleSwitch('caregiver')}>
        🤝 Caregiver
      </button>
      <button className={user?.role === 'doctor' ? 'active' : ''} onClick={() => handleSwitch('doctor')}>
        🩺 Doctor
      </button>
    </div>
  );
}
