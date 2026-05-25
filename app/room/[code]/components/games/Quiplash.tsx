"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { QuiplashQuestion } from "@/lib/types";
import { motion } from "framer-motion";
import GameShell, { Player, Answer } from "./GameShell";
import ScorePopup from "../ui/ScorePopup";

const TIMER_SECONDS = 25;
const POINTS_WINNER = 400;
const POINTS_RUNNER_UP = 200;
const POINTS_PARTICIPATED = 75;

const OPTION_KEYS = ["A", "B", "C", "D"] as const;
const OPTION_COLORS = ["#3b82f6", "#7c3aed", "#f59e0b", "#ec4899"];

interface QuiplashProps {
  question: QuiplashQuestion;
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

export default function Quiplash({
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
}: QuiplashProps) {
  const submitAnswer = useMutation(api.answers.submitAnswer);
  const updateScore = useMutation(api.players.updateScore);
  const updateStreak = useMutation(api.players.updateStreak);

  const [selected, setSelected] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(true);
  const [scoreGained, setScoreGained] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const scored = useRef(false);

  const isBadAdvice = gameMode === "bad_advice";
  const promptLabel = isBadAdvice ? question.prompt : question.prompt;

  const myAnswer = currentPlayer
    ? answers.find((a) => a.playerId === currentPlayer._id)
    : null;

  const voteCounts: Record<string, number> = {};
  for (const a of answers) {
    voteCounts[a.answer] = (voteCounts[a.answer] ?? 0) + 1;
  }
  const maxVotes = Math.max(0, ...Object.values(voteCounts));
  const winners = Object.entries(voteCounts)
    .filter(([, c]) => c === maxVotes && maxVotes > 0)
    .map(([k]) => k);
  const runnerUpVotes = maxVotes > 1
    ? Object.values(voteCounts).filter((c) => c < maxVotes).reduce((a, b) => Math.max(a, b), 0)
    : 0;

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

    let pts = POINTS_PARTICIPATED;
    if (winners.includes(myAnswer.answer)) {
      pts = POINTS_WINNER;
    } else if (runnerUpVotes > 0 && (voteCounts[myAnswer.answer] ?? 0) === runnerUpVotes) {
      pts = POINTS_RUNNER_UP;
    }

    setScoreGained(pts);
    setShowPopup(true);
    updateScore({ playerId: currentPlayer._id, points: pts });
    updateStreak({ playerId: currentPlayer._id, increment: winners.includes(myAnswer.answer) });
    setTimeout(() => setShowPopup(false), 2500);
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
            backgroundColor: isBadAdvice ? "#dc2626" : "#7c3aed",
            color: "white",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: `3px 3px 0px ${isBadAdvice ? "#b91c1c" : "#6d28d9"}`,
          }}
        >
          {question.emoji} {isBadAdvice ? "Vote worst advice" : "Vote your fave"} · {POINTS_WINNER} pts
        </div>
      }
      accentColor={question.theme?.accentColor}
    >
      <div className="relative retro-card w-full" style={{ borderColor: "var(--teal)" }}>
        <div className="relative z-10 p-5 flex flex-col gap-4 select-none">

          {/* Prompt */}
          <div className="text-center py-2">
            <p className="font-mono-custom text-xs uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
              {isBadAdvice ? "The situation:" : "The prompt:"}
            </p>
            <p className="font-display text-ink text-base md:text-lg uppercase leading-tight">
              {promptLabel}
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-2">
            {OPTION_KEYS.map((key, i) => {
              const color = OPTION_COLORS[i];
              const isSelected = selected === key;
              const votes = voteCounts[key] ?? 0;
              const isWinner = isReveal && winners.includes(key) && maxVotes > 0;

              return (
                <motion.button
                  key={key}
                  onClick={() => handleSelect(key)}
                  disabled={!!selected}
                  whileHover={selected ? {} : { scale: 1.01 }}
                  whileTap={selected ? {} : { scale: 0.99 }}
                  className="relative overflow-hidden flex items-center gap-3 p-3 rounded border-3 text-left cursor-pointer"
                  style={{
                    borderColor: isWinner ? color : isSelected ? color : "var(--border)",
                    backgroundColor: isWinner ? `${color}18` : isSelected ? `${color}0f` : "transparent",
                    boxShadow: isWinner ? `2px 2px 0px ${color}` : "none",
                  }}
                >
                  {/* Vote bar */}
                  {isReveal && votes > 0 && maxVotes > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(votes / maxVotes) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="absolute inset-y-0 left-0 rounded-l-sm"
                      style={{ backgroundColor: `${color}10`, zIndex: 0 }}
                    />
                  )}

                  <div
                    className="relative z-10 w-7 h-7 rounded border-2 flex items-center justify-center font-display text-xs shrink-0"
                    style={{
                      borderColor: color,
                      backgroundColor: isSelected || isWinner ? color : "transparent",
                      color: isSelected || isWinner ? "white" : color,
                    }}
                  >
                    {isWinner ? "★" : key}
                  </div>

                  <span
                    className="relative z-10 font-mono-custom font-bold text-xs flex-1 text-left leading-snug"
                    style={{ color: "var(--ink)" }}
                  >
                    {question.options[key]}
                  </span>

                  {isReveal && votes > 0 && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="relative z-10 font-display text-xs shrink-0"
                      style={{ color }}
                    >
                      {votes} vote{votes !== 1 ? "s" : ""}
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {isReveal && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center text-[10px] font-mono-custom font-bold uppercase tracking-widest"
              style={{ color: "var(--teal)" }}
            >
              {winners.length > 0
                ? `Most popular: Option ${winners.join(" & ")} — ${POINTS_WINNER} pts!`
                : "Vote for your favorite!"}
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
