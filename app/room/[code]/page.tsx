"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "framer-motion";
import Lobby from "./components/Lobby";
import GameBoard from "./components/GameBoard";
import Podium from "./components/Podium";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("sparky_session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("sparky_session", id);
  }
  return id;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = (params.code as string).toUpperCase();
  const autoPassword = searchParams.get("pw") ?? undefined;
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const room = useQuery(api.rooms.getRoom, { code });
  const player = useQuery(
    api.players.getPlayerBySession,
    room && sessionId
      ? { sessionId, roomId: room._id as Id<"rooms"> }
      : "skip"
  );

  if (room === undefined) {
    return <LoadingScreen message="Loading room..." />;
  }

  if (room === null) {
    return (
      <ErrorScreen
        message="Room not found."
        onHome={() => router.push("/")}
      />
    );
  }

  if (room.status === "lobby") {
    return (
      <Lobby
        room={room}
        sessionId={sessionId}
        currentPlayer={player ?? null}
        autoPassword={autoPassword}
      />
    );
  }

  if (room.status === "generating") {
    return <LoadingScreen message="Cooking up your questions..." spinner />;
  }

  if (room.status === "playing" || room.status === "reveal") {
    return (
      <GameBoard
        room={room}
        sessionId={sessionId}
        currentPlayer={player ?? null}
      />
    );
  }

  if (room.status === "ended") {
    return (
      <Podium
        room={{
          _id: room._id,
          code: room.code,
          gameMode: room.gameMode,
          triviaTopic: room.triviaTopic,
          groupContext: room.groupContext,
          isAdult: room.isAdult,
          roundCount: room.roundCount,
        }}
        sessionId={sessionId}
        currentPlayer={player ?? null}
      />
    );
  }

  return <LoadingScreen message="Loading..." />;
}

function LoadingScreen({
  message,
  spinner,
}: {
  message: string;
  spinner?: boolean;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: "var(--cream)" }}
    >
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {spinner && (
          <motion.div
            className="text-6xl mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            ⚡
          </motion.div>
        )}
        <p
          className="font-display text-2xl uppercase"
          style={{ color: "var(--teal)" }}
        >
          {message}
        </p>
        <div className="dot-pulse flex gap-1 justify-center mt-4">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "var(--rust)" }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "var(--rust)" }}
          />
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "var(--rust)" }}
          />
        </div>
      </motion.div>
    </div>
  );
}

function ErrorScreen({
  message,
  onHome,
}: {
  message: string;
  onHome: () => void;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: "var(--cream)" }}
    >
      <div className="retro-card p-8 text-center max-w-sm">
        <div className="text-5xl mb-4">😬</div>
        <p
          className="font-display text-xl uppercase mb-6"
          style={{ color: "var(--ink)" }}
        >
          {message}
        </p>
        <button className="btn-rust px-8 py-3" onClick={onHome}>
          Go Home
        </button>
      </div>
    </div>
  );
}
