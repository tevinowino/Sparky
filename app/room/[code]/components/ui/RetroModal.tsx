"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RetroModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
}

export default function RetroModal({
  isOpen,
  onClose,
  title,
  children,
}: RetroModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Semi-transparent dark overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", duration: 0.25 }}
            className="relative w-full max-w-md bg-(--card-bg) retro-double-border shadow-xl z-10 flex flex-col overflow-hidden max-h-[85vh] animate-retro-pop"
          >
            {/* Header bar */}
            <div className="bg-(--teal) text-white px-4 py-2 flex items-center justify-between border-b-3 border-(--teal) select-none">
              <span className="font-mono-custom font-bold uppercase text-xs tracking-widest">
                {title}
              </span>
              {onClose && (
                <button
                  onClick={onClose}
                  className="font-mono-custom font-bold text-sm bg-(--rust) hover:bg-(--rust-dark) text-white px-2 py-0.5 border border-black transition-all active:translate-y-0.5 active:translate-x-0.5 shadow-[1px_1px_0px_#000]"
                >
                  [X]
                </button>
              )}
            </div>

            {/* Content area */}
            <div className="p-4 md:p-6 overflow-y-auto font-mono-custom text-sm flex-1">
              {children}
            </div>

            {/* OK / Confirm Action Button */}
            {onClose && (
              <div className="p-4 pt-0 flex justify-center">
                <button
                  onClick={onClose}
                  className="btn-teal px-6 py-2 text-xs font-bold"
                >
                  OK
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
