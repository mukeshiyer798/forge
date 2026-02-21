import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getReloadMessage, dismissReloadMessage } from '@/lib/reloadMessages';

export default function ReloadMessage() {
  const { streak } = useAppStore();
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const msg = getReloadMessage(streak);
    setMessage(msg);
  }, [streak]);

  const handleDismiss = () => {
    setVisible(false);
    dismissReloadMessage();
  };

  if (!message || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-forge-surface border border-forge-amber/30 rounded-lg shadow-lg"
      >
        <span className="font-mono text-sm text-forge-amber">{message}</span>
        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-forge-surface2 text-forge-dim transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
