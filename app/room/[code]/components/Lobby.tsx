"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import PlayerList from "./ui/PlayerList";
import { HowToPlayPanel } from "./ui/HowToPlay";
import AvatarPicker from "./ui/AvatarPicker";

const RETRO_AVATARS = [
  "/avatars/avatar_dog.png",
  "/avatars/avatar_cat.png",
  "/avatars/avatar_robot.png",
  "/avatars/avatar_wizard.png",
  "/avatars/avatar_dino.png",
  "/avatars/avatar_fairy.png",
  "/avatars/avatar_knight.png",
  "/avatars/avatar_unicorn.png",
  "/avatars/avatar_ninja.png",
  "/avatars/avatar_princess.png",
  "/avatars/avatar_astronaut.png",
  "/avatars/avatar_mermaid.png",
  "/avatars/avatar_pirate.png",
  "/avatars/avatar_bunny.png",
  "/avatars/avatar_cyborg.png",
];

interface LobbyProps {
  room: {
    _id: Id<"rooms">;
    code: string;
    hostId: string;
    gameMode?: string;
    roundCount: number;
    maxPlayers: number;
    isAdult: boolean;
    status: string;
    isPrivate?: boolean;
    password?: string;
    triviaTopic?: string;
    groupContext?: string;
  };
  sessionId: string;
  currentPlayer: { _id: Id<"players">; isHost: boolean; status?: string } | null;
  autoPassword?: string;
}

const ROUND_OPTIONS = [5, 10, 15];

interface GameMode {
  value: string;
  label: string;
  emoji: string;
  description: string;
  category: string;
  group: string;
}

const GAME_MODES: GameMode[] = [
  // Party
  { value: "would_you_rather",      label: "Would You Rather",       emoji: "🤔", description: "Pick between two impossible choices", category: "party", group: "Party" },
  { value: "hot_takes",             label: "Hot Takes",              emoji: "🔥", description: "Agree or disagree — minority earns bonus", category: "party", group: "Party" },
  { value: "most_likely_to",        label: "Most Likely To",         emoji: "👑", description: "Vote for who fits each scenario best", category: "party", group: "Party" },
  { value: "never_have_i_ever",     label: "Never Have I Ever",      emoji: "🤫", description: "Confess (or don't) and earn points", category: "party", group: "Party" },
  { value: "rank_it",               label: "Rank It",                emoji: "📊", description: "Put four items in the correct order", category: "party", group: "Party" },
  { value: "true_or_false_blitz",   label: "True or False Blitz",    emoji: "⚡", description: "Speed-round true/false trivia", category: "party", group: "Party" },
  // Trivia
  { value: "classic_trivia",        label: "Classic Trivia",         emoji: "🧠", description: "Pop culture trivia 2000–2015", category: "trivia", group: "Trivia" },
  { value: "closest_wins",          label: "Closest Wins",           emoji: "🎯", description: "Guess the number — closest player wins", category: "trivia", group: "Trivia" },
  { value: "poll_spy",              label: "Poll Spy",               emoji: "🕵️", description: "Blend in with the majority to score big", category: "trivia", group: "Trivia" },
  { value: "fibbage",               label: "Fibbage",                emoji: "🤥", description: "Spot the real fact among convincing fakes", category: "trivia", group: "Trivia" },
  // Creative
  { value: "quiplash",              label: "Quiplash",               emoji: "😂", description: "Vote for the funniest answer", category: "creative", group: "Creative" },
  { value: "two_truths_one_lie",    label: "Two Truths One Lie",     emoji: "🤔", description: "Find the lie among three statements", category: "creative", group: "Creative" },
  { value: "bad_advice",            label: "Bad Advice",             emoji: "😈", description: "Vote for the most entertainingly terrible advice", category: "creative", group: "Creative" },
  // Icebreaker
  { value: "common_ground",         label: "Common Ground",          emoji: "🤝", description: "Discover what everyone has in common", category: "icebreaker", group: "Icebreaker" },
  { value: "first_impressions",     label: "First Impressions",      emoji: "👁️", description: "Vote for who best fits each description", category: "icebreaker", group: "Icebreaker" },
  { value: "assumptions",           label: "Assumptions",            emoji: "🔮", description: "Call out who in the group would do each thing", category: "icebreaker", group: "Icebreaker" },
  // Couples Wholesome
  { value: "how_well_do_you_know_me", label: "How Well Do You Know Me?", emoji: "🫶", description: "Guess what the host would pick", category: "couples_wholesome", group: "Couples — Wholesome" },
  { value: "compatibility_test",    label: "Compatibility Test",     emoji: "✨", description: "Score points by matching others' answers", category: "couples_wholesome", group: "Couples — Wholesome" },
  { value: "love_language_quiz",    label: "Love Language Quiz",     emoji: "💕", description: "Find your group's love language profile", category: "couples_wholesome", group: "Couples — Wholesome" },
  // Couples Spicy
  { value: "spicy_never_have_i_ever", label: "Spicy Never Have I Ever", emoji: "🌶️", description: "The bold version — not for the shy", category: "couples_spicy", group: "Couples — Spicy" },
  { value: "truth_or_dare",         label: "Truth or Dare",          emoji: "🎲", description: "Pick your fate — truth or dare", category: "couples_spicy", group: "Couples — Spicy" },
  { value: "red_flag_green_flag",   label: "Red Flag or Green Flag", emoji: "🚩", description: "Debate dating scenarios — minority earns bonus", category: "couples_spicy", group: "Couples — Spicy" },
  { value: "confess_or_dare",       label: "Confess or Dare",        emoji: "💬", description: "Confess something spicy or take a dare", category: "couples_spicy", group: "Couples — Spicy" },
  { value: "fantasy_scenarios",     label: "Fantasy Scenarios",      emoji: "🌙", description: "Dream big — pick your fantasy", category: "couples_spicy", group: "Couples — Spicy" },
];

export default function Lobby({ room, sessionId, currentPlayer, autoPassword }: LobbyProps) {
  const router = useRouter();

  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Join form state (for visitors with no player record)
  const [joinName, setJoinName] = useState("");
  const [joinAvatar, setJoinAvatar] = useState(RETRO_AVATARS[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [joinPassword, setJoinPassword] = useState<string>(() => autoPassword ?? "");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  // Privacy password editing
  const [passwordDraft, setPasswordDraft] = useState(room.password ?? "");

  // Custom trivia topic
  const [topicDraft, setTopicDraft] = useState("");

  const players        = useQuery(api.players.getPlayers, { roomId: room._id }) ?? [];
  const setGameMode    = useMutation(api.rooms.setGameMode);
  const setRoundCount  = useMutation(api.rooms.setRoundCount);
  const setMaxPlayers  = useMutation(api.rooms.setMaxPlayers);
  const setAdult       = useMutation(api.rooms.setAdult);
  const setStatus      = useMutation(api.rooms.setStatus);
  const setPrivacy     = useMutation(api.rooms.setPrivacy);
  const setTriviaTopic = useMutation(api.rooms.setTriviaTopic);
  const setGroupContext = useMutation(api.rooms.setGroupContext);
  const admitPlayer    = useMutation(api.rooms.admitPlayer);
  const kickPlayer     = useMutation(api.rooms.kickPlayer);
  const generateQuestions = useAction(api.ai.generateQuestions);
  const transferHost   = useMutation(api.rooms.transferHost);
  const removePlayer   = useMutation(api.players.removePlayer);
  const joinRoom       = useMutation(api.rooms.joinRoom);

  const isHost    = currentPlayer?.isHost ?? false;
  const isPending = currentPlayer?.status === "pending";
  const activeMode = room.gameMode ?? "would_you_rather";
  const takenAvatars = players.map((p) => p.avatar);
  const activePlayers = players.filter((p) => p.status !== "pending");

  async function copyCode() {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyLink() {
    const base = window.location.origin;
    const url = room.isPrivate && room.password
      ? `${base}/room/${room.code}?pw=${encodeURIComponent(room.password)}`
      : `${base}/room/${room.code}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

  async function handleLeave() {
    if (currentPlayer) {
      await removePlayer({ playerId: currentPlayer._id });
    }
    router.push("/");
  }

  async function startGame() {
    if (activePlayers.length < 2 || starting) return;
    setStarting(true);
    try {
      await setStatus({ roomId: room._id, status: "generating" });
      // Prefer what the user typed (topicDraft) over the saved DB value so
      // they don't have to click "Set" before starting.
      const savedTopic = room.triviaTopic ?? "universal";
      const effectiveTopic = activeMode === "classic_trivia"
        ? (topicDraft.trim() || savedTopic)
        : undefined;
      // If topicDraft overrides, persist it before generating
      if (activeMode === "classic_trivia" && topicDraft.trim() && topicDraft.trim() !== savedTopic) {
        await setTriviaTopic({ roomId: room._id, triviaTopic: topicDraft.trim() });
      }
      await generateQuestions({
        roomId: room._id,
        gameMode: activeMode,
        category: effectiveTopic && effectiveTopic !== "universal"
          ? effectiveTopic.toLowerCase().replace(/\s+/g, "_")
          : (GAME_MODES.find((m) => m.value === activeMode)?.category ?? "party"),
        isAdult: room.isAdult,
        count: room.roundCount,
        excludeIds: [],
        triviaTopic: effectiveTopic,
        playerCount: activePlayers.length,
        groupContext: room.groupContext,
      });
    } catch (err) {
      console.error("Failed to start game:", err);
      await setStatus({ roomId: room._id, status: "lobby" });
      setStarting(false);
    }
  }

  async function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!joinName.trim()) return;
    setJoining(true);
    setJoinError("");
    try {
      await joinRoom({
        code: room.code,
        sessionId,
        name: joinName.trim(),
        avatar: joinAvatar,
        password: joinPassword || undefined,
      });
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : "Could not join");
      setJoining(false);
    }
  }

  async function handleTogglePrivacy() {
    const next = !room.isPrivate;
    await setPrivacy({ roomId: room._id, isPrivate: next, password: next ? passwordDraft : undefined });
  }

  async function handleSavePassword() {
    if (!passwordDraft.trim()) return;
    await setPrivacy({ roomId: room._id, isPrivate: true, password: passwordDraft.trim() });
  }

  // ── Pending player: waiting for host admission ──────────────────────────────
  if (isPending && currentPlayer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: "var(--cream)" }}>
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="retro-card max-w-sm w-full text-center"
        >
          <div className="section-header">Waiting Room</div>
          <div className="p-8 flex flex-col items-center gap-5">
            <motion.div
              className="text-5xl"
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            >
              🚪
            </motion.div>
            <div>
              <p className="font-display text-xl uppercase mb-1" style={{ color: "var(--teal)" }}>
                Waiting for host
              </p>
              <p className="font-mono-custom text-sm" style={{ color: "var(--muted)" }}>
                The host needs to admit you into the room.
              </p>
            </div>
            <div className="font-mono-custom text-sm font-bold" style={{ color: "var(--teal)" }}>
              Room{" "}
              <span className="font-display text-lg tracking-widest" style={{ color: "var(--rust)" }}>
                {room.code}
              </span>
              <span className="dot-pulse ml-1"><span>.</span><span>.</span><span>.</span></span>
            </div>
            <button onClick={handleLeave} className="btn-rust px-6 py-2 text-sm mt-2">
              ← Leave Room
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main lobby ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: "var(--cream)" }}>
      <div className="max-w-5xl mx-auto">

        {/* Top nav */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 font-mono-custom font-bold uppercase text-xs tracking-widest px-3 py-2 rounded transition-all w-full sm:w-auto justify-center cursor-pointer"
            style={{ color: "var(--muted)", border: "2px solid var(--border)" }}
          >
            ← Leave Room
          </button>
          <img
            src="/logo.png"
            alt="Sparky"
            className="h-12 sm:h-14 w-auto object-contain"
          />
          <div className="hidden sm:block w-28" />
        </div>

        {/* Room code + share */}
        <motion.div initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="retro-card mb-6">
          <div className="section-header flex items-center justify-between px-4">
            <span>Room Code</span>
            {room.isPrivate && (
              <span className="text-xs font-mono-custom font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ backgroundColor: "rgba(196,71,42,0.18)", color: "var(--rust)" }}>
                🔒 Private
              </span>
            )}
          </div>
          <div className="p-5 flex flex-col sm:flex-row items-center gap-4 justify-between">
            <div className="font-display text-5xl md:text-6xl tracking-[0.3em] uppercase" style={{ color: "var(--teal)" }}>
              {room.code}
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <button onClick={copyCode} className="btn-teal px-4 py-2 text-sm">
                {copied ? "✓ Copied!" : "📋 Copy Code"}
              </button>
              <button onClick={copyLink} className="btn-rust px-4 py-2 text-sm">
                {linkCopied ? "✓ Link Copied!" : "🔗 Share Link"}
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left: players */}
          <motion.div className="retro-card" initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.08 }}>
            <div className="section-header">
              Players ({activePlayers.length}/{room.maxPlayers})
            </div>
            <div className="p-4">
              <PlayerList
                players={players}
                currentPlayerId={currentPlayer?._id}
                isHostView={isHost}
                onAdmit={(id) => admitPlayer({ playerId: id as Id<"players"> })}
                onKick={(id) => kickPlayer({ playerId: id as Id<"players"> })}
                onGrantHost={(id) => transferHost({ roomId: room._id, newHostPlayerId: id as Id<"players"> })}
              />

              {activePlayers.length < 2 && (
                <p className="text-center text-sm font-mono-custom mt-4" style={{ color: "var(--muted)" }}>
                  Need at least 2 active players to start
                </p>
              )}

              {/* Visitor join form */}
              {!currentPlayer && (
                <form onSubmit={handleJoin} className="mt-4 flex flex-col gap-3 pt-4" style={{ borderTop: "2px dashed var(--border)" }}>
                  <p className="font-mono-custom font-bold text-sm uppercase text-center" style={{ color: "var(--teal)" }}>
                    Join this room
                  </p>
                  <input
                    className="retro-input w-full text-sm"
                    placeholder="Your name (max 16 chars)"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    maxLength={16}
                    required
                  />
                  <AvatarPicker
                    emojis={RETRO_AVATARS}
                    selected={joinAvatar}
                    onSelect={setJoinAvatar}
                    takenAvatars={takenAvatars}
                  />
                  {room.isPrivate && room.password && (
                    <div>
                      <label className="block font-mono-custom font-bold uppercase text-[10px] tracking-widest mb-1" style={{ color: "var(--muted)" }}>
                        Room Password
                      </label>
                      <input
                        className="retro-input w-full text-sm"
                        placeholder="Enter password"
                        type="text"
                        value={joinPassword}
                        onChange={(e) => setJoinPassword(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  {joinError && (
                    <p className="text-xs font-mono-custom" style={{ color: "var(--rust)" }}>{joinError}</p>
                  )}
                  <button type="submit" className="btn-teal w-full py-2 text-sm" disabled={joining || !joinName.trim()}>
                    {joining ? "Joining..." : room.isPrivate && room.password ? "🔒 Request to Join" : "Join Room"}
                  </button>
                </form>
              )}
            </div>
          </motion.div>

          {/* Right: host settings or guest waiting */}
          <motion.div className="retro-card" initial={{ x: 16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.12 }}>
            {isHost ? (
              <>
                <div className="section-header">Game Settings</div>
                <div className="p-4 flex flex-col gap-5">

                  {/* Game mode */}
                  <div>
                    <label className="block font-mono-custom font-bold uppercase text-xs tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                      Game Mode
                    </label>
                    <div className="flex flex-col gap-1 max-h-[340px] overflow-y-auto pr-1">
                      {(() => {
                        const groups = Array.from(new Set(GAME_MODES.map((m) => m.group)));
                        return groups.map((group) => (
                          <div key={group}>
                            <p className="font-mono-custom font-bold uppercase text-[9px] tracking-widest px-1 py-1 mt-2 mb-1 first:mt-0"
                              style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                              {group}
                            </p>
                            {GAME_MODES.filter((m) => m.group === group).map((mode) => {
                              const isActive = activeMode === mode.value;
                              return (
                                <button
                                  key={mode.value}
                                  onClick={() => setGameMode({ roomId: room._id, gameMode: mode.value, category: mode.category })}
                                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded text-left transition-all mb-0.5"
                                  style={{
                                    border: isActive ? "2px solid var(--teal)" : "2px solid transparent",
                                    backgroundColor: isActive ? "rgba(30,95,95,0.08)" : "transparent",
                                  }}
                                >
                                  <span className="text-base shrink-0">{mode.emoji}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-mono-custom font-bold text-xs" style={{ color: isActive ? "var(--teal)" : "var(--ink)" }}>
                                      {mode.label}
                                    </div>
                                    <div className="text-[10px] font-mono-custom truncate" style={{ color: "var(--muted)" }}>
                                      {mode.description}
                                    </div>
                                  </div>
                                  {isActive && <span className="text-xs font-mono-custom font-bold shrink-0" style={{ color: "var(--teal)" }}>✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        ));
                      })()}
                    </div>
                    {/* Trivia topic picker — only shown when classic_trivia is selected */}
                    <AnimatePresence>
                      {activeMode === "classic_trivia" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden mt-3"
                        >
                          <TriviaTopicPicker
                            savedTopic={room.triviaTopic ?? "universal"}
                            topicDraft={topicDraft}
                            onTopicDraftChange={setTopicDraft}
                            onSelect={(topic) => setTriviaTopic({ roomId: room._id, triviaTopic: topic })}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={() => setShowTutorial((v) => !v)}
                      className="mt-2 text-xs font-mono-custom uppercase tracking-widest flex items-center gap-1"
                      style={{ color: "var(--rust)" }}
                    >
                      {showTutorial ? "▲" : "▼"} How to play this mode
                    </button>
                    <AnimatePresence>
                      {showTutorial && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 pb-1"><HowToPlayPanel gameMode={activeMode} /></div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Rounds */}
                  <div>
                    <label className="block font-mono-custom font-bold uppercase text-xs tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                      Rounds
                    </label>
                    <div className="flex gap-2">
                      {ROUND_OPTIONS.map((n) => (
                        <button
                          key={n}
                          onClick={() => setRoundCount({ roomId: room._id, roundCount: n })}
                          className="flex-1 py-2 font-mono-custom font-bold text-sm uppercase border-2 transition-all"
                          style={{
                            backgroundColor: room.roundCount === n ? "var(--rust)" : "var(--cream)",
                            borderColor: room.roundCount === n ? "var(--rust-dark)" : "var(--border)",
                            color: room.roundCount === n ? "white" : "var(--ink)",
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Max players */}
                  <div>
                    <label className="block font-mono-custom font-bold uppercase text-xs tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                      Max Players: {room.maxPlayers}
                    </label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setMaxPlayers({ roomId: room._id, maxPlayers: Math.max(2, room.maxPlayers - 1) })} className="btn-teal w-10 h-10 text-xl">−</button>
                      <div className="flex-1 text-center font-display text-3xl" style={{ color: "var(--teal)" }}>{room.maxPlayers}</div>
                      <button onClick={() => setMaxPlayers({ roomId: room._id, maxPlayers: Math.min(20, room.maxPlayers + 1) })} className="btn-teal w-10 h-10 text-xl">+</button>
                    </div>
                  </div>

                  {/* Privacy toggle */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-mono-custom font-bold uppercase text-sm" style={{ color: "var(--ink)" }}>
                          {room.isPrivate ? "🔒 Private Room" : "🔓 Open Room"}
                        </div>
                        <div className="text-xs font-mono-custom" style={{ color: "var(--muted)" }}>
                          {room.isPrivate ? "Password + host approval required" : "Anyone with the code can join"}
                        </div>
                      </div>
                      <button
                        onClick={handleTogglePrivacy}
                        className="relative w-14 h-7 rounded-full transition-colors shrink-0"
                        style={{ backgroundColor: room.isPrivate ? "var(--rust)" : "var(--border)" }}
                      >
                        <motion.div animate={{ x: room.isPrivate ? 28 : 2 }} className="absolute top-1 w-5 h-5 rounded-full bg-white shadow" />
                      </button>
                    </div>
                    <AnimatePresence>
                      {room.isPrivate && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-2 mt-1">
                            <input
                              className="retro-input flex-1 text-sm"
                              placeholder="Set password"
                              type="text"
                              value={passwordDraft}
                              onChange={(e) => setPasswordDraft(e.target.value)}
                            />
                            <button
                              onClick={handleSavePassword}
                              disabled={!passwordDraft.trim()}
                              className="btn-teal px-3 py-1 text-xs"
                            >
                              Save
                            </button>
                          </div>
                          {room.password && (
                            <p className="text-[11px] font-mono-custom mt-1" style={{ color: "var(--teal)" }}>
                              Password: <strong>{room.password}</strong>
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Group Vibe */}
                  <GroupVibePicker
                    selected={room.groupContext}
                    onSelect={(v) => setGroupContext({ roomId: room._id, groupContext: v })}
                  />

                  {/* Adults Only (per-game) — sits above Start so it's set first */}
                  <div
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer select-none transition-all"
                    style={{
                      backgroundColor: room.isAdult ? "rgba(196,71,42,0.12)" : "transparent",
                      border: room.isAdult ? "2px solid var(--rust)" : "2px solid var(--border)",
                    }}
                    onClick={() => setAdult({ roomId: room._id, isAdult: !room.isAdult })}
                  >
                    <div>
                      <div className="font-mono-custom font-bold uppercase text-sm" style={{ color: room.isAdult ? "var(--rust)" : "var(--ink)" }}>
                        🔞 Adults Only
                      </div>
                      <div className="text-xs font-mono-custom" style={{ color: "var(--muted)" }}>
                        {room.isAdult ? "Explicit content ON — this game only" : "Explicit content OFF"}
                      </div>
                    </div>
                    <span
                      className="relative w-11 h-6 rounded-full inline-flex shrink-0 transition-colors"
                      style={{ backgroundColor: room.isAdult ? "var(--rust)" : "var(--border)" }}
                    >
                      <motion.span
                        animate={{ x: room.isAdult ? 22 : 2 }}
                        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
                      />
                    </span>
                  </div>

                  {/* Start */}
                  <button
                    onClick={startGame}
                    disabled={activePlayers.length < 2 || starting}
                    className="btn-rust w-full py-4 text-lg"
                    style={room.isAdult ? { background: "linear-gradient(135deg, #8B0000, #C4472A)", border: "2px solid #8B0000" } : {}}
                  >
                    {starting ? "Starting..." : room.isAdult ? "🔞 Start Game" : "🎮 Start Game"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="section-header">Waiting…</div>
                <div className="p-6 flex flex-col items-center gap-4">
                  <div className="w-full">
                    <p className="font-mono-custom text-xs uppercase tracking-widest mb-3 text-center" style={{ color: "var(--muted)" }}>
                      Game selected by host
                    </p>
                    {(() => {
                      const m = GAME_MODES.find((g) => g.value === activeMode);
                      const topic = room.triviaTopic && room.triviaTopic !== "universal" ? room.triviaTopic : null;
                      return m ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ border: "2px solid var(--teal)", backgroundColor: "rgba(30,95,95,0.06)" }}>
                          <span className="text-2xl">{m.emoji}</span>
                          <div>
                            <p className="font-mono-custom font-bold text-[9px] uppercase tracking-widest mb-0.5" style={{ color: "var(--muted)" }}>{m.group}</p>
                            <div className="font-mono-custom font-bold text-sm" style={{ color: "var(--teal)" }}>
                              {m.label}{topic ? `: ${topic}` : ""}
                            </div>
                            <div className="text-xs font-mono-custom" style={{ color: "var(--muted)" }}>{m.description}</div>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div className="w-full">
                    <button
                      onClick={() => setShowTutorial((v) => !v)}
                      className="text-xs font-mono-custom uppercase tracking-widest flex items-center gap-1 mb-2"
                      style={{ color: "var(--rust)" }}
                    >
                      {showTutorial ? "▲" : "▼"} How to play
                    </button>
                    <AnimatePresence>
                      {showTutorial && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <HowToPlayPanel gameMode={activeMode} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <p className="font-mono-custom font-bold uppercase text-center text-sm" style={{ color: "var(--teal)" }}>
                    Waiting for host to start
                    <span className="dot-pulse ml-1"><span>.</span><span>.</span><span>.</span></span>
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ── Group Vibe Picker ───────────────────────────────────────────────────────

const GROUP_VIBES = [
  { value: "friends", label: "Friends", emoji: "🤝" },
  { value: "couple", label: "Couple", emoji: "💑" },
  { value: "talking_stage", label: "Talking Stage", emoji: "💬" },
  { value: "in_person", label: "In Person", emoji: "🎉" },
  { value: "virtual", label: "Virtual", emoji: "💻" },
  { value: "work", label: "Work", emoji: "💼" },
];

interface GroupVibePickerProps {
  selected?: string;
  onSelect: (value: string | undefined) => void;
}

function GroupVibePicker({ selected, onSelect }: GroupVibePickerProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="font-mono-custom font-bold uppercase text-xs tracking-widest" style={{ color: "var(--muted)" }}>
          Group Vibe <span className="normal-case font-normal">(optional)</span>
        </label>
        {selected && (
          <button
            onClick={() => onSelect(undefined)}
            className="text-[10px] font-mono-custom uppercase tracking-widest"
            style={{ color: "var(--muted)" }}
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {GROUP_VIBES.map((v) => {
          const isActive = selected === v.value;
          return (
            <button
              key={v.value}
              onClick={() => onSelect(isActive ? undefined : v.value)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono-custom font-bold transition-all"
              style={{
                backgroundColor: isActive ? "var(--teal)" : "var(--cream)",
                color: isActive ? "white" : "var(--ink)",
                border: isActive ? "2px solid var(--teal-dark, #005f5f)" : "2px solid var(--border)",
              }}
            >
              <span>{v.emoji}</span>
              <span>{v.label}</span>
            </button>
          );
        })}
      </div>
      {selected && (
        <p className="text-[10px] font-mono-custom mt-1.5" style={{ color: "var(--teal)" }}>
          AI will tailor questions for a <strong>{GROUP_VIBES.find((v) => v.value === selected)?.label}</strong> vibe.
        </p>
      )}
    </div>
  );
}

// ── Trivia Topic Picker ─────────────────────────────────────────────────────

const PRESET_TOPICS = [
  "Game of Thrones", "Breaking Bad", "The Office",
  "Modern Family", "Friends", "Stranger Things",
  "Harry Potter", "Marvel Movies", "Disney Movies",
  "Taylor Swift", "Beyoncé", "Eminem",
  "2000s Music", "Hip Hop", "Pop Music",
  "FIFA / Football", "NBA Basketball", "WWE",
  "Minecraft", "Call of Duty", "Grand Theft Auto",
  "Reality TV", "YouTube Classics", "Internet Memes",
];

interface TriviaTopicPickerProps {
  savedTopic: string;           // value from DB (room.triviaTopic ?? "universal")
  topicDraft: string;
  onTopicDraftChange: (v: string) => void;
  onSelect: (topic: string) => void;
}

function TriviaTopicPicker({ savedTopic, topicDraft, onTopicDraftChange, onSelect }: TriviaTopicPickerProps) {
  // Track panel open/close separately from the saved DB value so clicking
  // "Custom Topic" doesn't auto-save "Game of Thrones" when the input is empty.
  const [showCustom, setShowCustom] = useState(savedTopic !== "universal");

  const confirmedTopic = savedTopic !== "universal" ? savedTopic : null;

  function handleUniversal() {
    setShowCustom(false);
    onSelect("universal");
  }

  function handleConfirmTopic(topic: string) {
    onSelect(topic);
  }

  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-3"
      style={{ backgroundColor: "rgba(30,95,95,0.06)", border: "1.5px solid var(--teal)" }}
    >
      <p className="font-mono-custom font-bold uppercase text-[10px] tracking-widest" style={{ color: "var(--teal)" }}>
        Trivia Topic
      </p>

      {/* Universal / Custom toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleUniversal}
          className="flex-1 py-1.5 text-xs font-mono-custom font-bold uppercase rounded border-2 transition-all"
          style={{
            backgroundColor: !showCustom ? "var(--teal)" : "transparent",
            borderColor: "var(--teal)",
            color: !showCustom ? "white" : "var(--teal)",
          }}
        >
          Universal Mix
        </button>
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className="flex-1 py-1.5 text-xs font-mono-custom font-bold uppercase rounded border-2 transition-all"
          style={{
            backgroundColor: showCustom ? "var(--rust)" : "transparent",
            borderColor: showCustom ? "var(--rust-dark, #a33520)" : "var(--border)",
            color: showCustom ? "white" : "var(--muted)",
          }}
        >
          Custom Topic
        </button>
      </div>

      {/* Status line */}
      {!showCustom && (
        <div className="text-xs font-mono-custom" style={{ color: "var(--muted)" }}>
          Broad mix of pop culture, movies, TV, music, memes &amp; more.
        </div>
      )}
      {showCustom && confirmedTopic && (
        <div className="text-xs font-mono-custom" style={{ color: "var(--rust)" }}>
          Topic set: <strong>{confirmedTopic}</strong>
        </div>
      )}
      {showCustom && !confirmedTopic && (
        <div className="text-xs font-mono-custom" style={{ color: "var(--muted)" }}>
          Pick a preset or type your own topic below.
        </div>
      )}

      {/* Custom topic input + presets */}
      <AnimatePresence>
        {showCustom && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden flex flex-col gap-2"
          >
            {/* Text input */}
            <div className="flex gap-2">
              <input
                className="retro-input flex-1 text-sm"
                placeholder='e.g. "Modern Family"'
                value={topicDraft}
                onChange={(e) => onTopicDraftChange(e.target.value)}
                maxLength={50}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && topicDraft.trim().length >= 3) handleConfirmTopic(topicDraft.trim());
                }}
              />
              <button
                type="button"
                onClick={() => { if (topicDraft.trim().length >= 3) handleConfirmTopic(topicDraft.trim()); }}
                disabled={topicDraft.trim().length < 3}
                className="btn-rust px-3 py-1 text-xs shrink-0"
              >
                Set
              </button>
            </div>

            {/* Preset chips */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { onTopicDraftChange(t); handleConfirmTopic(t); }}
                  className="px-2 py-0.5 text-[10px] font-mono-custom font-bold rounded transition-all"
                  style={{
                    backgroundColor: confirmedTopic === t ? "var(--rust)" : "var(--cream)",
                    color: confirmedTopic === t ? "white" : "var(--ink)",
                    border: confirmedTopic === t ? "1.5px solid var(--rust-dark, #a33520)" : "1.5px solid var(--border)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
