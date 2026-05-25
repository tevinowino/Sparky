"use client";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { WouldYouRatherQuestion } from "@/lib/types";
import { calculateWouldYouRatherPoints } from "@/lib/scoring";
import QuestionCard from "../ui/QuestionCard";
import GameShell, { Player, Answer } from "./GameShell";
import ScorePopup from "../ui/ScorePopup";

const TIMER_SECONDS = 30;

interface WouldYouRatherProps {
  question: WouldYouRatherQuestion;
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

export default function WouldYouRather({
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
}: WouldYouRatherProps) {
  const submitAnswer = useMutation(api.answers.submitAnswer);
  const updateScore = useMutation(api.players.updateScore);
  const updateStreak = useMutation(api.players.updateStreak);

  const [selectedAnswer, setSelectedAnswer] = useState<"A" | "B" | null>(null);
  const [scoreGained, setScoreGained] = useState(0);
  const [showScorePopup, setShowScorePopup] = useState(false);
  const [timerRunning, setTimerRunning] = useState(true);
  const answerTimeRef = useRef<number>(Date.now());
  const scored = useRef(false);

  const myAnswer = currentPlayer
    ? answers.find((a) => a.playerId === currentPlayer._id)
    : null;

  const votesA = answers.filter((a) => a.answer === "A").length;
  const votesB = answers.filter((a) => a.answer === "B").length;
  const totalVotes = answers.length;

  useEffect(() => {
    setSelectedAnswer(null);
    answerTimeRef.current = Date.now();
    setTimerRunning(true);
    setShowScorePopup(false);
    scored.current = false;
  }, [questionIndex]);

  useEffect(() => {
    if (myAnswer) {
      setSelectedAnswer(myAnswer.answer as "A" | "B");
      setTimerRunning(false);
    }
  }, [myAnswer]);

  useEffect(() => {
    if (!isReveal || !currentPlayer || !myAnswer || scored.current) return;
    scored.current = true;

    const elapsed = Date.now() - answerTimeRef.current;
    const isMajority =
      (myAnswer.answer === "A" && votesA >= votesB) ||
      (myAnswer.answer === "B" && votesB >= votesA);
    const points = calculateWouldYouRatherPoints(
      isMajority,
      elapsed,
      TIMER_SECONDS * 1000,
      currentPlayer.streak
    );
    setScoreGained(points);
    setShowScorePopup(true);
    updateScore({ playerId: currentPlayer._id, points });
    updateStreak({ playerId: currentPlayer._id, increment: true });
    setTimeout(() => setShowScorePopup(false), 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReveal]);

  async function handleSelect(option: "A" | "B") {
    if (selectedAnswer || !currentPlayer) return;
    setSelectedAnswer(option);
    setTimerRunning(false);
    await submitAnswer({
      roomId,
      questionIndex,
      playerId: currentPlayer._id,
      answer: option,
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
          {question.theme?.mood?.toUpperCase() ?? "QUESTION"} · {question.intensity}/10 🔥
        </div>
      }
      accentColor={question.theme?.accentColor ?? "#94d1d1"}
    >
      <div className="relative">
        <QuestionCard
          question={question}
          selectedAnswer={selectedAnswer}
          locked={!!selectedAnswer || isReveal}
          onSelect={handleSelect}
          showResults={isReveal}
          votesA={votesA}
          votesB={votesB}
          totalVotes={totalVotes}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <ScorePopup points={scoreGained} show={showScorePopup} />
        </div>
      </div>
    </GameShell>
  );
}
