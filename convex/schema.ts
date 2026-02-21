import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 아이 정보
  children: defineTable({
    name: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    birthDate: v.string(), // ISO date string
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_creation", ["createdAt"]),

  // 성장 기록
  growthRecords: defineTable({
    childId: v.id("children"),
    date: v.string(), // ISO date string
    height: v.number(),
    weight: v.number(),
    percentile: v.optional(v.object({
      height: v.number(),
      weight: v.number(),
    })),
    createdAt: v.number(),
  })
    .index("by_child", ["childId"])
    .index("by_child_date", ["childId", "date"]),

  // 챌린지 기록
  challenges: defineTable({
    childId: v.id("children"),
    date: v.string(), // YYYY-MM-DD
    category: v.string(),
    title: v.string(),
    completed: v.boolean(),
    icon: v.string(),
    createdAt: v.number(),
  })
    .index("by_child", ["childId"])
    .index("by_child_date", ["childId", "date"]),

  // 커스텀 챌린지
  customChallenges: defineTable({
    title: v.string(),
    category: v.string(),
    icon: v.string(),
    createdAt: v.number(),
  }),

  // 키 예측 기록
  heightPredictions: defineTable({
    childId: v.id("children"),
    measureDate: v.string(),
    age: v.number(),
    height: v.number(),
    weight: v.number(),
    fatherHeight: v.number(),
    motherHeight: v.number(),
    predictedHeight: v.number(),
    predictedRange: v.object({
      min: v.number(),
      max: v.number(),
    }),
    midParentHeight: v.number(),
    createdAt: v.number(),
  })
    .index("by_child", ["childId"])
    .index("by_creation", ["createdAt"]),

  // 환자 정보 (관리자용)
  patients: defineTable({
    name: v.string(),
    birthDate: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    chartNumber: v.optional(v.string()),
    fatherHeight: v.optional(v.number()),
    motherHeight: v.optional(v.number()),
    targetHeight: v.optional(v.string()),
    specialNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_creation", ["createdAt"]),

  // 측정 기록 (관리자용 - 환자별)
  measurements: defineTable({
    patientId: v.id("patients"),
    date: v.string(),
    height: v.number(),
    weight: v.number(),
    boneAge: v.optional(v.string()),
    predictedHeight: v.optional(v.string()),
    treatment: v.optional(v.string()),
    memo: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_patient_date", ["patientId", "date"]),

  // FAQ (관리자 관리)
  faqs: defineTable({
    order: v.number(),
    category: v.string(),
    question: v.string(),
    answer: v.string(),
    tags: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_order", ["order"])
    .index("by_category", ["category"]),

  // 치료 사례 (관리자 관리)
  cases: defineTable({
    name: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
    birthDate: v.string(),
    fatherHeight: v.optional(v.number()),
    motherHeight: v.optional(v.number()),
    targetHeight: v.optional(v.string()),
    specialNotes: v.optional(v.string()),
    measurements: v.array(v.object({
      date: v.string(),
      height: v.number(),
      weight: v.number(),
      memo: v.optional(v.string()),
    })),
    memo: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_creation", ["createdAt"]),
});
