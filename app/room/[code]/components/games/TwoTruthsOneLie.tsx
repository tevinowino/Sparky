"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TwoTruthsOneLieQuestion } from "@/lib/types";
import { motion } from "framer-motion";
import GameShell, { Player, Answer } from "./GameShell";
import ScorePopup from "../ui/ScorePopup";

const TIMER_SECONDS = 25;
const POINTS_CORRECT = 400;
const POINTS_WRONG = 0;

interface TwoTruthsOneLieProps {
  question: TwoTruthsOneLieQuestion;
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

export default function TwoTruthsOneLie({
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
}: TwoTruthsOneLieProps) {
  const submitAnswer = useMutation(api.answers.submitAnswer);
  const updateScore = useMutation(api.players.updateScore);
  const updateStreak = useMutation(api.players.updateStreak);

  const [selected, setSelected] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(true);
  const [scoreGained, setScoreGained] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const startTime = useRef(Date.now());
  const scored = useRef(false);

  const lieIndex = question.lieIndex ?? 0;
  const statements = question.statements ?? ["Statement 1", "Statement 2", "Statement 3"];

  const myAnswer = currentPlayer
    ? answers.find((a) => a.playerId === currentPlayer._id)
    : null;

  const voteCounts: Record<string, number> = { "0": 0, "1": 0, "2": 0 };
  for (const a of answers) {
    voteCounts[a.answer] = (voteCounts[a.answer] ?? 0) + 1;
  }
  const correctCount = voteCounts[String(lieIndex)] ?? 0;

  useEffect(() => {
    setSelected(null);
    setTimerRunning(true);
    setShowPopup(false);
    scored.current = false;
    startTime.current = Date.now();
  }, [questionIndex]);

  useEffect(() => {
    if (myAnswer) {
      setSelected(Number(myAnswer.answer));
      setTimerRunning(false);
    }
  }, [myAnswer]);

  useEffect(() => {
    if (!isReveal || !currentPlayer || !myAnswer || scored.current) return;
    scored.current = true;

    const isCorrect = Number(myAnswer.answer) === lieIndex;
    if (!isCorrect) {
      updateStreak({ playerId: currentPlayer._id, increment: false });
      return;
    }

    setScoreGained(POINTS_CORRECT);
    setShowPopup(true);
    updateScore({ playerId: currentPlayer._id, points: POINTS_CORRECT });
    updateStreak({ playerId: currentPlayer._id, increment: true });
    setTimeout(() => setShowPopup(false), 2500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReveal]);

  async function handleSelect(idx: number) {
    if (selected !== null || !currentPlayer) return;
    setSelected(idx);
    setTimerRunning(false);
    await submitAnswer({
      roomId,
      questionIndex,
      playerId: currentPlayer._id,
      answer: String(idx),
    });
  }

  const COLORS = ["#3b82f6", "#7c3aed", "#ec4899"];

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
            backgroundColor: "#7c3aed",
            color: "white",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: "3px 3px 0px #6d28d9",
          }}
        >
          🤥 Which one is the LIE?
        </div>
      }
      accentColor={question.theme?.accentColor}
    >
      <div className="relative retro-card w-full" style={{ borderColor: "var(--teal)" }}>
        <div className="relative z-10 p-5 flex flex-col gap-4 select-none">

          {/* Topic */}
          <div className="text-center">
            <span className="font-mono-custom font-bold uppercase text-[10px] tracking-widest px-3 py-1 rounded"
              style={{ backgroundColor: "rgba(124,58,237,0.12)", color: "#7c3aed", border: "1px solid #7c3aed" }}>
              Topic: {question.topic}
            </span>
          </div>

          <p className="text-center font-mono-custom text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Two are true — one is a lie. Find the lie!
          </p>

          {/* Statements */}
          <div className="flex flex-col gap-2.5">
            {statements.map((stmt, i) => {
              const color = COLORS[i];
              const isSelected = selected === i;
              const isLie = i === lieIndex;
              const votes = voteCounts[String(i)] ?? 0;
              const maxVotes = Math.max(...Object.values(voteCounts));

              let borderColor = color;
              let bg = "transparent";
              if (isReveal) {
                if (isLie) { borderColor = "#ef4444"; bg = "rgba(239,68,68,0.1)"; }
                else { borderColor = "#22c55e"; bg = "rgba(34,197,94,0.07)"; }
              } else if (isSelected) {
                bg = `${color}12`;
              }

              return (
                <motion.button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={selected !== null}
                  whileHover={selected !== null ? {} : { scale: 1.01 }}
                  whileTap={selected !== null ? {} : { scale: 0.99 }}
                  className="relative overflow-hidden flex items-start gap-3 p-3 rounded border-3 text-left cursor-pointer"
                  style={{ borderColor, backgroundColor: bg }}
                >
                  {/* Vote bar on reveal */}
                  {isReveal && votes > 0 && maxVotes > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(votes / maxVotes) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="absolute inset-y-0 left-0"
                      style={{ backgroundColor: `${borderColor}10`, zIndex: 0 }}
                    />
                  )}

                  {/* Number badge */}
                  <div
                    className="relative z-10 w-7 h-7 rounded border-2 flex items-center justify-center font-display text-sm shrink-0 mt-0.5"
                    style={{
                      borderColor: isReveal ? (isLie ? "#ef4444" : "#22c55e") : isSelected ? color : color,
                      backgroundColor: isReveal ? (isLie ? "#ef4444" : "#22c55e") : isSelected ? color : "transparent",
                      color: isReveal || isSelected ? "white" : color,
                    }}
                  >
                    {isReveal ? (isLie ? "✗" : "✓") : i + 1}
                  </div>

                  <div className="relative z-10 flex-1">
                    <p className="font-mono-custom font-bold text-xs leading-snug" style={{ color: "var(--ink)" }}>
                      {stmt}
                    </p>
                    {isReveal && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="font-mono-custom text-[10px] mt-0.5 font-bold uppercase"
                        style={{ color: isLie ? "#ef4444" : "#22c55e" }}
                      >
                        {isLie ? "THE LIE" : "TRUE"}
                      </motion.p>
                    )}
                  </div>

                  {isReveal && votes > 0 && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="relative z-10 font-mono-custom text-xs shrink-0"
                      style={{ color: "var(--muted)" }}
                    >
                      {votes}
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Explanation on reveal */}
          {isReveal && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded border-2 p-3"
              style={{ borderColor: "var(--border)", backgroundColor: "rgba(0,0,0,0.02)" }}
            >
              <p className="font-mono-custom text-xs leading-relaxed" style={{ color: "var(--ink)" }}>
                {question.explanation}
              </p>
              <p className="font-mono-custom text-[10px] mt-1 font-bold uppercase" style={{ color: "var(--teal)" }}>
                {correctCount} of {answers.length} player{answers.length !== 1 ? "s" : ""} spotted the lie!
              </p>
            </motion.div>
          )}
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <ScorePopup points={scoreGained} show={showPopup} />
        </div>
      </div>
    </GameShell>
  );
}
