import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    hostId: v.string(),
    gameMode: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.string(), // "lobby" | "generating" | "playing" | "reveal" | "ended"
    currentQuestionIndex: v.number(),
    questionBatch: v.array(v.any()),
    isAdult: v.boolean(),
    roundCount: v.number(),
    maxPlayers: v.number(),
    isPrivate: v.optional(v.boolean()),
    password: v.optional(v.string()),
    triviaTopic: v.optional(v.string()),
    groupContext: v.optional(v.string()),
    bannedSessions: v.optional(v.array(v.string())),
  }).index("by_code", ["code"]),

  players: defineTable({
    roomId: v.id("rooms"),
    sessionId: v.string(),
    name: v.string(),
    avatar: v.string(),
    score: v.number(),
    streak: v.number(),
    isHost: v.boolean(),
    isConnected: v.boolean(),
    // "active" = in the game, "pending" = waiting for host admission
    status: v.optional(v.union(v.literal("active"), v.literal("pending"))),
  })
    .index("by_room", ["roomId"])
    .index("by_session_room", ["sessionId", "roomId"]),

  answers: defineTable({
    roomId: v.id("rooms"),
    questionIndex: v.number(),
    playerId: v.id("players"),
    answer: v.string(),
  })
    .index("by_room_question", ["roomId", "questionIndex"])
    .index("by_player_question", ["playerId", "questionIndex"]),

  questions: defineTable({
    gameMode: v.string(),
    category: v.string(),
    isAdult: v.boolean(),
    content: v.any(),
    usageCount: v.number(),
    createdAt: v.number(),
  }).index("by_mode_category", ["gameMode", "category", "isAdult"]),
});
