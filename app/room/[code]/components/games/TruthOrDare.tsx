"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { TruthOrDareQuestion } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import GameShell, { Player, Answer } from "./GameShell";
import ScorePopup from "../ui/ScorePopup";

const TIMER_SECONDS = 30;
const POINTS_PARTICIPATION = 150;
const POINTS_DID_IT = 400;
const POINTS_SKIPPED = 50;

interface TruthOrDareProps {
  question: TruthOrDareQuestion;
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

export default function TruthOrDare({
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
}: TruthOrDareProps) {
  const submitAnswer = useMutation(api.answers.submitAnswer);
  const updateScore = useMutation(api.players.updateScore);
  const updateStreak = useMutation(api.players.updateStreak);

  const [selected, setSelected] = useState<"truth" | "dare" | null>(null);
  const [timerRunning, setTimerRunning] = useState(true);
  const [scoreGained, setScoreGained] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [awarded, setAwarded] = useState(false);
  const scored = useRef(false);

  const isConfessOrDare = gameMode === "confess_or_dare";
  const choiceALabel = isConfessOrDare ? "Confess" : "Truth";
  const choiceAIcon = isConfessOrDare ? "💬" : "🤔";

  // For confess_or_dare: sort players by _id for deterministic order, pick active player by round
  const sortedPlayers = [...players].sort((a, b) => a._id.localeCompare(b._id));
  const activePlayer = isConfessOrDare ? sortedPlayers[questionIndex % sortedPlayers.length] : null;
  const isActivePlayer = isConfessOrDare
    ? currentPlayer?._id === activePlayer?._id
    : true;

  // The judge awards points — must NOT be the active player.
  // Prefer the host; if the host is the active player, fall back to the first other player.
  const judgePlayer = isConfessOrDare && activePlayer
    ? (sortedPlayers.find((p) => p.isHost && p._id !== activePlayer._id)
        ?? sortedPlayers.find((p) => p._id !== activePlayer._id)
        ?? null)
    : null;
  const isJudge = isConfessOrDare && !!judgePlayer && currentPlayer?._id === judgePlayer._id;

  const myAnswer = currentPlayer
    ? answers.find((a) => a.playerId === currentPlayer._id)
    : null;

  // For confess_or_dare: check if active player has answered
  const activePlayerAnswer = isConfessOrDare && activePlayer
    ? answers.find((a) => a.playerId === activePlayer._id)
    : null;

  const truthCount = answers.filter((a) => a.answer === "truth").length;
  const dareCount = answers.filter((a) => a.answer === "dare").length;

  useEffect(() => {
    setSelected(null);
    setTimerRunning(true);
    setShowPopup(false);
    setAwarded(false);
    scored.current = false;
  }, [questionIndex]);

  useEffect(() => {
    if (myAnswer) {
      setSelected(myAnswer.answer as "truth" | "dare");
      if (!isConfessOrDare) setTimerRunning(false);
    }
  }, [myAnswer, isConfessOrDare]);

  // Auto-stop timer once active player picks (confess_or_dare)
  useEffect(() => {
    if (isConfessOrDare && activePlayerAnswer) {
      setTimerRunning(false);
    }
  }, [isConfessOrDare, activePlayerAnswer]);

  // Auto-score for truth_or_dare (participation)
  useEffect(() => {
    if (isConfessOrDare) return; // host manually awards
    if (!isReveal || !currentPlayer || !myAnswer || scored.current) return;
    scored.current = true;
    setScoreGained(POINTS_PARTICIPATION);
    setShowPopup(true);
    updateScore({ playerId: currentPlayer._id, points: POINTS_PARTICIPATION });
    updateStreak({ playerId: currentPlayer._id, increment: true });
    setTimeout(() => setShowPopup(false), 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReveal]);

  async function handleSelect(choice: "truth" | "dare") {
    if (selected || !currentPlayer) return;
    if (isConfessOrDare && !isActivePlayer) return;
    setSelected(choice);
    if (!isConfessOrDare) setTimerRunning(false);
    await submitAnswer({
      roomId,
      questionIndex,
      playerId: currentPlayer._id,
      answer: choice,
    });
  }

  async function handleAward(points: number) {
    if (awarded || !activePlayer) return;
    setAwarded(true);
    setScoreGained(points);
    setShowPopup(true);
    await updateScore({ playerId: activePlayer._id, points });
    if (points >= POINTS_DID_IT) {
      await updateStreak({ playerId: activePlayer._id, increment: true });
    }
    setTimeout(() => setShowPopup(false), 2000);
  }

  // Reveal extra for confess_or_dare: host award buttons
  const confessRevealExtra = isConfessOrDare && activePlayer ? (
    <div
      className="rounded border-2 p-4 flex flex-col gap-3"
      style={{ borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.06)" }}
    >
      <p className="font-mono-custom font-bold text-xs uppercase tracking-widest text-center" style={{ color: "rgba(255,255,255,0.6)" }}>
        Did <span style={{ color: "#a78bfa" }}>{activePlayer.name}</span> do it?
        {judgePlayer && !isJudge && (
          <span style={{ color: "rgba(255,255,255,0.4)" }}> — {judgePlayer.name} decides</span>
        )}
      </p>
      {isJudge && !awarded && (
        <div className="flex gap-3">
          <button
            onClick={() => handleAward(POINTS_DID_IT)}
            className="flex-1 py-2.5 rounded font-mono-custom font-bold text-sm uppercase border-2 transition-all"
            style={{ backgroundColor: "#16a34a", borderColor: "#15803d", color: "white" }}
          >
            Did it! +{POINTS_DID_IT}
          </button>
          <button
            onClick={() => handleAward(POINTS_SKIPPED)}
            className="flex-1 py-2.5 rounded font-mono-custom font-bold text-sm uppercase border-2 transition-all"
            style={{ backgroundColor: "#6b7280", borderColor: "#4b5563", color: "white" }}
          >
            Skipped +{POINTS_SKIPPED}
          </button>
        </div>
      )}
      {(awarded || !isJudge) && (
        <p className="text-center text-xs font-mono-custom" style={{ color: awarded ? "#86efac" : "rgba(255,255,255,0.4)" }}>
          {awarded
            ? `+${scoreGained} pts awarded to ${activePlayer.name}`
            : isActivePlayer
              ? "Waiting for someone else to judge..."
              : `Waiting for ${judgePlayer?.name ?? "judge"} to decide...`}
        </p>
      )}
    </div>
  ) : undefined;

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
            boxShadow: "3px 3px 0px #5b21b6",
          }}
        >
          {question.emoji} {isConfessOrDare ? "Confess or Dare" : "Truth or Dare"} · {question.intensity}/10
        </div>
      }
      accentColor={question.theme?.accentColor}
      revealExtra={confessRevealExtra}
    >
      <div className="relative retro-card w-full" style={{ borderColor: "var(--teal)" }}>
        <div className="relative z-10 p-5 flex flex-col gap-5 select-none">

          {!isReveal ? (
            <>
              {/* Active player indicator for confess_or_dare */}
              {isConfessOrDare && activePlayer && (
                <div className="text-center py-2 px-4 rounded" style={{ backgroundColor: "rgba(167,139,250,0.12)", border: "1.5px solid rgba(167,139,250,0.4)" }}>
                  <p className="font-mono-custom font-bold text-xs uppercase tracking-widest" style={{ color: "#a78bfa" }}>
                    {isActivePlayer ? "Your turn!" : `${activePlayer.name}'s turn`}
                  </p>
                </div>
              )}

              <p className="text-center font-mono-custom font-bold text-sm uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                {isConfessOrDare ? "Choose your fate" : "Pick your poison"}
              </p>

              {/* Show buttons only to active player (or everyone for truth_or_dare) */}
              {(!isConfessOrDare || isActivePlayer) && !selected ? (
                <div className="grid grid-cols-2 gap-4">
                  {(["truth", "dare"] as const).map((choice) => {
                    const isTruth = choice === "truth";
                    const label = isTruth ? choiceALabel : "Dare";
                    const icon = isTruth ? choiceAIcon : "😈";
                    const activeBg = isTruth ? "#3b82f6" : "#7c3aed";

                    return (
                      <motion.button
                        key={choice}
                        onClick={() => handleSelect(choice)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex flex-col items-center justify-center gap-2 rounded py-6 font-display uppercase text-xl border-3 cursor-pointer"
                        style={{
                          background: "var(--cream)",
                          borderColor: "var(--border)",
                          color: "var(--ink)",
                          boxShadow: `3px 3px 0px ${isTruth ? "#2563eb" : "#6d28d9"}`,
                          transition: "all 0.1s ease",
                        }}
                      >
                        <span className="text-3xl">{icon}</span>
                        <span>{label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              ) : isConfessOrDare && !isActivePlayer && !activePlayerAnswer ? (
                <div className="text-center py-8">
                  <p className="font-display text-xl uppercase" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Waiting for {activePlayer?.name}...
                  </p>
                  <div className="dot-pulse mt-2 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                    <span>.</span><span>.</span><span>.</span>
                  </div>
                </div>
              ) : null}

              {/* Prompt shown after active player picks */}
              <AnimatePresence>
                {(isConfessOrDare ? activePlayerAnswer : selected) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded border-3 p-4 text-center"
                    style={{
                      borderColor: (activePlayerAnswer?.answer ?? selected) === "truth" ? "#3b82f6" : "#7c3aed",
                      backgroundColor: (activePlayerAnswer?.answer ?? selected) === "truth" ? "rgba(59,130,246,0.08)" : "rgba(124,58,237,0.08)",
                    }}
                  >
                    <p className="font-mono-custom font-bold text-xs uppercase tracking-widest mb-2"
                      style={{ color: (activePlayerAnswer?.answer ?? selected) === "truth" ? "#3b82f6" : "#7c3aed" }}>
                      {isConfessOrDare ? `${activePlayer?.name} chose: ` : "Your "}{(activePlayerAnswer?.answer ?? selected) === "truth" ? choiceALabel : "Dare"}:
                    </p>
                    <p className="font-mono-custom text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                      {(activePlayerAnswer?.answer ?? selected) === "truth" ? question.truth : question.dare}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              {isConfessOrDare ? (
                // Confess or Dare reveal
                <>
                  {activePlayer && (
                    <div className="text-center">
                      <p className="font-mono-custom text-xs uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                        This round
                      </p>
                      <p className="font-display text-xl uppercase" style={{ color: "#a78bfa" }}>
                        {activePlayer.name}
                      </p>
                      {activePlayerAnswer && (
                        <p className="font-mono-custom text-sm font-bold mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                          chose <span style={{ color: activePlayerAnswer.answer === "truth" ? "#3b82f6" : "#7c3aed" }}>
                            {activePlayerAnswer.answer === "truth" ? choiceALabel : "Dare"}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                  {activePlayerAnswer && (
                    <div className="rounded border-2 p-3" style={{
                      borderColor: activePlayerAnswer.answer === "truth" ? "#3b82f6" : "#7c3aed",
                      backgroundColor: activePlayerAnswer.answer === "truth" ? "rgba(59,130,246,0.06)" : "rgba(124,58,237,0.06)",
                    }}>
                      <p className="font-mono-custom font-bold text-[10px] uppercase tracking-widest mb-1" style={{ color: activePlayerAnswer.answer === "truth" ? "#3b82f6" : "#7c3aed" }}>
                        {activePlayerAnswer.answer === "truth" ? `${choiceAIcon} ${choiceALabel} Prompt:` : "😈 Dare Prompt:"}
                      </p>
                      <p className="font-mono-custom text-xs leading-relaxed" style={{ color: "var(--ink)" }}>
                        {activePlayerAnswer.answer === "truth" ? question.truth : question.dare}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                // Truth or Dare reveal
                <>
                  <div className="flex justify-around text-center">
                    <div>
                      <p className="text-2xl">{choiceAIcon}</p>
                      <p className="font-display text-2xl" style={{ color: "#3b82f6" }}>{truthCount}</p>
                      <p className="font-mono-custom text-xs uppercase" style={{ color: "var(--muted)" }}>{choiceALabel}</p>
                    </div>
                    <div>
                      <p className="text-2xl">😈</p>
                      <p className="font-display text-2xl" style={{ color: "#7c3aed" }}>{dareCount}</p>
                      <p className="font-mono-custom text-xs uppercase" style={{ color: "var(--muted)" }}>Dare</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="rounded border-2 p-3" style={{ borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.06)" }}>
                      <p className="font-mono-custom font-bold text-[10px] uppercase tracking-widest mb-1" style={{ color: "#3b82f6" }}>
                        {choiceAIcon} {choiceALabel} Prompt:
                      </p>
                      <p className="font-mono-custom text-xs leading-relaxed" style={{ color: "var(--ink)" }}>
                        {question.truth}
                      </p>
                    </div>
                    <div className="rounded border-2 p-3" style={{ borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,0.06)" }}>
                      <p className="font-mono-custom font-bold text-[10px] uppercase tracking-widest mb-1" style={{ color: "#7c3aed" }}>
                        😈 Dare Prompt:
                      </p>
                      <p className="font-mono-custom text-xs leading-relaxed" style={{ color: "var(--ink)" }}>
                        {question.dare}
                      </p>
                    </div>
                  </div>

                  <p className="text-center text-[10px] font-mono-custom uppercase tracking-widest font-bold" style={{ color: "var(--teal)" }}>
                    Everyone earned {POINTS_PARTICIPATION} participation points!
                  </p>
                </>
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
