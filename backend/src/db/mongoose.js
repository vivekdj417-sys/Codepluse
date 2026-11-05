import mongoose from "mongoose";
import { resumeAtlasClusterIfPaused } from "./atlas.js";

export const connectDatabase = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  const atlasAutoResume = await resumeAtlasClusterIfPaused();
  await mongoose.connect(process.env.MONGODB_URI, {
    ...(atlasAutoResume ? { serverSelectionTimeoutMS: 300000 } : {}),
  });
  console.log("CodePulse MongoDB connected");
};
