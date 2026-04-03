import { useState } from 'react';
import useMedicines from '../hooks/useMedicines';
import { addMedicine, updateMedicine, deleteMedicine, pauseMedicine } from '../api/medicines';

const TYPE_ICONS = { tablet: '💊', syrup: '🧴', injection: '💉', inhaler: '🫁' };
const FREQ_LABELS = { once: '1x daily', twice: '2x daily', thrice: '3x daily', custom: 'Custom' };

export default function Medicines() {
  const { medicines, loading, refresh } = useMedicines();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '', dosage: '', medicine_type: 'tablet', frequency: 'once',
    times_of_day: ['08:00'], before_after_food: 'after',
    start_date: new Date().toISOString().split('T')[0], end_date: '',
    total_quantity: 30, refill_alert_threshold: 5,
  });

  const resetForm = () => {
    setForm({
      name: '', dosage: '', medicine_type: 'tablet', frequency: 'once',
      times_of_day: ['08:00'], before_after_food: 'after',
      start_date: new Date().toISOString().split('T')[0], end_date: '',
      total_quantity: 30, refill_alert_threshold: 5,
    });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, remaining_quantity: form.total_quantity };
    if (editId) {
      await updateMedicine(editId, payload);
    } else {
      await addMedicine(payload);
    }
    resetForm();
    refresh();
  };

  const handleEdit = (med) => {
    setForm({
      name: med.name, dosage: med.dosage, medicine_type: med.medicine_type,
      frequency: med.frequency, times_of_day: med.times_of_day,
      before_after_food: med.before_after_food,
      start_date: med.start_date || '', end_date: med.end_date || '',
      total_quantity: med.total_quantity, refill_alert_threshold: med.refill_alert_threshold,
    });
    setEditId(med.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Deactivate this medicine?')) {
      await deleteMedicine(id);
      refresh();
    }
  };

  const handlePause = async (id) => {
    await pauseMedicine(id);
    refresh();
  };

  const updateTimes = (freq) => {
    const timesMap = { once: ['08:00'], twice: ['08:00', '20:00'], thrice: ['08:00', '14:00', '20:00'], custom: ['08:00'] };
    setForm(f => ({ ...f, frequency: freq, times_of_day: timesMap[freq] }));
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">💊 My Medicines</h1>
          <p className="text-sm text-gray-500 mt-1">{medicines.length} active medicines</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? '✕ Close' : '+ Add Medicine'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="glass-card p-6 mb-6 animate-fade-in">
          <h3 className="text-lg font-bold mb-4">{editId ? 'Edit Medicine' : 'Add New Medicine'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Medicine Name</label>
              <input className="form-input" placeholder="e.g. Metformin" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label className="form-label">Dosage</label>
              <input className="form-input" placeholder="e.g. 500mg" value={form.dosage} onChange={e => setForm({...form, dosage: e.target.value})} required />
            </div>
            <div>
              <label className="form-label">Type</label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {Object.entries(TYPE_ICONS).map(([t, icon]) => (
                  <button key={t} type="button"
                    onClick={() => setForm({...form, medicine_type: t})}
                    className={`p-2 rounded-xl text-center border-2 transition-all ${form.medicine_type === t ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="text-xl">{icon}</div>
                    <div className="text-[10px] capitalize mt-0.5">{t}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Frequency</label>
              <select className="form-select" value={form.frequency} onChange={e => updateTimes(e.target.value)}>
                <option value="once">Once daily</option>
                <option value="twice">Twice daily</option>
                <option value="thrice">Thrice daily</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="form-label">Dose Times</label>
              <div className="space-y-2">
                {form.times_of_day.map((t, i) => (
                  <input key={i} type="time" className="form-input" value={t}
                    onChange={e => {
                      const times = [...form.times_of_day];
                      times[i] = e.target.value;
                      setForm({...form, times_of_day: times});
                    }} />
                ))}
                {form.frequency === 'custom' && (
                  <button type="button" onClick={() => setForm({...form, times_of_day: [...form.times_of_day, '12:00']})}
                    className="text-sm text-blue-600 font-medium">+ Add time</button>
                )}
              </div>
            </div>
            <div>
              <label className="form-label">With Food</label>
              <div className="flex gap-2 mt-1">
                {['before', 'after', 'with'].map(o => (
                  <button key={o} type="button"
                    onClick={() => setForm({...form, before_after_food: o})}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize border-2 transition-all ${
                      form.before_after_food === o ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'
                    }`}>{o}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Start Date</label>
              <input type="date" className="form-input" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
            </div>
            <div>
              <label className="form-label">End Date (optional)</label>
              <input type="date" className="form-input" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Total Quantity</label>
              <input type="number" className="form-input" value={form.total_quantity} onChange={e => setForm({...form, total_quantity: parseInt(e.target.value)})} />
            </div>
            <div>
              <label className="form-label">Refill Alert At</label>
              <input type="number" className="form-input" value={form.refill_alert_threshold} onChange={e => setForm({...form, refill_alert_threshold: parseInt(e.target.value)})} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="btn-success">{editId ? '💾 Update' : '✅ Add Medicine'}</button>
              <button type="button" onClick={resetForm} className="btn-outline">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Medicine cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="loading-skeleton h-48 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medicines.map((med) => (
            <div key={med.id} className={`glass-card p-5 animate-fade-in ${med.is_paused ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{TYPE_ICONS[med.medicine_type] || '💊'}</span>
                  <div>
                    <h3 className="font-bold text-gray-800">{med.name}</h3>
                    <p className="text-sm text-gray-500">{med.dosage}</p>
                  </div>
                </div>
                {med.is_paused && <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">⏸ Paused</span>}
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p>📅 {FREQ_LABELS[med.frequency]} · {med.times_of_day?.join(', ')}</p>
                <p>🍽️ {med.before_after_food} food</p>
              </div>

              {/* Refill progress */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Stock</span>
                  <span>{med.remaining_quantity}/{med.total_quantity}</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      med.remaining_quantity <= med.refill_alert_threshold ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${(med.remaining_quantity / med.total_quantity) * 100}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => handleEdit(med)} className="text-xs text-blue-600 font-medium hover:underline">✏️ Edit</button>
                <button onClick={() => handlePause(med.id)} className="text-xs text-yellow-600 font-medium hover:underline">
                  {med.is_paused ? '▶️ Resume' : '⏸ Pause'}
                </button>
                <button onClick={() => handleDelete(med.id)} className="text-xs text-red-600 font-medium hover:underline">🗑️ Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
