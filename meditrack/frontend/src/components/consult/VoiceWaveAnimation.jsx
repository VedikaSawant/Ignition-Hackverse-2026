import { motion } from 'framer-motion';

export default function VoiceWaveAnimation({ isSpeaking }) {
  if (!isSpeaking) return null;

  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {[...Array(7)].map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] bg-primary rounded-full"
          animate={{
            height: ['6px', '22px', '6px'],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}
