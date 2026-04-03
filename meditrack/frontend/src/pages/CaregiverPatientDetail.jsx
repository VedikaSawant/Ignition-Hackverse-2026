import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPatientSummary } from '../api/caregiver';
import { getInsights } from '../api/predictions';
import AdherenceRing from '../components/AdherenceRing';
import HealthMetricChart from '../components/HealthMetricChart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CaregiverPatientDetail() {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatientSummary(id)
      .then(r => setSummary(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !summary) return (
    <div className="page-container">
      <div className="loading-skeleton h-8 w-48 mb-6 rounded" />
      <div className="loading-skeleton h-64 rounded-xl" />
    </div>
  );

  const { patient, weekly_adherence, monthly_adherence, risk, medicines, today_schedule, missed_recent, daily_adherence } = summary;

  return (
    <div className="page-container">
      {/* Patient Header */}
      <div className="glass-card p-6 mb-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
            {patient.name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{patient.name}</h1>
            <p className="text-sm text-gray-500">Age {patient.age} · {patient.conditions}</p>
            <p className="text-xs text-gray-400">{patient.email}</p>
          </div>
          <div className="ml-auto text-right">
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${
              risk.risk_level === 'high' ? 'risk-high' : risk.risk_level === 'medium' ? 'risk-medium' : 'risk-low'
            }`}>
              Risk: {risk.risk_score}/100
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-5 text-center">
              <AdherenceRing percent={weekly_adherence} size={80} strokeWidth={8} label="7-Day" />
            </div>
            <div className="glass-card p-5 text-center">
              <AdherenceRing percent={monthly_adherence} size={80} strokeWidth={8} label="30-Day" />
            </div>
          </div>

          {/* Adherence trend */}
          {daily_adherence?.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 7-Day Adherence Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={daily_adherence.map(d => ({ ...d, date: d.date.slice(5) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Line type="monotone" dataKey="adherence_percent" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} name="%" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Missed doses table */}
          {missed_recent?.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">❌ Recent Missed Doses</h3>
              <div className="space-y-2">
                {missed_recent.map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.medicine_name}</p>
                      <p className="text-xs text-gray-500">{m.scheduled_time}</p>
                    </div>
                    {m.skip_reason && <span className="text-xs text-gray-500 capitalize">{m.skip_reason}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Today's schedule */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 Today's Schedule</h3>
            {today_schedule?.length > 0 ? (
              <div className="space-y-2">
                {today_schedule.map((d, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${
                    d.status === 'taken' ? 'bg-green-50' : d.status === 'missed' ? 'bg-red-50' : 'bg-gray-50'
                  }`}>
                    <div>
                      <p className="text-sm font-medium">{d.medicine_name}</p>
                      <p className="text-xs text-gray-500">{d.medicine_dosage} · {d.scheduled_time.split(' ')[1]}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      d.status === 'taken' ? 'status-taken' : d.status === 'missed' ? 'status-missed' : 'status-pending'
                    }`}>{d.status}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No doses scheduled</p>}
          </div>

          {/* Medicines list */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">💊 Medications</h3>
            <div className="space-y-2">
              {medicines?.map((m, i) => (
                <div key={i} className="p-3 rounded-xl bg-gray-50">
                  <p className="text-sm font-medium text-gray-800">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.dosage} · {m.type}</p>
                </div>
              ))}
            </div>
          </div>

          <button className="btn-primary w-full">📲 Send Reminder</button>
        </div>
      </div>
    </div>
  );
}
