import { useState, useEffect } from 'react';
import { logHealth, getHealthHistory } from '../api/health';
import HealthMetricChart from '../components/HealthMetricChart';

const MOODS = ['😫', '😟', '😐', '🙂', '😊'];

export default function HealthLog() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    blood_pressure_systolic: '', blood_pressure_diastolic: '',
    blood_sugar: '', weight: '', mood: 3, pain_level: 1, notes: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await getHealthHistory(60);
      setHistory(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await logHealth({
        ...form,
        blood_pressure_systolic: form.blood_pressure_systolic ? parseInt(form.blood_pressure_systolic) : null,
        blood_pressure_diastolic: form.blood_pressure_diastolic ? parseInt(form.blood_pressure_diastolic) : null,
        blood_sugar: form.blood_sugar ? parseFloat(form.blood_sugar) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
      });
      fetchHistory();
      setForm(f => ({ ...f, blood_pressure_systolic: '', blood_pressure_diastolic: '', blood_sugar: '', weight: '', notes: '' }));
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">❤️ Health Log</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log form */}
        <div className="glass-card p-6 animate-fade-in">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📝 Log Today's Metrics</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">BP Systolic</label>
                <input className="form-input" type="number" placeholder="120" value={form.blood_pressure_systolic} onChange={e => setForm({...form, blood_pressure_systolic: e.target.value})} />
              </div>
              <div>
                <label className="form-label">BP Diastolic</label>
                <input className="form-input" type="number" placeholder="80" value={form.blood_pressure_diastolic} onChange={e => setForm({...form, blood_pressure_diastolic: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="form-label">Blood Sugar (mg/dL)</label>
              <input className="form-input" type="number" placeholder="110" value={form.blood_sugar} onChange={e => setForm({...form, blood_sugar: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Weight (kg)</label>
              <input className="form-input" type="number" step="0.1" placeholder="75.0" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Mood</label>
              <div className="flex gap-2 mt-1">
                {MOODS.map((m, i) => (
                  <button key={i} type="button" onClick={() => setForm({...form, mood: i + 1})}
                    className={`text-2xl p-2 rounded-lg transition-all ${form.mood === i + 1 ? 'bg-blue-100 scale-110' : 'hover:bg-gray-100'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Pain Level: {form.pain_level}/5</label>
              <input type="range" min="1" max="5" value={form.pain_level} onChange={e => setForm({...form, pain_level: parseInt(e.target.value)})}
                className="w-full mt-1" />
            </div>
            <div>
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows="2" placeholder="Any observations..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <button type="submit" disabled={saving} className="btn-success w-full py-3">
              {saving ? 'Saving...' : '💾 Save Entry'}
            </button>
          </form>
        </div>

        {/* Charts */}
        <div className="lg:col-span-2 space-y-6">
          {history.length > 0 ? (
            <>
              <HealthMetricChart data={[...history].reverse()} metrics={['blood_pressure_systolic', 'blood_pressure_diastolic']} title="Blood Pressure Trend" />
              <HealthMetricChart data={[...history].reverse()} metrics={['blood_sugar']} title="Blood Sugar Trend" />
              <HealthMetricChart data={[...history].reverse()} metrics={['weight']} title="Weight Trend" />
            </>
          ) : (
            <div className="glass-card p-8 text-center">
              <p className="text-2xl mb-2">📊</p>
              <p className="text-gray-500">No health data logged yet. Start logging to see trends!</p>
            </div>
          )}

          {/* History table */}
          {history.length > 0 && (
            <div className="glass-card p-5 overflow-x-auto">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 Recent Entries</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">BP</th>
                    <th className="pb-2 pr-4">Sugar</th>
                    <th className="pb-2 pr-4">Weight</th>
                    <th className="pb-2 pr-4">Mood</th>
                    <th className="pb-2">Pain</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 10).map((h) => (
                    <tr key={h.id} className="border-b border-gray-50">
                      <td className="py-2 pr-4 font-medium">{h.date}</td>
                      <td className="py-2 pr-4">{h.blood_pressure_systolic}/{h.blood_pressure_diastolic}</td>
                      <td className="py-2 pr-4">{h.blood_sugar || '—'}</td>
                      <td className="py-2 pr-4">{h.weight || '—'}</td>
                      <td className="py-2 pr-4">{MOODS[(h.mood || 3) - 1]}</td>
                      <td className="py-2">{h.pain_level}/5</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
