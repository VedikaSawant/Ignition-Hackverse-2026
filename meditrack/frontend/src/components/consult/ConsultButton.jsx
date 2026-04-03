import { motion } from 'framer-motion';
import { Stethoscope } from 'lucide-react';

export default function ConsultButton({ onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-3 bg-slate-900 border border-slate-800 text-white px-8 py-4 rounded-2xl font-bold text-sm shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all duration-300 group"
    >
      <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
        <Stethoscope className="w-4 h-4 text-primary" />
      </div>
      <span className="tracking-widest uppercase text-[11px] font-bold">Clinical Consultation</span>
    </motion.button>
  );
}
