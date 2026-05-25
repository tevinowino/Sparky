import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submitAnswer = mutation({
  args: {
    roomId: v.id("rooms"),
    questionIndex: v.number(),
    playerId: v.id("players"),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    // Reject if the room has already moved on (reveal, next question, or ended)
    const room = await ctx.db.get(args.roomId);
    if (!room) return;
    if (room.status === "reveal" || room.status === "ended") return;
    if (room.currentQuestionIndex !== args.questionIndex) return;

    const existing = await ctx.db
      .query("answers")
      .withIndex("by_player_question", (q) =>
        q.eq("playerId", args.playerId).eq("questionIndex", args.questionIndex)
      )
      .first();

    if (existing) return existing._id;

    return ctx.db.insert("answers", {
      roomId: args.roomId,
      questionIndex: args.questionIndex,
      playerId: args.playerId,
      answer: args.answer,
    });
  },
});

export const getAnswers = query({
  args: { roomId: v.id("rooms"), questionIndex: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("answers")
      .withIndex("by_room_question", (q) =>
        q.eq("roomId", args.roomId).eq("questionIndex", args.questionIndex)
      )
      .collect();
  },
});

export const clearAnswers = mutation({
  args: { roomId: v.id("rooms"), questionIndex: v.number() },
  handler: async (ctx, args) => {
    const answers = await ctx.db
      .query("answers")
      .withIndex("by_room_question", (q) =>
        q.eq("roomId", args.roomId).eq("questionIndex", args.questionIndex)
      )
      .collect();

    for (const answer of answers) {
      await ctx.db.delete(answer._id);
    }
  },
});

export const clearAllAnswers = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const answers = await ctx.db
      .query("answers")
      .withIndex("by_room_question", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const answer of answers) {
      await ctx.db.delete(answer._id);
    }
  },
});
