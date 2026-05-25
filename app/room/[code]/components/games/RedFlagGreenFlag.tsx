"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { RedFlagGreenFlagQuestion } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import GameShell, { Player, Answer } from "./GameShell";
import ScorePopup from "../ui/ScorePopup";

const TIMER_SECONDS = 20;
const POINTS_MAJORITY = 50;
const POINTS_MINORITY = 250;
const POINTS_SPEED = 50;

interface RedFlagGreenFlagProps {
  question: RedFlagGreenFlagQuestion;
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

export default function RedFlagGreenFlag({
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
}: RedFlagGreenFlagProps) {
  const submitAnswer = useMutation(api.answers.submitAnswer);
  const updateScore = useMutation(api.players.updateScore);
  const updateStreak = useMutation(api.players.updateStreak);

  const [selected, setSelected] = useState<"red" | "green" | null>(null);
  const [timerRunning, setTimerRunning] = useState(true);
  const [scoreGained, setScoreGained] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const startTime = useRef(Date.now());
  const scored = useRef(false);

  const myAnswer = currentPlayer
    ? answers.find((a) => a.playerId === currentPlayer._id)
    : null;

  const redCount = answers.filter((a) => a.answer === "red").length;
  const greenCount = answers.filter((a) => a.answer === "green").length;
  const total = answers.length;

  useEffect(() => {
    setSelected(null);
    setTimerRunning(true);
    setShowPopup(false);
    scored.current = false;
    startTime.current = Date.now();
  }, [questionIndex]);

  useEffect(() => {
    if (myAnswer) {
      setSelected(myAnswer.answer as "red" | "green");
      setTimerRunning(false);
    }
  }, [myAnswer]);

  useEffect(() => {
    if (!isReveal || !currentPlayer || !myAnswer || scored.current) return;
    scored.current = true;

    const elapsed = Date.now() - startTime.current;
    const isMinority =
      (myAnswer.answer === "red" && redCount < greenCount) ||
      (myAnswer.answer === "green" && greenCount < redCount);
    const speedBonus = elapsed < (TIMER_SECONDS * 1000) / 2 ? POINTS_SPEED : 0;
    const pts = (isMinority ? POINTS_MINORITY : POINTS_MAJORITY) + speedBonus;

    setScoreGained(pts);
    setShowPopup(true);
    updateScore({ playerId: currentPlayer._id, points: pts });
    updateStreak({ playerId: currentPlayer._id, increment: true });
    setTimeout(() => setShowPopup(false), 2200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReveal]);

  async function handleSelect(choice: "red" | "green") {
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

  const redPct = total > 0 ? Math.round((redCount / total) * 100) : 50;
  const greenPct = total > 0 ? 100 - redPct : 50;

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
            backgroundColor: "#C4472A",
            color: "white",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: "3px 3px 0px #A3331A",
          }}
        >
          {question.emoji} {question.context?.toUpperCase() ?? "VIBE CHECK"} · {question.intensity}/10
        </div>
      }
      accentColor={question.theme?.accentColor}
    >
      <div className="relative retro-card w-full" style={{ minHeight: "280px", borderColor: "var(--teal)" }}>
        <div className="relative z-10 p-5 flex flex-col gap-5 select-none">

          {/* Context chip */}
          <div>
            <span className="font-mono-custom font-bold uppercase text-[10px] tracking-widest px-3 py-1 rounded bg-(--teal) text-white border border-(--teal-dark)">
              Red Flag or Green Flag?
            </span>
          </div>

          {/* Scenario */}
          <div className="text-center py-2 flex-1 flex flex-col justify-center items-center">
            <p className="font-display text-2xl md:text-3xl mb-2">{question.emoji}</p>
            <p className="font-display text-ink text-lg md:text-2xl uppercase leading-tight">
              &ldquo;{question.scenario}&rdquo;
            </p>
          </div>

          {/* Buttons or reveal */}
          {!isReveal ? (
            <div className="grid grid-cols-2 gap-4">
              {(["red", "green"] as const).map((choice) => {
                const isRed = choice === "red";
                const isSelected = selected === choice;
                const activeBg = isRed ? "#ef4444" : "#22c55e";
                const icon = isRed ? "🚩" : "🟢";
                const label = isRed ? "Red Flag" : "Green Flag";

                return (
                  <motion.button
                    key={choice}
                    onClick={() => handleSelect(choice)}
                    disabled={!!selected}
                    whileHover={selected ? {} : { scale: 1.03 }}
                    whileTap={selected ? {} : { scale: 0.97 }}
                    className="flex flex-col items-center justify-center gap-2 rounded py-4 font-mono-custom font-bold uppercase text-sm border-3 cursor-pointer"
                    style={{
                      background: isSelected ? activeBg : "var(--cream)",
                      borderColor: isSelected ? "rgba(0,0,0,0.3)" : "var(--border)",
                      color: isSelected ? "white" : "var(--ink)",
                      boxShadow: isSelected ? "none" : `3px 3px 0px ${isRed ? "#dc2626" : "#16a34a"}`,
                      transform: isSelected ? "translate(3px, 3px)" : "none",
                      transition: "all 0.1s ease",
                    }}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span>{label}</span>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[10px] opacity-80">
                          Locked in!
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {/* Split bar */}
              <div className="flex h-10 rounded overflow-hidden border-2 border-(--ink) shadow-[2px_2px_0px_#000]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${redPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="flex items-center justify-center gap-1 text-white font-mono-custom font-bold text-xs"
                  style={{ backgroundColor: "#ef4444", minWidth: redPct > 0 ? "2rem" : 0 }}
                >
                  {redPct > 15 && `🚩 ${redPct}%`}
                </motion.div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${greenPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="flex items-center justify-center gap-1 text-white font-mono-custom font-bold text-xs"
                  style={{ backgroundColor: "#22c55e", minWidth: greenPct > 0 ? "2rem" : 0 }}
                >
                  {greenPct > 15 && `🟢 ${greenPct}%`}
                </motion.div>
              </div>
              <div className="flex justify-between text-[10px] md:text-xs font-mono-custom font-bold" style={{ color: "var(--muted)" }}>
                <span>Red Flag — {redCount} vote{redCount !== 1 ? "s" : ""}</span>
                <span>Green Flag — {greenCount} vote{greenCount !== 1 ? "s" : ""}</span>
              </div>
              {total > 0 && (
                <p className="text-center text-[10px] font-mono-custom uppercase tracking-widest font-bold" style={{ color: "var(--rust)" }}>
                  {redCount === greenCount
                    ? "Perfect split — both sides earn bonus points!"
                    : `Minority (${redCount < greenCount ? "Red Flag" : "Green Flag"}) earned bonus points!`}
                </p>
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
