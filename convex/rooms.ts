import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export const createRoom = mutation({
  args: {
    hostSessionId: v.string(),
    hostName: v.string(),
    hostAvatar: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.hostName.trim().length < 1) throw new Error("Name cannot be empty");
    if (args.hostName.trim().length > 16) throw new Error("Name must be 16 characters or fewer");

    let code = generateCode();
    // Ensure uniqueness
    while (true) {
      const existing = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (!existing) break;
      code = generateCode();
    }

    const roomId = await ctx.db.insert("rooms", {
      code,
      hostId: args.hostSessionId,
      status: "lobby",
      currentQuestionIndex: 0,
      questionBatch: [],
      isAdult: false,
      roundCount: 10,
      maxPlayers: 10,
    });

    const playerId = await ctx.db.insert("players", {
      roomId,
      sessionId: args.hostSessionId,
      name: args.hostName,
      avatar: args.hostAvatar,
      score: 0,
      streak: 0,
      isHost: true,
      isConnected: true,
    });

    return { roomId, code, playerId };
  },
});

export const joinRoom = mutation({
  args: {
    code: v.string(),
    sessionId: v.string(),
    name: v.string(),
    avatar: v.string(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!room) throw new Error("Room not found");

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    // Reconnect existing session regardless of game status
    const existing = players.find((p) => p.sessionId === args.sessionId);
    if (existing) {
      await ctx.db.patch(existing._id, { isConnected: true });
      return { roomId: room._id, code: room.code, playerId: existing._id };
    }

    // Block banned sessions
    if (room.bannedSessions?.includes(args.sessionId)) {
      throw new Error("You have been removed from this room");
    }

    // Only new players are blocked once the game has started
    if (room.status !== "lobby") throw new Error("Game already started");

    const isReturningHost = args.sessionId === room.hostId;

    // Password gate (skip for returning host)
    if (!isReturningHost && room.isPrivate && room.password) {
      if (args.password !== room.password) {
        throw new Error("Incorrect password");
      }
    }

    // Name length validation
    if (args.name.trim().length < 1) throw new Error("Name cannot be empty");
    if (args.name.trim().length > 16) throw new Error("Name must be 16 characters or fewer");

    if (!isReturningHost && players.length >= room.maxPlayers) {
      throw new Error("Room is full");
    }

    // Avatar uniqueness check
    if (!isReturningHost) {
      const avatarTaken = players.some((p) => p.avatar === args.avatar);
      if (avatarTaken) throw new Error("That avatar is already taken by another player");
    }

    // Private rooms: new players wait for host admission
    const playerStatus = room.isPrivate && !isReturningHost ? "pending" : "active";

    const playerId = await ctx.db.insert("players", {
      roomId: room._id,
      sessionId: args.sessionId,
      name: args.name,
      avatar: args.avatar,
      score: 0,
      streak: 0,
      isHost: isReturningHost,
      isConnected: true,
      status: playerStatus,
    });

    return { roomId: room._id, code: room.code, playerId };
  },
});

export const getRoom = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();
  },
});

export const getRoomById = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.roomId);
  },
});

export const setGameMode = mutation({
  args: {
    roomId: v.id("rooms"),
    gameMode: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, {
      gameMode: args.gameMode,
      category: args.category,
    });
  },
});

export const setStatus = mutation({
  args: { roomId: v.id("rooms"), status: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, { status: args.status });
  },
});

export const setQuestionBatch = mutation({
  args: {
    roomId: v.id("rooms"),
    questions: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, {
      questionBatch: args.questions,
      status: "playing",
      currentQuestionIndex: 0,
    });
  },
});

export const nextQuestion = mutation({
  args: { roomId: v.id("rooms"), fromIndex: v.number() },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    // Idempotency guard — ignore if already advanced past this index
    if (room.currentQuestionIndex !== args.fromIndex) return;

    const nextIndex = room.currentQuestionIndex + 1;
    if (nextIndex >= room.questionBatch.length) {
      await ctx.db.patch(args.roomId, { status: "ended" });
    } else {
      await ctx.db.patch(args.roomId, {
        currentQuestionIndex: nextIndex,
        status: "playing",
      });
    }
  },
});

export const showReveal = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room || room.status !== "playing") return;
    await ctx.db.patch(args.roomId, { status: "reveal" });
  },
});

export const setRoundCount = mutation({
  args: { roomId: v.id("rooms"), roundCount: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, { roundCount: args.roundCount });
  },
});

export const setMaxPlayers = mutation({
  args: { roomId: v.id("rooms"), maxPlayers: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, { maxPlayers: args.maxPlayers });
  },
});

export const setAdult = mutation({
  args: { roomId: v.id("rooms"), isAdult: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, { isAdult: args.isAdult });
  },
});

// Host abandons an active game — returns everyone to lobby without wiping scores yet
export const abandonGame = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, {
      status: "lobby",
      questionBatch: [],
      currentQuestionIndex: 0,
      isAdult: false,
      triviaTopic: undefined,
      groupContext: undefined,
    });
  },
});

export const setPrivacy = mutation({
  args: {
    roomId: v.id("rooms"),
    isPrivate: v.boolean(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, {
      isPrivate: args.isPrivate,
      password: args.isPrivate ? (args.password ?? "") : undefined,
    });
  },
});

export const admitPlayer = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.playerId, { status: "active" });
  },
});

export const kickPlayer = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) return;
    await ctx.db.delete(args.playerId);
    // Ban the session so they can't immediately rejoin
    const room = await ctx.db.get(player.roomId);
    if (room) {
      const banned = room.bannedSessions ?? [];
      if (!banned.includes(player.sessionId)) {
        await ctx.db.patch(player.roomId, {
          bannedSessions: [...banned, player.sessionId],
        });
      }
    }
  },
});

// Replay same game mode — resets scores & skips lobby straight to generating
export const restartGame = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const player of players) {
      await ctx.db.patch(player._id, { score: 0, streak: 0 });
    }

    await ctx.db.patch(args.roomId, {
      status: "generating",
      questionBatch: [],
      currentQuestionIndex: 0,
      isAdult: false,
    });
  },
});

export const setGroupContext = mutation({
  args: { roomId: v.id("rooms"), groupContext: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, { groupContext: args.groupContext });
  },
});

export const setTriviaTopic = mutation({
  args: { roomId: v.id("rooms"), triviaTopic: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.triviaTopic && args.triviaTopic !== "universal") {
      const t = args.triviaTopic.trim();
      if (t.length < 3) throw new Error("Topic must be at least 3 characters");
      if (t.length > 50) throw new Error("Topic must be 50 characters or fewer");
    }
    await ctx.db.patch(args.roomId, { triviaTopic: args.triviaTopic });
  },
});

export const transferHost = mutation({
  args: { roomId: v.id("rooms"), newHostPlayerId: v.id("players") },
  handler: async (ctx, args) => {
    const newHost = await ctx.db.get(args.newHostPlayerId);
    if (!newHost) throw new Error("Player not found");

    // Strip host from all current players in this room
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const player of players) {
      if (player.isHost) {
        await ctx.db.patch(player._id, { isHost: false });
      }
    }

    // Grant host to new player and update room.hostId
    await ctx.db.patch(args.newHostPlayerId, { isHost: true });
    await ctx.db.patch(args.roomId, { hostId: newHost.sessionId });
  },
});

export const resetRoom = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, {
      status: "lobby",
      questionBatch: [],
      currentQuestionIndex: 0,
      gameMode: undefined,
      category: undefined,
      isAdult: false,
      triviaTopic: undefined,
      groupContext: undefined,
    });

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const player of players) {
      await ctx.db.patch(player._id, { score: 0, streak: 0 });
    }
  },
});
