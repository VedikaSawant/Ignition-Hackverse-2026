import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getDoctorPatientReport, prescribeMedicine } from '../api/doctor';
import AdherenceRing from '../components/AdherenceRing';
import HealthMetricChart from '../components/HealthMetricChart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DoctorPatientDetail() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPrescribe, setShowPrescribe] = useState(false);
  const [form, setForm] = useState({
    name: '', dosage: '', medicine_type: 'tablet', frequency: 'once',
    times_of_day: ['08:00'], before_after_food: 'after', total_quantity: 30,
  });

  useEffect(() => {
    getDoctorPatientReport(id)
      .then(r => setReport(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrescribe = async (e) => {
    e.preventDefault();
    await prescribeMedicine({ ...form, patient_id: parseInt(id) });
    setShowPrescribe(false);
    getDoctorPatientReport(id).then(r => setReport(r.data));
  };

  if (loading || !report) return (
    <div className="page-container">
      <div className="loading-skeleton h-8 w-48 mb-6 rounded" />
      <div className="loading-skeleton h-64 rounded-xl" />
    </div>
  );

  const { patient, overall_adherence, total_doses, taken, missed, risk, medicine_breakdown, health_metrics, daily_adherence } = report;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="glass-card p-6 mb-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
              {patient.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{patient.name}</h1>
              <p className="text-sm text-gray-500">Age {patient.age} · {patient.conditions}</p>
              <p className="text-xs text-gray-400">{patient.email} · {patient.phone}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPrescribe(!showPrescribe)} className="btn-primary text-sm">
              📝 Prescribe Medicine
            </button>
          </div>
        </div>
      </div>

      {/* Prescribe Form */}
      {showPrescribe && (
        <div className="glass-card p-6 mb-6 animate-fade-in">
          <h3 className="text-lg font-bold mb-4">📝 Add Prescription</h3>
          <form onSubmit={handlePrescribe} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="form-label">Medicine</label><input className="form-input" placeholder="e.g. Atorvastatin" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
            <div><label className="form-label">Dosage</label><input className="form-input" placeholder="e.g. 10mg" value={form.dosage} onChange={e => setForm({...form, dosage: e.target.value})} required /></div>
            <div><label className="form-label">Frequency</label>
              <select className="form-select" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}>
                <option value="once">Once daily</option><option value="twice">Twice daily</option><option value="thrice">Thrice daily</option>
              </select>
            </div>
            <div className="md:col-span-3 flex gap-2">
              <button type="submit" className="btn-success">✅ Add Prescription</button>
              <button type="button" onClick={() => setShowPrescribe(false)} className="btn-outline">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-5 text-center">
          <AdherenceRing percent={overall_adherence} size={70} strokeWidth={7} label="30-Day" />
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-extrabold text-green-600">{taken}</p>
          <p className="text-xs text-gray-500 mt-1">Doses Taken</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-extrabold text-red-500">{missed}</p>
          <p className="text-xs text-gray-500 mt-1">Doses Missed</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className={`text-3xl font-extrabold ${risk.risk_level === 'high' ? 'text-red-500' : risk.risk_level === 'medium' ? 'text-yellow-500' : 'text-green-500'}`}>
            {risk.risk_score}
          </p>
          <p className="text-xs text-gray-500 mt-1">Risk Score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Adherence trend */}
        {daily_adherence?.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 30-Day Adherence Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={daily_adherence.map(d => ({ ...d, date: d.date.slice(5) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="adherence_percent" stroke="#2563EB" strokeWidth={2} dot={{ r: 2 }} name="%" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Medicine breakdown */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">💊 Per-Medicine Breakdown</h3>
          <div className="space-y-3">
            {medicine_breakdown?.map((m, i) => (
              <div key={i} className="p-3 rounded-xl bg-gray-50">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium text-gray-800">{m.medicine_name} ({m.dosage})</p>
                  <span className={`text-xs font-bold ${m.adherence_percent >= 80 ? 'text-green-600' : m.adherence_percent >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {m.adherence_percent}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${m.adherence_percent >= 80 ? 'bg-green-500' : m.adherence_percent >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${m.adherence_percent}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{m.taken}/{m.total} doses · {m.type} · {m.frequency}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Health metrics */}
        {health_metrics?.length > 0 && (
          <div className="lg:col-span-2">
            <HealthMetricChart
              data={[...health_metrics].reverse().map(h => ({
                date: h.date,
                blood_pressure_systolic: h.bp_systolic,
                blood_pressure_diastolic: h.bp_diastolic,
                blood_sugar: h.blood_sugar,
              }))}
              metrics={['blood_pressure_systolic', 'blood_sugar']}
              title="Health Metrics Overview"
            />
          </div>
        )}
      </div>
    </div>
  );
}
