import { Router } from "express";
import { listRecommendations } from "../controllers/recommendationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
const router = Router();
router.get("/", requireAuth, listRecommendations);
export default router;
