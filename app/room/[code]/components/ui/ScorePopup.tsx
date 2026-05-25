"use client";
import { motion, AnimatePresence } from "framer-motion";

interface ScorePopupProps {
  points: number;
  show: boolean;
}

export default function ScorePopup({ points, show }: ScorePopupProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 0, opacity: 1, scale: 0.8 }}
          animate={{ y: -60, opacity: 0, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute pointer-events-none font-display text-3xl"
          style={{ color: "var(--rust)", zIndex: 50 }}
        >
          +{points}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
