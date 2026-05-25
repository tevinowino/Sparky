import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getPlayers = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

export const getPlayerBySession = query({
  args: { sessionId: v.string(), roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("players")
      .withIndex("by_session_room", (q) =>
        q.eq("sessionId", args.sessionId).eq("roomId", args.roomId)
      )
      .first();
  },
});

export const updateScore = mutation({
  args: { playerId: v.id("players"), points: v.number() },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Player not found");
    await ctx.db.patch(args.playerId, { score: player.score + args.points });
  },
});

export const updateStreak = mutation({
  args: { playerId: v.id("players"), increment: v.boolean() },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Player not found");
    await ctx.db.patch(args.playerId, {
      streak: args.increment ? player.streak + 1 : 0,
    });
  },
});

export const setConnected = mutation({
  args: { playerId: v.id("players"), isConnected: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.playerId, { isConnected: args.isConnected });
  },
});

export const removePlayer = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) return;

    await ctx.db.delete(args.playerId);

    // If the leaving player was host, promote the next active player
    if (player.isHost) {
      const remaining = await ctx.db
        .query("players")
        .withIndex("by_room", (q) => q.eq("roomId", player.roomId))
        .collect();

      const nextHost = remaining.find((p) => p.status !== "pending");
      if (nextHost) {
        await ctx.db.patch(nextHost._id, { isHost: true });
        await ctx.db.patch(player.roomId, { hostId: nextHost.sessionId });
      }
    }
  },
});
