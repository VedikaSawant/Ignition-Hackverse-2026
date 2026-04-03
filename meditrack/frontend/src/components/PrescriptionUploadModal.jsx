import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, CheckCircle, Loader, Plus, AlertCircle, Trash2, Camera, Info } from 'lucide-react';
import { scanPrescription, confirmPrescription } from '../api/prescription';

export default function PrescriptionUploadModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setScanResult(null);
      setMedicines([]);
    }
  };

  const handleScan = async () => {
    if (!file) return;
    setIsScanning(true);
    try {
      const res = await scanPrescription(file);
      setScanResult(res.data);
      setMedicines(res.data.medicines || []);
    } catch (err) {
      console.error(err);
      alert('Failed to scan prescription. Please make sure the OCR is responding.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirm = async () => {
    if (medicines.length === 0) return;
    setIsConfirming(true);
    try {
      await confirmPrescription(medicines);
      onSuccess();
      closeModal();
    } catch (err) {
        console.error(err);
        alert('Failed to save medicines');
    } finally {
        setIsConfirming(false);
    }
  };

  const handleRemoveMedicine = (index) => {
      setMedicines(medicines.filter((_, i) => i !== index));
  }

  const handleMedicineChange = (index, field, value) => {
      const updated = [...medicines];
      updated[index][field] = value;
      setMedicines(updated);
  }

  const closeModal = () => {
      setFile(null);
      setScanResult(null);
      setMedicines([]);
      onClose();
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
      >
        <motion.div 
          initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
          className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Camera size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Smart Prescription Scan</h2>
                    <p className="text-sm font-medium text-slate-500">Extract medicines using AI-powered OCR</p>
                </div>
            </div>
            <button onClick={closeModal} className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={24} />
            </button>
          </div>

          <div className="p-8 overflow-y-auto">
              {!scanResult ? (
                  <div className="space-y-8">
                      {/* Upload Area */}
                      <div 
                          className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all ${file ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50 bg-slate-50'}`}
                      >
                          <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              ref={fileInputRef} 
                              onChange={handleFileChange}
                          />
                          {!file ? (
                              <div className="flex flex-col items-center gap-4">
                                  <div className="w-20 h-20 bg-white shadow-sm rounded-full flex items-center justify-center text-slate-400 mb-2">
                                      <Upload size={32} />
                                  </div>
                                  <h3 className="text-xl font-bold text-slate-700">Upload Prescription Envelope</h3>
                                  <p className="text-slate-500 font-medium">Capture or upload an image of your physical prescription.</p>
                                  <button onClick={() => fileInputRef.current?.click()} className="mt-4 px-8 py-3 bg-white border shadow-sm border-slate-200 rounded-xl font-bold text-slate-700 hover:border-primary hover:text-primary transition-all">
                                      Browse Files
                                  </button>
                              </div>
                          ) : (
                              <div className="flex flex-col items-center gap-4">
                                  <div className="w-20 h-20 bg-primary shadow-sm shadow-primary/20 rounded-full flex items-center justify-center text-white mb-2">
                                      <FileText size={32} />
                                  </div>
                                  <h3 className="text-xl font-bold text-slate-900">{file.name}</h3>
                                  <p className="text-primary font-bold">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready to Scan</p>
                                  <div className="flex gap-4 mt-4">
                                      <button onClick={() => setFile(null)} className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all">
                                          Change File
                                      </button>
                                      <button onClick={handleScan} disabled={isScanning} className="px-10 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-70 flex items-center gap-2">
                                          {isScanning ? <><Loader size={20} className="animate-spin" /> Analyzing...</> : <><Camera size={20} /> Analyze Prescription</>}
                                      </button>
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-4 text-amber-800">
                          <Info size={24} className="shrink-0" />
                          <div>
                              <p className="font-bold text-sm">Offline OCR Advisory</p>
                              <p className="text-xs font-medium mt-1 opacity-90 text-amber-700">The scanner uses Tesseract OCR which runs seamlessly in the background. Please double-check the extracted data before confirmation as hand-written styles vary.</p>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="space-y-8">
                      {/* Review Area */}
                      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex gap-4 text-emerald-800 items-center">
                          <CheckCircle size={28} className="shrink-0" />
                          <div>
                              <p className="font-bold">Scan Complete</p>
                              <p className="text-xs font-medium mt-0.5 opacity-90 text-emerald-700">We detected {medicines.length} medications from your document.</p>
                          </div>
                          <button onClick={() => setScanResult(null)} className="ml-auto px-4 py-2 border border-emerald-200 bg-white rounded-lg text-xs font-bold shadow-sm whitespace-nowrap text-emerald-700 hover:bg-emerald-50">
                              Scan Again
                          </button>
                      </div>

                      {scanResult.special_instructions && scanResult.special_instructions !== "None" && (
                          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex gap-4 text-primary">
                              <AlertCircle size={24} className="shrink-0" />
                              <div>
                                  <p className="font-bold text-sm">Smart Advisory & Context</p>
                                  <p className="text-xs font-medium mt-1 opacity-90 leading-relaxed">{scanResult.special_instructions}</p>
                              </div>
                          </div>
                      )}

                      <div className="space-y-4">
                          <h3 className="font-bold text-slate-800 flex items-center justify-between">
                              Extracted Medicines
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest">Verify Details</span>
                          </h3>
                          {medicines.length === 0 ? (
                              <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-500 font-medium">
                                  No medicines were confidently detected. Please try a clearer image.
                              </div>
                          ) : (
                              medicines.map((m, i) => (
                                  <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col md:flex-row gap-4 relative">
                                      <div className="flex-1 space-y-4">
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                              <div className="space-y-1.5 col-span-2">
                                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Name</label>
                                                  <input required value={m.name} onChange={(e) => handleMedicineChange(i, 'name', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                                              </div>
                                              <div className="space-y-1.5">
                                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Dosage</label>
                                                  <input required value={m.dosage} onChange={(e) => handleMedicineChange(i, 'dosage', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                                              </div>
                                              <div className="space-y-1.5">
                                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Frequency</label>
                                                  <input required value={m.frequency} onChange={(e) => handleMedicineChange(i, 'frequency', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                                              </div>
                                              <div className="space-y-1.5">
                                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Timing</label>
                                                  <input required value={m.timing} onChange={(e) => handleMedicineChange(i, 'timing', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                                              </div>
                                              <div className="space-y-1.5">
                                                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Duration</label>
                                                  <input required value={m.duration} onChange={(e) => handleMedicineChange(i, 'duration', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                                              </div>
                                          </div>
                                      </div>
                                      <button type="button" onClick={() => handleRemoveMedicine(i)} className="absolute top-4 right-4 md:relative md:top-0 md:right-0 w-10 h-10 shrink-0 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                                          <Trash2 size={18} />
                                      </button>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              )}
          </div>
          
          {scanResult && (
              <div className="p-8 border-t border-slate-100 bg-white flex justify-end gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-10 relative">
                  <button onClick={closeModal} className="px-8 py-4 bg-slate-50 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition-colors">
                      Discard
                  </button>
                  <button onClick={handleConfirm} disabled={medicines.length === 0 || isConfirming} className="px-10 py-4 bg-primary text-white rounded-xl font-bold shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center gap-2">
                      {isConfirming ? <><Loader size={20} className="animate-spin" /> Saving...</> : 'Confirm & Add to Schedule'}
                  </button>
              </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
