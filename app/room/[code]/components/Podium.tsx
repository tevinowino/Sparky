"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "framer-motion";

interface PodiumProps {
  room: {
    _id: Id<"rooms">;
    code: string;
    gameMode?: string;
    triviaTopic?: string;
    groupContext?: string;
    isAdult: boolean;
    roundCount: number;
  };
  sessionId: string;
  currentPlayer: { _id: Id<"players">; isHost: boolean } | null;
}

const PODIUM_ORDER = [1, 0, 2]; // 2nd, 1st, 3rd indices of sorted array
const PODIUM_HEIGHTS = ["h-24", "h-36", "h-16"];
const PODIUM_COLORS = ["#C0C0C0", "#FFD700", "#CD7F32"];
const MEDALS = ["🥇", "🥈", "🥉"];

export default function Podium({ room, sessionId, currentPlayer }: PodiumProps) {
  const players = useQuery(api.players.getPlayers, { roomId: room._id }) ?? [];
  const resetRoom = useMutation(api.rooms.resetRoom);
  const restartGame = useMutation(api.rooms.restartGame);
  const clearAllAnswers = useMutation(api.answers.clearAllAnswers);
  const generateQuestions = useAction(api.ai.generateQuestions);
  const generateTitles = useAction(api.ai.generatePlayerTitles);

  const [titles, setTitles] = useState<string[]>([]);
  const [confettiDone, setConfettiDone] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const isHost = currentPlayer?.isHost ?? false;

  useEffect(() => {
    // Launch confetti
    import("canvas-confetti").then(({ default: confetti }) => {
      const end = Date.now() + 3000;
      const interval = setInterval(() => {
        if (Date.now() > end) {
          clearInterval(interval);
          setConfettiDone(true);
          return;
        }
        confetti({
          particleCount: 40,
          spread: 70,
          origin: { y: 0.6, x: Math.random() },
          colors: ["#C4472A", "#1E5F5F", "#F5F0E3", "#FFD700"],
        });
      }, 300);
    });

    // Generate AI titles
    if (players.length > 0) {
      generateTitles({
        players: players.map((p: { name: string; score: number; streak: number }) => ({
          name: p.name,
          score: p.score,
          streak: p.streak,
        })),
      })
        .then((t) => setTitles(t as string[]))
        .catch(() => setTitles(players.map(() => "Party Legend")));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New Game → reset everything and go back to lobby for fresh settings
  async function handleNewGame() {
    await resetRoom({ roomId: room._id });
  }

  // Play Again → same mode/topic, new questions, scores reset, skip lobby
  async function handlePlayAgain() {
    if (restarting) return;
    setRestarting(true);
    try {
      await clearAllAnswers({ roomId: room._id });
      await restartGame({ roomId: room._id });
      const gameMode = room.gameMode ?? "would_you_rather";
      const triviaTopic = room.triviaTopic;
      const category = triviaTopic && triviaTopic !== "universal"
        ? triviaTopic.toLowerCase().replace(/\s+/g, "_")
        : "party";
      await generateQuestions({
        roomId: room._id,
        gameMode,
        category,
        isAdult: room.isAdult,
        count: room.roundCount,
        excludeIds: [],
        triviaTopic,
        playerCount: players.length,
        groupContext: room.groupContext,
      });
    } catch {
      // If generation fails, fall back to lobby so they aren't stuck
      await resetRoom({ roomId: room._id });
    } finally {
      setRestarting(false);
    }
  }

  return (
    <div
      className="min-h-screen p-4 md:p-8"
      style={{ backgroundColor: "var(--cream)" }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1
            className="font-display text-6xl uppercase"
            style={{ color: "var(--rust)" }}
          >
            Game Over!
          </h1>
          <p
            className="font-mono-custom font-bold uppercase tracking-widest mt-2"
            style={{ color: "var(--teal)" }}
          >
            Final Standings
          </p>
        </motion.div>

        {/* Podium visualization */}
        {sorted.length >= 1 && (
          <motion.div
            className="flex items-end justify-center gap-2 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {PODIUM_ORDER.map((rank, col) => {
              const player = sorted[rank];
              if (!player) return <div key={col} className="w-20" />;
              return (
                <motion.div
                  key={player._id}
                  className="flex flex-col items-center"
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + col * 0.15 }}
                >
                  <div className="text-3xl mb-1">{MEDALS[rank]}</div>
                  <div className="avatar-circle w-14 h-14 overflow-hidden flex items-center justify-center bg-(--card-bg) mb-1">
                    {player.avatar.startsWith("/") ? (
                      <img
                        src={player.avatar}
                        alt={player.name}
                        className="w-11 h-11 object-contain pixelated"
                      />
                    ) : (
                      <span className="text-2xl">{player.avatar}</span>
                    )}
                  </div>
                  <div
                    className="text-xs font-mono-custom font-bold text-center truncate w-20 mb-1"
                    style={{ color: "var(--ink)" }}
                  >
                    {player.name}
                  </div>
                  <div
                    className="w-20 flex items-center justify-center rounded-t-sm font-display text-lg"
                    style={{
                      backgroundColor: PODIUM_COLORS[rank],
                      color: "white",
                      height: rank === 0 ? "9rem" : rank === 1 ? "6rem" : "4rem",
                    }}
                  >
                    {player.score.toLocaleString()}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Full scoreboard */}
        <motion.div
          className="retro-card mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="section-header">Full Scoreboard</div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {sorted.map((player, i) => (
              <div
                key={player._id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="w-8 text-xl text-center">
                  {MEDALS[i] ?? (
                    <span
                      className="font-display"
                      style={{ color: "var(--muted)" }}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
                <div className="avatar-circle w-10 h-10 overflow-hidden flex items-center justify-center bg-(--card-bg)">
                  {player.avatar.startsWith("/") ? (
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-8 h-8 object-contain pixelated"
                    />
                  ) : (
                    <span className="text-xl">{player.avatar}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-mono-custom font-bold text-sm truncate"
                    style={{ color: "var(--ink)" }}
                  >
                    {player.name}
                  </div>
                  {titles[i] && (
                    <div
                      className="text-xs font-mono-custom italic"
                      style={{ color: "var(--muted)" }}
                    >
                      "{titles[i]}"
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div
                    className="font-display text-xl"
                    style={{ color: "var(--rust)" }}
                  >
                    {player.score.toLocaleString()}
                  </div>
                  {player.streak >= 3 && (
                    <div className="text-xs">
                      {"🔥".repeat(player.streak >= 5 ? 2 : 1)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        {isHost && (
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <button
              onClick={handlePlayAgain}
              disabled={restarting}
              className="btn-rust px-8 py-4 text-base"
            >
              {restarting ? "Starting..." : "🔄 Play Again"}
            </button>
            <button onClick={handleNewGame} className="btn-teal px-8 py-4 text-base">
              🎮 New Game
            </button>
          </motion.div>
        )}

        {!isHost && (
          <motion.p
            className="text-center font-mono-custom text-sm"
            style={{ color: "var(--muted)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            Waiting for host to start a new game...
          </motion.p>
        )}
      </div>
    </div>
  );
}
