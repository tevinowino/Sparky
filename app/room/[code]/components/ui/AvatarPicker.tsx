"use client";
import { motion, AnimatePresence } from "framer-motion";

interface AvatarPickerProps {
  emojis: string[];
  selected: string;
  onSelect: (emoji: string) => void;
  takenAvatars?: string[];
}

const AVATAR_NAMES: Record<string, string> = {
  "/avatars/avatar_dog.png": "Sparky",
  "/avatars/avatar_cat.png": "Mittens",
  "/avatars/avatar_robot.png": "Gearhead",
  "/avatars/avatar_wizard.png": "Merlin",
  "/avatars/avatar_dino.png": "Rex",
  "/avatars/avatar_fairy.png": "Pixie",
  "/avatars/avatar_knight.png": "Arthur",
  "/avatars/avatar_unicorn.png": "Celeste",
  "/avatars/avatar_ninja.png": "Shadow",
  "/avatars/avatar_princess.png": "Seraphina",
  "/avatars/avatar_astronaut.png": "Major Tom",
  "/avatars/avatar_mermaid.png": "Marina",
  "/avatars/avatar_pirate.png": "Barnaby",
  "/avatars/avatar_bunny.png": "Thumper",
  "/avatars/avatar_cyborg.png": "Neon",
};

export default function AvatarPicker({
  emojis,
  selected,
  onSelect,
  takenAvatars = [],
}: AvatarPickerProps) {
  const currentIndex = emojis.indexOf(selected);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  function step(from: number, dir: 1 | -1): number {
    let i = (from + dir + emojis.length) % emojis.length;
    let guard = emojis.length;
    while (takenAvatars.includes(emojis[i]) && guard-- > 0) {
      i = (i + dir + emojis.length) % emojis.length;
    }
    return i;
  }

  const prevIndex = step(activeIndex, -1);
  const nextIndex = step(activeIndex, 1);

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {/* Selector Row */}
      <div className="flex items-center justify-between w-full max-w-[280px] bg-[var(--cream)] border-2 border-[var(--border)] p-2 rounded mx-auto">
        {/* Left Arrow */}
        <button
          type="button"
          onClick={() => onSelect(emojis[prevIndex])}
          className="btn-teal w-9 h-9 flex items-center justify-center font-display text-base font-bold cursor-pointer rounded border-2"
          style={{ borderColor: "var(--teal-dark)" }}
        >
          &lt;
        </button>

        {/* Character Display Area */}
        <div className="flex items-center justify-center gap-3">
          {/* Faded Previous */}
          <button
            type="button"
            onClick={() => onSelect(emojis[prevIndex])}
            className="w-8 h-8 opacity-45 hover:opacity-75 transition-opacity flex items-center justify-center cursor-pointer scale-90"
          >
            <img
              src={emojis[prevIndex]}
              alt="Previous avatar"
              className="w-full h-full object-contain pixelated"
            />
          </button>

          {/* Active Avatar Frame */}
          <div className="relative w-14 h-14 bg-[var(--card-bg)] retro-double-border flex items-center justify-center p-0.5 animate-retro-pop">
            <AnimatePresence mode="wait">
              <motion.img
                key={selected}
                src={selected}
                alt="Selected avatar"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-10 h-10 object-contain pixelated"
              />
            </AnimatePresence>
          </div>

          {/* Faded Next */}
          <button
            type="button"
            onClick={() => onSelect(emojis[nextIndex])}
            className="w-8 h-8 opacity-45 hover:opacity-75 transition-opacity flex items-center justify-center cursor-pointer scale-90"
          >
            <img
              src={emojis[nextIndex]}
              alt="Next avatar"
              className="w-full h-full object-contain pixelated"
            />
          </button>
        </div>

        {/* Right Arrow */}
        <button
          type="button"
          onClick={() => onSelect(emojis[nextIndex])}
          className="btn-teal w-9 h-9 flex items-center justify-center font-display text-base font-bold cursor-pointer rounded border-2"
          style={{ borderColor: "var(--teal-dark)" }}
        >
          &gt;
        </button>
      </div>

      {/* Character Name Display */}
      <div className="text-center h-5 flex items-center justify-center overflow-hidden my-0.5">
        <AnimatePresence mode="wait">
          <motion.span
            key={selected}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="font-mono-custom font-bold uppercase text-[10px] tracking-widest text-[var(--teal)]"
          >
            — {AVATAR_NAMES[selected] || "Hero"} —
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Retro Indicator Dots */}
      <div className="flex justify-center gap-1.5 flex-wrap max-w-[260px] mx-auto">
        {emojis.map((emoji, idx) => {
          const isTaken = takenAvatars.includes(emoji);
          const isActive = idx === activeIndex;
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => !isTaken && onSelect(emoji)}
              disabled={isTaken}
              title={isTaken ? "Taken" : undefined}
              className="w-2.5 h-2.5 transition-all border"
              style={{
                backgroundColor: isActive ? "var(--rust)" : isTaken ? "rgba(0,0,0,0.12)" : "var(--border)",
                borderColor: isActive ? "var(--rust-dark)" : "var(--border)",
                borderRadius: "2px",
                boxShadow: isActive ? "1px 1px 0px rgba(0,0,0,0.15)" : "none",
                transform: isActive ? "scale(1.15)" : "scale(1)",
                cursor: isTaken ? "not-allowed" : "pointer",
                opacity: isTaken ? 0.35 : 1,
              }}
              aria-label={`Select avatar ${idx + 1}${isTaken ? " (taken)" : ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}
