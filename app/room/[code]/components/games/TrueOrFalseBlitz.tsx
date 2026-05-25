"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TrueOrFalseQuestion } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import GameShell, { Player, Answer } from "./GameShell";
import ScorePopup from "../ui/ScorePopup";

const TIMER_SECONDS = 15;
const POINTS_MAX = 800;
const POINTS_MIN = 100;

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "#22c55e",
  medium: "#f59e0b",
  hard: "#ef4444",
};

interface TrueOrFalseBlitzProps {
  question: TrueOrFalseQuestion;
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

export default function TrueOrFalseBlitz({
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
}: TrueOrFalseBlitzProps) {
  const submitAnswer = useMutation(api.answers.submitAnswer);
  const updateScore = useMutation(api.players.updateScore);
  const updateStreak = useMutation(api.players.updateStreak);

  const [selected, setSelected] = useState<"true" | "false" | null>(null);
  const [timerRunning, setTimerRunning] = useState(true);
  const [scoreGained, setScoreGained] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const startTime = useRef(Date.now());
  const scored = useRef(false);

  const myAnswer = currentPlayer
    ? answers.find((a) => a.playerId === currentPlayer._id)
    : null;

  const correct = question.answer;
  const trueCount = answers.filter((a) => a.answer === "true").length;
  const falseCount = answers.filter((a) => a.answer === "false").length;

  useEffect(() => {
    setSelected(null);
    setTimerRunning(true);
    setShowPopup(false);
    scored.current = false;
    startTime.current = Date.now();
  }, [questionIndex]);

  useEffect(() => {
    if (myAnswer) {
      setSelected(myAnswer.answer as "true" | "false");
      setTimerRunning(false);
    }
  }, [myAnswer]);

  useEffect(() => {
    if (!isReveal || !currentPlayer || !myAnswer || scored.current) return;
    scored.current = true;

    const isCorrect = myAnswer.answer === correct;
    if (!isCorrect) {
      updateStreak({ playerId: currentPlayer._id, increment: false });
      return;
    }

    const elapsed = Date.now() - startTime.current;
    const ratio = 1 - Math.min(elapsed / (TIMER_SECONDS * 1000), 1);
    const pts = Math.round(POINTS_MIN + ratio * (POINTS_MAX - POINTS_MIN));

    setScoreGained(pts);
    setShowPopup(true);
    updateScore({ playerId: currentPlayer._id, points: pts });
    updateStreak({ playerId: currentPlayer._id, increment: true });
    setTimeout(() => setShowPopup(false), 2500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReveal]);

  async function handleSelect(choice: "true" | "false") {
    if (selected || !currentPlayer) return;
    setSelected(choice);
    setTimerRunning(false);
    await submitAnswer({
      roomId,
      questionIndex,
      playerId: currentPlayer._id,
      answer: choice,
    });
  }

  const total = answers.length;
  const truePct = total > 0 ? Math.round((trueCount / total) * 100) : 50;
  const falsePct = total > 0 ? 100 - truePct : 50;

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
            backgroundColor: DIFFICULTY_COLOR[question.difficulty] ?? "#1E5F5F",
            color: "white",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: "3px 3px 0px rgba(0,0,0,0.3)",
          }}
        >
          {question.emoji} {question.category} · {question.difficulty?.toUpperCase()}
        </div>
      }
      accentColor={question.theme?.accentColor}
    >
      <div className="relative retro-card w-full" style={{ borderColor: "var(--teal)" }}>
        <div className="relative z-10 p-5 flex flex-col gap-5 select-none">

          {/* Statement */}
          <div className="text-center py-3">
            <p className="font-mono-custom text-xs uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>
              True or False?
            </p>
            <p className="font-display text-ink text-lg md:text-2xl uppercase leading-tight">
              &ldquo;{question.statement}&rdquo;
            </p>
          </div>

          {/* Buttons or reveal */}
          {!isReveal ? (
            <div className="grid grid-cols-2 gap-4">
              {(["true", "false"] as const).map((choice) => {
                const isSelected = selected === choice;
                const isTrue = choice === "true";
                const activeBg = isTrue ? "#22c55e" : "#ef4444";

                return (
                  <motion.button
                    key={choice}
                    onClick={() => handleSelect(choice)}
                    disabled={!!selected}
                    whileHover={selected ? {} : { scale: 1.03 }}
                    whileTap={selected ? {} : { scale: 0.97 }}
                    className="flex flex-col items-center justify-center gap-2 rounded py-5 font-display uppercase text-2xl border-3 cursor-pointer"
                    style={{
                      background: isSelected ? activeBg : "var(--cream)",
                      borderColor: isSelected ? "rgba(0,0,0,0.4)" : "var(--border)",
                      color: isSelected ? "white" : "var(--ink)",
                      boxShadow: isSelected ? "none" : `3px 3px 0px ${isTrue ? "#16a34a" : "#dc2626"}`,
                      transform: isSelected ? "translate(3px, 3px)" : "none",
                      transition: "all 0.1s ease",
                    }}
                  >
                    {isTrue ? "✓ True" : "✗ False"}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-sm font-mono-custom font-bold"
                          style={{ color: "rgba(255,255,255,0.85)" }}
                        >
                          Locked in!
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Split bar */}
              <div className="flex h-10 rounded overflow-hidden border-2 border-(--ink) shadow-[2px_2px_0px_#000]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${truePct}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="flex items-center justify-center text-white font-mono-custom font-bold text-xs"
                  style={{ backgroundColor: "#22c55e", minWidth: truePct > 0 ? "2rem" : 0 }}
                >
                  {truePct > 15 && `${truePct}%`}
                </motion.div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${falsePct}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="flex items-center justify-center text-white font-mono-custom font-bold text-xs"
                  style={{ backgroundColor: "#ef4444", minWidth: falsePct > 0 ? "2rem" : 0 }}
                >
                  {falsePct > 15 && `${falsePct}%`}
                </motion.div>
              </div>
              <div className="flex justify-between text-xs font-mono-custom font-bold" style={{ color: "var(--muted)" }}>
                <span>True — {trueCount} vote{trueCount !== 1 ? "s" : ""}</span>
                <span>False — {falseCount} vote{falseCount !== 1 ? "s" : ""}</span>
              </div>

              {/* Correct answer reveal */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="rounded border-3 p-3 text-center"
                style={{
                  borderColor: correct === "true" ? "#22c55e" : "#ef4444",
                  backgroundColor: correct === "true" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                }}
              >
                <p className="font-display text-lg uppercase" style={{ color: correct === "true" ? "#22c55e" : "#ef4444" }}>
                  {correct === "true" ? "✓ TRUE!" : "✗ FALSE!"}
                </p>
                <p className="font-mono-custom text-xs mt-1" style={{ color: "var(--ink)" }}>
                  {question.explanation}
                </p>
              </motion.div>

              {/* My answer */}
              {myAnswer && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-center text-xs font-mono-custom font-bold"
                  style={{ color: myAnswer.answer === correct ? "#22c55e" : "#ef4444" }}
                >
                  {myAnswer.answer === correct
                    ? "✓ Correct! You got it right."
                    : `✗ Wrong! The answer was ${correct.toUpperCase()}.`}
                </motion.p>
              )}
            </div>
          )}
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <ScorePopup points={scoreGained} show={showPopup} />
        </div>
      </div>
    </GameShell>
  );
}
