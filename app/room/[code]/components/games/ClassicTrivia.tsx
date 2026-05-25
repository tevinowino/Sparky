"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TriviaQuestion } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import GameShell, { Player, Answer } from "./GameShell";
import ScorePopup from "../ui/ScorePopup";
import RetroModal from "../ui/RetroModal";

const TIMER_SECONDS = 20;
const POINTS_MAX = 1000;
const POINTS_MIN = 100;

const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   "#22c55e",
  medium: "#f59e0b",
  hard:   "#ef4444",
};

const OPTION_KEYS = ["A", "B", "C", "D"] as const;
const OPTION_COLORS = [
  { bg: "rgba(59,130,246,0.1)", border: "var(--teal)", hover: "rgba(59,130,246,0.18)" },
  { bg: "rgba(168,85,247,0.1)", border: "var(--rust)", hover: "rgba(168,85,247,0.18)" },
  { bg: "rgba(249,115,22,0.1)", border: "var(--teal)", hover: "rgba(249,115,22,0.18)" },
  { bg: "rgba(236,72,153,0.1)", border: "var(--rust)", hover: "rgba(236,72,153,0.18)" },
];

interface ClassicTriviaProps {
  question: TriviaQuestion;
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

export default function ClassicTrivia({
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
}: ClassicTriviaProps) {
  const submitAnswer = useMutation(api.answers.submitAnswer);
  const updateScore = useMutation(api.players.updateScore);
  const updateStreak = useMutation(api.players.updateStreak);

  const [selected, setSelected] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(true);
  const [scoreGained, setScoreGained] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const startTime = useRef(Date.now());
  const scored = useRef(false);

  const myAnswer = currentPlayer
    ? answers.find((a) => a.playerId === currentPlayer._id)
    : null;

  const correct = question.correctAnswer;
  const correctAnswers = answers.filter((a) => a.answer === correct);

  const voteCounts: Record<string, number> = {};
  for (const a of answers) {
    voteCounts[a.answer] = (voteCounts[a.answer] ?? 0) + 1;
  }

  useEffect(() => {
    setSelected(null);
    setTimerRunning(true);
    setShowPopup(false);
    setModalOpen(false);
    scored.current = false;
    startTime.current = Date.now();
  }, [questionIndex]);

  useEffect(() => {
    if (myAnswer) {
      setSelected(myAnswer.answer);
      setTimerRunning(false);
    }
  }, [myAnswer]);

  useEffect(() => {
    if (isReveal) {
      setModalOpen(true);
    } else {
      setModalOpen(false);
    }
  }, [isReveal]);

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

  function optionState(key: string) {
    if (!isReveal) {
      if (selected === key) return "selected";
      return "idle";
    }
    if (key === correct) return "correct";
    if (selected === key && key !== correct) return "wrong";
    return "dim";
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
            backgroundColor: DIFFICULTY_COLOR[question.difficulty] ?? "#1E5F5F",
            color: "white",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: "3px 3px 0px rgba(0,0,0,0.3)",
          }}
        >
          🧠 {question.difficulty?.toUpperCase()} · {question.category}
        </div>
      }
      accentColor={question.theme.accentColor}
    >
      {/* Retro modal for trivia disclosures */}
      <RetroModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="💡 Did You Know?"
      >
        <div className="text-center py-1 flex flex-col items-center gap-3">
          <div className="text-4xl animate-bounce">💡</div>
          <h3 className="font-display text-xs uppercase text-(--teal) mb-1">
            Correct Answer: Option {correct}
          </h3>
          <p className="font-mono-custom text-sm text-(--ink) bg-(--cream) border-2 border-(--border) p-3 shadow-[1px_1px_0px_#000] w-full text-left leading-relaxed">
            {question.explanation}
          </p>
          <p className="font-mono-custom text-[10px] text-(--muted) border-t border-dashed border-(--border) pt-2 w-full">
            {correctAnswers.length} of {answers.length} player{answers.length !== 1 ? "s" : ""} got it right!
          </p>
        </div>
      </RetroModal>

      {/* Card */}
      <div
        className="relative retro-card w-full"
        style={{
          borderColor: "var(--teal)",
        }}
      >
        <div className="relative z-10 p-5 flex flex-col gap-4 select-none">
          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-mono-custom font-bold uppercase text-[9px] md:text-[10px] tracking-widest px-2.5 py-0.5 rounded bg-(--teal) text-white border border-(--teal-dark)"
            >
              🧠 {question.category}
            </span>
            <span
              className="font-mono-custom font-bold uppercase text-[9px] md:text-[10px] px-2.5 py-0.5 rounded border-2"
              style={{
                borderColor: DIFFICULTY_COLOR[question.difficulty],
                color: DIFFICULTY_COLOR[question.difficulty],
                backgroundColor: `${DIFFICULTY_COLOR[question.difficulty]}08`,
              }}
            >
              {question.difficulty}
            </span>
          </div>

          {/* Question */}
          <p
            className="font-display text-var(--ink) text-base md:text-xl uppercase leading-tight text-center py-1"
          >
            {question.question}
          </p>

          {/* Options grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-h-[160px] sm:max-h-[220px] overflow-y-auto pr-1">
            {OPTION_KEYS.map((key, i) => {
              const state = optionState(key);
              const col = OPTION_COLORS[i];
              const votes = voteCounts[key] ?? 0;
              const maxVotes = Math.max(1, ...Object.values(voteCounts));

              const bgColor =
                state === "correct" ? "rgba(34,197,94,0.15)"
                : state === "wrong"   ? "rgba(239,68,68,0.12)"
                : state === "dim"     ? "rgba(0,0,0,0.02)"
                : state === "selected" ? "var(--cream)"
                : "transparent";

              const borderColor =
                state === "correct" ? "#22c55e"
                : state === "wrong"   ? "#ef4444"
                : state === "dim"     ? "var(--border)"
                : state === "selected" ? "var(--rust)"
                : col.border;

              const textColor =
                state === "correct" ? "#22c55e"
                : state === "wrong" ? "#ef4444"
                : state === "dim" ? "var(--muted)"
                : "var(--ink)";

              return (
                <motion.button
                  key={key}
                  onClick={() => handleSelect(key)}
                  disabled={!!selected}
                  whileHover={selected ? {} : { scale: 1.02 }}
                  whileTap={selected ? {} : { scale: 0.98 }}
                  className="relative overflow-hidden flex items-center gap-1.5 sm:gap-2.5 p-2 sm:p-3 rounded border-2 sm:border-3 cursor-pointer select-none text-left"
                  style={{
                    background: bgColor,
                    borderColor: borderColor,
                    opacity: state === "dim" ? 0.45 : 1,
                    boxShadow: state === "selected" ? "2px 2px 0px var(--rust-dark)" : "none",
                  }}
                >
                  {/* Vote bar fill on reveal */}
                  {isReveal && votes > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(votes / maxVotes) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="absolute inset-y-0 left-0 rounded-l-sm"
                      style={{
                        backgroundColor:
                          key === correct ? "rgba(34,197,94,0.06)" : "rgba(0,0,0,0.03)",
                      }}
                    />
                  )}

                  {/* Key badge */}
                  <div
                    className="relative z-10 w-6 h-6 sm:w-7 sm:h-7 rounded border-2 flex items-center justify-center font-display text-xs shrink-0"
                    style={{
                      borderColor: borderColor,
                      backgroundColor:
                        state === "correct" ? "#22c55e"
                        : state === "wrong" ? "#ef4444"
                        : "transparent",
                      color: state === "correct" || state === "wrong" ? "white" : textColor,
                    }}
                  >
                    {state === "correct" ? "✓" : state === "wrong" ? "✗" : key}
                  </div>

                  <span
                    className="relative z-10 font-mono-custom font-bold text-xs flex-1 text-left"
                    style={{ color: textColor, lineHeight: 1.3 }}
                  >
                    {question.options[key]}
                  </span>

                  {isReveal && votes > 0 && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="relative z-10 font-display text-xs shrink-0"
                      style={{ color: textColor }}
                    >
                      {votes}
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* My answer indicator */}
          {isReveal && myAnswer && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center text-[10px] md:text-xs font-mono-custom font-bold"
              style={{
                color: myAnswer.answer === correct ? "#22c55e" : "#ef4444",
              }}
            >
              {myAnswer.answer === correct
                ? `✓ Correct! You picked Option ${myAnswer.answer}.`
                : `✗ Wrong! You picked Option ${myAnswer.answer} — correct was ${correct}.`}
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
