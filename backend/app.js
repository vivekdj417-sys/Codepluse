import "dotenv/config";
import cors from "cors";
import express from "express";
import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import analyticsRoutes from "./src/routes/analyticsRoutes.js";
import recommendationRoutes from "./src/routes/recommendationRoutes.js";
import dailyPlanRoutes from "./src/routes/dailyPlanRoutes.js";
import { connectDatabase } from "./src/db/mongoose.js";
import otpRoutes from "./src/routes/otpRoutes.js";
import leetcodeRoutes from "./src/routes/leetcodeRoutes.js";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_request, response) =>
  response.json({ service: "codepulse-api", status: "ok" }),
);
app.use("/api/auth", authRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/user", userRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/daily-plan", dailyPlanRoutes);
app.use("/api/leetcode", leetcodeRoutes);

app.use((_request, response) =>
  response.status(404).json({ message: "Route not found." }),
);
connectDatabase()
  .then(() =>
    app.listen(port, () =>
      console.log(`CodePulse API listening on port ${port}`),
    ),
  )
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
