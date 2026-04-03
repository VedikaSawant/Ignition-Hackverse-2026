import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateConsultResponse, getConsultHistory } from '../../api/consult';
import DoctorAvatar from './DoctorAvatar';
import ChatPanel from './ChatPanel';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  ShieldCheck, 
  Activity, 
  Globe, 
  SendHorizonal, 
  Wifi, 
  Terminal 
} from 'lucide-react';

export default function VideoCallModal({ isOpen, onClose, onSuccess }) {
  const [history, setHistory] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [statusText, setStatusText] = useState('Connecting to AI Consultant...');
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
        recognition.interimResults = true; // For real-time visual feedback
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (interimTranscript) {
            setStatusText(`Hearing: "${interimTranscript}..."`);
          }

          if (finalTranscript) {
            setStatusText(`Aria heard: "${finalTranscript}"`);
            handleSendMessage(null, finalTranscript);
          }
        };
        
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (e) => {
          console.error("Speech Recognition Error:", e);
          setIsListening(false);
          setStatusText("Microphone Error — Try Clicking Icon");
        };
        recognitionRef.current = recognition;
      }

      const timer = setTimeout(() => {
        setIsConnecting(false);
        setStatusText('AI Health Consultant');
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
    const endHandler = () => {
      setIsSpeaking(false);
      // Fluid conversation: wait a beat then listen auto-magically
      setTimeout(() => {
        if (isOpen && recognitionRef.current && !isListening) {
          try {
            recognitionRef.current.start();
            setStatusText("Aria is listening...");
          } catch (e) {
            console.error("Auto-start listening failed:", e);
          }
        }
      }, 500); 
    };
    audio.addEventListener('play', playHandler);
    audio.addEventListener('ended', endHandler);
    audio.addEventListener('pause', () => setIsSpeaking(false));
    return () => {
      audio.removeEventListener('play', playHandler);
      audio.removeEventListener('ended', endHandler);
      audio.removeEventListener('pause', () => setIsSpeaking(false));
    };
  }, [isOpen]);

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

    setStatusText('AI Analysis in Progress...');
    try {
      const res = await generateConsultResponse(message);
      const { text_response, audio_b64 } = res.data;
      setHistory(prev => [...prev, { role: 'ai', content: text_response }]);
      setStatusText('AI Health Consultant');
      if (audio_b64) {
        audioRef.current.src = `data:audio/mp3;base64,${audio_b64}`;
        audioRef.current.play().catch(e => console.error(e));
      }
      
      // Trigger dashboard refresh if any action was taken
      if (onSuccess && (res.data.logged_medicine || res.data.action_taken)) {
        onSuccess(res.data);
      }
    } catch (error) {
      console.error("Consult Generation Error:", error);
      setStatusText('Consultation Sync Error');
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    try {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
        setStatusText("Aria is listening...");
      }
    } catch (e) {
      console.error("Toggle Listening Failed:", e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-12 lg:p-16 bg-slate-950/95 backdrop-blur-3xl font-inter"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="w-full max-w-[1600px] h-full bg-white rounded-[48px] overflow-hidden shadow-2xl flex flex-col lg:flex-row relative border border-white/10"
      >
        {/* Main visual consultation area */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,82,255,0.1),transparent)]" />
          
          {/* Header HUD */}
          <div className="absolute top-10 left-10 right-10 flex items-center justify-between z-10">
            <div className="flex items-center gap-4 bg-slate-950/40 backdrop-blur-2xl px-6 py-4 rounded-2xl border border-white/10">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
              <span className="text-white text-[11px] font-bold uppercase tracking-[0.2em]">{statusText}</span>
            </div>

            <div className="flex gap-4">
              {/* Encryption Profile removed */}
            </div>
          </div>

          {/* Center avatar */}
          <div className="absolute inset-0 flex items-center justify-center">
            {isConnecting ? (
              <div className="flex flex-col items-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  className="relative w-24 h-24"
                >
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full shadow-[0_0_20px_rgba(0,82,255,0.4)]" />
                </motion.div>
                <p className="text-primary text-[11px] font-bold uppercase tracking-[0.4em] mt-12 bg-primary/10 px-6 py-2 rounded-lg border border-primary/20">Initialising Consultation</p>
              </div>
            ) : (
              <DoctorAvatar
                isSpeaking={isSpeaking}
                isListening={isListening}
                statusText={statusText}
              />
            )}
          </div>

          {/* Controls footer */}
          <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-10 items-center z-10 px-10">
            <div className="hidden md:flex flex-col items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Audio Input</span>
              <button
                onClick={toggleListening}
                className={`w-20 h-20 rounded-[28px] flex items-center justify-center transition-all duration-500 border-2 ${
                  isListening
                    ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.3)] scale-110'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                }`}
              >
                {isListening ? <Mic size={28} /> : <MicOff size={28} />}
              </button>
            </div>

            <div className="flex flex-col items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Terminate Session</span>
              <button
                onClick={onClose}
                className="w-24 h-24 bg-red-600 hover:bg-red-700 hover:rotate-12 transition-all duration-500 text-white rounded-[32px] flex items-center justify-center shadow-2xl shadow-red-500/30"
              >
                <PhoneOff size={32} />
              </button>
            </div>

            <div className="hidden md:flex flex-col items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Clinical Feed</span>
              <div className="w-20 h-20 rounded-[28px] bg-white/5 border-2 border-white/5 flex items-center justify-center opacity-20 cursor-not-allowed">
                <Video size={28} className="text-white" />
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-10 right-10 flex items-center gap-3">
              {/* Secure Node info removed */}
          </div>
        </div>

        {/* Chat documentation area - Maximized for best readability */}
        <div className="w-full lg:w-[850px] bg-white flex flex-col h-full border-l border-slate-100 shadow-2xl z-20">
          <div className="p-6 border-b border-slate-50">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Consultation Log</h2>
              <div className="flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">AI Active</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-4">
            <ChatPanel history={history} />
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100">
            <form onSubmit={handleSendMessage} className="relative group">
              <input
                type="text"
                className="w-full h-16 bg-white border border-slate-200 rounded-[24px] px-8 pr-16 text-[13px] font-bold text-slate-900 shadow-sm focus:outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all duration-300 placeholder:text-slate-300"
                placeholder={isConnecting ? "Establishing synchronization..." : "Describe your symptoms or questions..."}
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                disabled={isConnecting}
              />
              <button
                type="submit"
                disabled={isConnecting || !inputMsg.trim()}
                className="absolute right-3 top-3 bottom-3 w-10 h-10 bg-slate-900 hover:bg-primary disabled:bg-slate-200 transition-all duration-300 rounded-[18px] flex items-center justify-center text-white"
              >
                <SendHorizonal size={20} />
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
