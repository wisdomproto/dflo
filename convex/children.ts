import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// 모든 아이 조회
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("children").order("desc").collect();
  },
});

// 특정 아이 조회
export const get = query({
  args: { id: v.id("children") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// 아이 추가
export const create = mutation({
  args: {
    name: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    birthDate: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("children", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// 아이 수정
export const update = mutation({
  args: {
    id: v.id("children"),
    name: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    birthDate: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    await ctx.db.patch(id, {
      ...data,
      updatedAt: Date.now(),
    });
    return id;
  },
});

// 아이 삭제
export const remove = mutation({
  args: { id: v.id("children") },
  handler: async (ctx, args) => {
    // 관련 성장 기록도 삭제
    const growthRecords = await ctx.db
      .query("growthRecords")
      .withIndex("by_child", (q) => q.eq("childId", args.id))
      .collect();
    
    for (const record of growthRecords) {
      await ctx.db.delete(record._id);
    }

    // 관련 챌린지도 삭제
    const challenges = await ctx.db
      .query("challenges")
      .withIndex("by_child", (q) => q.eq("childId", args.id))
      .collect();
    
    for (const challenge of challenges) {
      await ctx.db.delete(challenge._id);
    }

    // 아이 삭제
    await ctx.db.delete(args.id);
  },
});
