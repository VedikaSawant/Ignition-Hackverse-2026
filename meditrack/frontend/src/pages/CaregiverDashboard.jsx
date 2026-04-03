import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCaregiverPatients, getCaregiverAlerts } from '../api/caregiver';
import AlertFeed from '../components/AlertFeed';
import AdherenceRing from '../components/AdherenceRing';

export default function CaregiverDashboard() {
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [p, a] = await Promise.all([getCaregiverPatients(), getCaregiverAlerts()]);
      setPatients(p.data);
      setAlerts(a.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const highRiskCount = patients.filter(p => p.risk_level === 'high').length;
  const avgAdherence = patients.length > 0
    ? Math.round(patients.reduce((s, p) => s + p.weekly_adherence, 0) / patients.length)
    : 0;

  if (loading) return (
    <div className="page-container">
      <div className="loading-skeleton h-8 w-48 mb-6 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="loading-skeleton h-48 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">🤝 Caregiver Dashboard</h1>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-extrabold text-blue-600">{patients.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Patients</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-extrabold text-red-500">{highRiskCount}</p>
          <p className="text-xs text-gray-500 mt-1">High Risk</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-extrabold text-green-600">{avgAdherence}%</p>
          <p className="text-xs text-gray-500 mt-1">Avg Adherence</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient cards */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-800 mb-4">👥 My Patients</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patients.map((p) => {
              const riskColors = { low: 'risk-low', medium: 'risk-medium', high: 'risk-high' };
              return (
                <div key={p.id} className="glass-card p-5 cursor-pointer" onClick={() => navigate(`/caregiver/patients/${p.id}`)}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold">
                      {p.name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{p.name}</h3>
                      <p className="text-xs text-gray-500">Age {p.age} · {p.conditions}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <AdherenceRing percent={p.weekly_adherence} size={60} strokeWidth={6} label="" />
                    <div className="text-right">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${riskColors[p.risk_level]}`}>
                        {p.risk_level === 'high' ? '🔴' : p.risk_level === 'medium' ? '🟡' : '🟢'} {p.risk_level}
                      </span>
                      <p className="text-xs text-gray-400 mt-2">{p.medicines_count} meds</p>
                    </div>
                  </div>
                  <button className="btn-outline w-full mt-3 text-sm py-2">View Details →</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alert feed */}
        <div>
          <AlertFeed alerts={alerts} onRefresh={fetchData} />
        </div>
      </div>
    </div>
  );
}
