import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    leetcodeUsername: { type: String, unique: true, sparse: true, trim: true },
    ranking: { type: Number, default: 0 },
    solvedProblems: [{
      questionFrontendId: { type: String, required: true },
      title: { type: String, required: true },
      problem: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", default: null },
      syncedAt: { type: Date, required: true },
    }],
    topicStats: { type: Map, of: Number, default: {} },
    difficultyStats: {
      total: { type: Number, default: 0 },
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
      unclassified: { type: Number, default: 0 },
    },
    recentSolved: [{
      title: { type: String, required: true },
      titleSlug: { type: String, default: "" },
      timestamp: { type: Number, default: 0 },
      lang: { type: String, default: "" },
    }],
    calendar: { type: mongoose.Schema.Types.Mixed, default: {} },
    totalSolved: { type: Number, default: 0 },
    solvedSyncedAt: { type: Date, default: null },
    fullSyncComplete: { type: Boolean, default: false },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
export const User = mongoose.model("User", userSchema);
