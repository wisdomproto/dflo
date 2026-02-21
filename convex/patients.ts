import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// 모든 환자 조회
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("patients").order("desc").collect();
  },
});

// 환자 검색
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const allPatients = await ctx.db.query("patients").collect();
    return allPatients.filter(patient => 
      patient.name.includes(args.query) ||
      patient.chartNumber?.includes(args.query)
    );
  },
});

// 특정 환자 조회
export const get = query({
  args: { id: v.id("patients") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// 환자 추가
export const create = mutation({
  args: {
    name: v.string(),
    birthDate: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    chartNumber: v.optional(v.string()),
    fatherHeight: v.optional(v.number()),
    motherHeight: v.optional(v.number()),
    targetHeight: v.optional(v.string()),
    specialNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("patients", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// 환자 수정
export const update = mutation({
  args: {
    id: v.id("patients"),
    name: v.string(),
    birthDate: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    chartNumber: v.optional(v.string()),
    fatherHeight: v.optional(v.number()),
    motherHeight: v.optional(v.number()),
    targetHeight: v.optional(v.string()),
    specialNotes: v.optional(v.string()),
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

// 환자 삭제
export const remove = mutation({
  args: { id: v.id("patients") },
  handler: async (ctx, args) => {
    // 관련 측정 기록도 삭제
    const measurements = await ctx.db
      .query("measurements")
      .withIndex("by_patient", (q) => q.eq("patientId", args.id))
      .collect();
    
    for (const measurement of measurements) {
      await ctx.db.delete(measurement._id);
    }

    // 환자 삭제
    await ctx.db.delete(args.id);
  },
});

// 환자와 측정 기록 함께 조회
export const getWithMeasurements = query({
  args: { id: v.id("patients") },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.id);
    if (!patient) return null;

    const measurements = await ctx.db
      .query("measurements")
      .withIndex("by_patient", (q) => q.eq("patientId", args.id))
      .order("desc")
      .collect();

    return {
      ...patient,
      measurements,
    };
  },
});
