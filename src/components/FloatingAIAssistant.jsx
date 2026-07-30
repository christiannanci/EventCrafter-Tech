import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FloatingAIAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hovered, setHovered] = React.useState(false);

  // Ne pas afficher sur la page Assistant elle-même
  if (location.pathname === '/AIAssistant') return null;

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate('/AIAssistant')}
      aria-label="Ouvrir l'assistant IA EventCrafter"
      className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2 bg-gradient-to-r from-[#FF6B35] to-[#F4C542] text-white rounded-full shadow-lg hover:shadow-xl transition-shadow pl-3 pr-4 h-14 min-h-[44px] min-w-[56px]"
    >
      <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-5 h-5" />
      </div>
      <motion.span
        initial={false}
        animate={{ opacity: hovered ? 1 : 0, width: hovered ? 'auto' : 0 }}
        className="text-sm font-medium whitespace-nowrap overflow-hidden"
      >
        Assistant IA
      </motion.span>
    </motion.button>
  );
}
