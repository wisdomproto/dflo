import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// 특정 환자의 모든 측정 기록 조회
export const listByPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("measurements")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

// 측정 기록 추가
export const create = mutation({
  args: {
    patientId: v.id("patients"),
    date: v.string(),
    height: v.number(),
    weight: v.number(),
    boneAge: v.optional(v.string()),
    predictedHeight: v.optional(v.string()),
    treatment: v.optional(v.string()),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 환자의 updatedAt 업데이트
    await ctx.db.patch(args.patientId, {
      updatedAt: Date.now(),
    });

    return await ctx.db.insert("measurements", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// 측정 기록 수정
export const update = mutation({
  args: {
    id: v.id("measurements"),
    date: v.string(),
    height: v.number(),
    weight: v.number(),
    boneAge: v.optional(v.string()),
    predictedHeight: v.optional(v.string()),
    treatment: v.optional(v.string()),
    memo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    
    // 측정 기록 조회
    const measurement = await ctx.db.get(id);
    if (!measurement) throw new Error("Measurement not found");

    // 환자의 updatedAt 업데이트
    await ctx.db.patch(measurement.patientId, {
      updatedAt: Date.now(),
    });

    // 측정 기록 업데이트
    await ctx.db.patch(id, data);
    return id;
  },
});

// 측정 기록 삭제
export const remove = mutation({
  args: { id: v.id("measurements") },
  handler: async (ctx, args) => {
    const measurement = await ctx.db.get(args.id);
    if (!measurement) throw new Error("Measurement not found");

    // 환자의 updatedAt 업데이트
    await ctx.db.patch(measurement.patientId, {
      updatedAt: Date.now(),
    });

    await ctx.db.delete(args.id);
  },
});
