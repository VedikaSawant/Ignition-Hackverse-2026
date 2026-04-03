import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileImage, Upload, X, Check, AlertTriangle, Loader2, 
  Sparkles, Pill, Clock, Utensils, ChevronRight, Trash2,
  ScanLine, FileCheck, Edit3
} from 'lucide-react';
import { scanPrescription, confirmPrescription } from '../api/prescription';
import { toast } from 'react-hot-toast';

const STEPS = {
  UPLOAD: 'upload',
  SCANNING: 'scanning',
  REVIEW: 'review',
  CONFIRMING: 'confirming',
  DONE: 'done',
};

export default function PrescriptionScanner({ onComplete, onClose }) {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [editableMeds, setEditableMeds] = useState([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, etc.)');
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  }, [handleFile]);

  const handleScan = async () => {
    if (!file) return;
    setStep(STEPS.SCANNING);
    try {
      const res = await scanPrescription(file);
      setScanResult(res.data);
      setEditableMeds(res.data.medicines || []);
      setSpecialInstructions(res.data.special_instructions || '');
      setStep(STEPS.REVIEW);
    } catch (err) {
      console.error('Scan failed:', err);
      toast.error(err.response?.data?.detail || 'Failed to scan prescription. Please try again.');
      setStep(STEPS.UPLOAD);
    }
  };

  const handleConfirm = async () => {
    if (editableMeds.length === 0) {
      toast.error('No medicines to add.');
      return;
    }
    setStep(STEPS.CONFIRMING);
    try {
      await confirmPrescription(editableMeds);
      toast.success(`${editableMeds.length} medicines added to your protocol!`, {
        icon: '📋',
        style: { borderRadius: '16px', background: '#0F172A', color: '#fff', fontWeight: 'bold' },
      });
      setStep(STEPS.DONE);
      if (onComplete) onComplete();
    } catch (err) {
      console.error('Confirm failed:', err);
      toast.error('Failed to save medicines. Please try again.');
      setStep(STEPS.REVIEW);
    }
  };

  const updateMed = (idx, field, value) => {
    setEditableMeds(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const removeMed = (idx) => {
    setEditableMeds(prev => prev.filter((_, i) => i !== idx));
  };

  const resetAll = () => {
    setStep(STEPS.UPLOAD);
    setFile(null);
    setPreview(null);
    setScanResult(null);
    setEditableMeds([]);
    setSpecialInstructions('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 30 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* ── Header ── */}
        <div className="p-8 pb-0 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center border border-violet-100">
              <ScanLine size={24} className="text-violet-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Prescription Scanner</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {step === STEPS.UPLOAD && 'Upload Prescription Image'}
                {step === STEPS.SCANNING && 'Processing with OCR Engine'}
                {step === STEPS.REVIEW && `${editableMeds.length} Medicines Detected`}
                {step === STEPS.CONFIRMING && 'Saving to Protocol'}
                {step === STEPS.DONE && 'Protocol Updated Successfully'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Progress Dots ── */}
        <div className="px-8 pt-6 pb-2 flex items-center gap-2">
          {[STEPS.UPLOAD, STEPS.SCANNING, STEPS.REVIEW, STEPS.DONE].map((s, i) => {
            const stepOrder = [STEPS.UPLOAD, STEPS.SCANNING, STEPS.REVIEW, STEPS.DONE];
            const currentIdx = stepOrder.indexOf(step === STEPS.CONFIRMING ? STEPS.REVIEW : step);
            const isActive = i <= currentIdx;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${isActive ? 'bg-violet-500' : 'bg-slate-100'}`} />
              </div>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="p-8 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* STEP: UPLOAD */}
            {step === STEPS.UPLOAD && (
              <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 ${
                    dragOver ? 'border-violet-400 bg-violet-50/50 scale-[1.02]' : 
                    preview ? 'border-violet-200 bg-violet-50/30' : 'border-slate-200 bg-slate-50/30 hover:border-violet-300 hover:bg-violet-50/20'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files[0])}
                  />
                  
                  {preview ? (
                    <div className="space-y-6">
                      <div className="relative inline-block">
                        <img src={preview} alt="Prescription" className="max-h-48 rounded-2xl shadow-lg mx-auto border border-slate-200" />
                        <div className="absolute -top-2 -right-2 p-1.5 bg-violet-500 text-white rounded-full shadow-lg">
                          <Check size={14} />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{file?.name}</p>
                        <p className="text-xs text-slate-400 mt-1">Click to change • {(file?.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-slate-100">
                        <FileImage size={36} className="text-violet-400" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900">Drop your prescription here</p>
                        <p className="text-sm text-slate-400 mt-2">Or click to browse • Supports JPG, PNG, WEBP</p>
                      </div>
                    </div>
                  )}
                </div>

                {preview && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleScan}
                    className="w-full mt-6 flex items-center justify-center gap-3 bg-violet-600 text-white py-5 rounded-2xl font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-200/40 group"
                  >
                    <ScanLine size={20} className="group-hover:animate-pulse" />
                    Scan & Extract Medicines
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* STEP: SCANNING */}
            {step === STEPS.SCANNING && (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 text-center space-y-8">
                <div className="relative inline-flex">
                  <div className="w-24 h-24 bg-violet-50 rounded-3xl flex items-center justify-center mx-auto border border-violet-100">
                    <Loader2 size={40} className="text-violet-600 animate-spin" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 p-2 bg-white rounded-full shadow-lg border border-slate-100">
                    <Sparkles size={16} className="text-violet-500 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Analyzing Prescription</h3>
                  <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">Running OCR pipeline with OpenCV preprocessing and Tesseract extraction...</p>
                </div>
                <div className="flex justify-center gap-1.5">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                      className="w-2.5 h-2.5 bg-violet-500 rounded-full"
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP: REVIEW */}
            {step === STEPS.REVIEW && (
              <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                
                {/* Preview thumbnail */}
                {preview && (
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <img src={preview} alt="Scanned" className="h-16 w-16 object-cover rounded-xl border border-slate-200" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-900">Scan Complete</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{editableMeds.length} medicine(s) extracted • Review & confirm below</p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                      <FileCheck size={18} className="text-emerald-600" />
                    </div>
                  </div>
                )}

                {/* Special Instructions */}
                {specialInstructions && specialInstructions !== 'None' && (
                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Clinical Intelligence Notes</p>
                      <p className="text-sm text-amber-900 mt-1 font-medium">{specialInstructions}</p>
                    </div>
                  </div>
                )}

                {/* Medicine List */}
                {editableMeds.length === 0 ? (
                  <div className="py-12 text-center">
                    <AlertTriangle size={36} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-sm font-bold text-slate-500">No medicines could be extracted.</p>
                    <p className="text-xs text-slate-400 mt-1">Try a clearer image or add medicines manually.</p>
                    <button onClick={resetAll} className="mt-4 text-sm font-bold text-violet-600 hover:underline">Try Again</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                      <Pill size={14} className="text-violet-500" />
                      Extracted Medicines — Edit Before Confirming
                    </div>
                    {editableMeds.map((med, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center border border-violet-100 text-violet-600 font-bold text-sm">
                              {idx + 1}
                            </div>
                            <input
                              type="text"
                              value={med.name}
                              onChange={(e) => updateMed(idx, 'name', e.target.value)}
                              className="text-lg font-bold text-slate-900 bg-transparent border-none outline-none focus:ring-0 w-full"
                              placeholder="Medicine Name"
                            />
                          </div>
                          <button
                            onClick={() => removeMed(idx)}
                            className="p-2 hover:bg-red-50 rounded-xl text-slate-300 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <Pill size={10} /> Dosage
                            </label>
                            <input
                              type="text"
                              value={med.dosage}
                              onChange={(e) => updateMed(idx, 'dosage', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 focus:border-violet-300 focus:ring-1 focus:ring-violet-200 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <Clock size={10} /> Frequency
                            </label>
                            <select
                              value={med.frequency}
                              onChange={(e) => updateMed(idx, 'frequency', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 focus:border-violet-300 focus:ring-1 focus:ring-violet-200 outline-none transition-all"
                            >
                              <option value="once daily">Once Daily</option>
                              <option value="twice daily">Twice Daily</option>
                              <option value="three times daily">Three Times</option>
                              <option value="four times daily">Four Times</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <Utensils size={10} /> Timing
                            </label>
                            <select
                              value={med.timing}
                              onChange={(e) => updateMed(idx, 'timing', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 focus:border-violet-300 focus:ring-1 focus:ring-violet-200 outline-none transition-all"
                            >
                              <option value="before food">Before Food</option>
                              <option value="after food">After Food</option>
                              <option value="not mentioned">Not Specified</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <Edit3 size={10} /> Duration
                            </label>
                            <input
                              type="text"
                              value={med.duration}
                              onChange={(e) => updateMed(idx, 'duration', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 focus:border-violet-300 focus:ring-1 focus:ring-violet-200 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                {editableMeds.length > 0 && (
                  <div className="flex gap-4 pt-2">
                    <button
                      onClick={resetAll}
                      className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                    >
                      Re-Scan
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="flex-[2] flex items-center justify-center gap-3 bg-violet-600 text-white py-4 rounded-2xl font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-200/40 group"
                    >
                      <Check size={20} />
                      Add {editableMeds.length} Medicine{editableMeds.length > 1 ? 's' : ''} to Protocol
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP: CONFIRMING */}
            {step === STEPS.CONFIRMING && (
              <motion.div key="confirming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center space-y-6">
                <Loader2 size={40} className="text-violet-600 animate-spin mx-auto" />
                <p className="text-lg font-bold text-slate-900">Saving to your protocol...</p>
              </motion.div>
            )}

            {/* STEP: DONE */}
            {step === STEPS.DONE && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-16 text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto border border-emerald-100">
                  <Check size={40} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Protocol Updated</h3>
                  <p className="text-sm text-slate-400 mt-2">Your medicines have been added and dose schedules generated.</p>
                </div>
                <button
                  onClick={onClose}
                  className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
                >
                  Back to Dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
