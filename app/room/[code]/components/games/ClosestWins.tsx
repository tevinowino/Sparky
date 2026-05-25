"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ClosestWinsQuestion } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import GameShell, { Player, Answer } from "./GameShell";
import ScorePopup from "../ui/ScorePopup";

const TIMER_SECONDS = 30;
const POINTS_WINNER = 600;
const POINTS_CLOSE = 300;
const POINTS_PARTICIPATED = 100;

interface ClosestWinsProps {
  question: ClosestWinsQuestion;
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

export default function ClosestWins({
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
}: ClosestWinsProps) {
  const submitAnswer = useMutation(api.answers.submitAnswer);
  const updateScore = useMutation(api.players.updateScore);
  const updateStreak = useMutation(api.players.updateStreak);

  const realAnswer = question.answer ?? 0;
  const minGuess = question.minGuess ?? 0;
  const maxGuess = question.maxGuess ?? realAnswer * 10;

  // Snap to a round starting value roughly in the middle of the range
  const initVal = Math.round((minGuess + maxGuess) / 2);

  const [guess, setGuess] = useState(initVal);
  const [inputStr, setInputStr] = useState(String(initVal));
  const [submitted, setSubmitted] = useState(false);
  const [timerRunning, setTimerRunning] = useState(true);
  const [scoreGained, setScoreGained] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const scored = useRef(false);

  const myAnswer = currentPlayer
    ? answers.find((a) => a.playerId === currentPlayer._id)
    : null;

  useEffect(() => {
    const mid = Math.round((minGuess + maxGuess) / 2);
    setGuess(mid);
    setInputStr(String(mid));
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

    const myGuess = Number(myAnswer.answer);
    const diffs = answers.map((a) => Math.abs(Number(a.answer) - realAnswer));
    const myDiff = Math.abs(myGuess - realAnswer);
    const minDiff = Math.min(...diffs);

    let pts = POINTS_PARTICIPATED;
    if (myDiff === minDiff) {
      pts = POINTS_WINNER;
    } else if (minDiff > 0 && myDiff <= minDiff * 1.5) {
      pts = POINTS_CLOSE;
    }

    setScoreGained(pts);
    setShowPopup(true);
    updateScore({ playerId: currentPlayer._id, points: pts });
    updateStreak({ playerId: currentPlayer._id, increment: myDiff === minDiff });
    setTimeout(() => setShowPopup(false), 2500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReveal]);

  function handleInputChange(val: string) {
    setInputStr(val);
    const n = Number(val.replace(/[^0-9]/g, ""));
    if (!isNaN(n)) setGuess(Math.max(minGuess, Math.min(maxGuess, n)));
  }

  function adjust(delta: number) {
    const step = Math.max(1, Math.round((maxGuess - minGuess) / 100));
    const next = Math.max(minGuess, Math.min(maxGuess, guess + delta * step));
    setGuess(next);
    setInputStr(String(next));
  }

  async function handleSubmit() {
    if (submitted || !currentPlayer) return;
    setSubmitted(true);
    setTimerRunning(false);
    await submitAnswer({
      roomId,
      questionIndex,
      playerId: currentPlayer._id,
      answer: String(guess),
    });
  }

  // Reveal: rank answers by closeness
  const sortedAnswers = isReveal
    ? [...answers].sort((a, b) => Math.abs(Number(a.answer) - realAnswer) - Math.abs(Number(b.answer) - realAnswer))
    : [];

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
          🎯 Closest Wins — {POINTS_WINNER} pts
        </div>
      }
      accentColor={question.theme?.accentColor}
    >
      <div className="relative retro-card w-full" style={{ borderColor: "var(--teal)" }}>
        <div className="relative z-10 p-5 flex flex-col gap-5 select-none">

          {/* Question */}
          <p className="font-display text-ink text-lg md:text-xl uppercase leading-tight text-center py-2">
            {question.question}
          </p>

          {question.hint && (
            <p className="text-center font-mono-custom text-xs italic" style={{ color: "var(--muted)" }}>
              Hint: {question.hint}
            </p>
          )}

          {!isReveal ? (
            <>
              <p className="text-center font-mono-custom text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                {submitted ? `Guess locked: ${myAnswer?.answer} ${question.unit}` : "Enter your guess"}
              </p>

              {!submitted && (
                <div className="flex flex-col gap-3">
                  {/* Number input with +/- buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => adjust(-1)}
                      className="btn-teal w-12 h-12 text-xl font-bold shrink-0"
                    >
                      −
                    </button>
                    <div className="flex-1 text-center">
                      <input
                        type="number"
                        className="retro-input w-full text-center text-2xl font-display"
                        value={inputStr}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onBlur={() => setInputStr(String(guess))}
                        style={{ color: "var(--teal)" }}
                      />
                      <p className="font-mono-custom text-xs mt-1" style={{ color: "var(--muted)" }}>
                        {question.unit}
                      </p>
                    </div>
                    <button
                      onClick={() => adjust(1)}
                      className="btn-teal w-12 h-12 text-xl font-bold shrink-0"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick-adjust presets */}
                  <div className="flex gap-2 justify-center flex-wrap">
                    {[-10, -1, 1, 10].map((delta) => {
                      const step = Math.max(1, Math.round((maxGuess - minGuess) / 100));
                      const label = delta > 0 ? `+${delta * step}` : `${delta * step}`;
                      return (
                        <button
                          key={delta}
                          onClick={() => adjust(delta)}
                          className="font-mono-custom text-xs px-3 py-1 rounded border-2 transition-all"
                          style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={handleSubmit} className="btn-rust w-full py-3 text-sm font-bold">
                    Lock In: {guess.toLocaleString()} {question.unit}
                  </button>
                </div>
              )}

              {submitted && (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="text-center py-4"
                >
                  <p className="font-display text-4xl" style={{ color: "var(--teal)" }}>
                    {Number(myAnswer?.answer).toLocaleString()}
                  </p>
                  <p className="font-mono-custom text-sm" style={{ color: "var(--muted)" }}>{question.unit}</p>
                  <p className="font-mono-custom text-xs mt-2 uppercase tracking-widest" style={{ color: "var(--teal)" }}>
                    Guess locked in!
                  </p>
                </motion.div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Real answer */}
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center p-4 rounded border-3"
                style={{ borderColor: "var(--teal)", backgroundColor: "rgba(30,95,95,0.08)" }}
              >
                <p className="font-mono-custom text-xs uppercase tracking-widest mb-1" style={{ color: "var(--muted)" }}>
                  The answer is:
                </p>
                <p className="font-display text-4xl" style={{ color: "var(--teal)" }}>
                  {realAnswer.toLocaleString()}
                </p>
                <p className="font-mono-custom text-sm" style={{ color: "var(--muted)" }}>{question.unit}</p>
              </motion.div>

              {/* Rankings */}
              <div className="flex flex-col gap-1.5">
                {sortedAnswers.map((a, i) => {
                  const player = players.find((p) => p._id === a.playerId);
                  const diff = Math.abs(Number(a.answer) - realAnswer);
                  const isMe = a.playerId === currentPlayer?._id;
                  return (
                    <motion.div
                      key={a.playerId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.07 }}
                      className="flex items-center gap-2 p-2 rounded border"
                      style={{
                        borderColor: i === 0 ? "#f59e0b" : isMe ? "var(--teal)" : "var(--border)",
                        backgroundColor: i === 0 ? "rgba(245,158,11,0.08)" : "transparent",
                      }}
                    >
                      <span className="font-display text-sm w-6 shrink-0" style={{ color: i === 0 ? "#f59e0b" : "var(--muted)" }}>
                        #{i + 1}
                      </span>
                      <span className="font-mono-custom text-xs font-bold flex-1 truncate" style={{ color: "var(--ink)" }}>
                        {player?.name ?? "?"}
                        {isMe && " (you)"}
                      </span>
                      <span className="font-mono-custom text-xs shrink-0" style={{ color: "var(--muted)" }}>
                        {Number(a.answer).toLocaleString()} {question.unit}
                      </span>
                      <span className="font-mono-custom text-[10px] shrink-0" style={{ color: i === 0 ? "#f59e0b" : "var(--muted)" }}>
                        {diff === 0 ? "Exact!" : `off by ${diff.toLocaleString()}`}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
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
