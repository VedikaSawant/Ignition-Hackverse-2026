import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Shield, Zap, Sparkles } from 'lucide-react';
import aiConsultantImg from '../../assets/ai_consultant.png';
import VoiceWaveAnimation from './VoiceWaveAnimation';

export default function DoctorAvatar({ isSpeaking, isListening, statusText }) {
   return (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-12 lg:p-20 font-inter">

         {/* Background orbital rings - Softer, more clinical */}
         <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-primary/20 rounded-full animate-[spin_40s_linear_infinite]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] border border-slate-200 rounded-full animate-[spin_60s_linear_infinite_reverse]" />
         </div>

         {/* Profile Image with state borders */}
         <div className="relative group">
            {/* Adaptive glow - Refined */}
            <AnimatePresence>
               {(isSpeaking || isListening) && (
                  <motion.div
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1.05 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     className={`absolute -inset-8 rounded-full blur-[60px] ${isSpeaking ? 'bg-primary/20' : 'bg-emerald-500/10'
                        }`}
                  />
               )}
            </AnimatePresence>

            {/* Ring system */}
            <div className="relative">
               <svg className="absolute -inset-10 w-[calc(100%+80px)] h-[calc(100%+80px)] transform -rotate-90 pointer-events-none opacity-40">
                  <motion.circle
                     cx="50%" cy="50%" r="48%"
                     fill="none"
                     stroke="currentColor"
                     className="text-slate-200"
                     strokeWidth="1"
                     strokeDasharray="12 6"
                  />
                  <AnimatePresence>
                     {isSpeaking && (
                        <motion.circle
                           initial={{ pathLength: 0 }}
                           animate={{ pathLength: 1 }}
                           exit={{ opacity: 0 }}
                           cx="50%" cy="50%" r="48%"
                           fill="none"
                           stroke="currentColor"
                           className="text-primary"
                           strokeWidth="2"
                           transition={{ duration: 0.6 }}
                        />
                     )}
                  </AnimatePresence>
               </svg>

               <motion.div
                  className={`relative z-10 w-72 h-72 md:w-96 md:h-96 rounded-full overflow-hidden border-[8px] ${isSpeaking ? 'border-primary shadow-[0_0_60px_rgba(0,82,255,0.25)]' : 'border-white shadow-2xl'
                     } transition-all duration-700 ease-out`}
               >
                  <motion.img
                     src={aiConsultantImg}
                     alt="AI Health Consultant"
                     className="w-full h-full object-cover"
                     animate={{
                        scale: isSpeaking ? [1, 1.03, 1] : 1,
                        filter: isSpeaking ? 'brightness(1.05)' : 'brightness(1)',
                     }}
                     transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                     }}
                  />
               </motion.div>
            </div>
         </div>

         <div className="mt-16 flex flex-col items-center gap-8 relative z-10">
            <div className="flex flex-col items-center text-center">
               <h3 className="text-white text-4xl font-bold tracking-tight mb-2">AI Health Consultant</h3>
               <p className="text-primary text-[11px] font-bold uppercase tracking-[0.4em]">Personalized AI Medical Guidance</p>
            </div>

            <AnimatePresence mode="wait">
                {isSpeaking ? (
                   <motion.div
                      key="speaking"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="px-10 py-4 bg-primary/10 backdrop-blur-3xl rounded-3xl flex items-center gap-6 border border-primary/20 shadow-xl"
                   >
                      <VoiceWaveAnimation isSpeaking={isSpeaking} />
                      <span className="text-white text-[11px] font-bold uppercase tracking-[0.2em]">Generating Guidance</span>
                   </motion.div>
                ) : isListening ? (
                   <motion.div
                      key="listening"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="px-10 py-4 bg-emerald-500/10 backdrop-blur-3xl rounded-3xl flex items-center gap-6 border border-emerald-500/20 shadow-xl"
                   >
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                      <span className="text-white text-[11px] font-bold uppercase tracking-[0.2em]">Monitoring Audio Input</span>
                   </motion.div>
                ) : null}
            </AnimatePresence>
         </div>
      </div>
   );
}
