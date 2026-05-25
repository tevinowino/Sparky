import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getQuestions = query({
  args: {
    gameMode: v.string(),
    category: v.string(),
    isAdult: v.boolean(),
    count: v.number(),
    excludeIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("questions")
      .withIndex("by_mode_category", (q) =>
        q
          .eq("gameMode", args.gameMode)
          .eq("category", args.category)
          .eq("isAdult", args.isAdult)
      )
      .collect();

    const filtered = all.filter((q) => !args.excludeIds.includes(q._id));
    // Shuffle and return
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, args.count);
  },
});

export const storeQuestions = mutation({
  args: {
    questions: v.array(v.any()),
    gameMode: v.string(),
    category: v.string(),
    isAdult: v.boolean(),
  },
  handler: async (ctx, args) => {
    const ids: string[] = [];
    for (const q of args.questions) {
      const id = await ctx.db.insert("questions", {
        gameMode: args.gameMode,
        category: args.category,
        isAdult: args.isAdult,
        content: q,
        usageCount: 1,
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});

export const incrementUsage = mutation({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    const q = await ctx.db.get(args.questionId);
    if (!q) return;
    await ctx.db.patch(args.questionId, { usageCount: q.usageCount + 1 });
  },
});
