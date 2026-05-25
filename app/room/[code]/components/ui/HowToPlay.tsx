"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TUTORIALS, Tutorial } from "@/lib/tutorials";

// ── Inline panel used in Lobby ───────────────────────────────────────────────
export function HowToPlayPanel({ gameMode }: { gameMode: string }) {
  const t = TUTORIALS[gameMode];
  if (!t) return null;
  return <TutorialContent t={t} />;
}

// ── Modal triggered by a ? button (used in-game) ─────────────────────────────
export function HowToPlayModal({ gameMode }: { gameMode: string }) {
  const [open, setOpen] = useState(false);
  const t = TUTORIALS[gameMode];
  if (!t) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
        style={{
          border: "2px solid rgba(255,255,255,0.3)",
          backgroundColor: "rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.8)",
        }}
        title="How to play"
      >
        ?
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
              onClick={() => setOpen(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl max-h-[80vh] overflow-y-auto"
              style={{ backgroundColor: "var(--card-bg)", border: "3px solid var(--teal)" }}
            >
              <div className="sticky top-0 section-header flex items-center justify-between px-4">
                <span>How to Play</span>
                <button
                  onClick={() => setOpen(false)}
                  className="text-white/70 hover:text-white text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="p-5">
                <TutorialContent t={t} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Shared content renderer ───────────────────────────────────────────────────
function TutorialContent({ t }: { t: Tutorial }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{t.emoji}</span>
        <div>
          <p
            className="font-display text-xl uppercase"
            style={{ color: "var(--teal)" }}
          >
            {t.title}
          </p>
          <p
            className="font-mono-custom text-xs italic"
            style={{ color: "var(--muted)" }}
          >
            {t.tagline}
          </p>
        </div>
      </div>

      {/* How to play */}
      <div>
        <div
          className="font-mono-custom font-bold uppercase text-xs tracking-widest mb-2"
          style={{ color: "var(--muted)" }}
        >
          How it works
        </div>
        <ol className="flex flex-col gap-1.5">
          {t.howToPlay.map((step, i) => (
            <li key={i} className="flex gap-2">
              <span
                className="font-display text-sm shrink-0 w-5 text-right"
                style={{ color: "var(--rust)" }}
              >
                {i + 1}.
              </span>
              <span
                className="font-mono-custom text-sm"
                style={{ color: "var(--ink)", lineHeight: 1.5 }}
              >
                {step}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Points */}
      <div>
        <div
          className="font-mono-custom font-bold uppercase text-xs tracking-widest mb-2"
          style={{ color: "var(--muted)" }}
        >
          Points breakdown
        </div>
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "2px solid var(--border)" }}
        >
          {t.points.map((rule, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2"
              style={{
                borderBottom:
                  i < t.points.length - 1 ? "1px solid var(--border)" : "none",
                backgroundColor: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)",
              }}
            >
              <div
                className="font-display text-base w-24 shrink-0"
                style={{ color: "var(--rust)" }}
              >
                {rule.value}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="font-mono-custom font-bold text-xs"
                  style={{ color: "var(--ink)" }}
                >
                  {rule.label}
                </div>
                <div
                  className="font-mono-custom text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  {rule.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div
        className="flex gap-2 p-3 rounded-lg"
        style={{
          backgroundColor: "rgba(196,71,42,0.06)",
          border: "1px solid rgba(196,71,42,0.2)",
        }}
      >
        <span className="text-base shrink-0">💡</span>
        <p
          className="font-mono-custom text-xs italic"
          style={{ color: "var(--ink)", lineHeight: 1.5 }}
        >
          <strong>Pro tip:</strong> {t.tip}
        </p>
      </div>
    </div>
  );
}
