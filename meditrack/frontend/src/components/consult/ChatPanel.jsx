import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Radio } from 'lucide-react';

export default function ChatPanel({ history }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden font-inter">
      <div className="flex-1 overflow-y-auto p-2 space-y-6 bg-white custom-scrollbar">
        <AnimatePresence initial={false}>
          {history.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center opacity-40 grayscale"
            >
              <Radio size={48} className="mb-6 text-slate-200" />
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Awaiting AI Input...
              </p>
            </motion.div>
          ) : (
            history.map((msg, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                key={idx}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-3 mb-1 px-1">
                  {msg.role !== 'user' && (
                    <div className="w-2 h-2 rounded-full bg-primary/40" />
                  )}
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    {msg.role === 'user' ? 'Patient' : 'AI Consultant'}
                  </span>
                </div>

                <div
                  className={`max-w-[95%] px-5 py-3 text-[15px] font-medium leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white rounded-2xl rounded-tr-sm shadow-lg shadow-slate-100'
                      : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-2xl rounded-tl-sm'
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
