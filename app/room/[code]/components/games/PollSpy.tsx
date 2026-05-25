"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PollSpyQuestion } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import GameShell, { Player, Answer } from "./GameShell";
import ScorePopup from "../ui/ScorePopup";

const TIMER_SECONDS = 20;
const POINTS_MAJORITY = 250;
const POINTS_MINORITY = 75;
const POINTS_SPEED = 50;

interface PollSpyProps {
  question: PollSpyQuestion;
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

export default function PollSpy({
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
}: PollSpyProps) {
  const submitAnswer = useMutation(api.answers.submitAnswer);
  const updateScore = useMutation(api.players.updateScore);
  const updateStreak = useMutation(api.players.updateStreak);

  const [selected, setSelected] = useState<"A" | "B" | null>(null);
  const [timerRunning, setTimerRunning] = useState(true);
  const [scoreGained, setScoreGained] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const startTime = useRef(Date.now());
  const scored = useRef(false);

  const myAnswer = currentPlayer
    ? answers.find((a) => a.playerId === currentPlayer._id)
    : null;

  const aCount = answers.filter((a) => a.answer === "A").length;
  const bCount = answers.filter((a) => a.answer === "B").length;
  const total = answers.length;
  const majority = aCount >= bCount ? "A" : "B";

  useEffect(() => {
    setSelected(null);
    setTimerRunning(true);
    setShowPopup(false);
    scored.current = false;
    startTime.current = Date.now();
  }, [questionIndex]);

  useEffect(() => {
    if (myAnswer) {
      setSelected(myAnswer.answer as "A" | "B");
      setTimerRunning(false);
    }
  }, [myAnswer]);

  useEffect(() => {
    if (!isReveal || !currentPlayer || !myAnswer || scored.current) return;
    scored.current = true;

    const elapsed = Date.now() - startTime.current;
    const isMajority = myAnswer.answer === majority;
    const speedBonus = elapsed < (TIMER_SECONDS * 1000) / 2 ? POINTS_SPEED : 0;
    const pts = (isMajority ? POINTS_MAJORITY : POINTS_MINORITY) + speedBonus;

    setScoreGained(pts);
    setShowPopup(true);
    updateScore({ playerId: currentPlayer._id, points: pts });
    updateStreak({ playerId: currentPlayer._id, increment: isMajority });
    setTimeout(() => setShowPopup(false), 2200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReveal]);

  async function handleSelect(choice: "A" | "B") {
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

  const aPct = total > 0 ? Math.round((aCount / total) * 100) : 50;
  const bPct = total > 0 ? 100 - aPct : 50;

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
            backgroundColor: "#0891b2",
            color: "white",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: "3px 3px 0px #0e7490",
          }}
        >
          {question.emoji} Blend in to win!
        </div>
      }
      accentColor={question.theme?.accentColor}
    >
      <div className="relative retro-card w-full" style={{ minHeight: "280px", borderColor: "var(--teal)" }}>
        <div className="relative z-10 p-5 flex flex-col gap-5 select-none">

          {/* Poll label */}
          <div>
            <span className="font-mono-custom font-bold uppercase text-[10px] tracking-widest px-3 py-1 rounded bg-(--teal) text-white border border-(--teal-dark)">
              Poll Spy — majority wins big!
            </span>
          </div>

          {/* Question */}
          <div className="text-center py-2 flex-1 flex flex-col justify-center items-center">
            <p className="font-display text-2xl mb-2">{question.emoji}</p>
            <p className="font-display text-ink text-lg md:text-2xl uppercase leading-tight">
              {question.question}
            </p>
          </div>

          {!isReveal ? (
            <div className="grid grid-cols-2 gap-4">
              {(["A", "B"] as const).map((choice) => {
                const isA = choice === "A";
                const isSelected = selected === choice;
                const label = isA ? question.optionA : question.optionB;
                const activeBg = isA ? "var(--teal)" : "var(--rust)";

                return (
                  <motion.button
                    key={choice}
                    onClick={() => handleSelect(choice)}
                    disabled={!!selected}
                    whileHover={selected ? {} : { scale: 1.02 }}
                    whileTap={selected ? {} : { scale: 0.98 }}
                    className="relative flex flex-col items-center justify-center gap-1 rounded py-4 font-mono-custom font-bold text-sm border-3 cursor-pointer"
                    style={{
                      background: isSelected ? activeBg : "var(--cream)",
                      borderColor: isSelected ? "var(--ink)" : "var(--border)",
                      color: isSelected ? "white" : "var(--ink)",
                      boxShadow: isSelected ? "none" : `3px 3px 0px ${isA ? "var(--teal-dark)" : "var(--rust-dark)"}`,
                      transform: isSelected ? "translate(3px, 3px)" : "none",
                      transition: "all 0.1s ease",
                    }}
                  >
                    <span className="font-display text-lg">{choice}</span>
                    <span className="text-xs text-center leading-snug px-1">{label}</span>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold bg-white"
                          style={{ color: activeBg }}
                        >
                          ✓
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="flex h-10 rounded overflow-hidden border-2 border-(--ink) shadow-[2px_2px_0px_#000]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${aPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="flex items-center justify-center gap-2 text-white font-mono-custom font-bold text-xs"
                  style={{ backgroundColor: "var(--teal)", minWidth: aPct > 0 ? "2rem" : 0 }}
                >
                  {aPct > 15 && `A: ${aPct}%`}
                </motion.div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${bPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="flex items-center justify-center gap-2 text-white font-mono-custom font-bold text-xs"
                  style={{ backgroundColor: "var(--rust)", minWidth: bPct > 0 ? "2rem" : 0 }}
                >
                  {bPct > 15 && `B: ${bPct}%`}
                </motion.div>
              </div>
              <div className="flex justify-between text-[10px] md:text-xs font-mono-custom font-bold" style={{ color: "var(--muted)" }}>
                <span>A: {question.optionA} — {aCount}</span>
                <span>B: {question.optionB} — {bCount}</span>
              </div>
              {total > 0 && (
                <p className="text-center text-[10px] font-mono-custom uppercase tracking-widest font-bold" style={{ color: "var(--teal)" }}>
                  {aCount === bCount
                    ? "Perfect tie — everyone earns bonus points!"
                    : `Majority (${majority === "A" ? question.optionA : question.optionB}) earned ${POINTS_MAJORITY} pts!`}
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
