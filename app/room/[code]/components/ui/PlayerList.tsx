"use client";
import { motion } from "framer-motion";

interface Player {
  _id: string;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  isHost: boolean;
  isConnected: boolean;
  status?: string;
}

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
  isHostView?: boolean;
  onAdmit?: (playerId: string) => void;
  onKick?: (playerId: string) => void;
  onGrantHost?: (playerId: string) => void;
}

export default function PlayerList({
  players,
  currentPlayerId,
  isHostView,
  onAdmit,
  onKick,
  onGrantHost,
}: PlayerListProps) {
  const active = players.filter((p) => p.status !== "pending");
  const pending = players.filter((p) => p.status === "pending");

  return (
    <div className="flex flex-col gap-1">
      {/* Active players */}
      {active.map((player, i) => (
        <motion.div
          key={player._id}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 p-2 rounded"
          style={{
            backgroundColor:
              player._id === currentPlayerId
                ? "rgba(30,95,95,0.08)"
                : "transparent",
            border:
              player._id === currentPlayerId
                ? "1px solid var(--teal)"
                : "1px solid transparent",
          }}
        >
          <div
            className="avatar-circle w-10 h-10 shrink-0 overflow-hidden flex items-center justify-center bg-(--card-bg)"
            style={{ opacity: player.isConnected ? 1 : 0.4 }}
          >
            {player.avatar.startsWith("/") ? (
              <img src={player.avatar} alt={player.name} className="w-8 h-8 object-contain pixelated" />
            ) : (
              <span className="text-xl">{player.avatar}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-mono-custom font-bold text-sm truncate" style={{ color: "var(--ink)" }}>
                {player.name}
              </span>
              {player.isHost && <span title="Host" className="text-xs">👑</span>}
              {player._id === currentPlayerId && (
                <span className="text-xs font-mono-custom uppercase" style={{ color: "var(--muted)" }}>(you)</span>
              )}
            </div>
            {player.score > 0 && (
              <span className="text-xs font-mono-custom" style={{ color: "var(--muted)" }}>
                {player.score} pts
                {player.streak >= 3 && (
                  <span className="ml-1">{"🔥".repeat(player.streak >= 5 ? 2 : 1)}</span>
                )}
              </span>
            )}
          </div>

          {/* Host controls */}
          {isHostView && !player.isHost && (
            <div className="flex gap-1">
              {onGrantHost && (
                <button
                  onClick={() => onGrantHost(player._id)}
                  title="Make host"
                  className="text-xs px-2 py-0.5 font-mono-custom font-bold uppercase transition-all"
                  style={{ color: "var(--teal)", border: "1px solid var(--teal)", borderRadius: "4px" }}
                >
                  👑
                </button>
              )}
              <button
                onClick={() => onKick?.(player._id)}
                title="Kick player"
                className="text-xs px-2 py-0.5 font-mono-custom font-bold uppercase transition-all"
                style={{ color: "var(--rust)", border: "1px solid var(--border)", borderRadius: "4px" }}
              >
                Kick
              </button>
            </div>
          )}

          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: player.isConnected ? "var(--teal)" : "var(--border)" }}
            title={player.isConnected ? "Connected" : "Disconnected"}
          />
        </motion.div>
      ))}

      {/* Pending players section (host view only) */}
      {isHostView && pending.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: "2px dashed var(--border)" }}>
          <p
            className="font-mono-custom font-bold uppercase text-xs tracking-widest mb-2"
            style={{ color: "var(--rust)" }}
          >
            Waiting for admission ({pending.length})
          </p>
          {pending.map((player, i) => (
            <motion.div
              key={player._id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-2 rounded mb-1"
              style={{ backgroundColor: "rgba(196,71,42,0.06)", border: "1px solid rgba(196,71,42,0.2)" }}
            >
              <div className="avatar-circle w-9 h-9 shrink-0 overflow-hidden flex items-center justify-center bg-(--card-bg)">
                {player.avatar.startsWith("/") ? (
                  <img src={player.avatar} alt={player.name} className="w-7 h-7 object-contain pixelated" />
                ) : (
                  <span className="text-lg">{player.avatar}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className="font-mono-custom font-bold text-sm truncate" style={{ color: "var(--ink)" }}>
                  {player.name}
                </span>
                <div className="font-mono-custom text-[10px] uppercase tracking-widest" style={{ color: "var(--rust)" }}>
                  Pending
                </div>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => onAdmit?.(player._id)}
                  className="text-xs px-2 py-1 font-mono-custom font-bold uppercase"
                  style={{ backgroundColor: "var(--teal)", color: "white", borderRadius: "4px", border: "1px solid var(--teal-dark)" }}
                >
                  Admit
                </button>
                <button
                  onClick={() => onKick?.(player._id)}
                  className="text-xs px-2 py-1 font-mono-custom font-bold uppercase"
                  style={{ backgroundColor: "transparent", color: "var(--rust)", borderRadius: "4px", border: "1px solid var(--rust)" }}
                >
                  Deny
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Non-host pending view */}
      {!isHostView && pending.length > 0 && (
        <div className="mt-2 pt-2" style={{ borderTop: "1px dashed var(--border)" }}>
          <p className="text-xs font-mono-custom uppercase text-center" style={{ color: "var(--muted)" }}>
            +{pending.length} waiting for admission
          </p>
        </div>
      )}
    </div>
  );
}
