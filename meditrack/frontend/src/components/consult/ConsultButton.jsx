import { motion } from 'framer-motion';

export default function ConsultButton({ onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-5 py-2.5 rounded-full font-medium shadow-lg shadow-blue-500/30 transition-all border border-blue-400/20"
    >
      <span className="text-lg">🩺</span>
      <span>Consult AI Doctor</span>
    </motion.button>
  );
}
