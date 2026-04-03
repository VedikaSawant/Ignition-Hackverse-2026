import { useState } from 'react';
import useMedicines from '../hooks/useMedicines';
import { addMedicine, updateMedicine, deleteMedicine, pauseMedicine } from '../api/medicines';
import PrescriptionUploadModal from '../components/PrescriptionUploadModal';
import { 
  Pill, 
  Plus, 
  Camera,
  Droplets, 
  Syringe, 
  Wind, 
  Clock, 
  Utensils, 
  Calendar, 
  Trash2, 
  Edit3, 
  PauseCircle, 
  PlayCircle,
  ChevronRight,
  Info,
  Package,
  AlertCircle,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_ICONS = { 
  tablet: { icon: Pill, color: 'text-primary', bg: 'bg-primary/5' }, 
  syrup: { icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-50' }, 
  injection: { icon: Syringe, color: 'text-purple-600', bg: 'bg-purple-50' }, 
  inhaler: { icon: Wind, color: 'text-emerald-600', bg: 'bg-emerald-50' } 
};

const FREQ_LABELS = { once: '1x daily', twice: '2x daily', thrice: '3x daily', custom: 'Custom' };

export default function Medicines() {
  const { medicines, loading, refresh } = useMedicines();
  const [showForm, setShowForm] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
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
    try {
        if (editId) {
            await updateMedicine(editId, payload);
        } else {
            await addMedicine(payload);
        }
        resetForm();
        refresh();
    } catch (err) {
        console.error(err);
    }
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
    if (confirm('Deactivate this medicine protocol?')) {
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
    <div className="dashboard-main bg-slate-50/30 min-h-screen relative">
      <PrescriptionUploadModal 
        isOpen={showScanModal} 
        onClose={() => setShowScanModal(false)} 
        onSuccess={refresh} 
      />
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[1600px] mx-auto px-4 lg:px-0"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
            <div className="space-y-4 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 text-primary font-bold text-[11px] uppercase tracking-[0.2em] bg-primary/5 px-3 py-1 rounded-lg border border-primary/10 w-fit mx-auto md:mx-0">
                    <Activity size={14} />
                    <span>Clinical Compendium</span>
                </div>
                <h1 className="text-5xl font-bold text-slate-900 tracking-tight">Active Medications</h1>
                <p className="text-slate-400 font-medium text-lg flex items-center justify-center md:justify-start gap-2">
                    <Package size={20} className="text-slate-300" />
                    Managing {medicines.length} unique protocols
                </p>
            </div>
            <div className="flex gap-4">
                <button 
                    onClick={() => setShowScanModal(true)} 
                    className="btn-medico px-8 py-4 shadow-xl bg-white border border-slate-200 text-slate-700 hover:border-primary hover:text-primary transition-all flex items-center gap-2 font-bold rounded-2xl"
                >
                    <Camera size={20} /> Smart Scan
                </button>
                <button 
                    onClick={() => setShowForm(!showForm)} 
                    className={`btn-medico px-10 py-4 shadow-xl ${showForm ? 'btn-medico-outline' : 'btn-medico-primary shadow-primary/20'}`}
                >
                    {showForm ? 'Close Entry Form' : <><Plus size={20} /> Register New Medicine</>}
                </button>
            </div>
        </div>

        <AnimatePresence mode="wait">
            {showForm && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="medico-card bg-white p-12 mb-16 shadow-2xl relative overflow-hidden"
                >
                    <h3 className="text-3xl font-bold text-slate-900 mb-10 flex items-center gap-4">
                        <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary border border-primary/10">
                            {editId ? <Edit3 size={28} /> : <Plus size={28} />}
                        </div>
                        {editId ? 'Modify Medical Protocol' : 'Protocol Registration'}
                    </h3>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {/* Column 1: Identity */}
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Medicine Name</label>
                                <input 
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-sm font-semibold" 
                                    placeholder="Enter medication name" 
                                    value={form.name} 
                                    onChange={e => setForm({...form, name: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Active Dosage</label>
                                <input 
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-sm font-semibold" 
                                    placeholder="e.g. 500mg or 20ml" 
                                    value={form.dosage} 
                                    onChange={e => setForm({...form, dosage: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Form Factor</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(TYPE_ICONS).map(([t, { icon: Icon, color, bg }]) => (
                                        <button key={t} type="button"
                                            onClick={() => setForm({...form, medicine_type: t})}
                                            className={`p-4 rounded-xl flex items-center gap-3 border-2 transition-all group ${form.medicine_type === t ? 'border-primary bg-primary/5' : 'border-slate-50 bg-slate-50/50 hover:border-slate-100'}`}>
                                            <Icon size={20} className={form.medicine_type === t ? 'text-primary' : 'text-slate-400'} />
                                            <span className={`text-[10px] font-bold uppercase ${form.medicine_type === t ? 'text-primary' : 'text-slate-400'}`}>{t}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Administration */}
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Frequency Strategy</label>
                                <select 
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none text-sm font-semibold appearance-none cursor-pointer" 
                                    value={form.frequency} 
                                    onChange={e => updateTimes(e.target.value)}
                                >
                                    <option value="once">Once Daily</option>
                                    <option value="twice">Twice Daily</option>
                                    <option value="thrice">Thrice Daily</option>
                                    <option value="custom">Custom Schedule</option>
                                </select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Administration Times</label>
                                <div className="space-y-3">
                                    {form.times_of_day.map((t, i) => (
                                        <div key={i} className="relative">
                                            <Clock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                            <input type="time" className="w-full pl-16 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold" value={t}
                                                onChange={e => {
                                                    const times = [...form.times_of_day];
                                                    times[i] = e.target.value;
                                                    setForm({...form, times_of_day: times});
                                                }} />
                                        </div>
                                    ))}
                                </div>
                                {form.frequency === 'custom' && (
                                    <button type="button" onClick={() => setForm({...form, times_of_day: [...form.times_of_day, '12:00']})}
                                        className="text-[11px] font-bold text-primary uppercase tracking-widest hover:underline px-1">+ Add Dose Instance</button>
                                )}
                            </div>
                            <div className="space-y-4">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Consumption Workflow</label>
                                <div className="flex gap-2">
                                    {['before', 'after', 'with'].map(o => (
                                        <button key={o} type="button"
                                            onClick={() => setForm({...form, before_after_food: o})}
                                            className={`flex-1 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest border-2 transition-all ${
                                                form.before_after_food === o ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20' : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-100'
                                            }`}>{o} food</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Column 3: Inventory & Commit */}
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Start Date</label>
                                    <input type="date" className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">End Date</label>
                                    <input type="date" className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-8">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 text-center block">Stock Quantity</label>
                                    <input type="number" className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-center" value={form.total_quantity} onChange={e => setForm({...form, total_quantity: parseInt(e.target.value)})} />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 text-center block">Refill Alert</label>
                                    <input type="number" className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-center" value={form.refill_alert_threshold} onChange={e => setForm({...form, refill_alert_threshold: parseInt(e.target.value)})} />
                                </div>
                            </div>
                            <div className="pt-6 space-y-4">
                                <button type="submit" className="w-full btn-medico btn-medico-primary py-5 text-sm rounded-2xl shadow-xl shadow-primary/20">
                                    {editId ? 'Commit Protocol Changes' : 'Initialize Medical Protocol'}
                                </button>
                                <button type="button" onClick={resetForm} className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">
                                    Discard Entry
                                </button>
                            </div>
                        </div>
                    </form>
                </motion.div>
            )}
        </AnimatePresence>

        {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {[1,2,3,4,5,6].map(i => <div key={i} className="medico-card h-80 bg-white border border-slate-50 animate-pulse shadow-sm" />)}
            </div>
        ) : medicines.length === 0 ? (
            <div className="max-w-2xl mx-auto py-40 text-center medico-card p-16 shadow-2xl bg-white">
                <div className="w-28 h-28 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10 mx-auto mb-10 text-6xl">
                    <Pill size={48} className="text-primary opacity-20" />
                </div>
                <h2 className="text-4xl font-bold text-slate-900 mb-6 tracking-tight">Compendium Empty</h2>
                <p className="text-slate-500 font-medium text-lg leading-relaxed mb-12">Your clinical medication compendium is currently unpopulated. Initialize your first protocol to begin structured tracking.</p>
                <button onClick={() => setShowForm(true)} className="btn-medico btn-medico-primary px-12 py-5 shadow-2xl shadow-primary/30">Initialize Protocol Registration</button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {medicines.map((med) => {
                    const TypeIcon = (TYPE_ICONS[med.medicine_type] || TYPE_ICONS.tablet).icon;
                    const stockPercent = (med.remaining_quantity / med.total_quantity) * 100;
                    const isLow = med.remaining_quantity <= med.refill_alert_threshold;

                    return (
                        <motion.div 
                            layout
                            key={med.id} 
                            className={`medico-card group flex flex-col h-full bg-white transition-all duration-500 ${med.is_paused ? 'opacity-60 grayscale' : ''}`}
                        >
                            <div className="p-10 flex-1 flex flex-col">
                                <div className="flex items-start justify-between mb-10">
                                    <div className="flex items-center gap-5">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 shadow-sm border border-slate-50 ${TYPE_ICONS[med.medicine_type]?.bg || 'bg-slate-50'}`}>
                                            <TypeIcon size={32} className={TYPE_ICONS[med.medicine_type]?.color || 'text-slate-400'} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight group-hover:text-primary transition-colors">{med.name}</h3>
                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1.5">{med.dosage}</p>
                                        </div>
                                    </div>
                                    {med.is_paused && (
                                        <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-amber-100">Inactive</span>
                                    )}
                                </div>

                                <div className="space-y-5 flex-1">
                                    <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                        <Clock size={20} className="text-primary opacity-60" />
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Administration Frequency</p>
                                            <p className="text-sm font-bold text-slate-700">{FREQ_LABELS[med.frequency]} • {med.times_of_day?.join(', ')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                        <Utensils size={20} className="text-secondary opacity-60" />
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Meal Protocol</p>
                                            <p className="text-sm font-bold text-slate-700 capitalize">{med.before_after_food} food intake</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Inventory tracking */}
                                <div className="mt-10 p-6 bg-slate-50/30 rounded-2xl border border-slate-50">
                                    <div className="flex justify-between items-end mb-3 px-1">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Inventory Level</p>
                                        <p className="text-sm font-bold text-slate-900">{med.remaining_quantity} / {med.total_quantity} <span className="text-slate-400 font-medium">units</span></p>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${stockPercent}%` }}
                                            className={`h-full rounded-full transition-all ${isLow ? 'bg-red-500 shadow-lg shadow-red-200' : 'bg-emerald-500'}`}
                                        />
                                    </div>
                                    {isLow && (
                                        <div className="flex items-center gap-2 px-2 text-red-600">
                                            <AlertCircle size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">Critical High Priority Refill</span>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Actions */}
                                <div className="flex items-center justify-between gap-6 mt-10 pt-8 border-t border-slate-50 transition-all opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0">
                                    <div className="flex gap-6">
                                        <button onClick={() => handleEdit(med)} className="flex items-center gap-2 text-[11px] font-bold text-primary hover:text-primary-dark transition-colors uppercase tracking-widest">
                                            <Edit3 size={16} />
                                            Update
                                        </button>
                                        <button onClick={() => handlePause(med.id)} className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${med.is_paused ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {med.is_paused ? <><PlayCircle size={16} /> Activate</> : <><PauseCircle size={16} /> Pause</>}
                                        </button>
                                    </div>
                                    <button onClick={() => handleDelete(med.id)} className="flex items-center gap-2 text-[11px] font-bold text-slate-300 hover:text-red-500 transition-colors uppercase tracking-widest">
                                        <Trash2 size={16} />
                                        Archive
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        )}
      </motion.div>
    </div>
  );
}
