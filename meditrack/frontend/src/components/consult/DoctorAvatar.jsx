import { motion, AnimatePresence } from 'framer-motion';
import doctorImg from '../../assets/doctor.png';
import VoiceWaveAnimation from './VoiceWaveAnimation';

export default function DoctorAvatar({ isSpeaking, isListening, statusText }) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-8">
      
      {/* Background Interactive HUD Elements */}
      <div className="absolute inset-0 opacity-20">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary/30 rounded-full animate-[spin_20s_linear_infinite]" />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-white/10 rounded-full animate-[spin_30s_linear_infinite_reverse]" />
      </div>

      {/* Profile Image with Dynamic State Borders */}
      <div className="relative group">
         {/* Adaptive Glow Layer */}
         <AnimatePresence>
            {(isSpeaking || isListening) && (
               <motion.div
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1.1 }}
                 exit={{ opacity: 0, scale: 0.8 }}
                 className={`absolute -inset-4 rounded-full blur-3xl ${
                   isSpeaking ? 'bg-primary/40' : 'bg-green-500/20'
                 }`}
               />
            )}
         </AnimatePresence>

         {/* Multi-layered Ring System */}
         <div className="relative">
            <svg className="absolute -inset-8 w-[calc(100%+64px)] h-[calc(100%+64px)] transform -rotate-90 pointer-events-none">
               <motion.circle 
                 cx="50%" cy="50%" r="48%" 
                 fill="none" 
                 stroke="rgba(0, 82, 255, 0.1)" 
                 strokeWidth="1" 
                 strokeDasharray="10 5"
               />
               <AnimatePresence>
                  {isSpeaking && (
                     <motion.circle 
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        exit={{ opacity: 0 }}
                        cx="50%" cy="50%" r="48%" 
                        fill="none" 
                        stroke="#0052FF" 
                        strokeWidth="2" 
                        transition={{ duration: 0.5 }}
                     />
                  )}
               </AnimatePresence>
            </svg>

            <motion.div 
               className={`relative z-10 w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-8 ${
                 isSpeaking ? 'border-primary' : 'border-white/10'
               } shadow-[0_40px_80px_rgba(0,0,0,0.5)] transition-colors duration-500`}
            >
               <motion.img
                 src={doctorImg}
                 alt="AI Doctor"
                 className="w-full h-full object-cover"
                 animate={{
                    scale: isSpeaking ? [1, 1.05, 1] : 1,
                    filter: isSpeaking ? 'brightness(1.1)' : 'brightness(0.9)',
                 }}
                 transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                 }}
               />
            </motion.div>
         </div>
         
         {/* Live Performance HUD */}
         <div className="absolute -right-20 top-0 hidden xl:flex flex-col gap-4 pointer-events-none">
            <div className="px-5 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col items-center">
               <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Neural Link</span>
               <span className="text-xs font-bold text-green-500 mt-1">99.8%</span>
            </div>
         </div>
      </div>

      <div className="mt-12 flex flex-col items-center gap-6 relative z-10">
         <div className="flex flex-col items-center">
            <h3 className="text-white text-2xl font-black tracking-tighter uppercase">Dr. Aria</h3>
            <p className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mt-1">MediPlus Intelligent Shell</p>
         </div>

         {isSpeaking && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="px-8 py-3 bg-primary/20 backdrop-blur-xl rounded-full flex items-center gap-4 border border-primary/30"
            >
               <VoiceWaveAnimation isSpeaking={isSpeaking} />
               <span className="text-white text-[10px] font-black uppercase tracking-widest">Generating Output</span>
            </motion.div>
         )}

         {isListening && (
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="px-8 py-3 bg-green-500/20 backdrop-blur-xl rounded-full flex items-center gap-4 border border-green-500/30"
           >
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
              <span className="text-white text-[10px] font-black uppercase tracking-widest">Monitoring Input</span>
           </motion.div>
         )}
      </div>
    </div>
  );
}
