import { Router } from "express";
import { dailyPlan } from "../controllers/dailyPlanController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
const router = Router();
router.get("/", requireAuth, dailyPlan);
router.post("/", requireAuth, dailyPlan);
export default router;
