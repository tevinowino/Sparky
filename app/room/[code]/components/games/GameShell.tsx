"use client";
import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Id } from "@/convex/_generated/dataModel";
import Leaderboard from "../Leaderboard";
import Timer from "../ui/Timer";
import { HowToPlayModal } from "../ui/HowToPlay";

export interface Player {
  _id: Id<"players">;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  isHost: boolean;
  isConnected: boolean;
}

export interface Answer {
  _id: string;
  playerId: Id<"players">;
  answer: string;
}

interface GameShellProps {
  questionIndex: number;
  totalQuestions: number;
  isReveal: boolean;
  isHost: boolean;
  isLastQuestion: boolean;
  players: Player[];
  answers: Answer[];
  timerSeconds: number;
  timerRunning: boolean;
  onExpire: () => void;
  onShowReveal: () => void;
  onNext: () => void;
  onAbandon?: () => void;
  onLeave?: () => void;
  gameMode?: string;
  badge?: ReactNode;
  accentColor?: string;
  children: ReactNode;
  revealExtra?: ReactNode;
}

const GAME_MODE_LABELS: Record<string, string> = {
  would_you_rather: "Would You Rather",
  hot_takes: "Hot Takes",
  most_likely_to: "Most Likely To",
  never_have_i_ever: "Never Have I Ever",
  classic_trivia: "Classic Trivia",
  true_or_false_blitz: "True or False Blitz",
  red_flag_green_flag: "Red Flag or Green Flag",
  truth_or_dare: "Truth or Dare",
  confess_or_dare: "Confess or Dare",
  compatibility_test: "Compatibility Test",
  love_language_quiz: "Love Language Quiz",
  how_well_do_you_know_me: "How Well Do You Know Me?",
  rank_it: "Rank It",
  closest_wins: "Closest Wins",
  poll_spy: "Poll Spy",
  quiplash: "Quiplash",
  bad_advice: "Bad Advice",
  two_truths_one_lie: "Two Truths One Lie",
  first_impressions: "First Impressions",
  assumptions: "Assumptions",
  fantasy_scenarios: "Fantasy Scenarios",
  spicy_never_have_i_ever: "Spicy Never Have I Ever",
  common_ground: "Common Ground",
  fibbage: "Fibbage",
};

export default function GameShell({
  questionIndex,
  totalQuestions,
  isReveal,
  isHost,
  isLastQuestion,
  players,
  answers,
  timerSeconds,
  timerRunning,
  onExpire,
  onShowReveal,
  onNext,
  onAbandon,
  onLeave,
  gameMode,
  badge,
  children,
  revealExtra,
}: GameShellProps) {
  const answeredIds = new Set(answers.map((a) => a.playerId));
  const modeName = gameMode ? (GAME_MODE_LABELS[gameMode] ?? gameMode) : "";

  return (
    <div className="flex flex-col h-full select-none">

      {/* ── Top info bar ── */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}
      >
        <button
          onClick={isHost ? onAbandon : onLeave}
          className="font-mono-custom font-bold uppercase text-xs tracking-wider px-2.5 py-1.5 rounded transition-all"
          style={{
            border: "2px solid rgba(255,255,255,0.25)",
            color: "rgba(255,255,255,0.7)",
            backgroundColor: "rgba(255,255,255,0.08)",
          }}
        >
          ← {isHost ? "Lobby" : "Leave"}
        </button>

        <div className="text-center">
          <div
            className="font-mono-custom font-bold uppercase text-[10px] tracking-widest"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            ROUND {questionIndex + 1} OF {totalQuestions}
          </div>
          <div
            className="font-display uppercase text-sm leading-tight"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            {modeName}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="font-mono-custom text-xs font-bold"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            {answers.length}/{players.length} ✓
          </div>
          {gameMode && <HowToPlayModal gameMode={gameMode} />}
        </div>
      </div>

      {/* ── Player avatar strip ── */}
      <div className="flex justify-center gap-2 px-4 py-2 shrink-0 flex-wrap">
        {players.map((p) => {
          const answered = answeredIds.has(p._id);
          return (
            <div key={p._id} className="relative shrink-0" title={p.name}>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 overflow-hidden"
                style={{
                  borderColor: answered ? "#94d1d1" : "rgba(255,255,255,0.2)",
                  backgroundColor: answered ? "rgba(148,209,209,0.18)" : "rgba(255,255,255,0.06)",
                  opacity: answered ? 1 : 0.38,
                  transition: "all 0.3s ease",
                }}
              >
                {p.avatar.startsWith("/") ? (
                  <img src={p.avatar} alt={p.name} className="w-7 h-7 object-contain pixelated" />
                ) : (
                  <span>{p.avatar}</span>
                )}
              </div>
              <AnimatePresence>
                {answered && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold border border-transparent"
                    style={{ backgroundColor: "#94d1d1", color: "#004747" }}
                  >
                    ✓
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── Badge + timer row (overlaps top edge of card) ── */}
      <div
        className="flex justify-between items-end px-5 shrink-0 relative z-20"
        style={{ marginBottom: "-22px" }}
      >
        <div>{badge ?? <div />}</div>
        {!isReveal && (
          <Timer durationSeconds={timerSeconds} running={timerRunning} onExpire={onExpire} />
        )}
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={questionIndex}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {isReveal && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3 mt-4"
            >
              {revealExtra}
              <Leaderboard players={players} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom host controls ── */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}
      >
        {isHost ? (
          <div className="flex justify-end">
            {!isReveal ? (
              <button onClick={onShowReveal} className="btn-teal px-6 py-2 text-sm">
                Show Results
              </button>
            ) : (
              <button onClick={onNext} className="btn-rust px-8 py-3">
                {isLastQuestion ? "🏆 Final Results" : "Next Question →"}
              </button>
            )}
          </div>
        ) : isReveal ? (
          <p
            className="text-center text-xs font-mono-custom"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Waiting for host to continue…
          </p>
        ) : null}
      </div>
    </div>
  );
}
