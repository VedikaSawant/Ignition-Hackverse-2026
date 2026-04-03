import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateConsultResponse, getConsultHistory } from '../../api/consult';
import DoctorAvatar from './DoctorAvatar';
import ChatPanel from './ChatPanel';

export default function VideoCallModal({ isOpen, onClose }) {
  const [history, setHistory] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState('Establishing Secure Connection...');
  const [isConnecting, setIsConnecting] = useState(true);
  const audioRef = useRef(new Audio());
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsConnecting(true);
      fetchHistory();
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) handleSendMessage(null, transcript);
        };
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        recognitionRef.current = recognition;
      }

      const timer = setTimeout(() => {
        setIsConnecting(false);
        setStatusText('Dr. Aria (AI Consultant)');
        handleSendMessage(null, "INIT_CALL");
      }, 1500);

      return () => {
        clearTimeout(timer);
        audioRef.current.pause();
        if (recognitionRef.current) recognitionRef.current.stop();
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const audio = audioRef.current;
    const playHandler = () => setIsSpeaking(true);
    const endHandler = () => setIsSpeaking(false);
    audio.addEventListener('play', playHandler);
    audio.addEventListener('ended', endHandler);
    audio.addEventListener('pause', endHandler);
    return () => {
      audio.removeEventListener('play', playHandler);
      audio.removeEventListener('ended', endHandler);
      audio.removeEventListener('pause', endHandler);
    };
  }, []);

  const fetchHistory = async () => {
    const res = await getConsultHistory();
    setHistory(res.data);
  };

  const handleSendMessage = async (e, overrideMsg = null) => {
    if (e) e.preventDefault();
    const message = overrideMsg || inputMsg;
    if (!message || message.trim() === '' || isConnecting) return;
    if (!overrideMsg) setInputMsg('');
    if (message !== "INIT_CALL") setHistory(prev => [...prev, { role: 'user', content: message }]);
    
    setStatusText('AI Dr. Thinking...');
    try {
      const res = await generateConsultResponse(message);
      const { text_response, audio_b64 } = res.data;
      setHistory(prev => [...prev, { role: 'ai', content: text_response }]);
      setStatusText('Consultation Active');
      if (audio_b64) {
        audioRef.current.src = `data:audio/mp3;base64,${audio_b64}`;
        audioRef.current.play().catch(e => console.error(e));
      }
    } catch (error) {
      setStatusText('Session Interrupted');
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 bg-[#0A112F]/90 backdrop-blur-md"
    >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-7xl h-full bg-[#1E293B] rounded-[48px] overflow-hidden shadow-[0_0_100px_rgba(0,82,255,0.2)] flex flex-col lg:flex-row relative border border-white/10"
        >
          {/* Main Visual Consultation Area */}
          <div className="flex-1 relative bg-gradient-to-br from-[#0F172A] to-[#1E293B] overflow-hidden">
             
             {/* Header HUD Overlay */}
             <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-10">
                <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10">
                   <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22C55E]" />
                   <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">{statusText}</span>
                </div>
                
                <div className="flex gap-2">
                   <div className="px-5 py-3 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 text-center">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Protocol</p>
                      <p className="text-xs font-bold text-white tracking-widest mt-1">AES-256</p>
                   </div>
                </div>
             </div>

             {/* Center Consultation Avatar */}
             <div className="absolute inset-0 flex items-center justify-center">
                {isConnecting ? (
                  <div className="flex flex-col items-center">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                      transition={{ repeat: Infinity, duration: 3 }}
                      className="w-20 h-20 border-3 border-primary border-t-transparent rounded-full shadow-[0_0_30px_rgba(0,82,255,0.4)]"
                    />
                    <p className="text-white text-[10px] font-black uppercase tracking-[0.4em] mt-10">Initializing Session</p>
                  </div>
                ) : (
                  <DoctorAvatar 
                    isSpeaking={isSpeaking} 
                    isListening={isListening} 
                    statusText={statusText} 
                  />
                )}
             </div>

             {/* Proactive Controls Footer */}
             <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-8 items-center z-10 px-6">
                <div className="hidden sm:flex flex-col items-center gap-2">
                   <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Toggle Voice</span>
                   <button 
                    onClick={toggleListening}
                    className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 border-2 ${
                      isListening ? 'bg-primary border-primary shadow-[0_0_40px_rgba(0,82,255,0.5)] scale-110' : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                   >
                     <span className="text-2xl">{isListening ? '🔊' : '🎤'}</span>
                   </button>
                </div>

                <div className="flex flex-col items-center gap-2">
                   <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Interrupt Shell</span>
                   <button 
                    onClick={onClose}
                    className="w-20 h-20 bg-accent hover:rotate-90 transition-all duration-700 text-white rounded-[32px] flex items-center justify-center text-4xl shadow-2xl shadow-orange-500/30"
                   >
                     📞
                   </button>
                </div>

                <div className="hidden sm:flex flex-col items-center gap-2">
                   <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">System Record</span>
                   <div className="w-16 h-16 rounded-3xl bg-white/5 border-2 border-white/10 flex items-center justify-center grayscale opacity-30">
                      <span className="text-2xl">📹</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Clinical Chat Documentation Area */}
          <div className="w-full lg:w-[480px] bg-white flex flex-col h-full shadow-[-40px_0_100px_rgba(0,0,0,0.2)]">
             <div className="p-8 border-b border-gray-50">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-black text-text uppercase tracking-tight">Clinical Log</h2>
                   <span className="text-[10px] font-black text-primary bg-primary-light px-3 py-1 rounded-full uppercase">Live Session</span>
                </div>
                <div className="flex gap-3">
                   <div className="flex-1 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 flex flex-col items-center">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Risk Factor</span>
                      <span className="text-xl font-black text-text mt-1">L-4</span>
                   </div>
                   <div className="flex-1 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 flex flex-col items-center">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Adherence</span>
                      <span className="text-xl font-black text-primary mt-1">92%</span>
                   </div>
                </div>
             </div>
             
             <div className="flex-1 overflow-hidden p-6">
                <ChatPanel history={history} />
             </div>

             <div className="p-8 bg-gray-50/50 border-t border-gray-100">
                <form onSubmit={handleSendMessage} className="relative group">
                   <input
                     type="text"
                     className="w-full h-16 bg-white border-2 border-transparent rounded-[24px] px-8 pr-20 text-sm font-bold text-text shadow-xl shadow-gray-100 focus:outline-none focus:border-primary transition-all placeholder:text-gray-300"
                     placeholder={isConnecting ? "Establishing link..." : "Direct communication terminal..."}
                     value={inputMsg}
                     onChange={e => setInputMsg(e.target.value)}
                     disabled={isConnecting}
                   />
                   <button 
                     type="submit" 
                     disabled={isConnecting || !inputMsg.trim()}
                     className="absolute right-3 top-3 bottom-3 w-10 h-10 bg-primary hover:bg-primary-dark transition-all rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200"
                   >
                     🚀
                   </button>
                </form>
             </div>
          </div>
      </motion.div>
    </motion.div>
  );
}
