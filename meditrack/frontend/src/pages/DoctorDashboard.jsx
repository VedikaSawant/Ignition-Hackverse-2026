import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoctorPatients, getNonCompliant } from '../api/doctor';

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDoctorPatients()
      .then(r => setPatients(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(p => {
    if (filter === 'high_risk') return p.risk_level === 'high';
    if (filter === 'low_adherence') return p.weekly_adherence < 60;
    return true;
  });

  if (loading) return (
    <div className="page-container">
      <div className="loading-skeleton h-8 w-48 mb-6 rounded" />
      <div className="loading-skeleton h-64 rounded-xl" />
    </div>
  );

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">🩺 Doctor Dashboard</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { val: 'all', label: 'All Patients' },
          { val: 'high_risk', label: '🔴 High Risk' },
          { val: 'low_adherence', label: '📉 Low Adherence (<60%)' },
        ].map(f => (
          <button key={f.val} onClick={() => setFilter(f.val)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f.val ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Patient table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <th className="p-4">Patient</th>
                <th className="p-4">Conditions</th>
                <th className="p-4">30-Day Adherence</th>
                <th className="p-4">Risk</th>
                <th className="p-4">Medications</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isLow = p.weekly_adherence < 60;
                return (
                  <tr key={p.id} className={`border-t border-gray-100 ${isLow ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                          {p.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-400">Age {p.age}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 text-xs">{p.conditions || '—'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            p.weekly_adherence >= 80 ? 'bg-green-500' : p.weekly_adherence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} style={{ width: `${p.weekly_adherence}%` }} />
                        </div>
                        <span className={`text-sm font-bold ${
                          p.weekly_adherence >= 80 ? 'text-green-600' : p.weekly_adherence >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>{Math.round(p.weekly_adherence)}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        p.risk_level === 'high' ? 'risk-high' : p.risk_level === 'medium' ? 'risk-medium' : 'risk-low'
                      }`}>
                        {p.risk_level === 'high' ? '🔴' : p.risk_level === 'medium' ? '🟡' : '🟢'} {p.risk_level}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{p.medicines_count}</td>
                    <td className="p-4">
                      <button onClick={() => navigate(`/doctor/patients/${p.id}`)}
                        className="btn-outline text-xs py-1.5 px-3">
                        View Report
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
