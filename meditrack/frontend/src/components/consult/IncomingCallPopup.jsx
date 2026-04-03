import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { checkTrigger } from '../../api/consult';
import doctorImg from '../../assets/doctor.png';

export default function IncomingCallPopup({ onAccept }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if we should trigger the popup
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
          initial={{ y: 50, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-50 bg-white p-5 rounded-2xl shadow-2xl border border-gray-100 w-80 flex flex-col items-center text-center"
        >
          {/* Ringing Avatar */}
          <div className="relative mb-4">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-blue-400 rounded-full"
            />
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-md">
              <img src={doctorImg} alt="Dr. Aria" className="w-full h-full object-cover" />
            </div>
          </div>

          <h4 className="font-bold text-gray-800 text-lg mb-1">Incoming Consultation</h4>
          <p className="text-sm text-gray-500 mb-6 font-medium">Dr. Aria (AI Consultant)</p>

          <div className="flex w-full justify-between gap-3">
            <button 
              onClick={handleDecline}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2.5 rounded-xl transition-colors"
            >
              Decline
            </button>
            <button 
              onClick={handleAccept}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-green-500/30 transition-colors animate-pulse"
            >
              Accept
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
