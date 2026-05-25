"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { RankItQuestion } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import GameShell, { Player, Answer } from "./GameShell";
import ScorePopup from "../ui/ScorePopup";

const TIMER_SECONDS = 35;
const POINTS_PER_POSITION = 100;

interface RankItProps {
  question: RankItQuestion;
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

export default function RankIt({
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
}: RankItProps) {
  const submitAnswer = useMutation(api.answers.submitAnswer);
  const updateScore = useMutation(api.players.updateScore);
  const updateStreak = useMutation(api.players.updateStreak);

  // ranking[i] = rank assigned to items[i], or null if not ranked yet
  const [ranking, setRanking] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [timerRunning, setTimerRunning] = useState(true);
  const [scoreGained, setScoreGained] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const scored = useRef(false);

  const items = question.items ?? [];
  const correctOrder = question.correctOrder ?? [];

  const myAnswer = currentPlayer
    ? answers.find((a) => a.playerId === currentPlayer._id)
    : null;

  useEffect(() => {
    setRanking(items.map(() => null));
    setSubmitted(false);
    setTimerRunning(true);
    setShowPopup(false);
    scored.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex]);

  useEffect(() => {
    if (myAnswer) {
      setSubmitted(true);
      setTimerRunning(false);
    }
  }, [myAnswer]);

  useEffect(() => {
    if (!isReveal || !currentPlayer || !myAnswer || scored.current) return;
    scored.current = true;

    // Parse submitted ranking
    const submitted = myAnswer.answer.split(",").map(Number);
    // correctOrder[rank] = itemIndex, submitted[rank] = itemIndex
    let correct = 0;
    for (let rank = 0; rank < correctOrder.length; rank++) {
      if (submitted[rank] === correctOrder[rank]) correct++;
    }

    const pts = correct * POINTS_PER_POSITION;
    if (pts > 0) {
      setScoreGained(pts);
      setShowPopup(true);
      updateScore({ playerId: currentPlayer._id, points: pts });
      updateStreak({ playerId: currentPlayer._id, increment: correct === correctOrder.length });
      setTimeout(() => setShowPopup(false), 2500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReveal]);

  function handleItemTap(itemIndex: number) {
    if (submitted) return;
    setRanking((prev) => {
      const next = [...prev];
      if (next[itemIndex] !== null) {
        // Deselect: remove its rank and shift others down
        const removedRank = next[itemIndex]!;
        return next.map((r) =>
          r === null ? null : r === removedRank ? null : r > removedRank ? r - 1 : r
        );
      }
      const usedRanks = next.filter((r) => r !== null) as number[];
      const nextRank = usedRanks.length > 0 ? Math.max(...usedRanks) + 1 : 1;
      if (nextRank > items.length) return prev;
      next[itemIndex] = nextRank;
      return next;
    });
  }

  async function handleSubmit() {
    if (submitted || !currentPlayer) return;
    const allRanked = ranking.every((r) => r !== null);
    if (!allRanked) return;

    // Build answer string: position-sorted item indices
    // e.g. if ranking = [2, null, 1, 3], the order is items[2], items[0], items[3]
    const order: number[] = [];
    for (let rank = 1; rank <= items.length; rank++) {
      const idx = ranking.findIndex((r) => r === rank);
      order.push(idx);
    }

    setSubmitted(true);
    setTimerRunning(false);
    await submitAnswer({
      roomId,
      questionIndex,
      playerId: currentPlayer._id,
      answer: order.join(","),
    });
  }

  const allRanked = ranking.length > 0 && ranking.every((r) => r !== null);

  // Parse my submitted answer for reveal
  const myOrder = myAnswer ? myAnswer.answer.split(",").map(Number) : null;

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
            backgroundColor: "#f59e0b",
            color: "white",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: "3px 3px 0px #d97706",
          }}
        >
          📊 Rank It — {POINTS_PER_POSITION * items.length} pts max
        </div>
      }
      accentColor={question.theme?.accentColor}
    >
      <div className="relative retro-card w-full" style={{ borderColor: "var(--teal)" }}>
        <div className="relative z-10 p-5 flex flex-col gap-4 select-none">

          {/* Prompt */}
          <p className="font-display text-ink text-base md:text-lg uppercase leading-tight text-center">
            {question.prompt}
          </p>

          {!isReveal ? (
            <>
              <p className="text-center font-mono-custom text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                {submitted ? "Ranking locked in!" : allRanked ? "Tap to change — or submit below" : "Tap items in order (1st, 2nd, 3rd, 4th)"}
              </p>

              {/* Items */}
              <div className="flex flex-col gap-2">
                {items.map((item, i) => {
                  const rank = ranking[i];
                  const isRanked = rank !== null;
                  return (
                    <motion.button
                      key={i}
                      onClick={() => handleItemTap(i)}
                      disabled={submitted}
                      whileHover={submitted ? {} : { scale: 1.01 }}
                      whileTap={submitted ? {} : { scale: 0.99 }}
                      className="flex items-center gap-3 p-3 rounded border-3 text-left cursor-pointer transition-all"
                      style={{
                        borderColor: isRanked ? "var(--teal)" : "var(--border)",
                        backgroundColor: isRanked ? "rgba(30,95,95,0.08)" : "transparent",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded border-2 flex items-center justify-center font-display text-sm shrink-0"
                        style={{
                          borderColor: isRanked ? "var(--teal)" : "var(--border)",
                          backgroundColor: isRanked ? "var(--teal)" : "transparent",
                          color: isRanked ? "white" : "var(--muted)",
                        }}
                      >
                        {isRanked ? `#${rank}` : "?"}
                      </div>
                      <span className="font-mono-custom font-bold text-sm" style={{ color: "var(--ink)" }}>
                        {item}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {!submitted && (
                <AnimatePresence>
                  {allRanked && (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={handleSubmit}
                      className="btn-rust w-full py-3 text-sm font-bold"
                    >
                      Lock In Ranking
                    </motion.button>
                  )}
                </AnimatePresence>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Correct order */}
              <div>
                <p className="font-mono-custom font-bold text-[10px] uppercase tracking-widest mb-2" style={{ color: "var(--teal)" }}>
                  Correct Order:
                </p>
                {correctOrder.map((itemIdx, rank) => {
                  const myRankForItem = myOrder ? myOrder.indexOf(itemIdx) : -1;
                  const isCorrect = myRankForItem === rank;
                  return (
                    <div
                      key={rank}
                      className="flex items-center gap-3 p-2 mb-1 rounded border"
                      style={{
                        borderColor: isCorrect ? "#22c55e" : "var(--border)",
                        backgroundColor: isCorrect ? "rgba(34,197,94,0.07)" : "transparent",
                      }}
                    >
                      <span className="font-display text-sm w-6" style={{ color: isCorrect ? "#22c55e" : "var(--muted)" }}>
                        #{rank + 1}
                      </span>
                      <span className="font-mono-custom text-xs flex-1" style={{ color: "var(--ink)" }}>
                        {items[itemIdx]}
                      </span>
                      {myAnswer && (
                        <span className="text-xs font-bold" style={{ color: isCorrect ? "#22c55e" : "#ef4444" }}>
                          {isCorrect ? "✓" : "✗"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs font-mono-custom leading-relaxed" style={{ color: "var(--muted)" }}>
                {question.explanation}
              </p>

              {myAnswer && (
                <p className="text-center text-[10px] font-mono-custom font-bold uppercase tracking-widest" style={{ color: "var(--teal)" }}>
                  +{POINTS_PER_POSITION} pts per correct position
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
