"use client";
import React from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import WouldYouRather from "./games/WouldYouRather";
import HotTakes from "./games/HotTakes";
import MostLikelyTo from "./games/MostLikelyTo";
import NeverHaveIEver from "./games/NeverHaveIEver";
import ClassicTrivia from "./games/ClassicTrivia";
import TrueOrFalseBlitz from "./games/TrueOrFalseBlitz";
import RedFlagGreenFlag from "./games/RedFlagGreenFlag";
import TruthOrDare from "./games/TruthOrDare";
import CompatibilityTest from "./games/CompatibilityTest";
import RankIt from "./games/RankIt";
import ClosestWins from "./games/ClosestWins";
import PollSpy from "./games/PollSpy";
import Quiplash from "./games/Quiplash";
import TwoTruthsOneLie from "./games/TwoTruthsOneLie";

interface GameBoardProps {
  room: {
    _id: Id<"rooms">;
    status: string;
    gameMode?: string;
    questionBatch: unknown[];
    currentQuestionIndex: number;
    roundCount: number;
    hostId: string;
  };
  sessionId: string;
  currentPlayer: {
    _id: Id<"players">;
    isHost: boolean;
    name: string;
    avatar: string;
    score: number;
    streak: number;
    isConnected: boolean;
  } | null;
}

export default function GameBoard({ room, sessionId, currentPlayer }: GameBoardProps) {
  const router = useRouter();
  const players = useQuery(api.players.getPlayers, { roomId: room._id }) ?? [];
  const answers = useQuery(api.answers.getAnswers, {
    roomId: room._id,
    questionIndex: room.currentQuestionIndex,
  }) ?? [];

  const nextQuestion = useMutation(api.rooms.nextQuestion);
  const showReveal = useMutation(api.rooms.showReveal);
  const clearAnswers = useMutation(api.answers.clearAnswers);
  const abandonGame = useMutation(api.rooms.abandonGame);
  const removePlayer = useMutation(api.players.removePlayer);

  const [advancing, setAdvancing] = React.useState(false);

  const isReveal = room.status === "reveal";
  const isHost = currentPlayer?.isHost ?? false;
  const question = room.questionBatch[room.currentQuestionIndex];
  const isLastQuestion = room.currentQuestionIndex >= room.questionBatch.length - 1;
  const gameMode = room.gameMode ?? "would_you_rather";

  async function handleShowReveal() {
    if (advancing) return;
    setAdvancing(true);
    try {
      await showReveal({ roomId: room._id });
    } finally {
      setAdvancing(false);
    }
  }

  async function handleNext() {
    if (advancing) return;
    setAdvancing(true);
    try {
      await clearAnswers({ roomId: room._id, questionIndex: room.currentQuestionIndex });
      await nextQuestion({ roomId: room._id, fromIndex: room.currentQuestionIndex });
    } finally {
      setAdvancing(false);
    }
  }

  async function handleAbandon() {
    await abandonGame({ roomId: room._id });
  }

  async function handleLeave() {
    if (currentPlayer) {
      await removePlayer({ playerId: currentPlayer._id });
    }
    router.push("/");
  }

  if (!question) {
    // If we're past the last question, end the game rather than white-screening
    if (isHost && room.currentQuestionIndex > 0) {
      nextQuestion({ roomId: room._id, fromIndex: room.currentQuestionIndex }).catch(() => {});
    }
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--cream)" }}
      >
        <p className="font-display text-2xl" style={{ color: "var(--teal)" }}>
          Loading question…
        </p>
      </div>
    );
  }

  const commonProps = {
    questionIndex: room.currentQuestionIndex,
    totalQuestions: room.questionBatch.length,
    roomId: room._id,
    players,
    currentPlayer,
    answers,
    isReveal,
    isHost,
    onNext: handleNext,
    onShowReveal: handleShowReveal,
    onAbandon: handleAbandon,
    onLeave: handleLeave,
    isLastQuestion,
    gameMode,
  };

  let gameComponent: React.ReactNode;

  switch (gameMode) {
    case "hot_takes":
      gameComponent = <HotTakes question={question as never} {...commonProps} />;
      break;
    case "most_likely_to":
    case "first_impressions":
    case "assumptions":
      gameComponent = <MostLikelyTo question={question as never} {...commonProps} />;
      break;
    case "never_have_i_ever":
    case "spicy_never_have_i_ever":
    case "common_ground":
      gameComponent = <NeverHaveIEver question={question as never} {...commonProps} />;
      break;
    case "classic_trivia":
    case "fibbage":
      gameComponent = <ClassicTrivia question={question as never} {...commonProps} />;
      break;
    case "fantasy_scenarios":
      gameComponent = <WouldYouRather question={question as never} {...commonProps} />;
      break;
    case "true_or_false_blitz":
      gameComponent = <TrueOrFalseBlitz question={question as never} {...commonProps} />;
      break;
    case "red_flag_green_flag":
      gameComponent = <RedFlagGreenFlag question={question as never} {...commonProps} />;
      break;
    case "truth_or_dare":
    case "confess_or_dare":
      gameComponent = <TruthOrDare question={question as never} {...commonProps} />;
      break;
    case "compatibility_test":
    case "love_language_quiz":
    case "how_well_do_you_know_me":
      gameComponent = <CompatibilityTest question={question as never} {...commonProps} />;
      break;
    case "rank_it":
      gameComponent = <RankIt question={question as never} {...commonProps} />;
      break;
    case "closest_wins":
      gameComponent = <ClosestWins question={question as never} {...commonProps} />;
      break;
    case "poll_spy":
      gameComponent = <PollSpy question={question as never} {...commonProps} />;
      break;
    case "quiplash":
    case "bad_advice":
      gameComponent = <Quiplash question={question as never} {...commonProps} />;
      break;
    case "two_truths_one_lie":
      gameComponent = <TwoTruthsOneLie question={question as never} {...commonProps} />;
      break;
    default:
      gameComponent = <WouldYouRather question={question as never} {...commonProps} />;
  }

  return (
    <div
      className="h-dvh-safe w-full overflow-hidden crt-effect"
      style={{ background: "linear-gradient(135deg, #004747 0%, #1e5f5f 40%, #ab351a 100%)" }}
    >
      <div className="max-w-3xl w-full mx-auto h-full flex flex-col overflow-hidden">{gameComponent}</div>
    </div>
  );
}
