import { Router } from "express";
import { getProfile, importProfile } from "../controllers/userController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
const router = Router();
router.get("/profile", requireAuth, getProfile);
router.post("/import", requireAuth, importProfile);
export default router;
