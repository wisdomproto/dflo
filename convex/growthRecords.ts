import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// 특정 아이의 모든 성장 기록 조회
export const listByChild = query({
  args: { childId: v.id("children") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("growthRecords")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
      .order("desc")
      .collect();
  },
});

// 성장 기록 추가
export const create = mutation({
  args: {
    childId: v.id("children"),
    date: v.string(),
    height: v.number(),
    weight: v.number(),
    percentile: v.optional(v.object({
      height: v.number(),
      weight: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("growthRecords", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// 성장 기록 삭제
export const remove = mutation({
  args: { id: v.id("growthRecords") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// 최근 N개 기록 조회
export const getRecent = query({
  args: { 
    childId: v.id("children"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("growthRecords")
      .withIndex("by_child", (q) => q.eq("childId", args.childId))
      .order("desc")
      .take(args.limit);
  },
});
