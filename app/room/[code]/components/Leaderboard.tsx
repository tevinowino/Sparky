"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Player {
  _id: string;
  name: string;
  avatar: string;
  score: number;
  streak: number;
}

interface LeaderboardProps {
  players: Player[];
  highlightScores?: Record<string, number>;
}

const MEDALS = ["🥇", "🥈", "🥉"];

function AnimatedScore({ target }: { target: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    const steps = 20;
    const increment = target / steps;
    let current = 0;
    const id = setInterval(() => {
      current = Math.min(current + increment, target);
      setDisplayed(Math.round(current));
      if (current >= target) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [target]);

  return <>{displayed.toLocaleString()}</>;
}

export default function Leaderboard({ players, highlightScores }: LeaderboardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="retro-card overflow-hidden flex flex-col max-h-[160px] md:max-h-[200px] w-full">
      <div className="section-header py-1 text-xs md:text-sm shrink-0">Leaderboard</div>
      <div className="divide-y overflow-y-auto flex-1" style={{ borderColor: "var(--border)" }}>
        {sorted.map((player, i) => {
          const gained = highlightScores?.[player._id] ?? 0;
          return (
            <motion.div
              key={player._id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-2 px-3 py-1.5"
              style={{
                backgroundColor:
                  i === 0 ? "rgba(196,71,42,0.06)" : "transparent",
              }}
            >
              <div className="w-6 text-sm text-center shrink-0 font-mono-custom">
                {MEDALS[i] ?? (
                  <span
                    className="font-display text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    {i + 1}
                  </span>
                )}
              </div>

              <div className="avatar-circle w-8 h-8 shrink-0 overflow-hidden flex items-center justify-center bg-(--card-bg)">
                {player.avatar.startsWith("/") ? (
                  <img
                    src={player.avatar}
                    alt={player.name}
                    className="w-6 h-6 object-contain pixelated"
                  />
                ) : (
                  <span className="text-lg">{player.avatar}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className="font-mono-custom font-bold text-xs truncate"
                  style={{ color: "var(--ink)" }}
                >
                  {player.name}
                </div>
                {player.streak >= 3 && (
                  <div className="text-[10px] leading-none">
                    {"🔥".repeat(player.streak >= 5 ? 2 : 1)}{" "}
                    <span
                      className="font-mono-custom"
                      style={{ color: "var(--muted)" }}
                    >
                      {player.streak} streak
                    </span>
                  </div>
                )}
              </div>

              <div className="text-right shrink-0">
                <div
                  className="font-display text-base"
                  style={{ color: "var(--rust)" }}
                >
                  <AnimatedScore target={player.score} />
                </div>
                {gained > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] font-mono-custom font-bold"
                    style={{ color: "var(--teal)" }}
                  >
                    +{gained}
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
