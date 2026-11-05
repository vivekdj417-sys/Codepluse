import mongoose from "mongoose";

const profileSnapshotSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    totalSolved: { type: Number, required: true },
    easySolved: { type: Number, required: true },
    mediumSolved: { type: Number, required: true },
    hardSolved: { type: Number, required: true },
    topics: [{ name: String, solved: Number, strength: Number }],
    contests: [
      {
        name: String,
        rating: Number,
        ratingChange: Number,
        participatedAt: Date,
      },
    ],
  },
  { timestamps: true },
);
export const ProfileSnapshot = mongoose.model(
  "ProfileSnapshot",
  profileSnapshotSchema,
);
