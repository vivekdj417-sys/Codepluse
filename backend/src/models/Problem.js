import mongoose from "mongoose";

const problemSchema = new mongoose.Schema(
  {
    questionFrontendId: { type: String, unique: true, required: true, index: true },
    title: { type: String, required: true },
    titleSlug: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
    },
    topicTags: [{ name: { type: String, required: true }, slug: { type: String, default: "" } }],
    paidOnly: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export const Problem = mongoose.model("Problem", problemSchema);
