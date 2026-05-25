"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { HotTakesQuestion } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import GameShell, { Player, Answer } from "./GameShell";
import ScorePopup from "../ui/ScorePopup";

const TIMER_SECONDS = 25;
const POINTS_MAJORITY = 50;
const POINTS_MINORITY = 200;
const POINTS_SPEED = 50;

interface HotTakesProps {
  question: HotTakesQuestion;
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

export default function HotTakes({
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
}: HotTakesProps) {
  const submitAnswer = useMutation(api.answers.submitAnswer);
  const updateScore = useMutation(api.players.updateScore);
  const updateStreak = useMutation(api.players.updateStreak);

  const [selected, setSelected] = useState<"agree" | "disagree" | null>(null);
  const [timerRunning, setTimerRunning] = useState(true);
  const [scoreGained, setScoreGained] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const startTime = useRef(Date.now());
  const scored = useRef(false);

  const myAnswer = currentPlayer
    ? answers.find((a) => a.playerId === currentPlayer._id)
    : null;

  const agreesCount = answers.filter((a) => a.answer === "agree").length;
  const disagreesCount = answers.filter((a) => a.answer === "disagree").length;
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
      setSelected(myAnswer.answer as "agree" | "disagree");
      setTimerRunning(false);
    }
  }, [myAnswer]);

  useEffect(() => {
    if (!isReveal || !currentPlayer || !myAnswer || scored.current) return;
    scored.current = true;

    const elapsed = Date.now() - startTime.current;
    const isMinority =
      (myAnswer.answer === "agree" && agreesCount < disagreesCount) ||
      (myAnswer.answer === "disagree" && disagreesCount < agreesCount);
    const speedBonus = elapsed < (TIMER_SECONDS * 1000) / 2 ? POINTS_SPEED : 0;
    const pts = (isMinority ? POINTS_MINORITY : POINTS_MAJORITY) + speedBonus;
    setScoreGained(pts);
    setShowPopup(true);
    updateScore({ playerId: currentPlayer._id, points: pts });
    updateStreak({ playerId: currentPlayer._id, increment: true });
    setTimeout(() => setShowPopup(false), 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReveal]);

  async function handleSelect(choice: "agree" | "disagree") {
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

  const agPct = total > 0 ? Math.round((agreesCount / total) * 100) : 50;
  const disPct = total > 0 ? 100 - agPct : 50;

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
            backgroundColor: "#1E5F5F",
            color: "white",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: "3px 3px 0px #153F3F",
          }}
        >
          🔥 {question.topic}
        </div>
      }
      accentColor={question.theme.accentColor}
    >
      {/* Card */}
      <div
        className="relative retro-card w-full"
        style={{
          minHeight: "280px",
          borderColor: "var(--teal)",
        }}
      >
        <div className="relative z-10 p-5 flex flex-col gap-5 select-none">
          {/* Topic chip */}
          <div className="flex items-center gap-2">
            <span
              className="font-mono-custom font-bold uppercase text-[10px] md:text-xs tracking-widest px-3 py-1 rounded bg-(--teal) text-white border border-(--teal-dark)"
            >
              Hot Take · {question.topic}
            </span>
          </div>

          {/* Statement */}
          <div className="text-center py-2 flex-1 flex flex-col justify-center items-center">
            <p
              className="font-display text-var(--ink) text-lg md:text-2xl uppercase leading-tight"
            >
              &ldquo;{question.statement}&rdquo;
            </p>
          </div>

          {/* Buttons or reveal bar */}
          {!isReveal ? (
            <div className="grid grid-cols-2 gap-4">
              {(["agree", "disagree"] as const).map((choice) => {
                const isAg = choice === "agree";
                const isSelected = selected === choice;
                const activeBg = isAg ? "var(--teal)" : "var(--rust)";
                const activeBgDark = isAg ? "var(--teal-dark)" : "var(--rust-dark)";

                return (
                  <motion.button
                    key={choice}
                    onClick={() => handleSelect(choice)}
                    disabled={!!selected}
                    whileHover={selected ? {} : { scale: 1.02 }}
                    whileTap={selected ? {} : { scale: 0.98 }}
                    className="relative flex flex-col items-center justify-center gap-1 rounded py-4 font-mono-custom font-bold uppercase text-sm border-3 cursor-pointer"
                    style={{
                      background: isSelected ? activeBg : "var(--cream)",
                      borderColor: isSelected ? "var(--ink)" : "var(--border)",
                      color: isSelected ? "white" : "var(--ink)",
                      boxShadow: isSelected
                        ? "none"
                        : `3px 3px 0px ${isAg ? "var(--teal-dark)" : "var(--rust-dark)"}`,
                      transform: isSelected ? "translate(3px, 3px)" : "none",
                      transition: "all 0.1s ease",
                    }}
                  >
                    <span className="text-sm">
                      {isAg ? question.agreeLabel : question.disagreeLabel}
                    </span>
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
            /* Reveal: split bar */
            <div className="flex flex-col gap-2.5">
              <div className="flex h-10 rounded overflow-hidden border-2 border-(--ink) shadow-[2px_2px_0px_#000]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${agPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="flex items-center justify-center gap-2 text-white font-mono-custom font-bold text-xs"
                  style={{ backgroundColor: "var(--teal)", minWidth: agPct > 0 ? "2rem" : 0 }}
                >
                  {agPct > 15 && (
                    <span>{agPct}%</span>
                  )}
                </motion.div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${disPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="flex items-center justify-center gap-2 text-white font-mono-custom font-bold text-xs"
                  style={{ backgroundColor: "var(--rust)", minWidth: disPct > 0 ? "2rem" : 0 }}
                >
                  {disPct > 15 && (
                    <span>{disPct}%</span>
                  )}
                </motion.div>
              </div>
              <div className="flex justify-between text-[10px] md:text-xs font-mono-custom text-(--muted) font-bold">
                <span>{question.agreeLabel} — {agreesCount} vote{agreesCount !== 1 ? "s" : ""}</span>
                <span>{question.disagreeLabel} — {disagreesCount} vote{disagreesCount !== 1 ? "s" : ""}</span>
              </div>
              {total > 0 && (
                <p className="text-center text-[10px] font-mono-custom uppercase tracking-widest text-(--rust) font-bold">
                  {agreesCount === disagreesCount
                    ? "Perfect split — everyone earned minority points!"
                    : `Minority (${agreesCount < disagreesCount ? question.agreeLabel : question.disagreeLabel}) earned bonus points!`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Score popup */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <ScorePopup points={scoreGained} show={showPopup} />
        </div>
      </div>
    </GameShell>
  );
}
