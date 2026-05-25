"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CompatibilityQuestion } from "@/lib/types";
import { motion } from "framer-motion";
import GameShell, { Player, Answer } from "./GameShell";
import ScorePopup from "../ui/ScorePopup";

const TIMER_SECONDS = 20;
const POINTS_PER_MATCH = 80;
const POINTS_HOST_MATCH = 350;

const OPTION_KEYS = ["A", "B", "C", "D"] as const;
const OPTION_COLORS = [
  { border: "#3b82f6", bg: "rgba(59,130,246,0.08)", selected: "#3b82f6" },
  { border: "#7c3aed", bg: "rgba(124,58,237,0.08)", selected: "#7c3aed" },
  { border: "#f59e0b", bg: "rgba(245,158,11,0.08)", selected: "#f59e0b" },
  { border: "#ec4899", bg: "rgba(236,72,153,0.08)", selected: "#ec4899" },
];

interface CompatibilityTestProps {
  question: CompatibilityQuestion;
  questionIndex: number;
  totalQuestions: number;
  roomId: Id<"rooms">;
  players: Player[];
  currentPlayer: Player | null;
  answers: Answer[];
  isReveal: boolean;
  isHost: boolean;
  onNext: () => void;
  onShowReveal: () => void;
  onAbandon?: () => void;
  onLeave?: () => void;
  isLastQuestion: boolean;
  gameMode?: string;
}

export default function CompatibilityTest({
  question,
  questionIndex,
  totalQuestions,
  roomId,
  players,
  currentPlayer,
  answers,
  isReveal,
  isHost,
  onNext,
  onShowReveal,
  onAbandon,
  onLeave,
  isLastQuestion,
  gameMode,
}: CompatibilityTestProps) {
  const submitAnswer = useMutation(api.answers.submitAnswer);
  const updateScore = useMutation(api.players.updateScore);
  const updateStreak = useMutation(api.players.updateStreak);

  const [selected, setSelected] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(true);
  const [scoreGained, setScoreGained] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const scored = useRef(false);

  const isHWDYKM = gameMode === "how_well_do_you_know_me";

  const myAnswer = currentPlayer
    ? answers.find((a) => a.playerId === currentPlayer._id)
    : null;

  // For HWDYKM: host's answer is the "correct" one
  const hostPlayer = players.find((p) => p.isHost);
  const hostAnswer = isHWDYKM && hostPlayer
    ? answers.find((a) => a.playerId === hostPlayer._id)?.answer ?? null
    : null;

  const voteCounts: Record<string, number> = {};
  for (const a of answers) {
    voteCounts[a.answer] = (voteCounts[a.answer] ?? 0) + 1;
  }
  const maxVotes = Math.max(0, ...Object.values(voteCounts));
  const majorityKey = Object.entries(voteCounts).find(([, c]) => c === maxVotes)?.[0] ?? null;

  useEffect(() => {
    setSelected(null);
    setTimerRunning(true);
    setShowPopup(false);
    scored.current = false;
  }, [questionIndex]);

  useEffect(() => {
    if (myAnswer) {
      setSelected(myAnswer.answer);
      setTimerRunning(false);
    }
  }, [myAnswer]);

  useEffect(() => {
    if (!isReveal || !currentPlayer || !myAnswer || scored.current) return;
    scored.current = true;

    let pts = 0;

    if (isHWDYKM) {
      // Points for matching host
      if (hostAnswer && myAnswer.answer === hostAnswer && currentPlayer._id !== hostPlayer?._id) {
        pts = POINTS_HOST_MATCH;
      }
    } else {
      // Points per other player who chose the same
      const sameCount = (voteCounts[myAnswer.answer] ?? 1) - 1;
      pts = sameCount * POINTS_PER_MATCH;
    }

    if (pts > 0) {
      setScoreGained(pts);
      setShowPopup(true);
      updateScore({ playerId: currentPlayer._id, points: pts });
      updateStreak({ playerId: currentPlayer._id, increment: true });
      setTimeout(() => setShowPopup(false), 2500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReveal]);

  async function handleSelect(key: string) {
    if (selected || !currentPlayer) return;
    setSelected(key);
    setTimerRunning(false);
    await submitAnswer({
      roomId,
      questionIndex,
      playerId: currentPlayer._id,
      answer: key,
    });
  }

  const badgeEmoji = gameMode === "love_language_quiz" ? "💕" : gameMode === "how_well_do_you_know_me" ? "🤫" : "✨";
  const badgeBg = gameMode === "love_language_quiz" ? "#ec4899" : gameMode === "how_well_do_you_know_me" ? "#7c3aed" : "#1E5F5F";

  return (
    <GameShell
      questionIndex={questionIndex}
      totalQuestions={totalQuestions}
      isReveal={isReveal}
      isHost={isHost}
      isLastQuestion={isLastQuestion}
      players={players}
      answers={answers}
      timerSeconds={TIMER_SECONDS}
      timerRunning={timerRunning}
      onExpire={onShowReveal}
      onShowReveal={onShowReveal}
      onNext={onNext}
      onAbandon={onAbandon}
      onLeave={onLeave}
      gameMode={gameMode}
      badge={
        <div
          className="font-mono-custom font-bold uppercase text-xs tracking-widest px-4 py-2 rounded-full"
          style={{
            backgroundColor: badgeBg,
            color: "white",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: "3px 3px 0px rgba(0,0,0,0.3)",
          }}
        >
          {badgeEmoji} {question.category ?? "Pick yours"}
        </div>
      }
      accentColor={question.theme?.accentColor}
    >
      <div className="relative retro-card w-full" style={{ borderColor: "var(--teal)" }}>
        <div className="relative z-10 p-5 flex flex-col gap-4 select-none">

          {isHWDYKM && (
            <div className="text-center">
              <span className="font-mono-custom text-[10px] uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ backgroundColor: "rgba(124,58,237,0.12)", color: "#7c3aed", border: "1px solid #7c3aed" }}>
                {isHost ? "Answer honestly — others will guess you!" : `Guess what ${hostPlayer?.name ?? "the host"} would pick`}
              </span>
            </div>
          )}

          {/* Question */}
          <p className="font-display text-ink text-lg md:text-xl uppercase leading-tight text-center py-2">
            {question.question}
          </p>

          {/* Options */}
          <div className="grid grid-cols-1 gap-2.5">
            {OPTION_KEYS.map((key, i) => {
              const col = OPTION_COLORS[i];
              const isSelected = selected === key;
              const votes = voteCounts[key] ?? 0;
              const isMajority = isReveal && key === majorityKey && votes > 0;
              const isHostPick = isReveal && isHWDYKM && key === hostAnswer;
              const isMyPick = isReveal && myAnswer?.answer === key;

              let borderColor = col.border;
              let bg = "transparent";
              if (isSelected && !isReveal) { borderColor = col.selected; bg = col.bg; }
              if (isReveal && isMajority && !isHWDYKM) { borderColor = "#22c55e"; bg = "rgba(34,197,94,0.08)"; }
              if (isReveal && isHostPick) { borderColor = "#7c3aed"; bg = "rgba(124,58,237,0.1)"; }

              return (
                <motion.button
                  key={key}
                  onClick={() => handleSelect(key)}
                  disabled={!!selected}
                  whileHover={selected ? {} : { scale: 1.01 }}
                  whileTap={selected ? {} : { scale: 0.99 }}
                  className="relative overflow-hidden flex items-center gap-3 p-3 rounded border-3 text-left cursor-pointer"
                  style={{ background: bg, borderColor, opacity: 1 }}
                >
                  {/* Vote bar */}
                  {isReveal && votes > 0 && maxVotes > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(votes / maxVotes) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="absolute inset-y-0 left-0"
                      style={{ backgroundColor: `${col.selected}12`, zIndex: 0 }}
                    />
                  )}

                  {/* Key badge */}
                  <div className="relative z-10 w-7 h-7 rounded border-2 flex items-center justify-center font-display text-xs shrink-0"
                    style={{ borderColor, color: isSelected ? col.selected : "var(--ink)", backgroundColor: isSelected && !isReveal ? col.bg : "transparent" }}>
                    {isMyPick && isReveal ? "→" : key}
                  </div>

                  <span className="relative z-10 font-mono-custom font-bold text-xs flex-1 text-left leading-snug" style={{ color: "var(--ink)" }}>
                    {question.options[key]}
                  </span>

                  {isReveal && (
                    <div className="relative z-10 flex items-center gap-2 shrink-0">
                      {isHostPick && (
                        <span className="text-xs font-bold" style={{ color: "#7c3aed" }}>👤 Host</span>
                      )}
                      {votes > 0 && (
                        <span className="font-display text-xs" style={{ color: "var(--muted)" }}>
                          {votes}
                        </span>
                      )}
                      {isMajority && !isHWDYKM && (
                        <span className="text-xs font-mono-custom font-bold" style={{ color: "#22c55e" }}>Most</span>
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Reveal message */}
          {isReveal && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center text-[10px] font-mono-custom font-bold uppercase tracking-widest"
              style={{ color: "var(--teal)" }}
            >
              {isHWDYKM
                ? hostAnswer
                  ? myAnswer?.answer === hostAnswer && !isHost
                    ? `✓ Nailed it! ${POINTS_HOST_MATCH} pts`
                    : myAnswer?.answer === hostAnswer && isHost
                    ? "You answered honestly!"
                    : `The host picked: Option ${hostAnswer}`
                  : "Host hasn't answered yet"
                : majorityKey
                ? `${(voteCounts[majorityKey] ?? 0)} player${(voteCounts[majorityKey] ?? 0) !== 1 ? "s" : ""} picked Option ${majorityKey} — +${POINTS_PER_MATCH} pts per match!`
                : "No votes recorded"}
            </motion.p>
          )}
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <ScorePopup points={scoreGained} show={showPopup} />
        </div>
      </div>
    </GameShell>
  );
}
