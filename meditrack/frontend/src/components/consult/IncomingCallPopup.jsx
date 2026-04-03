import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { checkTrigger } from '../../api/consult';
import { Phone, PhoneOff, Activity } from 'lucide-react';
import doctorImg from '../../assets/doctor.png';

export default function IncomingCallPopup({ onAccept }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkCallTrigger = async () => {
      try {
        const res = await checkTrigger();
        if (res.data.should_trigger && !sessionStorage.getItem('consult_dismissed')) {
          setIsVisible(true);
        }
      } catch (error) {
        console.error("Failed to check consult trigger", error);
      }
    };
    checkCallTrigger();
  }, []);

  const handleDecline = () => {
    setIsVisible(false);
    sessionStorage.setItem('consult_dismissed', 'true');
  };

  const handleAccept = () => {
    setIsVisible(false);
    onAccept();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-10 right-10 z-[300] bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100 w-[380px] flex flex-col items-center text-center font-inter"
        >
          {/* Ringing avatar */}
          <div className="relative mb-8">
            <div className="absolute -inset-4 bg-primary/5 rounded-full animate-pulse" />
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl ring-2 ring-primary/10">
              <img src={doctorImg} alt="Clinical Assistant" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg border-4 border-white">
                <Activity size={18} />
            </div>
          </div>

          <div className="space-y-2 mb-10">
            <h4 className="font-bold text-slate-900 text-xl tracking-tight">Incoming Protocol</h4>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Clinical Assistant Assistant</p>
          </div>

          <div className="flex w-full justify-between gap-4">
            <button
              onClick={handleDecline}
              className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-400 font-bold py-4 rounded-2xl transition-all duration-300 text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 border border-slate-100"
            >
              <PhoneOff size={16} />
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-200 hover:bg-primary transition-all duration-300 text-[11px] uppercase tracking-widest flex items-center justify-center gap-3"
            >
              <Phone size={16} />
              Accept
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
