import { motion } from 'framer-motion';

export default function VoiceWaveAnimation({ isSpeaking }) {
  if (!isSpeaking) return null;

  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1.5 bg-blue-500 rounded-full"
          animate={{
            height: ['8px', '24px', '8px'],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}
