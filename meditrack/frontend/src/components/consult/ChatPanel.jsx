import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatPanel({ history }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <div className="flex flex-col h-full bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gray-50/50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
           📑 Consultation Transcript
        </h3>
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white custom-scrollbar">
        <AnimatePresence initial={false}>
          {history.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center opacity-30 italic"
            >
              <span className="text-4xl mb-4">⌛</span>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Waiting for clinical data...</p>
            </motion.div>
          ) : (
            history.map((msg, idx) => (
              <motion.div
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={idx}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                   {msg.role !== 'user' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                   <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                     {msg.role === 'user' ? 'Patient' : 'MediPlus AI'}
                   </span>
                </div>
                
                <div 
                  className={`max-w-[90%] p-4 rounded-3xl text-sm font-medium leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-sm shadow-lg shadow-blue-100' 
                      : 'bg-gray-50 text-text border border-gray-100 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
    </div>
  );
}
