"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { NeverHaveIEverQuestion } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import GameShell, { Player, Answer } from "./GameShell";
import ScorePopup from "../ui/ScorePopup";
import RetroModal from "../ui/RetroModal";

const TIMER_SECONDS = 20;
const POINTS_MINORITY = 200;
const POINTS_MAJORITY = 50;
const POINTS_SPEED = 50;

interface NeverHaveIEverProps {
  question: NeverHaveIEverQuestion;
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

export default function NeverHaveIEver({
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
}: NeverHaveIEverProps) {
  const submitAnswer = useMutation(api.answers.submitAnswer);
  const updateScore = useMutation(api.players.updateScore);
  const updateStreak = useMutation(api.players.updateStreak);

  const [selected, setSelected] = useState<"have" | "never" | null>(null);
  const [timerRunning, setTimerRunning] = useState(true);
  const [scoreGained, setScoreGained] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const startTime = useRef(Date.now());
  const scored = useRef(false);

  const myAnswer = currentPlayer
    ? answers.find((a) => a.playerId === currentPlayer._id)
    : null;

  const haveCount = answers.filter((a) => a.answer === "have").length;
  const neverCount = answers.filter((a) => a.answer === "never").length;
  const total = answers.length;

  const havePlayers = answers
    .filter((a) => a.answer === "have")
    .map((a) => players.find((p) => p._id === a.playerId))
    .filter(Boolean) as Player[];

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
      setSelected(myAnswer.answer as "have" | "never");
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

    const elapsed = Date.now() - startTime.current;
    const speedBonus = elapsed < (TIMER_SECONDS * 1000) / 2 ? POINTS_SPEED : 0;
    const isMinority =
      (myAnswer.answer === "have" && haveCount < neverCount) ||
      (myAnswer.answer === "never" && neverCount < haveCount);
    const pts = (isMinority ? POINTS_MINORITY : POINTS_MAJORITY) + speedBonus;

    setScoreGained(pts);
    setShowPopup(true);
    updateScore({ playerId: currentPlayer._id, points: pts });
    updateStreak({ playerId: currentPlayer._id, increment: true });
    setTimeout(() => setShowPopup(false), 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReveal]);

  async function handleSelect(choice: "have" | "never") {
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

  const havePct = total > 0 ? Math.round((haveCount / total) * 100) : 0;

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
          🤫 Confess
        </div>
      }
      accentColor={question.theme.accentColor}
    >
      {/* Retro modal for disclosures */}
      <RetroModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="🤫 Who Has Done It?"
      >
        <div className="text-center py-1 flex flex-col items-center gap-3">
          {havePlayers.length > 0 ? (
            <>
              <div className="text-4xl animate-bounce">🙋</div>
              <h3 className="font-display text-base uppercase text-(--rust) mb-1">
                Confessed Players:
              </h3>
              <div className="flex flex-wrap justify-center gap-2 p-1 max-h-[120px] overflow-y-auto w-full">
                {havePlayers.map((p) => (
                  <div
                    key={p._id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border-2 border-(--ink) bg-(--rust) text-white shadow-[1px_1px_0px_#000]"
                  >
                    <span className="w-5 h-5 overflow-hidden flex items-center justify-center bg-(--card-bg) border border-(--ink)">
                      {p.avatar.startsWith("/") ? (
                        <img src={p.avatar} alt={p.name} className="w-full h-full object-contain pixelated" />
                      ) : (
                        <span>{p.avatar}</span>
                      )}
                    </span>
                    <span className="font-mono-custom font-bold text-xs">{p.name}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs italic font-mono-custom text-(--muted) mt-2 border-t border-dashed border-(--border) pt-2 w-full">
                &ldquo;{question.consequence}&rdquo;
              </p>
            </>
          ) : (
            <>
              <div className="text-5xl">😇</div>
              <h3 className="font-display text-lg uppercase text-(--teal)">
                Nobody has done this!
              </h3>
              <p className="font-mono-custom text-xs text-(--muted)">
                A clean sheet. Group of saints!
              </p>
            </>
          )}
        </div>
      </RetroModal>

      {/* Card */}
      <div
        className="relative retro-card w-full"
        style={{
          borderColor: "var(--teal)",
          minHeight: "260px",
        }}
      >
        <div className="relative z-10 p-5 flex flex-col gap-4 select-none">
          {/* Header */}
          <div className="text-center">
            <span
              className="font-mono-custom font-bold uppercase text-[10px] md:text-xs tracking-widest px-3 py-1 rounded bg-(--teal) text-white border border-(--teal-dark)"
            >
              Never Have I Ever…
            </span>
          </div>

          {/* Statement */}
          <div className="text-center py-2 flex-1 flex flex-col justify-center items-center">
            <p
              className="font-display text-var(--ink) text-lg md:text-2xl uppercase leading-tight"
            >
              &ldquo;...{question.statement}&rdquo;
            </p>
          </div>

          {/* Action buttons or reveal */}
          {!isReveal ? (
            <div className="grid grid-cols-2 gap-4">
              {(["have", "never"] as const).map((choice) => {
                const isHave = choice === "have";
                const isSelected = selected === choice;
                const activeBg = isHave ? "var(--rust)" : "var(--teal)";

                return (
                  <motion.button
                    key={choice}
                    onClick={() => handleSelect(choice)}
                    disabled={!!selected}
                    whileHover={selected ? {} : { scale: 1.02 }}
                    whileTap={selected ? {} : { scale: 0.98 }}
                    className="relative flex flex-col items-center gap-1 rounded py-4 font-mono-custom font-bold uppercase text-xs border-3 cursor-pointer"
                    style={{
                      background: isSelected ? activeBg : "var(--cream)",
                      borderColor: isSelected ? "var(--ink)" : "var(--border)",
                      color: isSelected ? "white" : "var(--ink)",
                      boxShadow: isSelected
                        ? "none"
                        : `3px 3px 0px ${isHave ? "var(--rust-dark)" : "var(--teal-dark)"}`,
                      transform: isSelected ? "translate(3px, 3px)" : "none",
                      transition: "all 0.1s ease",
                    }}
                  >
                    <span>{isHave ? "🙋 I Have!" : "🙅 Never"}</span>
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
            /* Reveal: bar showing have% */
            <div className="flex flex-col gap-2.5">
              <div
                className="relative h-10 rounded border-2 border-(--ink) overflow-hidden shadow-[2px_2px_0px_#000]"
                style={{ backgroundColor: "var(--cream)" }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${havePct}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute inset-y-0 left-0 flex items-center justify-end pr-3 rounded-l-sm"
                  style={{ backgroundColor: "var(--rust)", minWidth: havePct > 0 ? "3rem" : 0 }}
                >
                  {havePct > 15 && (
                    <span className="font-mono-custom font-bold text-white text-[10px] md:text-xs">🙋 {havePct}%</span>
                  )}
                </motion.div>
                {havePct < 85 && (
                  <div
                    className="absolute inset-y-0 right-0 flex items-center justify-start pl-3"
                    style={{ left: `${havePct}%` }}
                  >
                    <span className="font-mono-custom font-bold text-(--ink) text-[10px] md:text-xs">🙅 {100 - havePct}%</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-[10px] md:text-xs font-mono-custom text-(--muted) font-bold">
                <span>🙋 Confessed — {haveCount} vote{haveCount !== 1 ? "s" : ""}</span>
                <span>🙅 Saints — {neverCount} vote{neverCount !== 1 ? "s" : ""}</span>
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
