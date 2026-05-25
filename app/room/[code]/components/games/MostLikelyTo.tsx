"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MostLikelyToQuestion } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import GameShell, { Player, Answer } from "./GameShell";
import ScorePopup from "../ui/ScorePopup";
import RetroModal from "../ui/RetroModal";

const TIMER_SECONDS = 30;
const POINTS_CORRECT_VOTE = 100;
const POINTS_BEING_WINNER = 200;
const POINTS_SPEED = 50;

interface MostLikelyToProps {
  question: MostLikelyToQuestion;
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

export default function MostLikelyTo({
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
}: MostLikelyToProps) {
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

  const voteCounts: Record<string, number> = {};
  for (const a of answers) {
    voteCounts[a.answer] = (voteCounts[a.answer] ?? 0) + 1;
  }
  const maxVotes = Math.max(0, ...Object.values(voteCounts));
  const winners = maxVotes > 0
    ? Object.entries(voteCounts).filter(([, c]) => c === maxVotes).map(([name]) => name)
    : [];

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
    if (!isReveal || !currentPlayer || scored.current || answers.length === 0) return;
    scored.current = true;

    const elapsed = Date.now() - startTime.current;
    const speedBonus = elapsed < (TIMER_SECONDS * 1000) / 2 ? POINTS_SPEED : 0;

    let pts = 0;
    if (myAnswer && winners.includes(myAnswer.answer)) {
      pts += POINTS_CORRECT_VOTE + speedBonus;
    }
    if (winners.includes(currentPlayer.name)) {
      pts += POINTS_BEING_WINNER;
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

  async function handleVote(playerName: string) {
    if (selected || !currentPlayer || playerName === currentPlayer.name) return;
    setSelected(playerName);
    setTimerRunning(false);
    await submitAnswer({
      roomId,
      questionIndex,
      playerId: currentPlayer._id,
      answer: playerName,
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
            backgroundColor: "#C4472A",
            color: "white",
            border: "2px solid rgba(255,255,255,0.3)",
            boxShadow: "3px 3px 0px #A3331A",
          }}
        >
          👑 Most Likely To
        </div>
      }
      accentColor={question.theme.accentColor}
    >
      {/* Retro modal for winner alert */}
      <RetroModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="👑 Round Winners!"
      >
        <div className="text-center py-2 flex flex-col items-center gap-3">
          <div className="text-5xl animate-bounce">👑</div>
          <h3 className="font-display text-xl uppercase text-(--rust)">
            {winners.join(" & ")}
          </h3>
          <p className="font-mono-custom text-xs text-(--muted)">
            Most likely to {question.scenario} with {maxVotes} vote{maxVotes !== 1 ? "s" : ""}!
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
          {/* Header */}
          <div className="text-center flex flex-col items-center">
            <span
              className="font-mono-custom font-bold uppercase text-[10px] md:text-xs tracking-widest px-3 py-1 rounded bg-(--teal) text-white border border-(--teal-dark)"
            >
              Most Likely To…
            </span>
            <p
              className="font-display text-var(--ink) text-lg md:text-2xl uppercase leading-tight mt-3"
            >
              &ldquo;{question.scenario}&rdquo;
            </p>
            {!isReveal && currentPlayer && (
              <p className="text-(--muted) text-[10px] font-mono-custom mt-1 uppercase tracking-wider font-bold">
                Tap someone else to vote
              </p>
            )}
          </div>

          {/* Player grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[170px] overflow-y-auto pr-1">
            {players.map((p) => {
              const isSelf = p._id === currentPlayer?._id;
              const isSelected = selected === p.name;
              const voteCount = voteCounts[p.name] ?? 0;
              const isWinner = isReveal && winners.includes(p.name);

              return (
                <motion.button
                  key={p._id}
                  onClick={() => handleVote(p.name)}
                  disabled={!!selected || isSelf}
                  whileHover={selected || isSelf ? {} : { scale: 1.02 }}
                  whileTap={selected || isSelf ? {} : { scale: 0.98 }}
                  className="relative flex flex-col items-center gap-1.5 py-3 px-2 rounded border-3 cursor-pointer"
                  style={{
                    background: isWinner
                      ? "var(--cream)"
                      : isSelected
                      ? "var(--cream)"
                      : "transparent",
                    borderColor: isWinner
                      ? "var(--rust)"
                      : isSelected
                      ? "var(--teal)"
                      : "var(--border)",
                    color: "var(--ink)",
                    cursor: isSelf || selected ? "default" : "pointer",
                    opacity: isSelf ? 0.45 : 1,
                    boxShadow: isWinner
                      ? "2px 2px 0px var(--rust-dark)"
                      : isSelected
                      ? "2px 2px 0px var(--teal-dark)"
                      : "none",
                  }}
                >
                  {isWinner && (
                    <motion.div
                      initial={{ y: -5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="absolute -top-3 text-sm"
                    >
                      👑
                    </motion.div>
                  )}
                  <div className="w-10 h-10 overflow-hidden flex items-center justify-center bg-(--card-bg) border-2 border-(--border)">
                    {p.avatar.startsWith("/") ? (
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className="w-8 h-8 object-contain pixelated"
                      />
                    ) : (
                      <span className="text-xl">{p.avatar}</span>
                    )}
                  </div>
                  <span className="font-mono-custom font-bold text-xs text-(--ink) text-center truncate w-full">
                    {p.name}
                    {isSelf && <span className="text-(--muted)"> (you)</span>}
                  </span>
                  {isReveal && voteCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="font-display text-var(--rust) text-xs"
                    >
                      {voteCount} vote{voteCount !== 1 ? "s" : ""}
                    </motion.span>
                  )}
                  <AnimatePresence>
                    {isSelected && !isReveal && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold bg-(--teal) text-white"
                      >
                        ✓
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <ScorePopup points={scoreGained} show={showPopup} />
        </div>
      </div>
    </GameShell>
  );
}
