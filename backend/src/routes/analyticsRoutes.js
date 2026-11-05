import { Router } from "express";
import { overview } from "../controllers/analyticsController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
const router = Router();
router.get("/overview", requireAuth, overview);
export default router;
