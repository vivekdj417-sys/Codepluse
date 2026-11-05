import mongoose from "mongoose";

const dailyPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    availableMinutes: { type: Number, min: 15, max: 480, required: true },
    items: [{
      questionFrontendId: String,
      title: String,
      titleSlug: String,
      difficulty: String,
      label: String,
      minutes: Number,
      topic: String,
    }],
  },
  { timestamps: true },
);
export const DailyPlan = mongoose.model("DailyPlan", dailyPlanSchema);
